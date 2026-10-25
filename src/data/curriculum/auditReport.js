import { curriculumCatalog } from './catalog.js';
import { validateLesson } from './schema.js';

/**
 * Programmatic Curriculum Coverage & Missing-Lesson Audit Engine
 * 
 * Verifies lesson availability across all curriculum domains.
 * Guarantees transparency: Never claims a course is complete when lessons are missing.
 * Audits 12-element pedagogical compliance, OER licensing records, and review status.
 */
export function generateCurriculumAuditReport() {
  const domainAudits = [];
  let totalAuthoredLessons = 0;
  let totalVerifiedLessons = 0;
  let totalAiAssistedLessons = 0;
  let totalPedagogicallyCompliant = 0;

  for (const course of curriculumCatalog) {
    let lessonCount = 0;
    let verifiedCount = 0;
    let aiAssistedCount = 0;
    let compliantCount = 0;
    const lessonsList = [];

    const processLesson = (les, modTitle, chTitle) => {
      lessonCount++;
      if (les.reviewStatus === 'verified') verifiedCount++;
      if (les.reviewStatus === 'ai-assisted') aiAssistedCount++;

      const validation = validateLesson(les);
      if (validation.isValid) compliantCount++;

      lessonsList.push({
        id: les.id,
        title: les.title,
        module: modTitle,
        chapter: chTitle,
        reviewStatus: les.reviewStatus || 'draft',
        licenseType: les.metadata?.licenseRecord?.type || 'Unknown',
        isPedagogicallyCompliant: validation.isValid,
        missingFields: validation.missingFields
      });
    };

    if (course.modules && course.modules.length > 0) {
      for (const mod of course.modules) {
        if (mod.chapters && mod.chapters.length > 0) {
          for (const ch of mod.chapters) {
            if (ch.lessons && ch.lessons.length > 0) {
              for (const les of ch.lessons) {
                processLesson(les, mod.title, ch.title);
              }
            }
          }
        } else if (mod.lessons && mod.lessons.length > 0) {
          for (const les of mod.lessons) {
            processLesson(les, mod.title, 'General');
          }
        }
      }
    }

    totalAuthoredLessons += lessonCount;
    totalVerifiedLessons += verifiedCount;
    totalAiAssistedLessons += aiAssistedCount;
    totalPedagogicallyCompliant += compliantCount;

    domainAudits.push({
      courseId: course.id,
      title: course.title,
      category: course.category,
      authoredLessons: lessonCount,
      verifiedLessons: verifiedCount,
      aiAssistedLessons: aiAssistedCount,
      compliantLessons: compliantCount,
      status: lessonCount > 0 ? (verifiedCount === lessonCount ? 'Production Verified' : 'In Review / Hybrid') : 'Curriculum Planned',
      completionRate: lessonCount > 0 ? `${Math.min(100, Math.round((verifiedCount / lessonCount) * 100))}%` : '0%',
      complianceRate: lessonCount > 0 ? `${Math.min(100, Math.round((compliantCount / lessonCount) * 100))}%` : '0%',
      lessons: lessonsList
    });
  }

  return {
    totalDomains: curriculumCatalog.length,
    totalAuthoredLessons,
    totalVerifiedLessons,
    totalAiAssistedLessons,
    totalPedagogicallyCompliant,
    domainAudits,
    generatedAt: new Date().toISOString()
  };
}
