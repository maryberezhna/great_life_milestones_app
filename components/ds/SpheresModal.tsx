'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createSphere, updateSphere, deleteSphere } from '@/app/actions/spheres';
import { SPHERE_PALETTE } from '@/lib/sphere-palette';
import type { ConstellationSphere } from './GoalConstellation';

const HEX_TO_KEY: Record<string, string> = {
  '#8B5CF6': 'violet', '#F59E0B': 'amber', '#10B981': 'sage',
  '#EC4899': 'rose',   '#3B82F6': 'blue',  '#14B8A6': 'teal',
  '#F97316': 'clay',   '#6366F1': 'indigo',
};

interface Props {
  spheres: ConstellationSphere[];
  onClose: () => void;
}

function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {SPHERE_PALETTE.map(c => {
        const on = value === c.hex;
        return (
          <button key={c.key} data-no-brighten title={c.label}
            onClick={() => onChange(c.hex)}
            style={{
              width: 26, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: `hsl(var(--sphere-${c.key}))`,
              boxShadow: on ? `0 0 0 2px hsl(var(--surface-base)), 0 0 0 4px hsl(var(--sphere-${c.key}))` : 'none',
              transform: on ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform .18s ease, box-shadow .18s ease',
            }}
          />
        );
      })}
    </div>
  );
}

