// A sensible time of day for a step, from its wording — same rules the AI decomposition follows.
const RULES: [RegExp, string][] = [
  [/лікар|запис|дзвін|подзвон|подат|аналіз|лаборатор|консультац|документ|банк|установ|зустріч|співбесід/i, '10:00'],
  [/трен|спорт|біг|зал|йог|басейн|прогулян/i, '19:00'],
  [/вчи|курс|модул|урок|читат|книг|рівень|тест|іспит|сертифікац|стат(т|ю)|напис|план/i, '20:00'],
  [/купи|покупк|замов|прибра|ремонт|переїзд/i, '11:00'],
  [/фото|сім|мам|тат|діт|подар|творч|малюв/i, '17:30'],
];

export function suggestTime(text: string, fallback = '09:00'): string {
  for (const [re, time] of RULES) if (re.test(text)) return time;
  return fallback;
}
