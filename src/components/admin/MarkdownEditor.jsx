import React, { useState, useEffect, useRef } from 'react';
import MarkdownPreview from './MarkdownPreview';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, Code, List, ListOrdered, 
  Quote, Table, Link as LinkIcon, Image as ImageIcon, CheckSquare,
  Columns, Edit3, Eye, Save, AlertCircle, CheckCircle2, RotateCcw,
  Sparkles, Info, Lightbulb, AlertTriangle
} from 'lucide-react';

export default function MarkdownEditor({
  initialContent = '',
  lessonTitle = '',
  lessonId = null,
  onSave,
  onCancel,
  isPreview = false,
  onTogglePreview = null,
  isMandatory = true,
  onToggleMandatory = null,
  isSaving = false,
  saveError = null,
  saveSuccess = false
}) {
  const [content, setContent] = useState(initialContent || '');
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'edit' | 'preview'
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const textareaRef = useRef(null);

  // Draft key for auto-saving drafts locally
  const draftKey = lessonId ? `codificator_lesson_draft_${lessonId}` : null;

  useEffect(() => {
    setContent(initialContent || '');
    setHasUnsavedChanges(false);
  }, [initialContent, lessonId]);

  // Check for existing local draft on mount
  useEffect(() => {
    if (!draftKey) return;
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft && savedDraft !== initialContent) {
        // Option to recover draft if newer
        const meta = localStorage.getItem(`${draftKey}_meta`);
        if (meta) {
          const parsed = JSON.parse(meta);
          setDraftSavedAt(new Date(parsed.timestamp));
        }
      }
    } catch (e) {
      // Ignore local storage error
    }
  }, [draftKey]);

  // Auto-save draft locally every 10 seconds if dirty
  useEffect(() => {
    if (!draftKey || !hasUnsavedChanges) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, content);
        const now = new Date();
        localStorage.setItem(`${draftKey}_meta`, JSON.stringify({ timestamp: now.toISOString() }));
        setDraftSavedAt(now);
      } catch (e) {
        // Storage full or unavailable
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, draftKey, hasUnsavedChanges]);

  const handleContentChange = (newVal) => {
    setContent(newVal);
    setHasUnsavedChanges(true);
  };

  const handleRestoreDraft = () => {
    if (!draftKey) return;
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      setContent(draft);
      setHasUnsavedChanges(true);
    }
  };

  const handleDiscardDraft = () => {
    if (!draftKey) return;
    localStorage.removeItem(draftKey);
    localStorage.removeItem(`${draftKey}_meta`);
    setDraftSavedAt(null);
    setContent(initialContent || '');
    setHasUnsavedChanges(false);
  };

  // Helper to insert markdown syntax at cursor position
  const insertTextAtCursor = (prefix, suffix = '', placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${placeholder}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setHasUnsavedChanges(true);

    setTimeout(() => {
      textarea.focus();
      const cursorOffset = selected ? start + prefix.length + selected.length + suffix.length : start + prefix.length;
      textarea.setSelectionRange(cursorOffset, cursorOffset + (selected ? 0 : placeholder.length));
    }, 0);
  };

  const handleInsertCallout = (type) => {
    const calloutMap = {
      note: '> [!NOTE]\n> Highlights key architectural principles or background context.\n\n',
      tip: '> [!TIP]\n> Practical performance optimization or production tip.\n\n',
      warning: '> [!WARNING]\n> Breaking changes, gotchas, or security pitfalls to avoid.\n\n'
    };
    insertTextAtCursor(calloutMap[type] || calloutMap.note);
  };

  const handleInsertTable = () => {
    const tableTemplate = `| Feature / Aspect | Description | Syntax / Complexity |\n| :--- | :--- | :--- |\n| Item 1 | Core concept overview | O(1) Constant |\n| Item 2 | Memory considerations | O(n) Linear |\n\n`;
    insertTextAtCursor(tableTemplate);
  };

  const handleInsertCodeBlock = () => {
    const lang = 'javascript';
    insertTextAtCursor(`\`\`\`${lang}\n`, '\n```\n', '// Add implementation code here\nconsole.log("Hello from Codificators!");');
  };

  const handleSave = () => {
    if (onSave) {
      onSave(content);
      if (draftKey) {
        localStorage.removeItem(draftKey);
        localStorage.removeItem(`${draftKey}_meta`);
        setDraftSavedAt(null);
      }
      setHasUnsavedChanges(false);
    }
  };

  return (
    <div className="markdown-editor-wrapper" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '650px',
      background: 'var(--bg-card, #0f172a)',
      border: '1px solid var(--border-color, #334155)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Top Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '10px 16px',
        background: 'var(--bg-secondary, #1e293b)',
        borderBottom: '1px solid var(--border-color, #334155)'
      }}>
        {/* Formatting Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => insertTextAtCursor('**', '**', 'bold text')}
            title="Bold (**text**)"
            style={btnToolbarStyle}
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('*', '*', 'italic text')}
            title="Italic (*text*)"
            style={btnToolbarStyle}
          >
            <Italic size={15} />
          </button>
          <span style={{ width: '1px', height: '18px', background: 'var(--border-color, #475569)', margin: '0 4px' }} />

          <button
            type="button"
            onClick={() => insertTextAtCursor('# ', '\n', 'Heading 1')}
            title="Heading 1"
            style={btnToolbarStyle}
          >
            <Heading1 size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('## ', '\n', 'Heading 2')}
            title="Heading 2"
            style={btnToolbarStyle}
          >
            <Heading2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('### ', '\n', 'Heading 3')}
            title="Heading 3"
            style={btnToolbarStyle}
          >
            <Heading3 size={15} />
          </button>
          <span style={{ width: '1px', height: '18px', background: 'var(--border-color, #475569)', margin: '0 4px' }} />

          <button
            type="button"
            onClick={handleInsertCodeBlock}
            title="Code Block (```)"
            style={btnToolbarStyle}
          >
            <Code size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('- ', '\n', 'List item')}
            title="Bullet List"
            style={btnToolbarStyle}
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('1. ', '\n', 'Ordered item')}
            title="Numbered List"
            style={btnToolbarStyle}
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('- [ ] ', '\n', 'Checklist task')}
            title="Checklist Task"
            style={btnToolbarStyle}
          >
            <CheckSquare size={15} />
          </button>
          <span style={{ width: '1px', height: '18px', background: 'var(--border-color, #475569)', margin: '0 4px' }} />

          <button
            type="button"
            onClick={() => handleInsertCallout('note')}
            title="Insert Note Callout"
            style={btnToolbarStyle}
          >
            <Info size={15} color="#3b82f6" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertCallout('tip')}
            title="Insert Tip Callout"
            style={btnToolbarStyle}
          >
            <Lightbulb size={15} color="#10b981" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertCallout('warning')}
            title="Insert Warning Callout"
            style={btnToolbarStyle}
          >
            <AlertTriangle size={15} color="#f59e0b" />
          </button>
          <button
            type="button"
            onClick={handleInsertTable}
            title="Insert GFM Table"
            style={btnToolbarStyle}
          >
            <Table size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor('[', '](https://example.com)', 'Link label')}
            title="Insert Hyperlink"
            style={btnToolbarStyle}
          >
            <LinkIcon size={15} />
          </button>
        </div>

        {/* View Mode Switcher & Save Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-primary, #090d16)',
            borderRadius: '6px',
            padding: '2px',
            border: '1px solid var(--border-color, #334155)'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              title="Editor Only"
              style={{
                ...btnModeStyle,
                background: viewMode === 'edit' ? 'var(--brand-green, #10b981)' : 'transparent',
                color: viewMode === 'edit' ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
              }}
            >
              <Edit3 size={13} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              title="Split View"
              style={{
                ...btnModeStyle,
                background: viewMode === 'split' ? 'var(--brand-green, #10b981)' : 'transparent',
                color: viewMode === 'split' ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
              }}
            >
              <Columns size={13} /> Split
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              title="Preview Only"
              style={{
                ...btnModeStyle,
                background: viewMode === 'preview' ? 'var(--brand-green, #10b981)' : 'transparent',
                color: viewMode === 'preview' ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
              }}
            >
              <Eye size={13} /> Preview
            </button>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save Lesson'}
          </button>
        </div>
      </div>

      {/* Draft recovery banner if local draft exists */}
      {draftSavedAt && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#3b82f6'
        }}>
          <span>
            Unsaved draft auto-saved locally at {draftSavedAt.toLocaleTimeString()}.
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleRestoreDraft}
              style={{ background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px' }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {saveError && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderBottom: '1px solid #ef4444',
          color: '#ef4444',
          fontSize: '12.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={15} />
          <span>Save failed: {saveError}</span>
        </div>
      )}

      {saveSuccess && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(16, 185, 129, 0.1)',
          borderBottom: '1px solid var(--brand-green)',
          color: 'var(--brand-green)',
          fontSize: '12.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={15} />
          <span>Lesson successfully saved to database! Content is authoritative and marked admin-managed.</span>
        </div>
      )}

      {/* Editor Body */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: viewMode === 'split' ? '1fr 1fr' : '1fr',
        overflow: 'hidden'
      }}>
        {/* Input Pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            borderRight: viewMode === 'split' ? '1px solid var(--border-color, #334155)' : 'none',
            height: '100%'
          }}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="# Write comprehensive lesson notes in Markdown...&#10;&#10;Use headings (##), code blocks (```python), tables, and callouts (> [!NOTE])."
              style={{
                flex: 1,
                width: '100%',
                padding: '20px',
                border: 'none',
                outline: 'none',
                background: 'var(--bg-primary, #090d16)',
                color: 'var(--text-primary, #f8fafc)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '13.5px',
                lineHeight: '1.65',
                resize: 'none'
              }}
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <MarkdownPreview content={content} title={lessonTitle} />
          </div>
        )}
      </div>

      {/* Bottom Option Bar: Free Preview & Mandatory toggles */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--bg-secondary, #1e293b)',
        borderTop: '1px solid var(--border-color, #334155)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '12.5px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {onTogglePreview && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={Boolean(isPreview)}
                onChange={(e) => onTogglePreview(e.target.checked)}
                style={{ accentColor: 'var(--brand-green)' }}
              />
              <span>Free Preview Lesson (Unauthenticated/public visitors can read without purchasing)</span>
            </label>
          )}

          {onToggleMandatory && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={Boolean(isMandatory)}
                onChange={(e) => onToggleMandatory(e.target.checked)}
                style={{ accentColor: 'var(--brand-green)' }}
              />
              <span>Mandatory Lesson (Blocks progression if uncompleted)</span>
            </label>
          )}
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline"
            style={{ padding: '5px 14px', fontSize: '12px' }}
          >
            Close Editor
          </button>
        )}
      </div>
    </div>
  );
}

const btnToolbarStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary, #94a3b8)',
  padding: '6px 8px',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s, color 0.15s'
};

const btnModeStyle = {
  border: 'none',
  padding: '4px 10px',
  borderRadius: '4px',
  fontSize: '11.5px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  transition: 'all 0.15s'
};
