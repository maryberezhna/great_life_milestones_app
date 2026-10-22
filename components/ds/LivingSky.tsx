'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ConstellationGoal, ConstellationSphere } from './GoalConstellation';

// Living sky: «Я» in the centre, spheres around, goals as stars.
// A star glows from recent steps and fades without them — goals are kept alive, not "finished once".

interface Props {
  goals: ConstellationGoal[];
  spheres: ConstellationSphere[];
  selectedId?: string | null;
  onSelect?: (goal: ConstellationGoal) => void;
  onMeClick?: () => void;
  style?: React.CSSProperties;
}

const DAY = 86_400_000;
const NIGHT = '#12111a';
const QUIET = '#5b5872';

export function plural(n: number, one: string, few: string, many: string) {
  if (n % 10 === 1 && n % 100 !== 11) return one;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
  return many;
}
const tyzh = (n: number) => `${n} ${plural(n, 'тиждень', 'тижні', 'тижнів')}`;
const kroky = (n: number) => `${n} ${plural(n, 'крок', 'кроки', 'кроків')}`;

export function weeksAgo(d: string, now: number) { return Math.max(0, Math.floor((now - new Date(d).getTime()) / (7 * DAY))); }
// each step adds light that fades over ~3 weeks
export function energy(dates: string[], now: number) {
  return Math.min(1, dates.reduce((a, d) => a + 0.45 * Math.exp(-(now - new Date(d).getTime()) / DAY / 21), 0));
}
const mix = (c: string, e: number) => `color-mix(in srgb, ${c} ${Math.round(35 + e * 65)}%, ${QUIET})`;

function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of text.split(' ')) {
    if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  if (out.length > 2) { out.length = 2; out[1] = out[1].replace(/\s*\S*$/, '') + '…'; }
  return out;
}

const halo: React.CSSProperties = { paintOrder: 'stroke', stroke: NIGHT, strokeWidth: 5, strokeLinejoin: 'round' };
// small captions: thinner halo so the letters stay crisp
const haloThin: React.CSSProperties = { ...halo, strokeWidth: 3 };
const CAPTION = '#b6b1d1';
const sans = 'var(--font-sans)';

interface SphereGroup { sphere: ConstellationSphere; goals: ConstellationGoal[]; }

function goalLine(g: ConstellationGoal, now: number) {
  const dates = g.doneDates ?? [];
  const last = dates.length ? Math.min(...dates.map(d => weeksAgo(d, now))) : null;
  const age = g.createdAt ? weeksAgo(g.createdAt, now) : null;
  if (g.status === 'done') return { text: `завершено${dates.length ? ` · ${kroky(dates.length)}` : ''}`, lit: true };
  if (g.status === 'paused') return { text: 'на паузі', lit: false };
  if ((g.total ?? 0) > 0 && (g.done ?? 0) >= (g.total ?? 0)) return { text: 'усі кроки є — завершити?', lit: true };
  if (last === 0) return { text: `крок цього тижня · ${kroky(dates.length)}`, lit: true };
  if (last !== null) return { text: `тиша ${tyzh(last)}`, lit: false };
  if (!g.total) return { text: 'ще без кроків', lit: false };
  return { text: `чекає першого кроку${age ? ` · ${tyzh(age)}` : ''}`, lit: false };
}

function Star({ g, color, x, y, now, selected }: { g: ConstellationGoal; color: string; x: number; y: number; now: number; selected: boolean }) {
  const dates = g.doneDates ?? [];
  const e = energy(dates, now);
  const ring = selected ? <circle cx={x} cy={y} r={19} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.5} /> : null;
  if (g.status === 'done') return (<>
    <circle cx={x} cy={y} r={15} fill={color} fillOpacity={0.14} />
    <circle cx={x} cy={y} r={11} fill="none" stroke={color} strokeWidth={1.8} />
    <circle cx={x} cy={y} r={6} fill="#fff" />{ring}
  </>);
  if (!dates.length) return (<>
    <circle cx={x} cy={y} r={7} fill={color} fillOpacity={0.05} stroke={color} strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="3 3" />{ring}
  </>);
  const r = 5 + e * 6;
  return (<>
    <circle className="sky-twinkle" cx={x} cy={y} r={r + 10 * e} fill={color} fillOpacity={0.08 + 0.2 * e} />
    <circle cx={x} cy={y} r={r} fill={mix(color, e)} />{ring}
  </>);
}

