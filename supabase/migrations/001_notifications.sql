alter table app_users
  add column if not exists line_user_id text;

create table if not exists notifications (
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

create index if not exists notifications_recipient_idx
  on notifications(recipient_user_id, created_at desc);
