import fs from 'fs';
import path from 'path';
import { scanCoursePdfBuffer } from '../server/services/pdfCourseScanner.js';

// Construct a valid binary PDF with text streams
function createPdfBuffer(lines) {
  let streamContent = 'BT\n/F1 10 Tf\n72 720 Td\n14 TL\n';
  lines.forEach((line, idx) => {
    // Escape parens and backslashes
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    if (idx === 0) {
      streamContent += `(${escaped}) Tj\n`;
    } else {
      streamContent += `T* (${escaped}) Tj\n`;
    }
  });
  streamContent += 'ET\n';

  const streamLen = Buffer.byteLength(streamContent, 'utf-8');

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  // obj 1: Catalog
  offsets.push(Buffer.byteLength(pdf, 'ascii'));
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // obj 2: Pages
  offsets.push(Buffer.byteLength(pdf, 'ascii'));
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  // obj 3: Page
  offsets.push(Buffer.byteLength(pdf, 'ascii'));
  pdf += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n';

  // obj 4: Font
  offsets.push(Buffer.byteLength(pdf, 'ascii'));
  pdf += '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  // obj 5: Stream
  offsets.push(Buffer.byteLength(pdf, 'ascii'));
  pdf += `5 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}endstream\nendobj\n`;

  // xref
  const startXref = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  offsets.forEach(off => {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(pdf, 'ascii');
}

async function testPdfEndToEnd() {
  console.log('--- Generating Structured Curriculum PDF ---');
  const lines = [
    'Course Title: Cloud Native DevOps and Kubernetes Orchestration',
    'Category: DevOps',
    'Level: Intermediate to Advanced',
    'Duration: 50 hours',
    'Course Description:',
    'A production-grade curriculum preparing cloud engineers for containerized workflows, CI/CD pipelines, and microservices.',
    'Learning Objectives:',
    '- Deploy containerized workloads with Docker and Kubernetes',
    '- Implement GitOps deployment strategies with ArgoCD',
    '- Monitor distributed microservices with Prometheus and Grafana',
    'Prerequisites:',
    '- Basic Linux CLI familiarity',
    'Module 1: Container Foundations with Docker',
    'Lesson 1: Multi-stage Docker Builds',
    'Format: TEXT',
    'Duration: 20 mins',
    'Lesson 2: Docker Networking and Volume Mounts',
    'Format: CODE',
    'Duration: 30 mins',
    'Module 2: Kubernetes Cluster Architecture',
    'Lesson 1: Pods, Deployments and ReplicaSets',
    'Format: TEXT',
    'Duration: 25 mins',
    'Lesson 2: Ingress Controllers and Services',
    'Format: CODE',
    'Duration: 35 mins'
  ];

  const pdfBuf = createPdfBuffer(lines);
  const pdfPath = path.resolve('tests/sample_syllabus.pdf');
  fs.writeFileSync(pdfPath, pdfBuf);
  console.log(`Saved sample PDF to: ${pdfPath} (${pdfBuf.length} bytes)`);

  console.log('\n--- Scanning PDF via scanCoursePdfBuffer ---');
  const scanResult = await scanCoursePdfBuffer(pdfBuf);
  console.log('Result Status:', scanResult.status);
  console.log('Quality Score:', scanResult.score + '%');
  console.log('Title:', scanResult.extractedCourse?.title);
  console.log('Category:', scanResult.extractedCourse?.category);
  console.log('Modules Count:', scanResult.extractedCourse?.modules?.length);
  console.log('Lessons Count:', scanResult.extractedCourse?.modules?.reduce((a, m) => a + m.lessons.length, 0));
  console.log('Criteria:');
  scanResult.criteria.forEach(c => {
    console.log(` - ${c.label}: ${c.passed ? 'PASSED' : 'FAILED'} -> ${c.found}`);
  });
}

testPdfEndToEnd().catch(console.error);