function Goal({ g, color, hub, x, y, labelX, dir, max, now, selected, onSelect }: {
  g: ConstellationGoal; color: string; hub: { x: number; y: number }; x: number; y: number;
  labelX: number; dir: 1 | -1; max: number; now: number; selected: boolean; onSelect?: (g: ConstellationGoal) => void;
}) {
  const { text, lit } = goalLine(g, now);
  const lines = wrap(g.title, max);
  const ty = y - (lines.length === 2 ? 13 : 5);
  const anchor = dir > 0 ? 'start' : 'end';
  const k = 38 * dir;
  return (
    <g style={{ cursor: 'pointer' }} onClick={() => onSelect?.(g)} role="button" aria-label={g.title}>
      <path d={`M${hub.x} ${hub.y} C ${hub.x + k} ${hub.y}, ${x - k} ${y}, ${x - 11 * dir} ${y}`}
        stroke={color} strokeOpacity={lit ? 0.55 : 0.2} fill="none" strokeWidth={1.2} />
      <Star g={g} color={color} x={x} y={y} now={now} selected={selected} />
      {lines.map((l, i) => (
        <text key={i} x={labelX} y={ty + i * 16.5} textAnchor={anchor}
          style={{ ...halo, font: `600 14px ${sans}`, fill: lit || selected ? '#fff' : '#bdb8d3' }}>{l}</text>
      ))}
      <text x={labelX} y={ty + lines.length * 16.5 + 1} textAnchor={anchor}
        style={{ ...haloThin, font: `600 12.5px ${sans}`, fill: lit ? color : CAPTION }}>{text}</text>
      {/* generous hit area */}
      <rect x={dir > 0 ? x - 16 : labelX - 230} y={y - 24} width={dir > 0 ? labelX - x + 246 : x - labelX + 246} height={48} fill="transparent" />
    </g>
  );
}

function SphereNode({ group, hub, anchor, dx, dy, now }: {
  group: SphereGroup; hub: { x: number; y: number }; anchor: 'middle' | 'start'; dx: number; dy: number; now: number;
}) {
  const { sphere: s, goals } = group;
  const dates = goals.flatMap(g => g.doneDates ?? []);
  const e = energy(dates, now);
  const on = new Set(dates.map(d => weeksAgo(d, now)));
  const last = dates.length ? Math.min(...dates.map(d => weeksAgo(d, now))) : null;
  const state = last === 0 ? 'світиться цього тижня' : last !== null ? `тьмяніє · ${tyzh(last)}` : 'у тиші';
  const x0 = anchor === 'middle' ? hub.x + dx - 54 : hub.x + dx;
  return (<>
    <circle className={e ? 'sky-twinkle' : undefined} cx={hub.x} cy={hub.y} r={16 + 12 * e} fill={s.color} fillOpacity={0.1 + 0.2 * e} />
    <circle cx={hub.x} cy={hub.y} r={6 + 3 * e} fill={mix(s.color, e)} />
    <text x={hub.x + dx} y={hub.y + dy} textAnchor={anchor}
      style={{ ...halo, font: `800 12.5px ${sans}`, letterSpacing: '.1em', textTransform: 'uppercase', fill: mix(s.color, Math.max(e, 0.45)) }}>{s.name}</text>
    <text x={hub.x + dx} y={hub.y + dy + 15} textAnchor={anchor} style={{ ...haloThin, font: `600 12px ${sans}`, fill: CAPTION }}>{state}</text>
    {Array.from({ length: 12 }, (_, i) => 11 - i).map((wk, i) => (
      <circle key={wk} cx={x0 + i * 9 + 3} cy={hub.y + dy + 28} r={3}
        fill={on.has(wk) ? s.color : '#34324a'} stroke={wk === 0 ? '#6d6a86' : undefined} strokeWidth={wk === 0 ? 1 : undefined} />
    ))}
  </>);
}

