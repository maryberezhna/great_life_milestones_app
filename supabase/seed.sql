-- Seed: replace all goals with the personal goals list
-- 1. Open Supabase Dashboard → Authentication → Users → copy your UUID
-- 2. Paste it below where it says YOUR-USER-ID-HERE
-- 3. Run in SQL Editor

DO $$
DECLARE
  uid   uuid := 'c60fce7d-7fcc-482c-8fa6-2d2967cf1c4c'::uuid;
  s_health   uuid;
  s_home     uuid;
  s_travel   uuid;
  s_career   uuid;
  s_growth   uuid;
  s_family   uuid;
BEGIN

  -- ── Delete existing active/paused goals for this user ─────────────────
  DELETE FROM public.plan_goals WHERE user_id = uid;

  -- ── Upsert spheres (skip if name already exists for this user) ─────────

  SELECT id INTO s_health FROM public.spheres WHERE user_id = uid AND name = 'Здоров''я' LIMIT 1;
  IF s_health IS NULL THEN
    INSERT INTO public.spheres (user_id, name, icon, color, sort_order)
    VALUES (uid, 'Здоров''я', '🏃', '#10B981', 1) RETURNING id INTO s_health;
  END IF;

  SELECT id INTO s_home FROM public.spheres WHERE user_id = uid AND name = 'Дім' LIMIT 1;
  IF s_home IS NULL THEN
    INSERT INTO public.spheres (user_id, name, icon, color, sort_order)
    VALUES (uid, 'Дім', '🏠', '#F59E0B', 2) RETURNING id INTO s_home;
  END IF;

  SELECT id INTO s_travel FROM public.spheres WHERE user_id = uid AND name = 'Подорожі' LIMIT 1;
  IF s_travel IS NULL THEN
    INSERT INTO public.spheres (user_id, name, icon, color, sort_order)
    VALUES (uid, 'Подорожі', '✈️', '#14B8A6', 3) RETURNING id INTO s_travel;
  END IF;

  SELECT id INTO s_career FROM public.spheres WHERE user_id = uid AND name = 'Кар''єра' LIMIT 1;
  IF s_career IS NULL THEN
    INSERT INTO public.spheres (user_id, name, icon, color, sort_order)
    VALUES (uid, 'Кар''єра', '💼', '#6366F1', 4) RETURNING id INTO s_career;
  END IF;

  SELECT id INTO s_growth FROM public.spheres WHERE user_id = uid AND name = 'Розвиток' LIMIT 1;
  IF s_growth IS NULL THEN
    INSERT INTO public.spheres (user_id, name, icon, color, sort_order)
    VALUES (uid, 'Розвиток', '📚', '#8B5CF6', 5) RETURNING id INTO s_growth;
  END IF;

  SELECT id INTO s_family FROM public.spheres WHERE user_id = uid AND name = 'Сім''я' LIMIT 1;
  IF s_family IS NULL THEN
    INSERT INTO public.spheres (user_id, name, icon, color, sort_order)
    VALUES (uid, 'Сім''я', '💛', '#EC4899', 6) RETURNING id INTO s_family;
  END IF;

  -- ── Insert goals ───────────────────────────────────────────────────────

  INSERT INTO public.plan_goals (user_id, sphere_id, title, status) VALUES
    -- Здоров'я
    (uid, s_health,  'Схуднути',                                                             'active'),
    (uid, s_health,  'Здати генетичний тест',                                               'active'),
    (uid, s_health,  'Бородіна тест',                                                       'active'),

    -- Дім
    (uid, s_home,    'Купити житло у Європі',                                               'active'),
    (uid, s_home,    'Купили власну квартиру (women space)',                                 'active'),
    (uid, s_home,    'Зібрати дійсно пам''ятні для мене речі в 1 коробку',                 'active'),

    -- Подорожі
    (uid, s_travel,  'Поїхати на море',                                                     'active'),

    -- Кар'єра
    (uid, s_career,  'Вибрати один з своїх проектів і довести їх до розуму',               'active'),
    (uid, s_career,  'Написати статтю про 3 роки',                                         'active'),
    (uid, s_career,  'Закінчити необхідні сертифікатиції HubSpot',                         'active'),

    -- Розвиток
    (uid, s_growth,  'Почати вчити німецьку щоб змогти подаватися на роботу з німецькою',  'active'),
    (uid, s_growth,  'Зібрати свою бібліотеку мрії',                                       'active'),
    (uid, s_growth,  'Податися і вступити на 2гу вищу технічну освіту',                    'active'),

    -- Сім'я
    (uid, s_family,  'Зробити неймовірно круту сімейну фотографію',                        'active');

END $$;
