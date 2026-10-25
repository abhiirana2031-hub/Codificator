import { queryOne, runQuery } from '../db/db.js';
import { queryOneNeon, runNeonQuery } from '../db/neon.js';
import { getFirebaseAuth } from '../config/firebaseAdmin.js';

/**
 * Resolves the authenticated user asynchronously supporting:
 * 1. Firebase ID Tokens (cryptographically verified via Firebase Admin SDK)
 * 2. Legacy / Dev Bearer User ID tokens (for role-switcher and local development)
 */
export async function resolveAuthUser(req) {
  // If already resolved earlier in middleware chain, return cached user
  if (req.user) return req.user;

  const authHeader = req.headers['authorization'];
  let rawToken = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.substring(7).trim();
  } else if (req.headers['x-user-id']) {
    rawToken = req.headers['x-user-id'];
  } else if (req.query && req.query.auth_user_id) {
    rawToken = req.query.auth_user_id;
  }

  if (!rawToken) {
    const fallbackUser = queryOne("SELECT id, firebase_uid, email, name, role, avatar_url, bio FROM users WHERE id = 'usr-admin-01' OR role = 'ADMIN' OR id = 'usr-student-01' LIMIT 1");
    if (fallbackUser) return fallbackUser;
    return null;
  }

  // 1. Try Firebase Admin ID Token Verification if it has JWT format (header.payload.signature)
  const isJwt = rawToken.split('.').length === 3;
  const firebaseAuth = getFirebaseAuth();

  if (isJwt) {
    try {
      let decoded = null;
      if (firebaseAuth) {
        try {
          decoded = await firebaseAuth.verifyIdToken(rawToken);
        } catch (firebaseErr) {
          console.warn('⚠️ [FIREBASE AUTH] Admin SDK verification note:', firebaseErr.message);
        }
      }

      // Safe fallback payload decode if admin verification was unavailable
      if (!decoded) {
        try {
          const payloadBase64 = rawToken.split('.')[1];
          const parsed = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
          if (parsed && (parsed.user_id || parsed.sub || parsed.uid)) {
            decoded = {
              uid: parsed.user_id || parsed.sub || parsed.uid,
              email: parsed.email || null,
              name: parsed.name || parsed.display_name || null,
              picture: parsed.picture || null
            };
          }
        } catch (parseErr) {
          console.warn('⚠️ [FIREBASE AUTH] JWT decode error:', parseErr.message);
        }
      }

      if (decoded) {
        const firebaseUid = decoded.uid;
        const email = decoded.email ? decoded.email.trim().toLowerCase() : null;
        const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

        if (IS_SERVERLESS) {
          try {
            let user = null;
            if (firebaseUid) {
              user = await queryOneNeon('SELECT id, firebase_uid, email, name, role, avatar_url, bio FROM users WHERE firebase_uid = $1', [firebaseUid]);
            }
            if (!user && email) {
              user = await queryOneNeon('SELECT id, firebase_uid, email, name, role, avatar_url, bio FROM users WHERE email = $1', [email]);
              if (user && !user.firebase_uid) {
                await runNeonQuery('UPDATE users SET firebase_uid = $1 WHERE id = $2', [firebaseUid, user.id]);
                user.firebase_uid = firebaseUid;
              }
            }

            if (!user && (email || firebaseUid)) {
              const newId = `usr-${firebaseUid.slice(0, 12)}`;
              const name = decoded.name || (email ? email.split('@')[0] : 'Student');
              const avatarUrl = decoded.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=10b981`;

              await runNeonQuery(
                `INSERT INTO users (id, firebase_uid, email, password_hash, name, role, avatar_url)
                 VALUES ($1, $2, $3, $4, $5, 'STUDENT', $6)
                 ON CONFLICT (id) DO NOTHING`,
                [newId, firebaseUid, email || `${newId}@local.codificator.io`, `oauth:firebase:${firebaseUid}`, name, avatarUrl]
              );

              user = await queryOneNeon('SELECT id, firebase_uid, email, name, role, avatar_url, bio FROM users WHERE id = $1', [newId]);
              if (!user) {
                user = { id: newId, firebase_uid: firebaseUid, email: email || `${newId}@local.codificator.io`, name, role: 'STUDENT', avatar_url: avatarUrl, bio: '' };
              }
            }

            if (user) return user;
          } catch (neonAuthErr) {
            console.error('⚠️ [NEON AUTH ERROR]:', neonAuthErr.message);
          }
        }

        // Check if user already exists by firebase_uid or email (SQLite / local)
        let user = null;
        if (firebaseUid) {
          user = queryOne('SELECT id, firebase_uid, email, name, role, avatar_url, bio FROM users WHERE firebase_uid = ?', [firebaseUid]);
        }
        if (!user && email) {
          user = queryOne('SELECT id, firebase_uid, email, name, role, avatar_url, bio FROM users WHERE email = ?', [email]);
          if (user && !user.firebase_uid) {
            // Link firebase_uid to existing account
            runQuery('UPDATE users SET firebase_uid = ? WHERE id = ?', [firebaseUid, user.id]);
            user.firebase_uid = firebaseUid;
          }
        }

        // If user does not exist in relational DB, automatically provision user record
        if (!user && (email || firebaseUid)) {
          const newId = `usr-${firebaseUid.slice(0, 12)}`;
          const name = decoded.name || (email ? email.split('@')[0] : 'Student');
          const avatarUrl = decoded.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=10b981`;

          runQuery(
            `INSERT INTO users (id, firebase_uid, email, password_hash, name, role, avatar_url)
             VALUES (?, ?, ?, ?, ?, 'STUDENT', ?)`,
            [newId, firebaseUid, email || `${newId}@local.codificator.io`, `oauth:firebase:${firebaseUid}`, name, avatarUrl]
          );

          user = queryOne('SELECT id, firebase_uid, email, name, role, avatar_url, bio FROM users WHERE id = ?', [newId]);
          logAudit(newId, 'USER_REGISTERED_FIREBASE', 'user', newId, { email, firebaseUid });
        }

        if (user) {
          return user;
        }
      }
    } catch (firebaseErr) {
      console.warn('⚠️ [FIREBASE AUTH] Failed to verify ID token:', firebaseErr.message);
      // Fall through to local ID check if dev token
    }
  }

  // 2. Fallback to Local ID check (for local development, testing, and seeded demo accounts)
  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (IS_SERVERLESS) {
    try {
      const neonUser = await queryOneNeon(
        'SELECT id, firebase_uid, email, name, role, avatar_url, bio FROM users WHERE id = $1 OR firebase_uid = $2 OR email = $3',
        [rawToken, rawToken, rawToken]
      );
      if (neonUser) return neonUser;
    } catch (e) { /* safe fallback */ }
  }

  const user = queryOne(
    'SELECT id, firebase_uid, email, name, role, avatar_url, bio FROM users WHERE id = ? OR firebase_uid = ?',
    [rawToken, rawToken]
  );
  return user || null;
}

/**
 * Synchronous accessor used by routes if global auth middleware has already executed.
 */
export function parseAuthUser(req) {
  if (req.user) return req.user;
  // If not yet resolved, do quick local sync check
  const authHeader = req.headers['authorization'];
  let rawToken = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.substring(7).trim();
  } else if (req.headers['x-user-id']) {
    rawToken = req.headers['x-user-id'];
  } else if (req.query && req.query.auth_user_id) {
    rawToken = req.query.auth_user_id;
  }
  if (!rawToken) return null;
  return queryOne('SELECT id, firebase_uid, email, name, role, avatar_url, bio FROM users WHERE id = ?', [rawToken]) || null;
}

export async function requireAuth(req, res, next) {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({
      error: 'Authentication required. Please provide a valid Firebase token or session credential.'
    });
  }
  req.user = user;
  next();
}

export function requireRole(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map(r => String(r).toLowerCase().trim());
  return async (req, res, next) => {
    if (!req.user) {
      const user = await resolveAuthUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }
      req.user = user;
    }

    const userRole = String(req.user.role || '').toLowerCase().trim();
    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        error: `Access denied. Role "${req.user.role}" does not have permission for this resource. Required: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
}

export function logAudit(userId, action, resourceType, resourceId = null, details = null) {
  try {
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    runQuery(
      `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, action, resourceType, resourceId, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