function Me({ x, y, r, onClick }: { x: number; y: number; r: number; onClick?: () => void }) {
  return (<g className="sky-me" onClick={onClick} role="button" aria-label="Моя статистика" style={{ cursor: onClick ? 'pointer' : undefined }}>
    <title>Моя статистика</title>
    <defs>
      <radialGradient id="sky-sun" cx=".4" cy=".35">
        <stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#ece6ff" /><stop offset="1" stopColor="#c3b3ff" />
      </radialGradient>
    </defs>
    <circle cx={x} cy={y} r={r * 2.2} fill="#a28cff" fillOpacity={0.08} />
    <circle cx={x} cy={y} r={r * 1.5} fill="#a28cff" fillOpacity={0.1} />
    <circle cx={x} cy={y} r={r} fill="url(#sky-sun)" />
    <text x={x} y={y + r * 0.24} textAnchor="middle" style={{ font: `800 ${Math.round(r * 0.7)}px ${sans}`, fill: '#1b1930' }}>Я</text>
  </g>);
}

// same faint stars on every render (seeded)
function starField(w: number, h: number) {
  let seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 180 }, () => ({ x: rnd() * w, y: rnd() * h, r: rnd() * 1.1 + 0.2, o: rnd() * 0.3 + 0.04 }));
}

