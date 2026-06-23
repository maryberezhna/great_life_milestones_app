# Planning App — Особистий планувальник цілей

Веб-застосунок для управління особистими цілями по сферах життя. Цілі відображаються як орбітальне сузір'я навколо центру «Я», кожна розкладається на конкретні кроки через AI або вручну. Окрема сторінка — «Просто мрії» (Crazy List) — зберігає далекі мрії та дає змогу конвертувати їх у реальні цілі.

---

## Стек

| Шар | Технологія |
|---|---|
| Framework | Next.js 16 (App Router, Server Components) |
| UI | React 19, TypeScript strict |
| Стилі | Inline styles + CSS variables (власна дизайн-система) |
| База даних | Supabase (Postgres + Auth + RLS) |
| AI | Anthropic Claude Haiku — декомпозиція кроків |
| Календар | Google Calendar URL API + iCalendar (.ics) |

---

## Структура проєкту

```
app/
  (app)/
    dashboard/        # Головний екран — сузір'я цілей
    calendar/         # Календар з дедлайнами задач
    backlog/          # «Просто мрії» — Crazy List
    goals/[id]/       # Сторінка окремої цілі
    spheres/[id]/     # Сторінка сфери
  actions/
    tasks.ts          # CRUD задач (via Supabase RPC)
    goals.ts          # Створення цілі з мрії, список сфер
    dreams.ts         # CRUD мрій (Crazy List)
    decompose.ts      # AI-декомпозиція через Claude Haiku

components/
  ds/                 # Дизайн-система
    GoalConstellation.tsx   # SVG-сузір'я з liquid fill бульбашками
    ConstellationView.tsx   # Обгортка: фільтри, панель цілі, DecomposeModal
    DecomposeModal.tsx      # Модал: Крок 1 AI/manual → Крок 2 редактор → Крок 3 done
    PromoteDreamModal.tsx   # Модал: конвертація мрії в ціль зі сферою + кроками
    DreamList.tsx           # Сітка карток Crazy List
    CalendarSyncMenu.tsx    # Дропдаун: Google Calendar / Apple Calendar (.ics)
    SphereCard.tsx          # Картка сфери
    TaskItem.tsx            # Рядок задачі з чекбоксом

lib/
  ics.ts              # Генерація .ics файлів і Google Calendar URL
  supabase/
    server.ts         # SSR Supabase client
    client.ts         # Client-side Supabase client
```

---

## База даних

### Таблиці

```sql
spheres           -- Сфери життя (Розвиток, Фінанси, …)
  id, user_id, name, color (hex), icon (emoji),
  sort_order, is_backlog, archived

plan_goals        -- Цілі
  id, user_id, sphere_id, title, description,
  status (active|paused|done|archived), target_date

plan_tasks        -- Кроки / задачі
  id, user_id, goal_id, specific, deadline,
  status (active|postponed|done|irrelevant),
  recurrence (none|daily|weekdays|weekly|monthly),
  calendar_event_id

dreams            -- Crazy List (мрії без прив'язки до цілей)
  id, user_id, title, done, sort_order
```

### RLS та Security Definer функції

Усі таблиці мають RLS-політики `user_id = auth.uid()`.
Для dev-сесії (anonymous key, auth.uid() = null) використовуються `SECURITY DEFINER` функції:

```sql
get_goal_tasks(p_goal_id, p_user_id)
insert_plan_tasks(p_goal_id, p_user_id, p_tasks)
toggle_task_done(p_task_id, p_user_id, p_done)
get_dreams(p_user_id)
add_dream(p_user_id, p_title, p_sort_order)
toggle_dream(p_dream_id, p_user_id, p_done)
```

### View

```sql
sphere_summary    -- Агрегат: active_goal_count, active_task_count, overdue_task_count
```

---

## Ключові функціональності

### Сузір'я цілей (GoalConstellation)
- Еліптичні орбіти, 2 пояси
- Liquid fill бульбашки: рівень заповнення = прогрес кроків
- Curved bezier коннектори від центру до кожної цілі
- Hover: відображає `done/total` і `%`
- SSR-safe: рендеривться лише на клієнті (`mounted` guard)

### DecomposeModal — розбивка цілі на кроки
1. **Крок 1**: "Розпланувати з AI" або "Планую сам"
2. **Крок 2**: Редактор кроків — плоский список, borderless textarea, inline дедлайн + 🔔 / 📅 пілюлі
3. **Крок 3**: Підтвердження збереження

AI-промпт (Claude Haiku):
- Кожен крок починається з дієслова
- Описує результат, не процес
- Максимум 6–8 слів
- Приклади good/bad форматів в промпті

### Crazy List (Dreams)
- 2-колонкова сітка кольорових карток
- Великий watermark-номер (01, 02…) — фоновий елемент
- Клік → `PromoteDreamModal`: вибір сфери → AI кроки → створення goal + tasks одним запитом
- Окрема ✓ кнопка (hover) для ручної позначки "виконано"
- Optimistic updates

### Синхронізація з календарем (CalendarSyncMenu)
- Google Calendar: відкриває URL-подію в новій вкладці (1 подія) або завантажує `.ics` (кілька)
- Apple Calendar: завантажує `.ics` файл
- Підтримка повторюваних подій через `RRULE` в `.ics`
- Доступна на сторінці Планування (всі задачі місяця) та в GoalPanel (кожен крок окремо)

---

## Налаштування

### .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=https://iyirhfdhktndlriyhocy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Запуск

```bash
npm install
npm run dev       # http://localhost:3000
```

### Dev user

Поточна dev-сесія працює без авторизації через хардкод `DEV_USER_ID`:
```typescript
const DEV_USER_ID = 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c';
```

Замінити на `supabase.auth.getUser()` при підключенні реальної авторизації.

---

## Дизайн-система

CSS-змінні визначені в `app/globals.css`:

```css
/* Сфери */
--sphere-violet / --sphere-violet-soft
--sphere-amber  / --sphere-amber-soft
--sphere-sage   / --sphere-sage-soft
--sphere-rose   / --sphere-rose-soft
--sphere-blue   / --sphere-blue-soft

/* Текст */
--text-strong / --text-body / --text-muted / --text-faint

/* Поверхні */
--surface-card / --surface-sunken

/* Межі */
--border-subtle / --border-strong / --border-field
```

Кольори сфер у БД зберігаються як hex (`#8B5CF6`), маппінг до CSS-ключів:
```typescript
const HEX_TO_KEY = {
  '#8B5CF6': 'violet',
  '#F59E0B': 'amber',
  '#10B981': 'sage',
  '#EC4899': 'rose',
  '#3B82F6': 'blue',
};
```

---

## Roadmap

- [ ] Реальна авторизація (замість DEV_USER_ID)
- [ ] Мобільний вигляд
- [ ] Push-нагадування (Notification API)
- [ ] Звіт по тижню (AI-інтерпретація прогресу)
- [ ] Hold/Resume для цілей
