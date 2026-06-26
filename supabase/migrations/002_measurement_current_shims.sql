alter table measurement_sets
  add column if not exists current_shims jsonb not null default '{}'::jsonb;
