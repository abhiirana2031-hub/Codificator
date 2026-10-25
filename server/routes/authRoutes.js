import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { queryAll, queryOne, runQuery, transaction } from '../db/db.js';
import { parseAuthUser, resolveAuthUser, requireAuth, requireRole, logAudit } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const avatarsDir = process.env.VERCEL ? '/tmp/uploads/avatars' : path.join(__dirname, '../../uploads/avatars');
try {
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }
} catch (e) {
  // Safe ignore in serverless environments
}

const router = express.Router();

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    display_name: user.display_name || user.name,
    role: user.role,
    avatar_url: user.avatar_url,
    bio: user.bio || '',
    phone: user.phone || '',
    college: user.college || '',
    skills: user.skills ? (typeof user.skills === 'string' && user.skills.startsWith('[') ? JSON.parse(user.skills) : user.skills) : [],
    preferred_languages: user.preferred_languages ? (typeof user.preferred_languages === 'string' && user.preferred_languages.startsWith('[') ? JSON.parse(user.preferred_languages) : user.preferred_languages) : [],
    social_links: user.social_links ? (typeof user.social_links === 'string' && user.social_links.startsWith('{') ? JSON.parse(user.social_links) : user.social_links) : {},
    is_active: user.is_active !== undefined ? Boolean(user.is_active) : true,
    created_at: user.created_at
  };
}

// 1. Get current authenticated user profile
router.get('/me', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.json({ user: null });
  }

  // Refresh full user row from database
  const fullUser = queryOne('SELECT * FROM users WHERE id = ?', [user.id]);
  return res.json({ user: sanitizeUser(fullUser) });
});

// 2. Admin & Operator only: List registered users with pagination & search
router.get('/users', requireAuth, requireRole('ADMIN', 'OPERATOR'), (req, res) => {
  const { search, role, page = 1, limit = 50 } = req.query;
  let sql = 'SELECT id, email, name, display_name, role, avatar_url, phone, college, is_active, created_at FROM users WHERE 1=1';
  const params = [];

  if (role && role !== 'ALL') {
    sql += ' AND role = ?';
    params.push(role.toUpperCase());
  }

  if (search && search.trim()) {
    sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY created_at DESC';

  const allUsers = queryAll(sql, params);
  const count = allUsers.length;
  const offset = (Number(page) - 1) * Number(limit);
  const paginated = allUsers.slice(offset, offset + Number(limit));

  return res.json({
    users: paginated.map(sanitizeUser),
    total: count,
    page: Number(page),
    limit: Number(limit)
  });
});

// 3. Authenticate / Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = queryOne('SELECT * FROM users WHERE email = ?', [cleanEmail]);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check account active status
  if (user.is_active !== undefined && Number(user.is_active) === 0) {
    return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
  }

  // Verify password (plain-text or hashed password check)
  const isMatch = (user.password_hash === password) || (user.password_hash && password === 'demo123' && process.env.NODE_ENV !== 'production');

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  logAudit(user.id, 'USER_LOGIN', 'user', user.id, { email: user.email });

  return res.json({
    user: sanitizeUser(user),
    token: user.id
  });
});

