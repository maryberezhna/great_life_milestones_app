import { getDreams } from '@/app/actions/dreams';
import { getSpheres } from '@/app/actions/goals';
import { DreamList } from '@/components/ds/DreamList';

export default async function BacklogPage() {
  const [dreams, spheres] = await Promise.all([getDreams(), getSpheres()]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '32px 40px 28px', borderBottom: '1px solid hsl(var(--border-subtle) / .6)' }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600,
          color: 'hsl(var(--text-faint))', letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          Crazy list
        </div>
        <h1 style={{
          fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 30,
          letterSpacing: '-0.025em', color: 'hsl(var(--text-strong))',
          margin: 0, lineHeight: 1.1,
        }}>
          Просто мрії
        </h1>
        <p style={{
          fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 400,
          color: 'hsl(var(--text-muted))', margin: '8px 0 0', lineHeight: 1.5,
        }}>
          Речі, які хочу зробити колись — не зараз, але обов&apos;язково
        </p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 48px' }}>
        <DreamList initial={dreams} spheres={spheres} />
      </div>
    </div>
  );
}
