import express from 'express';
import { queryAll, queryOne, runQuery } from '../db/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// -----------------------------------------------------------------------------
// 1. LESSON BOOKMARKS
// -----------------------------------------------------------------------------

// List all bookmarked lessons for the current student
router.get('/bookmarks', requireAuth, (req, res) => {
  const { courseId } = req.query;
  const userId = req.user.id;

  let query = `
    SELECT b.id, b.course_id, b.lesson_id, b.created_at,
           l.title as lesson_title, l.reading_time_minutes, l.order_index as lesson_order,
           m.title as module_title, m.order_index as module_order,
           c.title as course_title, c.slug as course_slug
    FROM lesson_bookmarks b
    JOIN lessons l ON b.lesson_id = l.id
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON b.course_id = c.id
    WHERE b.user_id = ?
  `;
  const params = [userId];

  if (courseId) {
    query += ' AND b.course_id = ?';
    params.push(courseId);
  }

  query += ' ORDER BY b.created_at DESC';

  const bookmarks = queryAll(query, params);
  res.json({ bookmarks });
});

// Toggle bookmark for a lesson (add if absent, remove if present)
router.post('/bookmarks', requireAuth, (req, res) => {
  let { courseId, lessonId } = req.body;
  const userId = req.user.id;

  if (!lessonId) {
    return res.status(400).json({ error: 'lessonId is required.' });
  }

  if (!courseId) {
    const les = queryOne('SELECT m.course_id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE l.id = ?', [lessonId]);
    if (les) courseId = les.course_id;
  }

  if (!courseId) {
    return res.status(400).json({ error: 'courseId could not be resolved for this lesson.' });
  }

  const existing = queryOne(
    'SELECT id FROM lesson_bookmarks WHERE user_id = ? AND lesson_id = ?',
    [userId, lessonId]
  );

  if (existing) {
    runQuery('DELETE FROM lesson_bookmarks WHERE id = ?', [existing.id]);
    return res.json({ isBookmarked: false, bookmarked: false, message: 'Bookmark removed' });
  } else {
    const id = `bmk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    runQuery(
      `INSERT INTO lesson_bookmarks (id, user_id, course_id, lesson_id, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, userId, courseId, lessonId]
    );
    return res.json({ isBookmarked: true, bookmarked: true, id, message: 'Lesson bookmarked' });
  }
});

// Check if a specific lesson is bookmarked (supports both URL patterns)
router.get(['/bookmarks/:lessonId/status', '/bookmarks/status/:lessonId'], requireAuth, (req, res) => {
  const { lessonId } = req.params;
  const userId = req.user.id;

  const existing = queryOne(
    'SELECT id FROM lesson_bookmarks WHERE user_id = ? AND lesson_id = ?',
    [userId, lessonId]
  );

  res.json({ isBookmarked: Boolean(existing) });
});

// Remove bookmark by lesson ID
router.delete('/bookmarks/:lessonId', requireAuth, (req, res) => {
  const { lessonId } = req.params;
  const userId = req.user.id;

  runQuery(
    'DELETE FROM lesson_bookmarks WHERE user_id = ? AND lesson_id = ?',
    [userId, lessonId]
  );

  res.json({ success: true, message: 'Bookmark removed' });
});

// -----------------------------------------------------------------------------
// 2. PERSONAL STUDY NOTES
// -----------------------------------------------------------------------------

// Get personal study notes for a specific lesson
router.get(['/notes/:lessonId', '/notes/lesson/:lessonId'], requireAuth, (req, res) => {
  const { lessonId } = req.params;
  const userId = req.user.id;

  const note = queryOne(
    `SELECT id, user_id, course_id, lesson_id, note_text, created_at, updated_at
     FROM lesson_notes
     WHERE user_id = ? AND lesson_id = ?`,
    [userId, lessonId]
  );

  res.json({ note: note ? { ...note, content: note.note_text } : null });
});

// Save or autosave study notes for a lesson
router.put(['/notes/:lessonId', '/notes/lesson/:lessonId'], requireAuth, (req, res) => {
  const { lessonId } = req.params;
  let { courseId, noteText, content } = req.body;
  const text = typeof noteText === 'string' ? noteText : typeof content === 'string' ? content : null;
  const userId = req.user.id;

  if (text === null) {
    return res.status(400).json({ error: 'noteText or content string is required.' });
  }

  if (!courseId) {
    const les = queryOne('SELECT m.course_id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE l.id = ?', [lessonId]);
    if (les) courseId = les.course_id;
  }

  if (!courseId) {
    return res.status(400).json({ error: 'courseId could not be resolved for this lesson.' });
  }

  const existing = queryOne(
    'SELECT id FROM lesson_notes WHERE user_id = ? AND lesson_id = ?',
    [userId, lessonId]
  );

  if (existing) {
    runQuery(
      `UPDATE lesson_notes
       SET note_text = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [text, existing.id]
    );
    const updated = queryOne('SELECT * FROM lesson_notes WHERE id = ?', [existing.id]);
    return res.json({ success: true, note: { ...updated, content: updated.note_text } });
  } else {
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    runQuery(
      `INSERT INTO lesson_notes (id, user_id, course_id, lesson_id, note_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, userId, courseId, lessonId, text]
    );
    const created = queryOne('SELECT * FROM lesson_notes WHERE id = ?', [id]);
    return res.status(201).json({ success: true, note: { ...created, content: created.note_text } });
  }
});

// List all study notes for a student (across a course or all courses)
router.get('/notes', requireAuth, (req, res) => {
  const { courseId } = req.query;
  const userId = req.user.id;

  let query = `
    SELECT n.id, n.course_id, n.lesson_id, n.note_text, n.created_at, n.updated_at,
           l.title as lesson_title, l.order_index as lesson_order,
           m.title as module_title,
           c.title as course_title
    FROM lesson_notes n
    JOIN lessons l ON n.lesson_id = l.id
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON n.course_id = c.id
    WHERE n.user_id = ?
  `;
  const params = [userId];

  if (courseId) {
    query += ' AND n.course_id = ?';
    params.push(courseId);
  }

  query += ' ORDER BY n.updated_at DESC';

  const notes = queryAll(query, params);
  res.json({ notes });
});

// Delete a personal study note
router.delete('/notes/:lessonId', requireAuth, (req, res) => {
  const { lessonId } = req.params;
  const userId = req.user.id;

  runQuery(
    'DELETE FROM lesson_notes WHERE user_id = ? AND lesson_id = ?',
    [userId, lessonId]
  );

  res.json({ success: true, message: 'Note deleted' });
});

export default router;
