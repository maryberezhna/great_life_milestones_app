'use server';

import { createClient } from '@/lib/supabase/server';
import { getRequiredUserId } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface WeeklyReport {
  summary: string;
  wins: string[];
  focus: string[];
  encouragement: string;
  generatedAt: string;
}

export async function generateWeeklyReport(): Promise<WeeklyReport> {
  const userId = await getRequiredUserId();
  const supabase = await createClient();

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const now = new Date().toISOString();

  const [
    { data: goals },
    { data: doneTasks },
    { data: pendingTasks },
  ] = await Promise.all([
    supabase
      .from('plan_goals')
      .select('id, title, status, spheres(name, icon)')
      .eq('user_id', userId)
      .in('status', ['active', 'paused', 'done']),
    supabase
      .from('plan_tasks')
      .select('specific, deadline, plan_goals(title, spheres(name, icon))')
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('updated_at', weekAgo)
      .lte('updated_at', now),
    supabase
      .from('plan_tasks')
      .select('specific, deadline')
      .eq('user_id', userId)
      .in('status', ['active', 'postponed'])
      .lte('deadline', new Date(Date.now() + 7 * 86_400_000).toISOString()),
  ]);

  const activeGoals = (goals ?? []).filter((g: any) => g.status === 'active');
  const pausedGoals = (goals ?? []).filter((g: any) => g.status === 'paused');

  const goalsSummary = activeGoals
    .map((g: any) => {
      const sphere = Array.isArray(g.spheres) ? g.spheres[0] : g.spheres;
      return `• ${sphere?.icon ?? ''} ${sphere?.name ?? ''}: ${g.title}`;
    })
    .join('\n');

  const doneList = (doneTasks ?? [])
    .map((t: any) => {
      const goal = Array.isArray(t.plan_goals) ? t.plan_goals[0] : t.plan_goals;
      const sphere = Array.isArray(goal?.spheres) ? goal.spheres[0] : goal?.spheres;
      return `• ${t.specific}${sphere ? ` (${sphere.icon} ${sphere.name})` : ''}`;
    })
    .join('\n');

  const upcomingList = (pendingTasks ?? [])
    .slice(0, 8)
    .map((t: any) => {
      const d = t.deadline ? new Date(t.deadline).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }) : '';
      return `• ${t.specific}${d ? ` — до ${d}` : ''}`;
    })
    .join('\n');

  const prompt = `Ти підтримуючий особистий коуч. Проаналізуй тижневий прогрес і напиши короткий звіт.

АКТИВНІ ЦІЛІ (${activeGoals.length}):
${goalsSummary || 'Немає активних цілей'}

${pausedGoals.length > 0 ? `НА ПАУЗІ (${pausedGoals.length}): ${pausedGoals.map((g: any) => g.title).join(', ')}` : ''}

ВИКОНАНІ ЗАДАЧІ ЗА ТИЖДЕНЬ (${doneTasks?.length ?? 0}):
${doneList || 'Не виконано жодної задачі'}

ЗАДАЧІ НА НАСТУПНИЙ ТИЖДЕНЬ:
${upcomingList || 'Немає задач з дедлайнами'}

Відповідай СТРОГО у форматі JSON:
{
  "summary": "1-2 речення про загальний прогрес тижня",
  "wins": ["досягнення 1", "досягнення 2", "досягнення 3"],
  "focus": ["пріоритет 1 на наступний тиждень", "пріоритет 2", "пріоритет 3"],
  "encouragement": "коротке надихаюче слово (1 речення), тон — теплий, не формальний"
}

Правила:
- Якщо виконано 0 задач — не осуджуй, знайди позитив (пауза теж частина процесу)
- wins та focus — максимум 3 пункти кожен, без зайвого
- Тон — як друг, не як менеджер
- Відповідь ЛИШЕ JSON, без жодного тексту ззовні`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI не повернув валідний JSON');

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    summary: parsed.summary ?? '',
    wins: parsed.wins ?? [],
    focus: parsed.focus ?? [],
    encouragement: parsed.encouragement ?? '',
    generatedAt: new Date().toISOString(),
  };
}