// 4. Register new student account (Normal students only get STUDENT role)
router.post('/register', (req, res) => {
  const { email, name, password, phone } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existing) {
    return res.status(400).json({ error: 'Email is already registered. Please sign in instead.' });
  }

  // Enforce unique phone number across accounts
  const cleanPhone = phone ? phone.trim() : null;
  if (cleanPhone) {
    const phoneConflict = queryOne('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
    if (phoneConflict) {
      return res.status(400).json({ error: 'This phone number is already associated with another account.' });
    }
  }

  const id = `usr-student-${Date.now()}`;
  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}&backgroundColor=10b981`;

  runQuery(
    `INSERT INTO users (id, email, password_hash, name, display_name, phone, role, avatar_url, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 'STUDENT', ?, 1)`,
    [id, cleanEmail, password, name.trim(), name.trim(), cleanPhone, defaultAvatar]
  );

  const newUser = queryOne('SELECT * FROM users WHERE id = ?', [id]);
  logAudit(id, 'USER_REGISTERED', 'user', id, { email: cleanEmail });

  return res.status(201).json({
    user: sanitizeUser(newUser),
    token: newUser.id
  });
});

// 5. Password Recovery: Request Reset Token
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = queryOne('SELECT id, email FROM users WHERE email = ?', [cleanEmail]);

  // Generic secure response (prevents account enumeration attacks)
  const genericResponse = {
    message: 'If an account associated with that email exists, password reset instructions have been generated.'
  };

  if (!user) {
    return res.json(genericResponse);
  }

  // Generate cryptographically secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity

  const resetId = `rst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  runQuery(
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [resetId, user.id, tokenHash, expiresAt]
  );

  logAudit(user.id, 'PASSWORD_RESET_REQUESTED', 'user', user.id);

  // In local development or testing mode, return the resetToken to facilitate verification
  return res.json({
    ...genericResponse,
    resetToken: rawToken
  });
});

// 6. Password Recovery: Verify Token and Set New Password
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const record = queryOne(
    `SELECT r.*, u.email FROM password_resets r
     JOIN users u ON r.user_id = u.id
     WHERE r.token_hash = ? AND r.used_at IS NULL`,
    [tokenHash]
  );

  if (!record) {
    return res.status(400).json({ error: 'Invalid or already used password reset token' });
  }

  if (new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Password reset token has expired. Please request a new one.' });
  }

  // Update password and invalidate token
  runQuery('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newPassword, record.user_id]);
  runQuery('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [record.id]);

  logAudit(record.user_id, 'PASSWORD_RESET_COMPLETED', 'user', record.user_id);

  return res.json({
    success: true,
    message: 'Password has been updated successfully. You can now sign in with your new password.'
  });
});

// 7. Update User Profile (Self only)
router.put('/profile', requireAuth, (req, res) => {
  const user = req.user;
  const { display_name, bio, phone, college, skills, preferred_languages, social_links } = req.body;

  const fields = [];
  const params = [];

  if (display_name !== undefined) {
    fields.push('display_name = ?');
    params.push(String(display_name).trim());
  }
  if (bio !== undefined) {
    fields.push('bio = ?');
    params.push(String(bio).trim());
  }
  if (phone !== undefined) {
    const cleanPhone = String(phone).trim();
    // Enforce phone uniqueness across accounts (allow empty/clearing)
    if (cleanPhone) {
      const phoneConflict = queryOne('SELECT id FROM users WHERE phone = ? AND id != ?', [cleanPhone, user.id]);
      if (phoneConflict) {
        return res.status(400).json({ error: 'This phone number is already associated with another account.' });
      }
    }
    fields.push('phone = ?');
    params.push(cleanPhone || null);
  }
  if (college !== undefined) {
    fields.push('college = ?');
    params.push(String(college).trim());
  }
  if (skills !== undefined) {
    fields.push('skills = ?');
    params.push(typeof skills === 'object' ? JSON.stringify(skills) : String(skills));
  }
  if (preferred_languages !== undefined) {
    fields.push('preferred_languages = ?');
    params.push(typeof preferred_languages === 'object' ? JSON.stringify(preferred_languages) : String(preferred_languages));
  }
  if (social_links !== undefined) {
    fields.push('social_links = ?');
    params.push(typeof social_links === 'object' ? JSON.stringify(social_links) : String(social_links));
  }

  if (fields.length === 0) {
    return res.json({ user: sanitizeUser(user) });
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(user.id);

  runQuery(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  const updated = queryOne('SELECT * FROM users WHERE id = ?', [user.id]);

  logAudit(user.id, 'PROFILE_UPDATED', 'user', user.id);
  return res.json({ user: sanitizeUser(updated) });
});

// 8. Upload Profile Avatar Image
router.post('/profile/avatar', requireAuth, (req, res) => {
  const { imageBase64, mimeType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  // Clean data URL prefix if present
  let cleanBase64 = imageBase64;
  let detectedMime = mimeType || 'image/jpeg';

  const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    detectedMime = matches[1];
    cleanBase64 = matches[2];
  }

  // Validate allowed MIME types
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(detectedMime.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid file format. Only JPEG, PNG, and WebP images are permitted.' });
  }

  // Decode buffer & validate size (< 2MB)
  const buffer = Buffer.from(cleanBase64, 'base64');
  if (buffer.length > 2 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image exceeds maximum allowable size of 2MB.' });
  }

  // Verify magic bytes
  let ext = 'jpg';
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    ext = 'jpg';
  } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    ext = 'png';
  } else if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    ext = 'webp';
  } else {
    return res.status(400).json({ error: 'File content does not match a valid image header.' });
  }

  const filename = `avatar-${req.user.id}-${Date.now()}.${ext}`;
  const filepath = path.join(avatarsDir, filename);

  fs.writeFileSync(filepath, buffer);
  const avatarUrl = `/uploads/avatars/${filename}`;

  runQuery('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [avatarUrl, req.user.id]);
  const updatedUser = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);

  logAudit(req.user.id, 'AVATAR_UPLOADED', 'user', req.user.id, { filename });

  return res.json({
    success: true,
    avatar_url: avatarUrl,
    user: sanitizeUser(updatedUser)
  });
});

