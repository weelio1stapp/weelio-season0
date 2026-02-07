-- Add route_name column to places table
-- This allows authors to give their route a personalized name separate from the destination name

alter table places
add column if not exists route_name text;

-- No default value, nullable
-- route_name is optional and author-defined
