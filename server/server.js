import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initSchema } from './db/db.js';
import { seedDatabase } from './db/seed.js';
import { syncCurriculumAssessments } from './services/curriculumImporter.js';
import { syncVexorCourses } from './services/vexorCourseImporter.js';

import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import curriculumRoutes from './routes/curriculumRoutes.js';
import learningRoutes from './routes/learningRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import instructorRoutes from './routes/instructorRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import exerciseRoutes from './routes/exerciseRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import userStudyRoutes from './routes/userStudyRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import fs from 'node:fs';
import { syncCodingExercises } from './services/exerciseCatalog.js';
import { initFirebaseAdmin } from './config/firebaseAdmin.js';
import { resolveAuthUser } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global Auth User Resolver (handles both Firebase ID tokens and dev bearer tokens)
app.use(async (req, res, next) => {
  try {
    req.user = await resolveAuthUser(req);
  } catch (e) {
    req.user = null;
  }
  next();
});

// Initialize DB schema & seed initial state if empty
try { initSchema(); } catch (err) { console.error('Schema init error:', err.message); }
try { seedDatabase(); } catch (err) { console.error('Database seed error:', err.message); }
try { syncVexorCourses(); } catch (err) { console.error('Vexor course import error:', err.message); }
try { syncCurriculumAssessments(); } catch (err) { console.error('Curriculum assessment sync error:', err.message); }
try { syncCodingExercises(); } catch (err) { console.error('Coding exercises sync error:', err.message); }
try { initFirebaseAdmin(); } catch (err) { console.error('Firebase Admin init error:', err.message); }

import { checkNeonHealth, queryAllNeon } from './db/neon.js';

// Health check endpoint (reports LMS Engine and Neon Cloud PostgreSQL status)
app.get('/api/health', async (req, res) => {
  const neonHealth = await checkNeonHealth();
  res.json({
    status: 'ok',
    service: 'Codificators LMS Engine',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: {
      provider: 'Neon Cloud PostgreSQL',
      branch: process.env.NEON_BRANCH || 'production',
      status: neonHealth.status,
      latencyMs: neonHealth.latencyMs,
      details: neonHealth
    }
  });
});

// Dedicated Neon status and inspection endpoint
app.get('/api/neon/status', async (req, res) => {
  const neonHealth = await checkNeonHealth();
  let tableStats = {};
  if (neonHealth.status === 'connected') {
    try {
      const users = await queryAllNeon('SELECT COUNT(*) as count FROM users');
      const courses = await queryAllNeon('SELECT COUNT(*) as count FROM courses');
      const orders = await queryAllNeon('SELECT COUNT(*) as count FROM orders');
      const enrollments = await queryAllNeon('SELECT COUNT(*) as count FROM enrollments');
      tableStats = {
        users: Number(users[0]?.count || 0),
        courses: Number(courses[0]?.count || 0),
        orders: Number(orders[0]?.count || 0),
        enrollments: Number(enrollments[0]?.count || 0)
      };
    } catch (e) {
      tableStats.error = e.message;
    }
  }

  res.json({
    neon: neonHealth,
    tables: tableStats
  });
});

// Live course catalog queried directly from Neon Cloud PostgreSQL
app.get('/api/neon/courses', async (req, res) => {
  try {
    const courses = await queryAllNeon('SELECT id, title, slug, price, category, level, is_published FROM courses ORDER BY price ASC');
    res.json({
      source: 'Neon Cloud PostgreSQL (production branch)',
      count: courses.length,
      courses
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Routes
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/study', userStudyRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api', couponRoutes); // Exposes /api/admin/coupons
app.use('/api', paymentRoutes); // Exposes POST /api/create-order and POST /api/verify-payment directly

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

export default app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Codificators LMS API Server running on http://127.0.0.1:${PORT}`);
  });
}
