import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { parse as parseYaml } from 'yaml';
import hljs from 'highlight.js/lib/common';
import {
  Copy,
  Check,
  Play,
  Terminal,
  Info,
  Lightbulb,
  AlertTriangle,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';
import LiveCodeConsoleModal from './lms/LiveCodeConsoleModal';
import './lms/markdownArticle.css';

/**
 * Generates URL-friendly, unique slug anchors for headings,
 * incrementing duplicate occurrences deterministically.
 */
export function slugifyHeading(text, tracker = new Map()) {
  const clean = String(text || '')
    .replace(/[*_`#\[\]!]/g, '')
    .trim();
  const base = clean
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-') || 'section';

  const count = tracker.get(base) || 0;
  tracker.set(base, count + 1);
  return count > 0 ? `${base}-${count}` : base;
}

/**
 * Calculates estimated reading time in minutes (200-250 words per minute),
 * excluding code blocks from visible word count.
 */
export function calculateReadingTime(rawText = '') {
  if (!rawText) return { minutes: 1, wordCount: 0 };
  const textWithoutCode = rawText.replace(/```[\s\S]*?```/g, '');
  const words = textWithoutCode.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const minutes = Math.max(1, Math.ceil(wordCount / 225));
  return { minutes, wordCount };
}

/**
 * Normalizes common syllabus & digital note plain-text patterns into standard GFM Markdown:
 * 1. Converts HTML snippet lists (e.g. "1. <!DOCTYPE>\n2. <html>...") into fenced HTML code blocks
 * 2. Unescapes stray backslashes before tags (e.g. "\<html\>" -> "<html>")
 * 3. Normalizes callouts
 */
export function normalizeCurriculumMarkdown(raw) {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw;

  // Unescape escaped angle brackets and exclamation marks in converted digital notes (\<div> -> <div>, \<!DOCTYPE\> -> <!DOCTYPE>)
  text = text
    .replace(/\\</g, '<')
    .replace(/\\>/g, '>')
    .replace(/\\!/g, '!');

  let cleaned = text
    .replace(/```\w*\s*\r?\n\s*```/g, '')
    .replace(/\*{4,}(.*?)\*{4,}/g, '**$1**')
    .replace(/```text\s*\r?\n---\r?\n\s*```/g, '---')
    .replace(/([^\n])(\s*\+[+-]{5,})/g, '$1\n\n$2');

  const lines = cleaned.split(/\r?\n/);
  const normalizedLines = [];
  let inCustomCodeBlock = false;
  let codeBuffer = [];
  let isCollectingNumberedHtml = false;

  const isHeadingLine = (l) => {
    const trimmed = l.trim();
    if (trimmed.startsWith('#')) return false;
    return /^(Core Technical Explanation|Key Concepts\s*(&|and)?\s*Theory|Practical Exercises|Hands-on Exercises|Summary\s*(&|and)?\s*Knowledge Check|Key Takeaways|Implementation\s*(&|and)?\s*Code Examples|Overview\s*(&|and)?\s*Objectives)$/i.test(trimmed);
  };

  const isAsciiDiagramLine = (l) => {
    const trimmed = l.trim();
    if (trimmed.length === 0) return false;
    if (trimmed === '---' || trimmed === '________________' || trimmed.startsWith('#')) return false;
    return (
      /^[+|\\/]{1}[+|\\/-]{3,}/.test(trimmed) ||
      /^\|.*\|$/.test(trimmed) ||
      trimmed.includes('+---+') ||
      trimmed.includes('+-----------------') ||
      (trimmed.includes('|') && (trimmed.includes('v') || trimmed.includes('+') || trimmed.includes('---')))
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCustomCodeBlock) {
        while (codeBuffer.length > 0 && codeBuffer[codeBuffer.length - 1].trim() === '') {
          codeBuffer.pop();
        }
        normalizedLines.push(codeBuffer.join('\n'));
        normalizedLines.push('```\n');
        codeBuffer = [];
        inCustomCodeBlock = false;
        continue;
      }
      normalizedLines.push(line);
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        normalizedLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        normalizedLines.push(lines[i]);
      }
      continue;
    }

    if (inCustomCodeBlock) {
      if (
        isHeadingLine(trimmed) ||
        trimmed.startsWith('##') ||
        trimmed.startsWith('###') ||
        /^(?:Code Snippet|Example|Implementation)\s*[:=-]/i.test(trimmed) ||
        /^(\d+\.|\*|-)\s+[A-Z]/.test(trimmed) ||
        trimmed === '________________' ||
        trimmed === '---'
      ) {
        while (codeBuffer.length > 0 && codeBuffer[codeBuffer.length - 1].trim() === '') {
          codeBuffer.pop();
        }
        normalizedLines.push(codeBuffer.join('\n'));
        normalizedLines.push('```\n');
        codeBuffer = [];
        inCustomCodeBlock = false;
      } else {
        codeBuffer.push(line);
        continue;
      }
    }

    // Numbered HTML listings
    const isNumberedHtmlLine = /^\d+[\.\)]\s*<(!DOCTYPE|html|head|title|body|h[1-6]|p|div|span|a|ul|ol|li|table|form|input|button|script|style)/i.test(trimmed);
    if (isNumberedHtmlLine) {
      if (!isCollectingNumberedHtml) {
        isCollectingNumberedHtml = true;
        codeBuffer = [];
      }
      const cleanCode = line.replace(/^\s*\d+[\.\)]\s*/, '');
      codeBuffer.push(cleanCode);
      continue;
    } else if (isCollectingNumberedHtml) {
      if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
        codeBuffer.push(line.trim());
        continue;
      }
      normalizedLines.push('```html');
      codeBuffer.forEach(c => normalizedLines.push(c));
      normalizedLines.push('```\n');
      codeBuffer = [];
      isCollectingNumberedHtml = false;
    }

    // Horizontal separator
    if (/^_{3,}$/.test(trimmed)) {
      normalizedLines.push('\n---\n');
      continue;
    }

    // Section Heading
    if (isHeadingLine(trimmed)) {
      normalizedLines.push(`\n## ${trimmed}\n`);
      continue;
    }

    // Code Snippet Header
    const snippetMatch = trimmed.match(/^(?:Code Snippet|Example|Implementation)\s*[:=-]\s*(.+)$/i);
    if (snippetMatch && !trimmed.startsWith('#')) {
      normalizedLines.push(`\n### ${trimmed}\n\n\`\`\`javascript`);
      inCustomCodeBlock = true;
      codeBuffer = [];
      continue;
    }

    // ASCII diagram
    if (isAsciiDiagramLine(trimmed)) {
      const diagramLines = [line];
      while (i + 1 < lines.length && (isAsciiDiagramLine(lines[i + 1]) || lines[i + 1].trim() === '' || lines[i + 1].includes('v') || lines[i + 1].includes('Thread Pool') || lines[i + 1].includes('Blocking operations'))) {
        i++;
        diagramLines.push(lines[i]);
      }
      normalizedLines.push('\n```text\n' + diagramLines.join('\n') + '\n```\n');
      continue;
    }

    // Numbered items: "1. Creation Phase: ...", "2. Execution Phase: ..."
    if (/^\d+\.\s+/.test(trimmed)) {
      if (trimmed.includes('**')) {
        normalizedLines.push(`\n${trimmed}\n`);
      } else {
        const matchItem = trimmed.match(/^(\d+)\.\s+([^:]+):\s*(.*)$/);
        if (matchItem) {
          normalizedLines.push(`\n${matchItem[1]}. **${matchItem[2].trim()}**: ${matchItem[3].trim()}\n`);
        } else {
          normalizedLines.push(`\n${trimmed}\n`);
        }
      }
      continue;
    }

    normalizedLines.push(line);
  }

  if (isCollectingNumberedHtml && codeBuffer.length > 0) {
    normalizedLines.push('```html');
    codeBuffer.forEach(c => normalizedLines.push(c));
    normalizedLines.push('```\n');
  }

  if (inCustomCodeBlock && codeBuffer.length > 0) {
    while (codeBuffer.length > 0 && codeBuffer[codeBuffer.length - 1].trim() === '') {
      codeBuffer.pop();
    }
    normalizedLines.push(codeBuffer.join('\n'));
    normalizedLines.push('```\n');
  }

  return normalizedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Syntax-highlighted code block component with copy-to-clipboard functionality
 */
