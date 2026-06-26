export const SPHERE_PALETTE = [
  { key: 'violet', hex: '#8B5CF6', label: 'Фіолетовий' },
  { key: 'blue',   hex: '#3B82F6', label: 'Синій' },
  { key: 'teal',   hex: '#14B8A6', label: 'Бірюзовий' },
  { key: 'sage',   hex: '#10B981', label: 'Зелений' },
  { key: 'amber',  hex: '#F59E0B', label: 'Жовтий' },
  { key: 'clay',   hex: '#F97316', label: 'Помаранчевий' },
  { key: 'rose',   hex: '#EC4899', label: 'Рожевий' },
  { key: 'indigo', hex: '#6366F1', label: 'Індиго' },
] as const;

export type SphereColor = typeof SPHERE_PALETTE[number]['key'];
