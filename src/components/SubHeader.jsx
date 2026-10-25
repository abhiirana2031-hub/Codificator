import React from 'react';

export const subHeaderLinks = [
  { label: "DSA", view: "tutorials", topic: "binary-search" },
  { label: "Practice Problems", view: "practice" },
  { label: "Contests & Job-A-Thon", view: "contests" },
  { label: "C++", view: "tutorials", topic: "cpp-smart-pointers" },
  { label: "Java", view: "tutorials", topic: "java-hashmap-internal" },
  { label: "Python IDE", view: "ide" },
  { label: "JavaScript", view: "ide" },
  { label: "Data Science & AI", view: "courses" },
  { label: "System Design", view: "tutorials", topic: "lru-cache-design" },
  { label: "DevOps & Cloud", view: "courses" },
  { label: "SDE Sheet 160", view: "sde-sheet" },
  { label: "Courses", view: "courses" },
  { label: "Razorpay Checkout", view: "payment-demo" },
  { label: "Problem of the Day", view: "practice", problemId: "binary-search" },
  { label: "My Profile & Heatmap", view: "profile" }
];

export default function SubHeader({ onSelectSubHeader }) {
  return (
    <div
      className="sub-header-bar no-print"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '4px 0',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}
    >
      <div className="max-width-wrapper" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0 24px'
      }}>
        {subHeaderLinks.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectSubHeader(item)}
            style={{
              padding: '6px 14px',
              fontSize: '13.5px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              transition: 'var(--transition)',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--brand-green)';
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
