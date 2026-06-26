create extension if not exists pgcrypto;

create type user_role as enum ('admin', 'operator', 'viewer');
create type measurement_row_type as enum ('flat_before', 'reverse_only', 'reverse_flat', 'washer');
create type punch_type as enum ('form', 'ring', 'reverse_push', 'flat_push');
create type measurement_key as enum ('peak_load_g', 'make_load_g', 'click_rate_percent', 'stroke_mm', 'rlf_g');
create type effect_direction as enum ('increase', 'decrease', 'none');
create type sensitivity_level as enum ('high', 'medium', 'low');

create table app_users (
  id uuid primary key default gen_random_uuid(),
  login_id text not null unique,
  password_hash text not null,
  display_name text not null,
  role user_role not null default 'operator',
  can_manage_settings boolean not null default false,
  line_user_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  drawing_no text,
  note text,
  created_at timestamptz not null default now(),
  unique(customer_id, name)
);

create table product_targets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  key measurement_key not null,
  min_value numeric not null,
  max_value numeric not null,
  unique(product_id, key),
  check (min_value <= max_value)
);

create table measurement_sets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  product_id uuid not null references products(id),
  measured_at timestamptz not null default now(),
  source text not null default 'mobile',
  current_shims jsonb not null default '{}'::jsonb,
  note text,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now()
);

create table measurement_rows (
  id uuid primary key default gen_random_uuid(),
  measurement_set_id uuid not null references measurement_sets(id) on delete cascade,
  row_type measurement_row_type not null,
  row_index integer not null default 1,
  peak_load_g numeric,
  make_load_g numeric,
  click_rate_percent numeric,
  stroke_mm numeric,
  rlf_g numeric,
  note text,
  unique(measurement_set_id, row_type, row_index)
);

create table shim_change_sets (
  id uuid primary key default gen_random_uuid(),
  measurement_set_id uuid not null references measurement_sets(id) on delete cascade,
  change_note text,
  created_at timestamptz not null default now()
);

create table shim_changes (
  id uuid primary key default gen_random_uuid(),
  shim_change_set_id uuid not null references shim_change_sets(id) on delete cascade,
  punch punch_type not null,
  before_text text not null,
  after_text text not null,
  display_text text generated always as (
    case punch
      when 'form' then 'フォーム'
      when 'ring' then 'リング'
      when 'reverse_push' then '逆押'
      when 'flat_push' then '平押'
    end || ' ' || before_text || '→' || after_text
  ) stored
);

create table punch_characteristics (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  punch punch_type not null,
  key measurement_key not null,
  direction effect_direction not null,
  sensitivity sensitivity_level not null default 'medium',
  min_effective_delta_mm numeric not null default 0.001,
  max_recommended_delta_mm numeric not null default 0.02,
  note text,
  unique(product_id, punch, key)
);

create table prediction_runs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  product_id uuid not null references products(id),
  input_measurements jsonb not null,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now()
);

create table prediction_suggestions (
  id uuid primary key default gen_random_uuid(),
  prediction_run_id uuid not null references prediction_runs(id) on delete cascade,
  rank integer not null,
  score numeric not null,
  shim_plan jsonb not null,
  predicted_measurements jsonb not null,
  warnings text[] not null default '{}'
);

create table pdf_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  product_id uuid references products(id),
  file_name text not null,
  storage_path text not null,
  document_type text,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references app_users(id),
  recipient_role user_role,
  channel text not null default 'line',
  title text not null,
  body text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index measurement_sets_product_idx on measurement_sets(customer_id, product_id, measured_at desc);
create index measurement_rows_set_idx on measurement_rows(measurement_set_id);
create index shim_changes_set_idx on shim_changes(shim_change_set_id);
create index notifications_recipient_idx on notifications(recipient_user_id, created_at desc);
