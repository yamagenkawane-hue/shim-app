alter table app_users
  add column if not exists can_manage_settings boolean not null default false;

update app_users
  set can_manage_settings = true
  where role = 'admin';
