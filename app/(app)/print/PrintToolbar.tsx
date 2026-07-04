'use client';

import Link from 'next/link';

export function PrintToolbar() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99,
      background: '#1e1b2e', color: '#e5e3f1',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 24px', gap: 16,
      fontFamily: 'system-ui, sans-serif', fontSize: 14,
    }}>
      <Link href="/dashboard" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 500 }}>
        ← Назад
      </Link>
      <span style={{ fontSize: 13, color: '#a5a0c0' }}>Попередній перегляд А4</span>
      <button
        onClick={() => window.print()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: '#7c3aed', color: '#fff',
          fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: 600,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M3.5 5V1.5h8V5M3.5 10.5H2a1 1 0 01-1-1v-4a1 1 0 011-1h11a1 1 0 011 1v4a1 1 0 01-1 1h-1.5M3.5 8h8v5.5h-8V8z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Друкувати
      </button>
    </div>
  );
}