function Background({ w, h }: { w: number; h: number }) {
  const stars = useMemo(() => starField(w, h), [w, h]);
  return <>{stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" fillOpacity={s.o} />)}</>;
}

export function LivingSky({ goals, spheres, selectedId, onSelect, onMeClick, style }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 820));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const groups: SphereGroup[] = spheres
    .map(s => ({ sphere: s, goals: goals.filter(g => g.sphereId ? g.sphereId === s.id : g.sphere === s.key) }))
    .filter(gr => gr.goals.length > 0);


  let W: number, H: number;
  const lines: React.ReactNode[] = [];
  const body: React.ReactNode[] = [];

  if (!narrow) {
    W = 1260;
    const rowH = 60, gap = 40, top = 50;
    const L: SphereGroup[] = [], R: SphereGroup[] = [];
    let nl = 0, nr = 0;
    groups.forEach(gr => { if (nl <= nr) { L.push(gr); nl += gr.goals.length; } else { R.push(gr); nr += gr.goals.length; } });
    const blockH = (gr: SphereGroup) => gr.goals.length * rowH + 30;
    const sideH = (side: SphereGroup[]) => side.reduce((a, gr) => a + blockH(gr), 0) + gap * Math.max(side.length - 1, 0);
    H = Math.max(sideH(L), sideH(R), 260) + top * 2;
    const me = { x: W / 2, y: H / 2 };
    const side = (list: SphereGroup[], dir: 1 | -1) => {
      let y = top + (H - top * 2 - sideH(list)) / 2;
      list.forEach((gr, idx) => {
        const h = blockH(gr);
        const hubX = me.x + dir * (idx % 2 ? 250 : 175);              // staggered — no straight columns
        const hub = { x: hubX, y: y + 30 + (h - 30) / 2 };
        const e = energy(gr.goals.flatMap(g => g.doneDates ?? []), now);
        lines.push(<path key={`l${gr.sphere.id}`} d={`M${me.x} ${me.y} C ${me.x + dir * 90} ${me.y}, ${hub.x - dir * 90} ${hub.y}, ${hub.x} ${hub.y}`}
          stroke={gr.sphere.color} strokeOpacity={0.18 + 0.5 * e} strokeWidth={1.4 + 1.4 * e} fill="none" />);
        const half = (gr.goals.length - 1) / 2 || 1;
        gr.goals.forEach((g, i) => {
          const t = gr.goals.length > 1 ? (i - (gr.goals.length - 1) / 2) / half : 0;
          body.push(<Goal key={g.id ?? g.title} g={g} color={gr.sphere.color} hub={hub} now={now}
            x={hubX + dir * (78 + 26 * (1 - t * t))} y={y + 30 + rowH / 2 + i * rowH}
            labelX={hubX + dir * 126} dir={dir} max={30} selected={g.id === selectedId} onSelect={onSelect} />);
        });
        const dy = -(h - 30) / 2 - 12 > -44 ? -48 : -(h - 30) / 2 - 22;
        body.push(<SphereNode key={`s${gr.sphere.id}`} group={gr} hub={hub} anchor="middle" dx={0} dy={dy} now={now} />);
        y += h + gap;
      });
    };
    side(L, -1); side(R, 1);
    body.push(<Me key="me" x={me.x} y={me.y} r={34} onClick={onMeClick} />);
  } else {
    W = 380;
    const rowH = 60, gap = 30, head = 58;
    const me = { x: W / 2, y: 104 };                               // centred under the floating top bar
    let y = 150, prev = me;
    groups.forEach((gr, idx) => {
      const h = gr.goals.length * rowH;
      const hub = { x: idx % 2 ? 58 : 30, y: y + head + h / 2 };     // trunk sways left/right
      const e = energy(gr.goals.flatMap(g => g.doneDates ?? []), now);
      lines.push(<path key={`l${gr.sphere.id}`} d={`M${prev.x} ${prev.y} C ${prev.x} ${prev.y + 50}, ${hub.x} ${hub.y - 50}, ${hub.x} ${hub.y}`}
        stroke={gr.sphere.color} strokeOpacity={0.18 + 0.5 * e} strokeWidth={1.4 + 1.2 * e} fill="none" />);
      const half = (gr.goals.length - 1) / 2 || 1;
      gr.goals.forEach((g, i) => {
        const t = gr.goals.length > 1 ? (i - (gr.goals.length - 1) / 2) / half : 0;
        body.push(<Goal key={g.id ?? g.title} g={g} color={gr.sphere.color} hub={hub} now={now}
          x={hub.x + 52 + 18 * (1 - t * t)} y={y + head + rowH / 2 + i * rowH}
          labelX={140} dir={1} max={26} selected={g.id === selectedId} onSelect={onSelect} />);
      });
      body.push(<SphereNode key={`s${gr.sphere.id}`} group={gr} hub={hub} anchor="start" dx={18} dy={y + 14 - hub.y} now={now} />);
      prev = hub;
      y += head + h + gap;
    });
    H = Math.max(y + 90, 200);                                      // clear the tab bar
    body.push(<Me key="me" x={me.x} y={me.y} r={24} onClick={onMeClick} />);
  }

  return (
    <div ref={wrapRef} style={{
      ...style, overflowY: 'auto', overflowX: 'hidden',
      background: `radial-gradient(640px 460px at 50% ${narrow ? '0%' : '50%'}, #27244a 0%, transparent 70%), radial-gradient(700px 500px at 90% 100%, #182433 0%, transparent 60%), ${NIGHT}`,
    }}>
      <style>{`
        @keyframes sky-tw { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
        .sky-twinkle { animation: sky-tw 3s ease-in-out infinite; }
        .sky-me { transition: filter .2s; } .sky-me:hover { filter: brightness(1.12) drop-shadow(0 0 10px rgb(190 170 255 / .6)); }
        @media (prefers-reduced-motion: reduce) { .sky-twinkle { animation: none; } }
      `}</style>
      {groups.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#8f8ba6', fontFamily: sans, fontSize: 14 }}>Тут поки немає цілей.</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', maxWidth: narrow ? undefined : 1400, height: 'auto', margin: '0 auto' }}>
          <Background w={W} h={H} />
          {lines}
          {body}
        </svg>
      )}
    </div>
  );
}
