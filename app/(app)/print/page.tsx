import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';
import { PrintToolbar } from './PrintToolbar';

const HEX_TO_KEY: Record<string, string> = {
  '#8B5CF6': 'violet', '#F59E0B': 'amber', '#10B981': 'sage',
  '#EC4899': 'rose',   '#3B82F6': 'blue',  '#14B8A6': 'teal',
  '#F97316': 'clay',   '#6366F1': 'indigo',
};

const KEY_TO_HEX: Record<string, string> = Object.fromEntries(
  Object.entries(HEX_TO_KEY).map(([h, k]) => [k, h])
);

function deadlineStr(d: string | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function PrintPage() {
  const userId = await getRequiredUserId();
  const supabase = await createClient();

  const [{ data: spheresRaw }, { data: goalsRaw }, { data: tasksRaw }] = await Promise.all([
    supabase.from('spheres').select('id, name, color, icon, sort_order')
      .eq('user_id', userId).eq('archived', false).order('sort_order'),
    supabase.from('plan_goals').select('id, title, sphere_id, target_date, status, description')
      .eq('user_id', userId).in('status', ['active', 'paused']).order('created_at'),
    supabase.from('plan_tasks').select('goal_id, specific, status, deadline')
      .eq('user_id', userId).neq('status', 'irrelevant').order('created_at'),
  ]);

  const spheres = (spheresRaw ?? []) as { id: string; name: string; color: string; icon: string }[];
  const goals   = (goalsRaw  ?? []) as { id: string; title: string; sphere_id: string; target_date: string | null; status: string; description: string | null }[];
  const tasks   = (tasksRaw  ?? []) as { goal_id: string; specific: string; status: string; deadline: string | null }[];

  const tasksByGoal = new Map<string, typeof tasks>();
  for (const t of tasks) {
    if (!tasksByGoal.has(t.goal_id)) tasksByGoal.set(t.goal_id, []);
    tasksByGoal.get(t.goal_id)!.push(t);
  }

  const sphereGoals = spheres.map(s => ({
    ...s,
    hex: s.color,
    key: HEX_TO_KEY[s.color] ?? 'violet',
    goals: goals.filter(g => g.sphere_id === s.id),
  })).filter(s => s.goals.length > 0);

  const today = new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  const totalGoals = goals.length;
  const totalDone  = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Georgia', 'Times New Roman', serif; background: #fff; color: #1a1a1a; }


        .doc {
          max-width: 794px; margin: 0 auto;
          padding: 72px 48px 48px;
        }
        .doc-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          border-bottom: 2.5px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 28px;
        }
        .doc-title { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
        .doc-meta  { font-size: 11px; color: #666; text-align: right; line-height: 1.6; }

        .stats-row {
          display: flex; gap: 24px; margin-bottom: 28px;
        }
        .stat-box {
          border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 18px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .stat-n  { font-size: 22px; font-weight: 700; line-height: 1; }
        .stat-lbl{ font-size: 10px; color: #888; letter-spacing: 0.05em; text-transform: uppercase; font-family: system-ui, sans-serif; }

        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 28px; }

        .sphere-section { break-inside: avoid; }
        .sphere-header {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 10px; padding-bottom: 6px;
          border-bottom: 1.5px solid currentColor;
        }
        .sphere-icon  { font-size: 15px; line-height: 1; }
        .sphere-name  { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; font-family: system-ui, sans-serif; }

        .goal-item  { margin-bottom: 10px; break-inside: avoid; }
        .goal-title { font-size: 12px; font-weight: 600; line-height: 1.35; display: flex; align-items: flex-start; gap: 6px; font-family: system-ui, sans-serif; }
        .goal-check { flex-shrink: 0; width: 13px; height: 13px; border: 1.5px solid #999; border-radius: 3px; margin-top: 1px; }
        .goal-meta  { font-size: 10px; color: #888; margin-top: 3px; padding-left: 19px; font-family: system-ui, sans-serif; display: flex; gap: 10px; flex-wrap: wrap; }

        .steps-list { padding-left: 19px; margin-top: 4px; }
        .step-item  {
          font-size: 10px; color: #555; line-height: 1.4; font-family: system-ui, sans-serif;
          display: flex; align-items: flex-start; gap: 5px; margin-bottom: 2px;
        }
        .step-check { flex-shrink: 0; width: 10px; height: 10px; border: 1px solid #bbb; border-radius: 50%; margin-top: 1px; }
        .step-done  { color: #aaa; text-decoration: line-through; }
        .step-done .step-check { background: #bbb; }

        .footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #aaa; font-family: system-ui, sans-serif; text-align: center; }

        @media print {
          [data-toolbar] { display: none !important; }
          .doc { padding: 0; max-width: 100%; }
          @page { size: A4; margin: 16mm 14mm 12mm; }
          body { font-size: 10pt; }
          .grid { gap: 14px 20px; }
          .doc-title { font-size: 20px; }
          .doc-header { margin-bottom: 14px; padding-bottom: 8px; }
          .stats-row { margin-bottom: 14px; gap: 12px; }
          .stat-box { padding: 6px 12px; }
          .stat-n { font-size: 16px; }
          .sphere-section { margin-bottom: 2px; }
        }

        @media screen {
          .doc { padding-top: 88px; }
        }
      `}</style>

      <PrintToolbar />

      <div className="doc">
        {/* Document header */}
        <div className="doc-header">
          <div className="doc-title">Мої цілі</div>
          <div className="doc-meta">
            <div>{today}</div>
            <div>{totalGoals} активних цілей</div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-n">{totalGoals}</span>
            <span className="stat-lbl">цілей</span>
          </div>
          <div className="stat-box">
            <span className="stat-n">{totalTasks}</span>
            <span className="stat-lbl">кроків</span>
          </div>
          <div className="stat-box">
            <span className="stat-n">{totalDone}</span>
            <span className="stat-lbl">виконано</span>
          </div>
          <div className="stat-box">
            <span className="stat-n" style={{ color: totalTasks > 0 ? '#059669' : '#1a1a1a' }}>
              {totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0}%
            </span>
            <span className="stat-lbl">прогрес</span>
          </div>
        </div>

        {/* Goals grid by sphere */}
        <div className="grid">
          {sphereGoals.map(s => {
            const sGoals = s.goals;
            return (
              <div key={s.id} className="sphere-section">
                <div className="sphere-header" style={{ color: s.hex, borderBottomColor: s.hex + '66' }}>
                  <span className="sphere-icon">{s.icon}</span>
                  <span className="sphere-name">{s.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'system-ui', color: s.hex + 'aa' }}>
                    {sGoals.length} цілі
                  </span>
                </div>

                {sGoals.map(g => {
                  const gTasks = tasksByGoal.get(g.id) ?? [];
                  const doneCount = gTasks.filter(t => t.status === 'done').length;
                  const dl = deadlineStr(g.target_date);
                  const isPaused = g.status === 'paused';
                  return (
                    <div key={g.id} className="goal-item">
                      <div className="goal-title" style={{ opacity: isPaused ? 0.5 : 1 }}>
                        <span className="goal-check" style={{ borderColor: s.hex }} />
                        <span>{g.title}{isPaused ? ' ⏸' : ''}</span>
                      </div>
                      <div className="goal-meta">
                        {gTasks.length > 0 && (
                          <span style={{ color: s.hex }}>
                            {doneCount}/{gTasks.length} кроків
                          </span>
                        )}
                        {dl && <span>до {dl}</span>}
                      </div>

                      {/* Step list */}
                      {gTasks.length > 0 && (
                        <div className="steps-list">
                          {gTasks.map((t, i) => {
                            const isDone = t.status === 'done';
                            // strip URL from display
                            const text = t.specific.replace(/https?:\/\/[^\s]+/g, '').trim() || t.specific;
                            return (
                              <div key={i} className={`step-item${isDone ? ' step-done' : ''}`}>
                                <span className="step-check" />
                                <span>{text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="footer">Згенеровано {today} · Sphere</div>
      </div>
    </>
  );
}

