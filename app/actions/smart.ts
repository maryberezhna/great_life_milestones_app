'use server';

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type SmartLetter = 'S' | 'M' | 'A' | 'R' | 'T';

export interface SmartCheck {
  missing: SmartLetter[];     // empty — the goal is SMART enough
  hint: string;               // what exactly is missing, one short sentence
  suggestion: string | null;  // her title + the date she set; never applied by itself
}

const LETTERS: SmartLetter[] = ['S', 'M', 'A', 'R', 'T'];

export async function checkSmart(
  title: string,
  targetDate: string | null,
  today: string,
): Promise<SmartCheck> {
  const t = title.trim();
  if (t.length < 3) return { missing: [], hint: '', suggestion: null };

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system:
      'You are a concise goal coach who checks goals against SMART and writes in Ukrainian. Return ONLY valid JSON, no markdown, no explanation.',
    messages: [
      {
        role: 'user',
        content: `Ціль: "${t}"
Дата, до якої хочу дійти: ${targetDate ? ukDate(targetDate.slice(0, 10)) : 'не вказана'}
Сьогодні: ${today}

Перевір ціль за SMART:
- S (конкретна): зрозуміло, що саме буде зроблено чи отримано
- M (вимірювана): видно, як зрозуміти, що ціль досягнута (число, факт, результат)
- A (досяжна): реалістично для однієї людини
- R (значуща): вважай виконаною, якщо ціль не зовсім розмита
- T (обмежена в часі): у назві є строк АБО вказана дата вище

Якщо чогось бракує — hint: одне-два коротких запитання до мене, щоб я сама уточнила саме те,
чого бракує (що саме буде зроблено, як я зрозумію, що вийшло, до коли). Тепло, без повчань.
НЕ пропонуй власних варіантів, чисел, дат, деталей чи прикладів — лише запитання.

Поверни ТІЛЬКИ JSON:
{"S": true, "M": false, "A": true, "R": true, "T": false, "hint": "..."}
Якщо все true — hint порожній рядок.`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const json = text.match(/\{[\s\S]*\}/);
  if (!json) throw new Error('AI не повернув валідний JSON');
  const parsed: Record<string, unknown> = JSON.parse(json[0]);

  const missing = LETTERS.filter(l => parsed[l] === false);
  // A wording to take is offered only when it can be built from her own words: the date she set
  // and nothing else missing. The model used to fill gaps itself («з трьома змінами образу до
  // 2026-11-23» — 23.10.2026), so it no longer writes wordings at all.
  const onlyDate = missing.length === 1 && missing[0] === 'T' && targetDate;
  return {
    missing,
    hint: missing.length && typeof parsed.hint === 'string' ? parsed.hint.trim() : '',
    suggestion: onlyDate ? `${t} до ${ukDate(targetDate.slice(0, 10))}` : null,
  };
}

const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
// «2026-11-23» → «23 листопада 2026»
function ukDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
