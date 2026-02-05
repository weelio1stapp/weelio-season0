-- =========================================
-- Recurring Activities System (Weelio) - PART 1: DB SCHEMA
-- Variant B: check-in pending, XP only on confirmed
-- =========================================

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2) Tables

-- Activities (recurring events like run clubs)
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'run_club',
  location_name text,
  location_point geography(Point, 4326),
  timezone text NOT NULL DEFAULT 'Europe/Prague',
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Activity roles (owners and organizers)
CREATE TABLE IF NOT EXISTS public.activity_roles (
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','organizer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_id, user_id)
);

-- Activity occurrences (specific instances of recurring activity)
CREATE TABLE IF NOT EXISTS public.activity_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location_override_name text,
  location_override_point geography(Point, 4326),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','done','canceled')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, starts_at)
);

-- Activity check-ins (user participation)
CREATE TABLE IF NOT EXISTS public.activity_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.activity_occurrences(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_method text NOT NULL DEFAULT 'manual' CHECK (checkin_method IN ('manual','qr','gps')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (occurrence_id, user_id)
);

-- 3) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_occurrences_activity_starts
  ON public.activity_occurrences(activity_id, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_occurrence_status
  ON public.activity_checkins(occurrence_id, status);

CREATE INDEX IF NOT EXISTS idx_checkins_user_created
  ON public.activity_checkins(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_public
  ON public.activities(is_public, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_roles_user
  ON public.activity_roles(user_id, activity_id);

-- Comments for documentation
COMMENT ON TABLE public.activities IS 'Recurring activities (run clubs, events, etc.)';
COMMENT ON TABLE public.activity_roles IS 'Activity ownership and organizer permissions';
COMMENT ON TABLE public.activity_occurrences IS 'Specific instances of recurring activities';
COMMENT ON TABLE public.activity_checkins IS 'User check-ins to activity occurrences (pending until confirmed by organizer)';
COMMENT ON COLUMN public.activity_checkins.status IS 'pending: awaiting confirmation, confirmed: XP awarded, rejected: denied by organizer';