export function CodeBlock({ node, inline, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const rawCode = String(children || '').replace(/\n$/, '');
  const [copied, setCopied] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // If inline code
  if (inline || (!match && !rawCode.includes('\n') && rawCode.length < 50 && !props.style?.display)) {
    return (
      <code className="codificators-inline-code" {...props}>
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Syntax highlighting with highlight.js
  let highlightedHtml = '';
  try {
    if (lang && hljs.getLanguage(lang)) {
      highlightedHtml = hljs.highlight(rawCode, { language: lang, ignoreIllegals: true }).value;
    } else {
      highlightedHtml = hljs.highlightAuto(rawCode).value;
    }
  } catch {
    highlightedHtml = rawCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return (
    <>
      <div className="codificators-code-block">
        <div className="codificators-code-header">
          <span className="codificators-code-lang">
            <Terminal size={14} />
            {lang || 'code'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsConsoleOpen(true)}
              className="codificators-console-button"
              aria-label="Open in Console & CSS Viewer"
              title="Open in interactive Console & CSS Viewer"
            >
              <Play size={12} />
              <span>Console &amp; CSS Viewer</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`codificators-copy-button ${copied ? 'copied' : ''}`}
              aria-label="Copy code to clipboard"
              title="Copy exact source code"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
        <pre>
          <code
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            tabIndex={0}
          />
        </pre>
      </div>

      {isConsoleOpen && (
        <LiveCodeConsoleModal
          isOpen={isConsoleOpen}
          onClose={() => setIsConsoleOpen(false)}
          initialCode={rawCode}
          initialLanguage={lang || 'javascript'}
        />
      )}
    </>
  );
}

/**
 * Responsive image component with aspect ratio preservation and fallback error display
 */
export function MarkdownImage({ src, alt, title }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div className="broken-image-fallback">
        <ImageIcon size={18} />
        <span>Image illustration unavailable: {alt || 'Educational diagram'}</span>
      </div>
    );
  }

  // Safe source check: prevent javascript: URIs
  const isSafeSrc = /^(https?:\/\/|\/|data:image\/)/i.test(src);
  if (!isSafeSrc) {
    return (
      <div className="broken-image-fallback">
        <AlertTriangle size={18} />
        <span>Restricted or invalid image source</span>
      </div>
    );
  }

  return (
    <figure className="article-figure">
      <img
        src={src}
        alt={alt || 'Lesson visual illustration'}
        loading="lazy"
        className="article-image"
        onError={() => setHasError(true)}
      />
      {(alt || title) && (
        <figcaption className="article-caption">
          {title || alt}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Accessible external and anchor link component
 */
export function MarkdownLink({ href, children, ...props }) {
  const isExternal = href && /^https?:\/\//i.test(href);
  const isSafe = href && (/^(https?:\/\/|\/|#)/i.test(href));

  return (
    <a
      href={isSafe ? href : '#'}
      target={isExternal ? '_blank' : '_self'}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
      {isExternal && <ExternalLink size={12} style={{ display: 'inline', marginLeft: '4px', verticalAlign: '-1px' }} />}
    </a>
  );
}

/**
 * Main Lesson Content Renderer Component
 */
export default function LessonContentRenderer({ content }) {
  if (!content) {
    return (
      <div style={{ color: 'var(--text-light)', fontStyle: 'italic', padding: '24px 0' }}>
        No educational notes available for this lesson yet.
      </div>
    );
  }

  // Parse YAML Frontmatter safely if present
  let cleanMarkdown = content;
  let frontmatterData = null;

  try {
    const contentWithoutLeadingWhitespace = content.trimStart();
    const frontmatter = contentWithoutLeadingWhitespace.match(
      /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
    );
    if (frontmatter) {
      const parsed = parseYaml(frontmatter[1]) || {};
      const leadingWhitespaceLength = content.length - contentWithoutLeadingWhitespace.length;
      cleanMarkdown = content.slice(leadingWhitespaceLength + frontmatter[0].length);
      frontmatterData = parsed;
    }
  } catch {
    cleanMarkdown = content;
  }

  // Normalize formatting for digital notes and raw text
  const normalized = normalizeCurriculumMarkdown(cleanMarkdown);

  // Custom components for ReactMarkdown to render semantic, accessible HTML
  const components = {
    // Code blocks and inline code
    code: CodeBlock,
    
    // Images
    img: MarkdownImage,

    // Links
    a: MarkdownLink,

    // Tables
    table: ({ children, ...props }) => (
      <div className="table-wrapper">
        <table {...props}>{children}</table>
      </div>
    ),

    // Blockquotes & Callouts
    blockquote: ({ children, ...props }) => {
      // Inspect child text for [!NOTE], [!TIP], etc.
      const rawText = React.Children.toArray(children)
        .map(c => (typeof c === 'string' ? c : c?.props?.children || ''))
        .join(' ');

      if (rawText.includes('[!NOTE]')) {
        return (
          <div className="markdown-callout note">
            <Info size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#3b82f6' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '2px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#3b82f6' }}>Note</strong>
              {children}
            </div>
          </div>
        );
      }
      if (rawText.includes('[!TIP]')) {
        return (
          <div className="markdown-callout tip">
            <Lightbulb size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#10b981' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '2px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#10b981' }}>Pro Tip</strong>
              {children}
            </div>
          </div>
        );
      }
      if (rawText.includes('[!WARNING]') || rawText.includes('[!CAUTION]')) {
        return (
          <div className="markdown-callout warning">
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#f59e0b' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '2px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#f59e0b' }}>Important Warning</strong>
              {children}
            </div>
          </div>
        );
      }

      return <blockquote {...props}>{children}</blockquote>;
    },

    // Headings with anchor IDs
    h1: ({ id, children, ...props }) => (
      <h1 id={id} {...props}>
        <a href={`#${id}`} className="heading-anchor">
          {children}
          <span className="heading-hash">#</span>
        </a>
      </h1>
    ),
    h2: ({ id, children, ...props }) => (
      <h2 id={id} {...props}>
        <a href={`#${id}`} className="heading-anchor">
          {children}
          <span className="heading-hash">#</span>
        </a>
      </h2>
    ),
    h3: ({ id, children, ...props }) => (
      <h3 id={id} {...props}>
        <a href={`#${id}`} className="heading-anchor">
          {children}
          <span className="heading-hash">#</span>
        </a>
      </h3>
    ),
    h4: ({ id, children, ...props }) => (
      <h4 id={id} {...props}>
        <a href={`#${id}`} className="heading-anchor">
          {children}
          <span className="heading-hash">#</span>
        </a>
      </h4>
    )
  };

  return (
    <article className="codificators-article-body">
      {/* Frontmatter metadata summary header if present */}
      {frontmatterData && frontmatterData.title && (
        <div style={{
          padding: '16px 20px',
          marginBottom: '24px',
          borderRadius: '8px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-green)' }}>
              Lesson Topic
            </span>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {frontmatterData.title}
            </div>
          </div>
          {frontmatterData.duration && (
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Estimated Duration: {frontmatterData.duration}
            </span>
          )}
        </div>
      )}

      {/* Semantic Markdown Article Renderer */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={components}
      >
        {normalized}
      </ReactMarkdown>
    </article>
  );
}
