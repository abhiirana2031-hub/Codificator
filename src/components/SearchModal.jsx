import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, Code2, Layers, ArrowRight, Trophy } from 'lucide-react';
import { problemsList } from '../data/problemsData';
import { coursesList } from '../data/coursesData';
import { articlesDetail } from '../data/articlesData';
import { contestsData } from '../data/contestsData';

export default function SearchModal({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onNavigate({ type: 'openSearch' });
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNavigate]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const filteredArticles = Object.values(articlesDetail).filter(a =>
    a.title.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q))
  );

  const filteredProblems = problemsList.filter(p =>
    p.title.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q))
  );

  const filteredCourses = coursesList.filter(c =>
    c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
  );

  const filteredContests = contestsData.filter(c =>
    c.title.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.hiringCompanies.some(comp => comp.toLowerCase().includes(q))
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        paddingInline: '16px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh'
        }}
        className="animate-fade-in"
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-primary)'
        }}>
          <Search size={22} color="var(--brand-green)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type to search tutorials, problems, courses, DSA..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '17px',
              color: 'var(--text-primary)',
              padding: 0
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          )}
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            padding: '3px 8px',
            borderRadius: '4px',
            color: 'var(--text-muted)'
          }}>
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div style={{ overflowY: 'auto', padding: '16px 20px' }}>
          {/* Quick Suggestions Chips */}
          {!query && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                Popular Searches
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {["Binary Search", "Two Pointers", "Trapping Rain Water", "LRU Cache", "AI Engineering", "SDE Sheet 160"].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '13px',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tutorial Articles Section */}
          {filteredArticles.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={14} color="var(--brand-green)" /> Tutorials & Notes ({filteredArticles.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredArticles.map(art => (
                  <div
                    key={art.id}
                    onClick={() => {
                      onNavigate({ type: 'tutorial', topicId: art.id });
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                    className="search-item-hover"
                  >
                    <div>
                      <h5 style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{art.title}</h5>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{art.readingTime} • {art.tags.join(', ')}</span>
                    </div>
                    <ArrowRight size={16} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Problems Section */}
          {filteredProblems.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code2 size={14} color="#3b82f6" /> Practice Problems ({filteredProblems.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredProblems.map(prob => (
                  <div
                    key={prob.id}
                    onClick={() => {
                      onNavigate({ type: 'practice', problemId: prob.id });
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`badge badge-${prob.difficulty.toLowerCase()}`}>
                        {prob.difficulty}
                      </span>
                      <h5 style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{prob.title}</h5>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {prob.accuracy} Accuracy
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courses Section */}
          {filteredCourses.length > 0 && (
            <div>
              <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} color="#8b5cf6" /> Live Courses ({filteredCourses.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredCourses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => {
                      onNavigate({ type: 'course', courseId: course.id });
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <h5 style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{course.title}</h5>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{course.category} • {course.studentsCount} Students</span>
                    </div>
                    <span style={{ fontWeight: '700', color: 'var(--brand-green)', fontSize: '14px' }}>
                      ₹{course.discountedPrice}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contests Section */}
          {filteredContests.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trophy size={14} color="#eab308" /> Contests & Job-A-Thon ({filteredContests.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredContests.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onNavigate({ view: 'contests' });
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <h5 style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{c.title}</h5>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.type} • {c.registeredCount?.toLocaleString() || '1,000+'} Candidates</span>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: c.status === 'live' ? '#dc2626' : 'var(--primary-color)',
                      color: '#fff',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-pill)'
                    }}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {query && filteredArticles.length === 0 && filteredProblems.length === 0 && filteredCourses.length === 0 && filteredContests.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '16px', fontWeight: '600' }}>No results found for "{query}"</p>
              <p style={{ fontSize: '13px', marginTop: '6px' }}>Try searching for "Binary Search", "Job-A-Thon", "Two Pointers", or "SDE Sheet".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