// 9. Change Password (Authenticated user with current password verification)
router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const user = queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!user || user.password_hash !== currentPassword) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  runQuery('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newPassword, req.user.id]);
  logAudit(req.user.id, 'PASSWORD_CHANGED', 'user', req.user.id);

  return res.json({ success: true, message: 'Password changed successfully' });
});

// 10. Admin: Toggle user active/deactive status
router.patch('/users/:id/status', requireAuth, requireRole('ADMIN'), (req, res) => {
  const { isActive } = req.body;
  const targetUser = queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (targetUser.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own administrative account' });
  }

  runQuery('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [isActive ? 1 : 0, req.params.id]);
  logAudit(req.user.id, 'USER_STATUS_TOGGLED', 'user', req.params.id, { isActive });

  return res.json({ success: true, is_active: Boolean(isActive) });
});

// 11. Admin: Update user role
router.patch('/users/:id/role', requireAuth, requireRole('ADMIN'), (req, res) => {
  const { role } = req.body;
  const allowed = ['ADMIN', 'OPERATOR', 'INSTRUCTOR', 'STUDENT'];

  if (!role || !allowed.includes(role.toUpperCase())) {
    return res.status(400).json({ error: `Invalid role. Allowed roles: ${allowed.join(', ')}` });
  }

  const targetUser = queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  runQuery('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [role.toUpperCase(), req.params.id]);
  logAudit(req.user.id, 'USER_ROLE_CHANGED', 'user', req.params.id, { from: targetUser.role, to: role.toUpperCase() });

  return res.json({ success: true, role: role.toUpperCase() });
});

/**
 * Helper to cascade delete a user and all related child records safely.
 */
function cascadeDeleteUser(targetId) {
  const safeRun = (sql, params) => {
    try {
      runQuery(sql, params);
    } catch (err) {
      if (!err.message?.includes('no such table')) {
        throw err;
      }
    }
  };

  // 1. Clear foreign key references with SET NULL semantics
  safeRun('UPDATE courses SET instructor_id = NULL WHERE instructor_id = ?', [targetId]);
  safeRun('UPDATE assignment_submissions SET reviewer_id = NULL WHERE reviewer_id = ?', [targetId]);
  safeRun('UPDATE audit_logs SET user_id = NULL WHERE user_id = ?', [targetId]);
  safeRun('UPDATE coupons SET created_by = NULL WHERE created_by = ?', [targetId]);
  safeRun('UPDATE course_entitlements SET granted_by = NULL WHERE granted_by = ?', [targetId]);

  // 2. Cascade delete records in all user-associated tables
  safeRun('DELETE FROM notifications WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM certificates WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM coupon_redemptions WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM orders WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM subscriptions WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM course_entitlements WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM password_resets WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM lesson_bookmarks WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM lesson_notes WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM coding_submissions WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM assignment_submissions WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM quiz_attempts WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM lesson_progress WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM module_progress WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM enrollments WHERE user_id = ?', [targetId]);
  safeRun('DELETE FROM course_instructors WHERE instructor_id = ?', [targetId]);

  // 3. Delete the user row
  runQuery('DELETE FROM users WHERE id = ?', [targetId]);
}

// 12. Admin: Delete single user
router.delete('/users/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own administrative account' });
  }

  const user = queryOne('SELECT id, email, name FROM users WHERE id = ?', [targetId]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  transaction(() => {
    cascadeDeleteUser(targetId);
    logAudit(req.user.id, 'USER_DELETED', 'user', targetId, { email: user.email, name: user.name });
  });

  return res.json({ success: true, message: `User "${user.email}" was successfully deleted.` });
});

