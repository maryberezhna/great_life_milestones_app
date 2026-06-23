'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface NavItem { href: string; icon: string; label: string; }
interface Sphere {
  id: string; name: string; color: string; icon: string;
  is_active: boolean; active_goal_count: number;
}

interface Props {
  nav: NavItem[];
  spheres: Sphere[];
  userEmail: string | null;
  children: React.ReactNode;
}

const HEX_TO_KEY: Record<string, string> = {
  '#8B5CF6': 'violet', '#F59E0B': 'amber', '#10B981': 'sage',
  '#EC4899': 'rose',   '#3B82F6': 'blue',
};

export function AppShell({ nav, spheres, userEmail, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 8px 20px' }}>
        <span style={{ color: 'hsl(var(--primary))' }}>
          <svg width="28" height="28" viewBox="0 0 512 512" fill="none">
            <path d="M150 366 L256 175 L362 366" stroke="currentColor" strokeWidth="70" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', color: 'hsl(var(--text-strong))', fontFamily: 'var(--font-sans)' }}>
          Sphere
        </span>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                background: active ? 'hsl(var(--primary-soft))' : 'transparent',
                color: active ? 'hsl(var(--primary))' : 'hsl(var(--text-body))',
                fontFamily: 'var(--font-sans)', fontWeight: active ? 600 : 500, fontSize: 14.5,
                transition: 'background .12s',
              }}>
                <span style={{ width: 19, height: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {item.icon}
                </span>
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Spheres label */}
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'hsl(var(--text-faint))', padding: '20px 12px 8px',
      }}>
        Сфери
      </div>

      {/* Sphere links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, overflowY: 'auto' }}>
        {spheres.map(s => {
          const dormant = !s.is_active || s.active_goal_count === 0;
          const color = dormant ? 'hsl(var(--sphere-dormant))' : (s.color ?? 'hsl(var(--primary))');
          return (
            <Link key={s.id} href={`/spheres/${s.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: color, flexShrink: 0 }} />
                <span style={{
                  flex: 1, fontSize: 14, fontWeight: 500,
                  color: dormant ? 'hsl(var(--text-muted))' : 'hsl(var(--text-strong))',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontFamily: 'var(--font-sans)',
                }}>
                  {s.name}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'hsl(var(--text-faint))' }}>
                  {dormant ? '·' : s.active_goal_count}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* User + Logout */}
      <div style={{
        marginTop: 'auto', paddingTop: 12,
        borderTop: '1px solid hsl(var(--border-subtle))',
      }}>
        {userEmail && (
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 12,
            color: 'hsl(var(--text-muted))', padding: '4px 12px 8px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {userEmail}
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            border: 'none', background: 'transparent',
            color: 'hsl(var(--text-muted))',
            fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--surface-sunken))')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ fontSize: 15 }}>↩</span>
          Вийти
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'hsl(var(--background))' }}>
      {/* Mobile overlay */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'hsl(28 16% 11% / 0.4)',
            zIndex: 40, display: 'none',
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`app-sidebar${drawerOpen ? ' open' : ''}`}
        style={{
          width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'hsl(var(--surface-card))',
          borderRight: '1px solid hsl(var(--border-subtle))',
          padding: '20px 14px',
          overflowY: 'auto',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Main */}
      <main className="app-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile header bar */}
        <div className="mobile-header" style={{ display: 'none' }}>
          <button
            onClick={() => setDrawerOpen(v => !v)}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              padding: '12px 16px', color: 'hsl(var(--text-body))',
              fontSize: 20, lineHeight: 1,
            }}
            aria-label="Меню"
          >
            ☰
          </button>
          <span style={{
            fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em',
            color: 'hsl(var(--text-strong))', fontFamily: 'var(--font-sans)',
          }}>
            Sphere
          </span>
          <div style={{ width: 44 }} />
        </div>

        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .app-sidebar {
            position: fixed !important;
            top: 0; left: 0; bottom: 0;
            z-index: 50;
            transform: translateX(-100%);
            transition: transform .25s cubic-bezier(0.22, 0.61, 0.36, 1);
            box-shadow: var(--shadow-xl);
          }
          .app-sidebar.open {
            transform: translateX(0);
          }
          .mobile-overlay { display: block !important; }
          .mobile-header {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid hsl(var(--border-subtle));
            background: hsl(var(--surface-card));
            position: sticky; top: 0; z-index: 10;
          }
        }
      `}</style>
    </div>
  );
}
