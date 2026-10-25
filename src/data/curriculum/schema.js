/**
 * Pedagogical Lesson Schema & Contract
 * 
 * Enforces the 12-element pedagogical format for every lesson in Codificator:
 * 1. Learning Objectives
 * 2. Prerequisites
 * 3. Detailed Explanations
 * 4. Definitions and Key Concepts
 * 5. Step-by-Step Worked Examples
 * 6. Production Code Snippets
 * 7. Common Mistakes and Corrections
 * 8. Diagrams or Tables
 * 9. Practice Exercises (with unit test evaluations)
 * 10. Checkpoint Quiz (with explanations)
 * 11. Chapter Summary and Revision Notes
 * 12. Further Reading & Verified License Provenance
 */

export function validateLesson(lesson) {
  const missingFields = [];
  if (!lesson.id) missingFields.push('id');
  if (!lesson.title) missingFields.push('title');
  if (!lesson.objectives || !lesson.objectives.length) missingFields.push('objectives');
  if (!lesson.prerequisites) missingFields.push('prerequisites');
  if (!lesson.explanation) missingFields.push('explanation');
  if (!lesson.keyConcepts || !lesson.keyConcepts.length) missingFields.push('keyConcepts');
  if (!lesson.workedExamples || !lesson.workedExamples.length) missingFields.push('workedExamples');
  if (!lesson.codeSnippets || !lesson.codeSnippets.length) missingFields.push('codeSnippets');
  if (!lesson.pitfalls || !lesson.pitfalls.length) missingFields.push('pitfalls');
  if (!lesson.visualAids || !lesson.visualAids.length) missingFields.push('visualAids');
  if (!lesson.exercises || !lesson.exercises.length) missingFields.push('exercises');
  if (!lesson.quiz || !lesson.quiz.length) missingFields.push('quiz');
  if (!lesson.summary || !lesson.summary.takeaways) missingFields.push('summary');
  if (!lesson.metadata || !lesson.metadata.licenseRecord) missingFields.push('metadata.licenseRecord');

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

export const REVIEW_STATUS = {
  DRAFT: 'draft',
  AI_ASSISTED: 'ai-assisted',
  PEER_REVIEWED: 'peer-reviewed',
  VERIFIED: 'verified'
};
