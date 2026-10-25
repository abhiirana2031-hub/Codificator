import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseApp = null;
let firebaseAuth = null;
let firebaseStorage = null;
let initAttempted = false;

/**
 * Initializes Firebase Admin SDK with credentials from environment variables or a service account file.
 * Dynamically imported to ensure CJS/ESM dependency quirks (e.g. jwks-rsa/jose in serverless) never crash server startup.
 */
export async function initFirebaseAdmin() {
  if (firebaseApp) {
    return { app: firebaseApp, auth: firebaseAuth, storage: firebaseStorage };
  }
  if (initAttempted) {
    return null;
  }
  initAttempted = true;

  try {
    const { initializeApp, cert, getApps, getApp } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    const { getStorage } = await import('firebase-admin/storage');

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;

    // 1. Initialize via Service Account JSON file path if specified
    const possiblePaths = [
      serviceAccountPath ? path.resolve(process.cwd(), serviceAccountPath) : null,
      serviceAccountPath ? path.resolve(__dirname, '..', '..', serviceAccountPath) : null,
      path.resolve(__dirname, 'service-account.json')
    ].filter(Boolean);

    for (const candidatePath of possiblePaths) {
      if (fs.existsSync(candidatePath)) {
        try {
          const serviceAccount = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
          firebaseApp = initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`
          });
          firebaseAuth = getAuth(firebaseApp);
          firebaseStorage = getStorage(firebaseApp);
          console.log(`🔥 [FIREBASE] Firebase Admin initialized successfully via service account file (${candidatePath}).`);
          return { app: firebaseApp, auth: firebaseAuth, storage: firebaseStorage };
        } catch (err) {
          console.error('❌ [FIREBASE] Failed to initialize Firebase Admin from service account file:', err.message);
        }
      }
    }

    // 2. Initialize via individual environment variables
    if (projectId && clientEmail && privateKey) {
      try {
        const formattedKey = privateKey.includes('\\n') 
          ? privateKey.replace(/\\n/g, '\n') 
          : privateKey;

        firebaseApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: formattedKey
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`
        });
        firebaseAuth = getAuth(firebaseApp);
        firebaseStorage = getStorage(firebaseApp);
        console.log('🔥 [FIREBASE] Firebase Admin initialized successfully via environment credentials.');
        return { app: firebaseApp, auth: firebaseAuth, storage: firebaseStorage };
      } catch (err) {
        console.error('❌ [FIREBASE] Failed to initialize Firebase Admin from environment credentials:', err.message);
      }
    }
  } catch (sdkErr) {
    console.warn('⚠️ [FIREBASE] Firebase Admin SDK could not be loaded in this runtime:', sdkErr.message);
  }

  console.log('ℹ️ [FIREBASE] Running in dev mode without Firebase Admin credentials (bearer token fallback enabled).');
  return null;
}

export function getFirebaseAuth() {
  return firebaseAuth;
}

export function getFirebaseStorage() {
  return firebaseStorage;
}

export function isFirebaseConfigured() {
  return Boolean(firebaseApp);
}
