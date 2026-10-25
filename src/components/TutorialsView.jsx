import React, { useState } from 'react';
import { BookOpen, Copy, Check, Play, Bookmark, ThumbsUp, Share2, ChevronRight, Search, Code2, ArrowUpRight, HelpCircle } from 'lucide-react';
import { topicsTree, articlesDetail } from '../data/articlesData';
import Visualizer from './Visualizer';

export default function TutorialsView({
  selectedTopicId = "binary-search",
  onSelectTopic,
  onNavigateToPractice,
  onNavigateToIde
}) {
  const [topicSearch, setTopicSearch] = useState('');
  const [activeLang, setActiveLang] = useState('cpp');
  const [copied, setCopied] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likes, setLikes] = useState(2450);
  const [hasLiked, setHasLiked] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizVerified, setQuizVerified] = useState(false);

  const article = articlesDetail[selectedTopicId] || articlesDetail["binary-search"];

  // Reset quiz state when topic changes
  React.useEffect(() => {
    setSelectedQuiz(null);
    setQuizVerified(false);
  }, [selectedTopicId]);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = () => {
    if (!hasLiked) {
      setLikes(prev => prev + 1);
      setHasLiked(true);
    } else {
      setLikes(prev => prev - 1);
      setHasLiked(false);
    }
  };

  return (
    <div className="max-width-wrapper animate-fade-in" style={{ padding: '24px 0', minHeight: '85vh' }}>
      <div className="tutorials-grid">
        {/* LEFT SIDEBAR: Hierarchical Topic Tree */}
        <aside className="tutorials-left-aside" style={{
          position: 'sticky',
          top: '80px',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px'
        }}>
          {/* Topic search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            marginBottom: '16px'
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Filter topics..."
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                width: '100%',
                padding: 0
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {topicsTree.map((category, catIdx) => {
              const filteredSubs = category.subtopics.filter(s =>
                s.title.toLowerCase().includes(topicSearch.toLowerCase())
              );
              if (filteredSubs.length === 0) return null;

              return (
                <div key={catIdx}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <BookOpen size={13} color="var(--brand-green)" /> {category.category}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {filteredSubs.map((sub) => {
                      const isActive = sub.id === article.id;
                      return (
                        <div
                          key={sub.id}
                          onClick={() => onSelectTopic(sub.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '13.5px',
                            fontWeight: isActive ? '700' : '500',
                            color: isActive ? 'var(--brand-green)' : 'var(--text-primary)',
                            background: isActive ? 'var(--brand-green-light)' : 'transparent',
                            borderLeft: isActive ? '3px solid var(--brand-green)' : '3px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'var(--transition)'
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sub.title}
                          </span>
                          <span className={`badge badge-${sub.difficulty.toLowerCase()}`} style={{ fontSize: '10px' }}>
                            {sub.difficulty}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER COLUMN: Main Article Reader */}
        <main style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px 40px',
          minWidth: 0
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', flexWrap: 'wrap' }}>
            {article.breadcrumb.map((bc, idx) => (
              <React.Fragment key={idx}>
                <span>{bc}</span>
                {idx < article.breadcrumb.length - 1 && <ChevronRight size={13} />}
              </React.Fragment>
            ))}
          </div>

          {/* Article Title */}
          <h1 style={{ fontSize: 'clamp(26px, 3.5vw, 34px)', marginBottom: '16px' }}>
            {article.title}
          </h1>

          {/* Metadata & Actions Strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '18px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={article.author.avatar}
                alt={article.author.name}
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {article.author.name} <span style={{ fontSize: '11px', color: 'var(--brand-green)', fontWeight: '800' }}>• {article.author.badge}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Last Updated: {article.lastUpdated} • {article.readingTime}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleLike}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: hasLiked ? 'var(--brand-green-light)' : 'var(--bg-secondary)',
                  color: hasLiked ? 'var(--brand-green)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                <ThumbsUp size={15} fill={hasLiked ? 'var(--brand-green)' : 'none'} />
                <span>{likes}</span>
              </button>

              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: isBookmarked ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)',
                  color: isBookmarked ? '#3b82f6' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                <Bookmark size={15} fill={isBookmarked ? '#3b82f6' : 'none'} />
                <span>{isBookmarked ? 'Saved' : 'Save'}</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Article link copied to clipboard!');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                <Share2 size={15} />
              </button>
            </div>
          </div>

          {/* Article Summary Box */}
          <div style={{
            background: 'var(--brand-green-light)',
            borderLeft: '4px solid var(--brand-green)',
            padding: '16px 20px',
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
            marginBottom: '32px'
          }}>
            <p style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: '500' }}>
              {article.summary}
            </p>
          </div>

          {/* Formatted Sections */}
          {article.sections.map((section, idx) => (
            <div key={idx} id={section.id} style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                {section.heading}
              </h3>
              <div style={{ fontSize: '15.5px', lineHeight: '1.7', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                {section.content}
              </div>
            </div>
          ))}

          {/* Embedded Interactive Visualizer (For Binary Search or Two Pointers) */}
          {article.id === 'binary-search' && (
            <div id="visualizer-section">
              <Visualizer type="binary-search" />
            </div>
          )}

          {/* Practice Banner (GFG trademark "Try It Yourself" block) */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '36px 0',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                TRY IT YOURSELF
              </span>
              <h4 style={{ color: 'white', fontSize: '18px', marginTop: '4px' }}>
                Solve "{article.title.split('-')[0]}" on Codificator Practice Arena
              </h4>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13.5px', margin: 0 }}>
                Test your code against test cases with real compiler verdict & score +XP!
              </p>
            </div>
            <button
              onClick={() => onNavigateToPractice(article.relatedProblemId)}
              style={{
                background: 'white',
                color: '#059669',
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14.5px'
              }}
            >
              Solve Problem <ArrowUpRight size={18} />
            </button>
          </div>

          {/* Code Implementation Tabs (<gfg-tabs> style) */}
          <div id="implementation" style={{ margin: '36px 0' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '14px' }}>
              Multi-Language Implementation
            </h3>

            <div style={{
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid var(--code-border)',
              background: 'var(--code-bg)'
            }}>
              {/* Tab Header Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--code-header-bg)',
                padding: '0 12px',
                borderBottom: '1px solid var(--code-border)'
              }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[
                    { id: 'cpp', label: 'C++' },
                    { id: 'java', label: 'Java' },
                    { id: 'python', label: 'Python' },
                    { id: 'javascript', label: 'JavaScript' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveLang(tab.id)}
                      style={{
                        padding: '10px 16px',
                        fontSize: '13.5px',
                        fontWeight: '700',
                        color: activeLang === tab.id ? '#ffffff' : '#9ca3af',
                        background: activeLang === tab.id ? 'var(--code-bg)' : 'transparent',
                        borderBottom: activeLang === tab.id ? '2px solid var(--brand-green)' : '2px solid transparent'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleCopyCode(article.codeSnippets[activeLang])}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: copied ? '#10b981' : '#d1d5db',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Code</>}
                  </button>

                  <button
                    onClick={() => onNavigateToIde(article.codeSnippets[activeLang], activeLang)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      background: 'var(--brand-green)'
                    }}
                  >
                    <Play size={13} fill="white" /> Run on IDE
                  </button>
                </div>
              </div>

              {/* Code Pre Container */}
              <pre style={{
                margin: 0,
                padding: '20px',
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'var(--code-text)',
                overflowX: 'auto',
                fontFamily: 'var(--font-mono)'
              }}>
                <code>{article.codeSnippets[activeLang]}</code>
              </pre>
            </div>
          </div>

          {/* Complexity Analysis Box */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            marginBottom: '36px'
          }}>
            <h4 style={{ fontSize: '16px', marginBottom: '10px', color: 'var(--text-primary)' }}>
              Complexity Analysis
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>TIME COMPLEXITY</span>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--brand-green)', marginTop: '2px' }}>
                  {article.complexity.time}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>AUXILIARY SPACE</span>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {article.complexity.space}
                </div>
              </div>
            </div>
          </div>

          {/* FAQ / Interview Q&A Section */}
          {article.faqs && (
            <div style={{ marginTop: '36px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={20} color="var(--brand-green)" /> Frequently Asked Questions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {article.faqs.map((faq, idx) => (
                  <div key={idx} style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px'
                  }}>
                    <h5 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      Q: {faq.q}
                    </h5>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Topic Quiz Checkpoint */}
          {article.quiz && (
            <div style={{
              marginTop: '40px',
              padding: '24px 28px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="badge badge-sale">ARTICLE QUIZ CHECKPOINT</span>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Test your comprehension</span>
              </div>
              <h4 style={{ fontSize: '17px', color: 'var(--text-primary)', marginBottom: '16px' }}>
                {article.quiz.question}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {article.quiz.options.map((opt, optIdx) => {
                  let border = 'var(--border-color)';
                  let bg = 'var(--bg-card)';
                  if (quizVerified) {
                    if (optIdx === article.quiz.correctIndex) {
                      border = '#10b981';
                      bg = 'rgba(16, 185, 129, 0.15)';
                    } else if (selectedQuiz === optIdx) {
                      border = '#ef4444';
                      bg = 'rgba(239, 68, 68, 0.15)';
                    }
                  } else if (selectedQuiz === optIdx) {
                    border = 'var(--brand-green)';
                    bg = 'var(--brand-green-light)';
                  }

                  return (
                    <div
                      key={optIdx}
                      onClick={() => !quizVerified && setSelectedQuiz(optIdx)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1.5px solid ${border}`,
                        background: bg,
                        cursor: quizVerified ? 'default' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        transition: 'var(--transition)'
                      }}
                    >
                      {String.fromCharCode(65 + optIdx)}. {opt}
                    </div>
                  );
                })}
              </div>

              {!quizVerified ? (
                <button
                  onClick={() => selectedQuiz !== null && setQuizVerified(true)}
                  disabled={selectedQuiz === null}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '13.5px' }}
                >
                  Verify Answer
                </button>
              ) : (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedQuiz === article.quiz.correctIndex ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: selectedQuiz === article.quiz.correctIndex ? '#059669' : '#dc2626',
                  fontSize: '13.5px'
                }}>
                  <strong>{selectedQuiz === article.quiz.correctIndex ? "Correct Answer." : "Incorrect Answer."}</strong> {article.quiz.explanation}
                </div>
              )}
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR: Table of Contents & Related Problems */}
        <aside className="tutorials-right-aside" style={{
          position: 'sticky',
          top: '80px',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Table of Contents */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '18px'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
              Table of Contents
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {article.sections.map((s, idx) => (
                <a
                  key={idx}
                  href={`#${s.id}`}
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    borderLeft: '2px solid transparent',
                    paddingLeft: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--brand-green)';
                    e.currentTarget.style.borderLeftColor = 'var(--brand-green)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                >
                  {s.heading}
                </a>
              ))}
              <a
                href="#implementation"
                style={{ fontSize: '13px', color: 'var(--text-secondary)', borderLeft: '2px solid transparent', paddingLeft: '8px' }}
              >
                Code Implementation
              </a>
            </div>
          </div>

          {/* Related Practice Problems */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '18px'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Code2 size={14} color="#3b82f6" /> Practice Problems
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { title: "Binary Search", diff: "Easy", id: "binary-search" },
                { title: "Pair with Given Sum", diff: "Easy", id: "two-sum-sorted" },
                { title: "Trapping Rain Water", diff: "Hard", id: "trapping-rain-water" }
              ].map(p => (
                <div
                  key={p.id}
                  onClick={() => onNavigateToPractice(p.id)}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px'
                  }}
                >
                  <span style={{ fontWeight: '600' }}>{p.title}</span>
                  <span className={`badge badge-${p.diff.toLowerCase()}`} style={{ fontSize: '10px' }}>
                    {p.diff}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