export function SpheresModal({ spheres, onClose }: Props) {
  const router = useRouter();
  const [, startT] = useTransition();

  // New sphere form
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newColor, setNewColor] = useState('#8B5CF6');
  const [adding, setAdding] = useState(false);

  // Edit state per sphere
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');

  // Delete confirmations
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

  function startEdit(s: ConstellationSphere) {
    setEditId(s.id);
    setEditName(s.name);
    setEditIcon(String(s.icon ?? ''));
    setEditColor(s.color);
    setDeleteConfirm(null);
  }

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(false);
    startT(async () => {
      await createSphere(name, newIcon.trim() || '⭐', newColor);
      setNewName(''); setNewIcon(''); setNewColor('#8B5CF6');
      router.refresh();
    });
  }

  function handleSaveEdit() {
    if (!editId) return;
    startT(async () => {
      await updateSphere(editId, { name: editName, icon: editIcon, color: editColor });
      setEditId(null);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startT(async () => {
      const res = await deleteSphere(id);
      if (!res.ok) {
        setDeleteError(e => ({ ...e, [id]: res.reason ?? 'Помилка' }));
        setDeleteConfirm(null);
      } else {
        setDeleteConfirm(null);
        router.refresh();
      }
    });
  }

  const colorKey = (hex: string) => HEX_TO_KEY[hex] ?? 'violet';

  return (
    <aside style={{
      position: 'absolute', top: 0, right: 0, height: '100%', width: 400,
      background: 'hsl(var(--surface-card))',
      boxShadow: '-18px 0 48px hsl(28 16% 10% / .18)',
      zIndex: 22, display: 'flex', flexDirection: 'column',
      animation: 'panel-in .38s cubic-bezier(0.22,1,0.36,1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '22px 24px 18px',
        borderBottom: '1px solid hsl(var(--border-subtle))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(var(--text-faint))', marginBottom: 4 }}>
            Управління
          </div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: 'hsl(var(--text-strong))', margin: 0 }}>
            Сфери
          </h2>
        </div>
        <button onClick={onClose} data-no-brighten style={{
          width: 34, height: 34, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'hsl(var(--surface-sunken))', color: 'hsl(var(--text-muted))',
          fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* Add new sphere */}
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            style={{
              width: '100%', padding: '10px', borderRadius: 'var(--radius-md)',
              border: '1.5px dashed hsl(var(--border-subtle))',
              background: 'transparent', color: 'hsl(var(--text-muted))',
              cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13.5,
              marginBottom: 16,
            }}
          >
            + Нова сфера
          </button>
        ) : (
          <div style={{
            padding: '14px', borderRadius: 'var(--radius-md)',
            border: '1.5px solid hsl(var(--sphere-violet))',
            background: 'hsl(var(--sphere-violet-soft))',
            marginBottom: 16,
            animation: 'fade-up .22s ease',
          }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--sphere-violet))', marginBottom: 10 }}>
              Нова сфера
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                value={newIcon}
                onChange={e => setNewIcon(e.target.value)}
                placeholder="⭐"
                maxLength={2}
                style={{
                  width: 48, padding: '8px', borderRadius: 'var(--radius-md)', textAlign: 'center',
                  border: '1.5px solid hsl(var(--border-subtle))', outline: 'none',
                  fontFamily: 'var(--font-sans)', fontSize: 18, background: 'hsl(var(--surface-base))',
                  color: 'hsl(var(--text-strong))',
                }}
              />
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Назва сфери…"
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)',
                  border: '1.5px solid hsl(var(--border-subtle))', outline: 'none',
                  fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                  background: 'hsl(var(--surface-base))', color: 'hsl(var(--text-strong))',
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <ColorPicker value={newColor} onChange={setNewColor} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAdding(false)} data-no-brighten style={{
                flex: 1, padding: '8px', borderRadius: 'var(--radius-md)',
                border: '1px solid hsl(var(--border-subtle))', background: 'transparent',
                color: 'hsl(var(--text-muted))', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13,
              }}>Скасувати</button>
              <button onClick={handleAdd} disabled={!newName.trim()} style={{
                flex: 2, padding: '8px', borderRadius: 'var(--radius-md)',
                border: 'none',
                background: newName.trim() ? `hsl(var(--sphere-${colorKey(newColor)}))` : 'hsl(var(--surface-sunken))',
                color: newName.trim() ? '#fff' : 'hsl(var(--text-faint))',
                cursor: newName.trim() ? 'pointer' : 'default',
                fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13,
              }}>Додати</button>
            </div>
          </div>
        )}

        {/* Existing spheres */}
        {spheres.map(s => {
          const isEditing = editId === s.id;
          const isConfirmDelete = deleteConfirm === s.id;
          const err = deleteError[s.id];
          const ck = colorKey(s.color);

          return (
            <div key={s.id} style={{
              padding: '12px 14px', borderRadius: 'var(--radius-md)',
              background: 'hsl(var(--surface-base))',
              border: `1px solid ${isEditing ? `hsl(var(--sphere-${colorKey(editColor)}))` : 'hsl(var(--border-subtle))'}`,
              marginBottom: 8,
              transition: 'border-color .2s ease',
            }}>
              {isEditing ? (
                /* Edit form */
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input
                      value={editIcon}
                      onChange={e => setEditIcon(e.target.value)}
                      maxLength={2}
                      style={{
                        width: 48, padding: '7px', borderRadius: 'var(--radius-md)', textAlign: 'center',
                        border: '1.5px solid hsl(var(--border-subtle))', outline: 'none',
                        fontFamily: 'var(--font-sans)', fontSize: 18, background: 'hsl(var(--surface-base))',
                        color: 'hsl(var(--text-strong))',
                      }}
                    />
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                      style={{
                        flex: 1, padding: '7px 12px', borderRadius: 'var(--radius-md)',
                        border: '1.5px solid hsl(var(--border-subtle))', outline: 'none',
                        fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                        background: 'hsl(var(--surface-base))', color: 'hsl(var(--text-strong))',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <ColorPicker value={editColor} onChange={setEditColor} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditId(null)} data-no-brighten style={{
                      flex: 1, padding: '7px', borderRadius: 'var(--radius-md)',
                      border: '1px solid hsl(var(--border-subtle))', background: 'transparent',
                      color: 'hsl(var(--text-muted))', cursor: 'pointer',
                      fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12.5,
                    }}>Скасувати</button>
                    <button onClick={handleSaveEdit} style={{
                      flex: 2, padding: '7px', borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: `hsl(var(--sphere-${colorKey(editColor)}))`,
                      color: '#fff', cursor: 'pointer',
                      fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 12.5,
                    }}>Зберегти</button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                      background: `hsl(var(--sphere-${ck}-soft))`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                    }}>
                      {s.icon as string}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 999, background: `hsl(var(--sphere-${ck}))`, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: 'hsl(var(--text-strong))' }}>
                          {s.name}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => startEdit(s)} data-no-brighten style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'hsl(var(--text-faint))', padding: '4px 6px', borderRadius: 6,
                      fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                      transition: 'color .15s ease',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = `hsl(var(--sphere-${ck}))`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--text-faint))'; }}
                    >
                      Редагувати
                    </button>
                    {!isConfirmDelete ? (
                      <button onClick={() => { setDeleteConfirm(s.id); setDeleteError(e => ({ ...e, [s.id]: '' })); }}
                        data-no-brighten style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'hsl(var(--text-faint))', padding: '4px',
                          transition: 'color .15s ease',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#dc2626'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--text-faint))'; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <path d="M1 3h11M4.5 3V2a1 1 0 011-1h2a1 1 0 011 1v1M5 5.5v4M8 5.5v4M2 3l.75 7a1 1 0 001 .75h5.5a1 1 0 001-.75L11 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    ) : null}
                  </div>

                  {/* Delete confirm */}
                  {isConfirmDelete && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'hsl(0 60% 97%)' }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#991b1b', marginBottom: 8, fontWeight: 500 }}>
                        Архівувати сферу? Цілі без сфери залишаться.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setDeleteConfirm(null)} data-no-brighten style={{
                          flex: 1, padding: '6px', borderRadius: 'var(--radius-md)',
                          border: '1px solid hsl(var(--border-subtle))', background: 'transparent',
                          color: 'hsl(var(--text-muted))', cursor: 'pointer',
                          fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12.5,
                        }}>Скасувати</button>
                        <button onClick={() => handleDelete(s.id)} style={{
                          flex: 1, padding: '6px', borderRadius: 'var(--radius-md)',
                          border: 'none', background: '#dc2626', color: '#fff',
                          cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 12.5,
                        }}>Архівувати</button>
                      </div>
                    </div>
                  )}

                  {err && (
                    <div style={{ marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: 12, color: '#dc2626' }}>
                      ⚠ {err}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
