-- =====================================================
-- Seasons and Challenges for Weelio Season 0
-- =====================================================

-- 1) Create seasons table
CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Create challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES public.seasons(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  kind text NOT NULL, -- 'unique_places' | 'visits' | 'authored_places'
  target integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) RLS Policies for seasons
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for everyone (anon + authenticated)
DROP POLICY IF EXISTS "Allow SELECT for everyone" ON public.seasons;
CREATE POLICY "Allow SELECT for everyone"
  ON public.seasons
  FOR SELECT
  USING (true);

-- 4) RLS Policies for challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for everyone (anon + authenticated)
DROP POLICY IF EXISTS "Allow SELECT for everyone" ON public.challenges;
CREATE POLICY "Allow SELECT for everyone"
  ON public.challenges
  FOR SELECT
  USING (true);

-- 5) Seed data: Insert Season 0
INSERT INTO public.seasons (name, starts_at, ends_at, is_active)
VALUES (
  'Season 0',
  now() - interval '7 days',
  now() + interval '30 days',
  true
)
ON CONFLICT DO NOTHING;

-- 6) Seed data: Insert 3 challenges for Season 0
DO $$
DECLARE
  v_season_id uuid;
BEGIN
  -- Get Season 0 ID
  SELECT id INTO v_season_id FROM public.seasons WHERE name = 'Season 0' LIMIT 1;

  IF v_season_id IS NOT NULL THEN
    -- Challenge 1: 5 unique places
    INSERT INTO public.challenges (season_id, title, description, kind, target, is_active)
    VALUES (
      v_season_id,
      '5 unikátních míst',
      'Navštiv 5 různých míst na Weelio',
      'unique_places',
      5,
      true
    )
    ON CONFLICT DO NOTHING;

    -- Challenge 2: 10 visits
    INSERT INTO public.challenges (season_id, title, description, kind, target, is_active)
    VALUES (
      v_season_id,
      '10 návštěv',
      'Zaznamenej 10 návštěv míst',
      'visits',
      10,
      true
    )
    ON CONFLICT DO NOTHING;

    -- Challenge 3: 3 authored places
    INSERT INTO public.challenges (season_id, title, description, kind, target, is_active)
    VALUES (
      v_season_id,
      'Přidej 3 místa',
      'Vytvoř a sdílej 3 nová místa',
      'authored_places',
      3,
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 7) RPC: Get active season
CREATE OR REPLACE FUNCTION public.get_active_season()
RETURNS TABLE(
  id uuid,
  name text,
  starts_at timestamptz,
  ends_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.starts_at, s.ends_at
  FROM public.seasons s
  WHERE s.is_active = true
  LIMIT 1;
END;
$$;

-- 8) RPC: Get active challenges
CREATE OR REPLACE FUNCTION public.get_active_challenges()
RETURNS TABLE(
  id uuid,
  season_id uuid,
  title text,
  description text,
  kind text,
  target integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.season_id, c.title, c.description, c.kind, c.target
  FROM public.challenges c
  INNER JOIN public.seasons s ON c.season_id = s.id
  WHERE c.is_active = true AND s.is_active = true
  ORDER BY c.created_at ASC;
END;
$$;

-- 9) RPC: Get my challenge progress
CREATE OR REPLACE FUNCTION public.get_my_challenge_progress(p_user_id uuid)
RETURNS TABLE(
  challenge_id uuid,
  current integer,
  target integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_challenge RECORD;
  v_current integer;
BEGIN
  -- Get active season
  SELECT s.id, s.starts_at, s.ends_at
  INTO v_season_id, v_starts_at, v_ends_at
  FROM public.seasons s
  WHERE s.is_active = true
  LIMIT 1;

  -- If no active season, return empty
  IF v_season_id IS NULL THEN
    RETURN;
  END IF;

  -- Loop through active challenges
  FOR v_challenge IN
    SELECT c.id, c.kind, c.target
    FROM public.challenges c
    WHERE c.season_id = v_season_id AND c.is_active = true
  LOOP
    v_current := 0;

    -- Calculate current based on challenge kind
    CASE v_challenge.kind
      WHEN 'visits' THEN
        -- Count all visits in season interval
        SELECT COUNT(*)
        INTO v_current
        FROM public.place_visits pv
        WHERE pv.user_id = p_user_id
          AND pv.visited_at >= v_starts_at
          AND pv.visited_at <= v_ends_at;

      WHEN 'unique_places' THEN
        -- Count distinct places visited in season interval
        SELECT COUNT(DISTINCT pv.place_id)
        INTO v_current
        FROM public.place_visits pv
        WHERE pv.user_id = p_user_id
          AND pv.visited_at >= v_starts_at
          AND pv.visited_at <= v_ends_at;

      WHEN 'authored_places' THEN
        -- Count authored places in season interval
        SELECT COUNT(*)
        INTO v_current
        FROM public.places p
        WHERE p.author_user_id = p_user_id
          AND p.created_at >= v_starts_at
          AND p.created_at <= v_ends_at;

      ELSE
        v_current := 0;
    END CASE;

    -- Return row for this challenge
    challenge_id := v_challenge.id;
    current := v_current;
    target := v_challenge.target;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_active_season() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_challenges() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_challenge_progress(uuid) TO authenticated;
