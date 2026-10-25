import React, { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Layers,
  Clock,
  Code2,
  FileCode,
  Video,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  Info,
  FolderOpen,
  Link2,
  Globe,
  Award
} from 'lucide-react';
import { lmsApi } from '../../api/lmsApi';
import './pdfCourseUploadModal.css';

export default function PdfCourseUploadModal({ isOpen, onClose, onCourseImported }) {
  const [activeTab, setActiveTab] = useState('googledoc'); // 'googledoc' | 'upload' | 'text' | 'guidelines'
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [coursePrice, setCoursePrice] = useState(499);
  const [courseOriginalPrice, setCourseOriginalPrice] = useState(999);
  const [isFormattingCohort, setIsFormattingCohort] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});
  const [guidelinesData, setGuidelinesData] = useState(null);

  // Certification Quiz state (75% passing percentage required for certificate)
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizRawText, setQuizRawText] = useState(`Question 1: What does CSS stand for?
A) Computer Style Sheets
*B) Cascading Style Sheets
C) Creative Style Systems
D) Colorful Style Sheets
Explanation: CSS stands for Cascading Style Sheets.

Question 2: Which keyword defines an immutable variable in modern JavaScript?
*A) const
B) let
C) var
D) static
Explanation: const declares block-scoped constants that cannot be reassigned.

Question 3: Which HTTP method is standard for creating a new resource?
A) GET
*B) POST
C) DELETE
D) HEAD
Explanation: POST is standard for resource creation.

Question 4: In relational databases, what key uniquely identifies each record in a table?
*A) Primary Key
B) Foreign Key
C) Index Key
D) Composite Key
Explanation: A Primary Key uniquely identifies every row in a table.`);
  const [quizFile, setQuizFile] = useState(null);
  const [isQuizConfigExpanded, setIsQuizConfigExpanded] = useState(true);

  // Load guidelines template on mount
  useEffect(() => {
    if (isOpen) {
      lmsApi.getSyllabusGuidelines()
        .then(res => {
          if (res?.guidelines) setGuidelinesData(res.guidelines);
        })
        .catch(err => console.error('Failed to load syllabus guidelines', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Only PDF files are supported for document upload.');
        return;
      }
      setFile(selected);
      setErrorMessage('');
      setScanResult(null);
      setSuccessMessage('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type !== 'application/pdf' && !droppedFile.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Only PDF documents (.pdf) are accepted.');
        return;
      }
      setFile(droppedFile);
      setErrorMessage('');
      setScanResult(null);
      setSuccessMessage('');
    }
  };

  const readFileAsBase64 = (fileObj) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileObj);
    });
  };

  const handleFetchGoogleDoc = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!googleDocUrl.trim()) {
      setErrorMessage('Please enter a Google Docs link.');
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    try {
      const res = await lmsApi.fetchGoogleDocCourse(googleDocUrl.trim());
      if (res?.scanResult) {
        setScanResult(res.scanResult);
        const ext = res.scanResult.extractedCourse;
        if (ext) {
          if (ext.price !== undefined && ext.price !== null) {
            setCoursePrice(ext.price);
          }
          if (ext.original_price !== undefined && ext.original_price !== null && ext.original_price > 0) {
            setCourseOriginalPrice(ext.original_price);
          } else if (ext.price) {
            setCourseOriginalPrice(Math.round(ext.price * 1.5));
          }
        }
        if (res.scanResult.extractedCourse?.modules?.length > 0) {
          setExpandedModules({ 0: true });
        }
      } else {
        setErrorMessage(res?.error || 'Failed to fetch course from Google Docs.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Error fetching Google Doc course.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleScan = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsScanning(true);
    setScanResult(null);

    try {
      let payload = {};
      if (activeTab === 'upload') {
        if (!file) {
          setErrorMessage('Please select or drag a PDF file to scan.');
          setIsScanning(false);
          return;
        }
        const base64Data = await readFileAsBase64(file);
        payload = {
          pdfBase64: base64Data,
          fileName: file.name
        };
      } else {
        if (!rawText.trim() || rawText.trim().length < 40) {
          setErrorMessage('Please enter at least 40 characters of syllabus content.');
          setIsScanning(false);
          return;
        }
        payload = {
          rawText: rawText.trim(),
          fileName: 'Pasted_Syllabus.txt'
        };
      }

      const res = await lmsApi.scanCoursePdf(payload);
      if (res?.scanResult) {
        setScanResult(res.scanResult);
        const ext = res.scanResult.extractedCourse;
        if (ext) {
          if (ext.price !== undefined && ext.price !== null) {
            setCoursePrice(ext.price);
          }
          if (ext.original_price !== undefined && ext.original_price !== null && ext.original_price > 0) {
            setCourseOriginalPrice(ext.original_price);
          } else if (ext.price) {
            setCourseOriginalPrice(Math.round(ext.price * 1.5));
          }
        }
        // Expand first module by default
        if (res.scanResult.extractedCourse?.modules?.length > 0) {
          setExpandedModules({ 0: true });
        }
      } else {
        setErrorMessage(res?.error || 'Failed to scan syllabus.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred while scanning the syllabus.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConvertTo4Weeks = async () => {
    if (!scanResult?.extractedCourse) return;
    setIsFormattingCohort(true);
    setErrorMessage('');
    try {
      const res = await lmsApi.formatCurriculumAsCohort(scanResult.extractedCourse);
      if (res?.scanResult) {
        setScanResult(res.scanResult);
        setExpandedModules({ 0: true });
      }
    } catch (err) {
      console.error('Failed to format as 4 weeks', err);
      setErrorMessage('Could not format into 4-week structure: ' + err.message);
    } finally {
      setIsFormattingCohort(false);
    }
  };

  const handleImport = async () => {
    if (!scanResult || scanResult.status !== 'APPROVED' || !scanResult.extractedCourse) {
      setErrorMessage('Only approved courses can be imported.');
      return;
    }

    setIsImporting(true);
    setErrorMessage('');
    try {
      // Merge customized user pricing before final import
      const courseToImport = {
        ...scanResult.extractedCourse,
        price: Number(coursePrice) || 0,
        original_price: Number(courseOriginalPrice) || 0
      };

      // Attach Certification Quiz if enabled (75% passing percentage required for certificate)
      if (includeQuiz) {
        courseToImport.certificationQuiz = {
          title: quizTitle.trim() || `${courseToImport.title} - Final Certification Assessment`,
          passingPercentage: 75.0, // Strictly 75% required
          rawQuizText: quizRawText,
          description: 'Mandatory certification assessment. You must score 75% or higher to unlock and earn your verified certificate of completion.'
        };
      }

      const res = await lmsApi.importScannedCourse({
        course: courseToImport,
        publishImmediately
      });

      if (res?.success) {
        setSuccessMessage(`Success! Course "${res.course?.title || scanResult.extractedCourse.title}" was imported at ₹${courseToImport.price} (M.R.P. ₹${courseToImport.original_price})${includeQuiz ? ' with 75% Certification Quiz enabled' : ''}.`);
        if (onCourseImported) {
          onCourseImported(res.course || { id: res.courseId });
        }
      } else {
        setErrorMessage(res?.error || 'Failed to import course.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Error occurred while importing the course.');
    } finally {
      setIsImporting(false);
    }
  };

  const parseClientQuizText = (text) => {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split('\n');
    const questions = [];
    let currentQuestion = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const qMatch = line.match(/^(?:Question|Q)\s*\d*[:.-]\s*(.+)/i) || line.match(/^\d+[.)]\s+(.+)/i);
      if (qMatch) {
        if (currentQuestion && currentQuestion.prompt && currentQuestion.options.length > 0) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          prompt: qMatch[1].trim(),
          explanation: '',
          options: []
        };
        continue;
      }

      if (currentQuestion) {
        const expMatch = line.match(/^(?:Explanation|Reason|Note)\s*[:=-]\s*(.+)/i);
        if (expMatch) {
          currentQuestion.explanation = expMatch[1].trim();
          continue;
        }

        const optMatch = line.match(/^([*]?)\s*([A-Ea-e1-5])[.)]\s*(.+)$/) || line.match(/^([*])\s+(.+)$/);
        if (optMatch) {
          let isCorrect = Boolean(optMatch[1]);
          let optText = optMatch.length === 4 ? optMatch[3].trim() : optMatch[2].trim();
          if (/\((?:correct|true)\)$/i.test(optText)) {
            isCorrect = true;
            optText = optText.replace(/\((?:correct|true)\)$/i, '').trim();
          }
          currentQuestion.options.push({
            text: optText,
            is_correct: isCorrect
          });
          continue;
        }
      }
    }

    if (currentQuestion && currentQuestion.prompt && currentQuestion.options.length > 0) {
      questions.push(currentQuestion);
    }

    return questions.map(q => {
      const hasCorrect = q.options.some(o => o.is_correct);
      if (!hasCorrect && q.options.length > 0) {
        q.options[0].is_correct = true;
      }
      return q;
    });
  };

  const handleQuizFileUpload = (e) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    setQuizFile(uploaded);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      if (typeof text === 'string') {
        setQuizRawText(text);
      }
    };
    reader.readAsText(uploaded);
  };

  const copySampleTemplate = () => {
    const templateText = guidelinesData?.template || `Course Title: Master Full-Stack Web Development 2026
Category: Web Development
Level: Beginner to Intermediate
Duration: 45 hours
Price: 499

Course Description:
An end-to-end, hands-on immersive curriculum designed to transform beginners into production-ready full-stack software engineers. Covers modern JavaScript, React 19, Node.js, REST APIs, databases, authentication, and cloud deployment with live code exercises.

Learning Objectives:
- Master modern ES6+ JavaScript concepts and asynchronous programming
- Build reactive, scalable frontend web interfaces with React and Tailwind
- Develop robust, secure RESTful API backends with Node.js and Express
- Design relational database schemas and perform optimized queries with SQLite & PostgreSQL
- Deploy production web applications to cloud infrastructures with CI/CD

Prerequisites:
- Basic computer proficiency and modern web browser
- No prior programming experience required

Module 1: Foundations of Modern Web Development
Module Overview: Deep dive into the fundamentals of web architecture, HTML5 semantics, CSS3 layouts, and core JavaScript.

Lesson 1: Introduction to Web Architecture & HTTP Protocols
Format: TEXT
Duration: 15 mins
Content:
The web operates on client-server protocols using HTTP/HTTPS request and response lifecycles. In this lesson, we break down DNS lookups, TCP handshakes, TLS encryption, and how browsers parse HTML, CSS, and JS into DOM trees.

Lesson 2: Modern JavaScript Fundamentals & Async Operations
Format: CODE
Duration: 25 mins
Content:
Explore ES6 features including destructuring, spread operators, arrow functions, promises, and async/await syntax. Complete the inline code exercises to manipulate JSON objects and handle API network failures gracefully.

Module 2: Server-Side Architecture with Node & Express
Module Overview: Architecting scalable REST APIs with Express, middleware, routing, and error-handling pipelines.

Lesson 1: Building Modular RESTful APIs
Format: TEXT
Duration: 20 mins
Content:
Understand CRUD API design principles, status codes (200, 201, 400, 401, 403, 404, 500), input validation, and route structuring for maintainable production backends.

Lesson 2: Database Schema Design & SQL Queries
Format: CODE
Duration: 30 mins
Content:
Design normalized database schemas, create foreign key relationships, and write efficient transactional queries.`;

    if (fillInput) {
      setRawText(templateText);
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(templateText).catch(() => {});
    }
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const toggleModule = (idx) => {
    setExpandedModules(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const renderLessonTypeBadge = (type) => {
    switch (type) {
      case 'CODE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Code2 className="w-3 h-3" /> Code Lab
          </span>
        );
      case 'VIDEO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Video className="w-3 h-3" /> Video
          </span>
        );
      case 'PDF':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileCode className="w-3 h-3" /> PDF Doc
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FileText className="w-3 h-3" /> Text Article
          </span>
        );
    }
  };

  return (
    <div className="pdf-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="pdf-modal-dialog relative w-full max-w-4xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800/60 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Upload Course Syllabus via PDF
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI & Pattern Verification
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Scan your curriculum PDF against academic criteria. Approved courses can be imported directly into LMS in 1-click.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-800/80 bg-slate-900/50 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('googledoc')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'googledoc'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Import from Google Docs Link
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Upload PDF Document
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'text'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Paste Syllabus Text
          </button>
          <button
            onClick={() => setActiveTab('guidelines')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'guidelines'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Structure Guidelines & Sample
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              <div className="flex-1">
                <p className="font-semibold text-rose-200">Validation Notice</p>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-200">Course Imported Successfully</p>
                <p className="mt-0.5 leading-relaxed">{successMessage}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors"
                  >
                    View Courses Catalog
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 0: Import from Google Docs */}
          {activeTab === 'googledoc' && !successMessage && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Import Course from Google Docs Link</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Paste your Google Docs document URL. Our system automatically extracts all 4-Week modules, Day-wise lessons, objectives, code examples, and hands-on exercises directly into the LMS.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                    <span>Google Docs URL:</span>
                    <span className="text-[11px] text-slate-400">Share settings: Anyone with link can view</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={googleDocUrl}
                      onChange={(e) => setGoogleDocUrl(e.target.value)}
                      placeholder="https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                      className="flex-1 rounded-xl bg-slate-950/70 border border-slate-700/80 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      disabled={!googleDocUrl.trim() || isScanning}
                      onClick={handleFetchGoogleDoc}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all shrink-0 ${
                        !googleDocUrl.trim() || isScanning
                          ? 'bg-slate-700/60 opacity-50 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20 active:scale-95'
                      }`}
                    >
                      {isScanning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Importing & Parsing Doc...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Import Course
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Helpful instructions for Google Docs */}
                <div className="pt-2 border-t border-indigo-500/20 text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
                    <Info className="w-3.5 h-3.5" />
                    How to prepare your Google Doc:
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11.5px] text-slate-400">
                    <li>In Google Docs, click the blue <strong>Share</strong> button at top right.</li>
                    <li>Under General access, switch from Restricted to <strong>"Anyone with the link"</strong> with Viewer permissions.</li>
                    <li>Structure your doc with <strong>WEEK 1</strong> .. <strong>WEEK 4</strong> headers and <strong>Day 1</strong> .. <strong>Day 7</strong> lesson titles.</li>
                    <li>If your document is private to your company/school domain, you can also paste the text directly in the <strong>Paste Syllabus Text</strong> tab.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Upload PDF */}
          {activeTab === 'upload' && !successMessage && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  file
                    ? 'border-indigo-500/80 bg-indigo-500/5'
                    : 'border-slate-700/80 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 mb-4 shadow-inner">
                  {file ? <FileText className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
                </div>

                {file ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Ready for scanning
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-3">
                      <label className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer underline">
                        Replace File
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        onClick={() => { setFile(null); setScanResult(null); }}
                        className="text-xs text-slate-400 hover:text-rose-400 underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-200">
                      Drag & Drop your syllabus PDF here, or{' '}
                      <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer underline">
                        Browse Computer
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </p>
                    <p className="text-xs text-slate-500">
                      PDF files up to 50MB with structured Course Title, Modules, and Lessons.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  PDF will be validated against 6 structural and academic criteria.
                </div>
                <button
                  disabled={!file || isScanning}
                  onClick={handleScan}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
                    !file || isScanning
                      ? 'bg-slate-700/60 opacity-50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20 active:scale-95'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Scanning & Verifying PDF...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Scan & Evaluate Syllabus
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Paste Syllabus Text */}
          {activeTab === 'text' && !successMessage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Directly paste syllabus text if your PDF is in draft or plain text format:</span>
                <button
                  type="button"
                  onClick={() => copySampleTemplate(true)}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  {copiedTemplate ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedTemplate ? 'Copied Template!' : 'Paste Sample Template'}
                </button>
              </div>
              <textarea
                rows={12}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Course Title: Master Full-Stack Web Development&#10;Category: Web Development&#10;Level: Intermediate&#10;Duration: 40 hours&#10;&#10;Course Description:&#10;A comprehensive program covering...&#10;&#10;Learning Objectives:&#10;- Master frontend and backend technologies&#10;- Build REST APIs&#10;&#10;Module 1: Getting Started&#10;Lesson 1: Intro to HTTP&#10;Format: TEXT&#10;Duration: 15 mins"
                className="w-full rounded-xl bg-slate-950/70 border border-slate-700/80 p-4 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-y"
              />
              <div className="flex justify-end">
                <button
                  disabled={!rawText.trim() || isScanning}
                  onClick={handleScan}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
                    !rawText.trim() || isScanning
                      ? 'bg-slate-700/60 opacity-50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20 active:scale-95'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Scanning Content...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Scan & Evaluate Content
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Syllabus Guidelines & Standard Structure */}
          {activeTab === 'guidelines' && (
            <div className="space-y-5 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Info className="w-4 h-4 text-indigo-400" />
                    Expected PDF Syllabus Format & Criteria
                  </div>
                  <button
                    onClick={copySampleTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 transition-colors font-medium"
                  >
                    {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedTemplate ? 'Copied Template!' : 'Copy Reference Template'}
                  </button>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Our PDF scanner evaluates your document across 6 curriculum standards. Your PDF must include:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-indigo-300">1. Course Title & Identity:</span>
                    <p className="text-slate-400 mt-1">Clear heading labeled "Course Title: [Name]". Minimum 5 characters.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-indigo-300">2. Course Overview & Description:</span>
                    <p className="text-slate-400 mt-1">Section with at least 50 characters explaining course outcomes.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-indigo-300">3. Category & Skill Level:</span>
                    <p className="text-slate-400 mt-1">e.g. Category: Web Development | Level: Beginner to Intermediate.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-indigo-300">4. Learning Objectives:</span>
                    <p className="text-slate-400 mt-1">At least 2 bulleted objectives detailing concrete competencies.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-indigo-300">5. Structured Modules:</span>
                    <p className="text-slate-400 mt-1">Minimum 2 organized modules (e.g., Module 1:..., Unit 2:...).</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-indigo-300">6. Lesson Distribution:</span>
                    <p className="text-slate-400 mt-1">At least 2 lessons across the course with Format (TEXT/CODE/VIDEO/PDF).</p>
                  </div>
                </div>
              </div>

              {/* Sample Template Code Box */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-200">Reference Syllabus Template:</span>
                <pre className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed max-h-60">
{guidelinesData?.template || `Course Title: Modern Computer Science & Software Engineering
Category: Computer Science
Level: Beginner to Intermediate
Duration: 40 hours

Course Description:
A comprehensive, industry-aligned foundational course in computer science. Students master algorithms, data structures, systems architecture, and production software patterns.

Learning Objectives:
- Implement key algorithmic patterns and analyze complexity
- Build robust, modular applications following clean code practices
- Understand operating systems, network protocols, and storage

Prerequisites:
- Basic mathematical logic

Module 1: Foundations of Algorithms
Module Overview: Computational complexity and fundamental data structures.

Lesson 1: Time & Space Complexity Big-O
Format: TEXT
Duration: 15 mins
Content:
Introduction to Big-O, asymptotic notation, and empirical benchmarking.

Lesson 2: Dynamic Arrays & Linked Lists
Format: CODE
Duration: 30 mins
Content:
Hands-on memory layout comparison and implementing linked structures.

Module 2: Web Systems & Protocols
Module Overview: Architecture of distributed web services.

Lesson 1: TCP, HTTP, and REST APIs
Format: TEXT
Duration: 20 mins
Content:
Protocol handshakes, HTTP methods, headers, and idempotent operations.`}
                </pre>
              </div>
            </div>
          )}

          {/* Scan Results Section (shown when scanResult is present) */}
          {scanResult && !successMessage && (
            <div className="space-y-6 pt-2 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-2">
              
              {/* Status Header Badge */}
              <div
                className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  scanResult.status === 'APPROVED'
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-rose-950/30 border-rose-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                      scanResult.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {scanResult.status === 'APPROVED' ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <XCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          scanResult.status === 'APPROVED'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {scanResult.status}
                      </span>
                      <span className="text-sm font-bold text-white">
                        Curriculum Quality Score: {scanResult.score}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {scanResult.status === 'APPROVED'
                        ? 'This syllabus meets all academic criteria and is ready for 1-click import into the LMS.'
                        : 'This syllabus did not meet the required threshold (70% minimum score). Review the reasons and improvement tips below.'}
                    </p>
                  </div>
                </div>

                {/* Import CTA if APPROVED */}
                {scanResult.status === 'APPROVED' && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={publishImmediately}
                        onChange={(e) => setPublishImmediately(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Publish immediately</span>
                    </label>
                    <button
                      disabled={isImporting}
                      onClick={handleImport}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Importing Course Structure...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4" />
                          Import Course into LMS (1-Click)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* REJECTION REASONS & HOW TO FIX (if REJECTED) */}
              {scanResult.status === 'REJECTED' && (
                <div className="space-y-4">
                  {/* Critical Reasons */}
                  {Array.isArray(scanResult.reasons) && scanResult.reasons.length > 0 && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        Specific Rejection Reasons:
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-xs text-rose-200/90 pl-1">
                        {scanResult.reasons.map((reason, rIdx) => (
                          <li key={rIdx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actionable Improvement Tips */}
                  {Array.isArray(scanResult.improvementTips) && scanResult.improvementTips.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Actionable Steps to Improve & Approve Your Syllabus:
                      </div>
                      <ul className="space-y-1.5 text-xs text-amber-200/90">
                        {scanResult.improvementTips.map((tip, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold shrink-0">{tIdx + 1}.</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="pt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveTab('guidelines')}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs transition-colors border border-amber-500/30"
                        >
                          View Syllabus Guidelines
                        </button>
                        <button
                          type="button"
                          onClick={copySampleTemplate}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700"
                        >
                          {copiedTemplate ? 'Copied Template!' : 'Copy Reference Template'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 6 Criteria Checklist Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Curriculum Evaluation Checklist (6 Standards)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(Array.isArray(scanResult.criteria) ? scanResult.criteria : Object.values(scanResult.criteria || {})).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        item.passed
                          ? 'bg-slate-900/60 border-emerald-500/30'
                          : 'bg-slate-900/60 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {item.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <p className={`font-semibold ${item.passed ? 'text-slate-200' : 'text-rose-200'}`}>
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {item.found}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.passed
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {item.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extracted Course Structure Preview */}
              {scanResult.extractedCourse && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Extracted Course Structure Preview
                    </h3>
                    <span className="text-xs text-indigo-400 font-medium">
                      {scanResult.extractedCourse.modules?.length || 0} Modules •{' '}
                      {scanResult.extractedCourse.modules?.reduce(
                        (acc, m) => acc + (m.lessons?.length || 0),
                        0
                      ) || 0}{' '}
                      Lessons
                    </span>
                  </div>

                  {/* Course Metadata Card */}
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-base font-bold text-white">
                        {scanResult.extractedCourse.title || 'Untitled Course'}
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium">
                          {scanResult.extractedCourse.category || 'Computer Science'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-medium">
                          {scanResult.extractedCourse.level || 'Beginner to Intermediate'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {scanResult.extractedCourse.estimated_duration || '40 hours'}
                        </span>
                      </div>
                    </div>

                    {scanResult.extractedCourse.description && (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {scanResult.extractedCourse.description}
                      </p>
                    )}

                    {/* Learning Objectives Pills */}
                    {Array.isArray(scanResult.extractedCourse.learning_objectives) &&
                      scanResult.extractedCourse.learning_objectives.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            Learning Objectives:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {scanResult.extractedCourse.learning_objectives.map((obj, oIdx) => (
                              <span
                                key={oIdx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-[11px] border border-slate-700/60"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                {obj}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Course Pricing, Cost & 4-Week Structure Controls */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                            Course Pricing & 4-Week Cohort Structure
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Cohort Config
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Configure student checkout price, original cost (M.R.P.), and ensure curriculum aligns to a 4-week cohort.
                        </p>
                      </div>

                      {/* Convert to 4-Week Cohort Button */}
                      <button
                        type="button"
                        onClick={handleConvertTo4Weeks}
                        disabled={isFormattingCohort || (scanResult.extractedCourse.modules?.length === 4 && scanResult.extractedCourse.modules?.every(m => /week\s*[1-4]/i.test(m.title)))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          scanResult.extractedCourse.modules?.length === 4 && scanResult.extractedCourse.modules?.every(m => /week\s*[1-4]/i.test(m.title))
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-95'
                        }`}
                      >
                        {isFormattingCohort ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Restructuring to 4 Weeks...
                          </>
                        ) : scanResult.extractedCourse.modules?.length === 4 && scanResult.extractedCourse.modules?.every(m => /week\s*[1-4]/i.test(m.title)) ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            4-Week Cohort Active
                          </>
                        ) : (
                          <>
                            <Layers className="w-3.5 h-3.5" />
                            Format to 4-Week Structure
                          </>
                        )}
                      </button>
                    </div>

                    {/* Pricing Inputs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Selling Price (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={coursePrice}
                            onChange={(e) => setCoursePrice(Math.max(0, Number(e.target.value) || 0))}
                            placeholder="e.g. 499"
                            className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Original Cost / M.R.P. (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={courseOriginalPrice}
                            onChange={(e) => setCourseOriginalPrice(Math.max(0, Number(e.target.value) || 0))}
                            placeholder="e.g. 999"
                            className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col justify-end">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCoursePrice(0);
                              setCourseOriginalPrice(0);
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                              coursePrice === 0
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {coursePrice === 0 ? 'Free Course' : 'Make Free (₹0)'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCoursePrice(499);
                              setCourseOriginalPrice(999);
                            }}
                            className="py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
                          >
                            Standard (₹499)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Certification Assessment & Quiz Configuration (75% Passing Required for Certificate) */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                            Course Certification Quiz
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            75% Passing Required for Certificate
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Upload or customize the final assessment. Students must score at least 75% on this quiz to unlock and earn their course completion certificate.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={includeQuiz}
                            onChange={(e) => setIncludeQuiz(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-semibold">Enable Certification Quiz</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsQuizConfigExpanded(!isQuizConfigExpanded)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Toggle Quiz Configuration"
                        >
                          {isQuizConfigExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {includeQuiz && isQuizConfigExpanded && (
                      <div className="space-y-3 pt-3 border-t border-slate-800">
                        {/* Title & Threshold Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Quiz Assessment Title
                            </label>
                            <input
                              type="text"
                              value={quizTitle}
                              onChange={(e) => setQuizTitle(e.target.value)}
                              placeholder={`${scanResult.extractedCourse.title || 'Course'} - Final Certification Assessment`}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Passing Requirement
                            </label>
                            <div className="w-full px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between">
                              <span>75% (Mandatory)</span>
                              <span className="text-[10px] text-emerald-400/80">Certificate Gate</span>
                            </div>
                          </div>
                        </div>

                        {/* File Upload & Question Input */}
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="text-[11px] font-semibold text-slate-300">
                              Upload Quiz Questions File (.txt or .json) or Edit Questions:
                            </label>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 cursor-pointer transition-colors">
                                <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{quizFile ? quizFile.name : 'Upload Quiz File'}</span>
                                <input
                                  type="file"
                                  accept=".txt,.json"
                                  onChange={handleQuizFileUpload}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuizRawText(`Question 1: What is the main objective of this technical curriculum?\n*A) Mastering core principles and practical skills\nB) Memorizing terminology without practice\nC) Skipping fundamental concepts\nD) None of the above\nExplanation: The course focuses on mastering technical concepts and practical skills.\n\nQuestion 2: Which architectural principle ensures code maintainability and modularity?\n*A) Separation of Concerns\nB) Monolithic Coupling\nC) Hardcoded Parameters\nD) Global State Mutation\nExplanation: Separation of concerns isolates responsibilities into distinct modules.\n\nQuestion 3: How should sensitive credentials and API keys be stored in production applications?\n*A) Environment variables\nB) Hardcoded directly in client source files\nC) Public Git repositories\nD) Commented out in source code\nExplanation: Secrets must always be loaded via secure environment variables.\n\nQuestion 4: What is the primary benefit of parameterized SQL queries?\n*A) Prevents SQL injection attacks\nB) Increases server CPU load\nC) Decreases query speed\nD) Prevents table creation\nExplanation: Parameterized queries separate SQL commands from user input.`);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition-colors"
                              >
                                Insert Sample Questions
                              </button>
                            </div>
                          </div>

                          <textarea
                            rows={6}
                            value={quizRawText}
                            onChange={(e) => setQuizRawText(e.target.value)}
                            placeholder="Question 1: Prompt text here...&#10;A) Option 1&#10;*B) Correct Option (marked with asterisk)&#10;C) Option 3&#10;D) Option 4&#10;Explanation: Explanatory text here."
                            className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Questions preview summary */}
                        {(() => {
                          const parsed = parseClientQuizText(quizRawText);
                          return (
                            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-400">
                                  {parsed.length} Questions Configured
                                </span>
                                <span>•</span>
                                <span>Threshold: 75% required to pass for certificate</span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                Prefix correct answer with <strong className="text-emerald-400">*</strong> (e.g. *B)
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Modules & Lessons Hierarchy Tree */}
                  <div className="space-y-2.5">
                    {scanResult.extractedCourse.modules?.map((mod, modIdx) => {
                      const isExpanded = !!expandedModules[modIdx];
                      return (
                        <div
                          key={modIdx}
                          className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden transition-colors"
                        >
                          {/* Module Header Bar */}
                          <button
                            type="button"
                            onClick={() => toggleModule(modIdx)}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/40 text-left transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-xs font-bold">
                                {mod.order_index || modIdx + 1}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">
                                  {mod.title}
                                </p>
                                {mod.description && (
                                  <p className="text-[11px] text-slate-400 truncate max-w-md">
                                    {mod.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px]">
                                {mod.lessons?.length || 0} Lessons
                              </span>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </button>

                          {/* Lessons inside Module */}
                          {isExpanded && Array.isArray(mod.lessons) && (
                            <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
                              {mod.lessons.length === 0 ? (
                                <p className="text-[11px] text-slate-500 italic px-2">
                                  No lessons detected in this module.
                                </p>
                              ) : (
                                mod.lessons.map((les, lesIdx) => (
                                  <div
                                    key={lesIdx}
                                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                  >
                                    <div className="flex items-start sm:items-center gap-2.5">
                                      <span className="text-[11px] font-mono text-slate-500">
                                        {modIdx + 1}.{lesIdx + 1}
                                      </span>
                                      <div>
                                        <p className="text-xs font-medium text-slate-200">
                                          {les.title}
                                        </p>
                                        {les.text_content && (
                                          <p className="text-[11px] text-slate-500 line-clamp-1 max-w-lg mt-0.5">
                                            {les.text_content}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                      {renderLessonTypeBadge(les.lesson_type)}
                                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {les.reading_time_minutes || 10}m
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" />
            Antigravity Academic Curriculum Engine
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
