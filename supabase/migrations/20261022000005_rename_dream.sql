-- Dreams are read and written through SECURITY DEFINER functions (get_dreams, add_dream,
-- toggle_dream) — the site runs as anon and dreams' RLS checks auth.uid().
-- Renaming goes the same way; an empty title is refused.
CREATE OR REPLACE FUNCTION public.rename_dream(p_dream_id uuid, p_user_id uuid, p_title text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(btrim(p_title), '') = '' THEN
    RAISE EXCEPTION 'empty title';
  END IF;
  UPDATE dreams SET title = btrim(p_title) WHERE id = p_dream_id AND user_id = p_user_id;
END; $function$;
