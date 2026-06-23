'use server';

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AiStep {
  specific: string;
  deadline: string; // YYYY-MM-DD
}

export async function decomposeWithAI(
  goalTitle: string,
  sphereName: string,
  today: string,
): Promise<AiStep[]> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system:
      'You are a concise productivity coach who writes ultra-short action steps in Ukrainian. Each step starts with a verb and names only the outcome. Return ONLY valid JSON — an array of objects, no markdown, no explanation.',
    messages: [
      {
        role: 'user',
        content: `Ціль: "${goalTitle}"
Сфера: "${sphereName}"
Сьогодні: ${today}

Розбий цю ціль на 3–5 кроків. Правила для кожного кроку:
- Починається з дієслова (Записатися, Порівняти, Обрати, Підготувати, Встановити…)
- Описує РЕЗУЛЬТАТ, а не процес — що буде зроблено, а не як
- Максимум 6–8 слів, без зайвих деталей і пояснень
- Дедлайн реалістичний, кроки рівномірно розподілені від сьогодні

Кращий формат — через досягнення (що буде ВИКОНАНО):
✓ "Пройти консультацію ортодонта"
✓ "Отримати план лікування та кошториси"
✓ "Обрати клініку та метод лікування"
✗ НЕ: "Провести дослідження ринку і зібрати інформацію про варіанти"
✗ НЕ: "Записатися та відвідати консультацію ортодонта для отримання рекомендацій"

Поверни ТІЛЬКИ JSON-масив, без markdown:
[{"specific": "...", "deadline": "YYYY-MM-DD"}, ...]`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]';
  const cleaned = text.replace(/```json\n?|```/g, '').trim();
  const steps: AiStep[] = JSON.parse(cleaned);

  if (!Array.isArray(steps)) throw new Error('AI returned non-array');

  return steps.slice(0, 5).map(s => ({
    specific: String(s.specific ?? ''),
    deadline: String(s.deadline ?? ''),
  }));
}
