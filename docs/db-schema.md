# Database Schema Snapshot

This document serves as the **source of truth** for database column names in the Weelio application. It is generated from actual database introspection and should be referenced when writing queries to avoid runtime errors caused by incorrect column names.

---

## activities

- id (uuid)
- slug (text)
- title (text)
- description (text)
- type (text)
- location_name (text)
- lat (double precision)
- lng (double precision)
- timezone (text)
- is_public (boolean)
- created_by (uuid)
- created_at (timestamp with time zone)

## activity_checkins

- id (uuid)
- occurrence_id (uuid)
- user_id (uuid)
- checkin_method (text)
- status (text)
- confirmed_by (uuid)
- confirmed_at (timestamp with time zone)
- xp_awarded_at (timestamp with time zone)
- created_at (timestamp with time zone)

## activity_occurrences

- id (uuid)
- activity_id (uuid)
- starts_at (timestamp with time zone)
- ends_at (timestamp with time zone)
- status (text)
- created_by (uuid)
- created_at (timestamp with time zone)

## activity_roles

- activity_id (uuid)
- user_id (uuid)
- role (text)
- created_at (timestamp with time zone)

## challenges

- id (uuid)
- season_id (uuid)
- title (text)
- description (text)
- kind (text)
- target (integer)
- is_active (boolean)
- created_at (timestamp with time zone)

## journal_entries

- id (uuid)
- user_id (uuid)
- place_id (uuid)
- content (text)
- visibility (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- visit_id (uuid)
- is_hidden (boolean)

## moderation_reports

- id (uuid)
- reporter_user_id (uuid)
- target_type (text)
- target_id (uuid)
- reason (text)
- status (text)
- created_at (timestamp with time zone)
- resolved_by (uuid)
- resolved_at (timestamp with time zone)
- action_taken (text)

## place_media

- id (uuid)
- place_id (uuid)
- media_type (text)
- bucket (text)
- path (text)
- caption (text)
- author_user_id (uuid)
- created_at (timestamp with time zone)
- duration_sec (smallint)
- mime_type (text)
- file_size (integer)
- storage_path (text)
- is_hidden (boolean)

## place_photos

- id (uuid)
- place_id (uuid)
- user_id (uuid)
- visit_id (uuid)
- storage_path (text)
- created_at (timestamp with time zone)
- is_hidden (boolean)

## place_riddle_attempts

- id (uuid)
- riddle_id (uuid)
- user_id (uuid)
- answer_plain (text)
- is_correct (boolean)
- created_at (timestamp with time zone)

## place_riddles

- id (uuid)
- place_id (uuid)
- prompt (text)
- answer_type (text)
- answer_plain (text)
- xp_reward (integer)
- created_by (uuid)
- created_at (timestamp with time zone)
- is_active (boolean)
- max_attempts (integer)
- cooldown_hours (integer)
- is_hidden (boolean)

## place_visits

- id (uuid)
- place_id (uuid)
- user_id (uuid)

---

## Naming Rules

To maintain consistency and avoid runtime errors, follow these naming conventions:

- **Main entity author columns** should be named `author_id`
  - Example: `places.author_id` for the creator of a place

- **Sub-content creator columns** should be named `created_by`
  - Example: `place_riddles.created_by` for the creator of a riddle
  - Example: `activities.created_by` for the creator of an activity

- **Ownership/participant user columns** should be named `user_id`
  - Example: `place_visits.user_id` for the user who visited
  - Example: `journal_entries.user_id` for the journal entry author

- **Avoid introducing new variants** like `author_user_id`
  - This inconsistency causes SQL errors and confusion
  - Choose one of the three conventions above based on context

---

## Known Inconsistencies (to clean up later)

The following inconsistencies exist in the current schema and should be addressed in future migrations:

- **place_media.author_user_id**: Uses non-standard naming. Should be either:
  - `created_by` (if treated as sub-content, following `place_riddles` pattern)
  - `user_id` (if treated as ownership, following `place_photos` pattern)

- **moderation_reports.reporter_user_id**: Could be simplified to `user_id` or `reported_by` for consistency with other patterns

These inconsistencies should be migrated carefully to avoid breaking existing queries and application logic.
