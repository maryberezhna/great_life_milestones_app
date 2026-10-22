'use server';

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type SmartLetter = 'S' | 'M' | 'A' | 'R' | 'T';

export interface SmartCheck {
  missing: SmartLetter[];     // empty — the goal is SMART enough
  hint: string;               // what exactly is missing, one short sentence
  suggestion: string | null;  // clearer wording to take with one tap; never applied by itself
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
Дата, до якої хочу дійти: ${targetDate ? targetDate.slice(0, 10) : 'не вказана'}
Сьогодні: ${today}

Перевір ціль за SMART:
- S (конкретна): зрозуміло, що саме буде зроблено чи отримано
- M (вимірювана): видно, як зрозуміти, що ціль досягнута (число, факт, результат)
- A (досяжна): реалістично для однієї людини
- R (значуща): вважай виконаною, якщо ціль не зовсім розмита
- T (обмежена в часі): у назві є строк АБО вказана дата вище

Якщо чогось бракує:
- hint — одне коротке речення, чого саме бракує, тепло, без повчань
- suggestion — та сама ціль, переписана чіткіше: до 12 слів, починається з дієслова,
  зберігає її зміст і слова, додає лише відсутнє (наприклад, строк чи мірило).
  Не вигадуй фактів про людину; якщо строк невідомий — запропонуй реалістичний відносно сьогодні.

Поверни ТІЛЬКИ JSON:
{"S": true, "M": false, "A": true, "R": true, "T": false, "hint": "...", "suggestion": "..."}
Якщо все true — hint і suggestion порожні рядки.`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const json = text.match(/\{[\s\S]*\}/);
  if (!json) throw new Error('AI не повернув валідний JSON');
  const parsed: Record<string, unknown> = JSON.parse(json[0]);

  const missing = LETTERS.filter(l => parsed[l] === false);
  const suggestion = typeof parsed.suggestion === 'string' ? parsed.suggestion.trim() : '';
  return {
    missing,
    hint: missing.length && typeof parsed.hint === 'string' ? parsed.hint.trim() : '',
    // a suggestion equal to her own text is no suggestion
    suggestion: missing.length && suggestion && suggestion !== t ? suggestion : null,
  };
}