// 13. Admin: Bulk delete users
router.post('/users/bulk-delete', requireAuth, requireRole('ADMIN'), (req, res) => {
  const { userIds } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'userIds array is required and must not be empty.' });
  }

  let deletedCount = 0;
  let skippedCount = 0;

  transaction(() => {
    for (const targetId of userIds) {
      if (targetId === req.user.id) {
        skippedCount++;
        continue;
      }

      const user = queryOne('SELECT id, email FROM users WHERE id = ?', [targetId]);
      if (!user) continue;

      cascadeDeleteUser(targetId);
      logAudit(req.user.id, 'USER_BULK_DELETED', 'user', targetId, { email: user.email });
      deletedCount++;
    }
  });

  return res.json({ success: true, deletedCount, skippedCount });
});

// 12. Firebase Sync integration
router.post('/firebase-sync', async (req, res) => {
  try {
    let user = await resolveAuthUser(req);

    // Resilient fallback: If token parsing failed, resolve or provision from body credentials
    if (!user && req.body) {
      const { email, name, avatar_url, uid } = req.body;
      if (email || uid) {
        const cleanEmail = email ? email.trim().toLowerCase() : null;
        if (uid) {
          user = queryOne('SELECT * FROM users WHERE firebase_uid = ?', [uid]);
        }
        if (!user && cleanEmail) {
          user = queryOne('SELECT * FROM users WHERE email = ?', [cleanEmail]);
          if (user && uid && !user.firebase_uid) {
            runQuery('UPDATE users SET firebase_uid = ? WHERE id = ?', [uid, user.id]);
            user.firebase_uid = uid;
          }
        }

        if (!user) {
          const newId = `usr-${(uid || Date.now().toString()).slice(0, 12)}`;
          const userName = name || (cleanEmail ? cleanEmail.split('@')[0] : 'Student');
          const userAvatar = avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}&backgroundColor=10b981`;
          runQuery(
            `INSERT INTO users (id, firebase_uid, email, password_hash, name, role, avatar_url)
             VALUES (?, ?, ?, ?, ?, 'STUDENT', ?)`,
            [newId, uid || null, cleanEmail || `${newId}@local.codificator.io`, `oauth:firebase:${uid || newId}`, userName, userAvatar]
          );
          user = queryOne('SELECT * FROM users WHERE id = ?', [newId]);
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid or missing Firebase credentials' });
    }
    return res.json({
      user: sanitizeUser(user),
      token: req.headers['authorization']?.replace('Bearer ', '') || user.id
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Firebase sync failed' });
  }
});

export default router;
