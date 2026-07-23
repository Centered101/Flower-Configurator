create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- Legacy tables that are not read or written by the current app.
drop table if exists public.product_materials cascade;
drop table if exists public.order_status_history cascade;
drop table if exists public.order_progress_images cascade;
drop table if exists public.production_capacity cascade;
drop table if exists public.blocked_dates cascade;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  first_name text,
  last_name text,
  phone text,
  line_id text,
  address text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  role text not null default 'admin' check (role in ('owner', 'superadmin', 'admin')),
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  base_price numeric(10,2) not null default 0,
  base_quantity int not null default 1,
  production_score int not null default 1,
  production_days int not null default 1,
  image_url text,
  image_path text,
  image_width int,
  image_height int,
  image_format text,
  image_size int,
  image_tone text not null default '#FCE4EC',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.configurator_product_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_th text not null,
  description text,
  base_price numeric(10,2) not null default 0,
  base_quantity int not null default 1,
  production_score int not null default 1,
  production_days int not null default 1,
  image_tone text not null default '#FCE4EC',
  image_url text,
  image_path text,
  image_width int,
  image_height int,
  image_format text,
  image_size int,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flower_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_th text not null,
  name_en text not null,
  description text,
  price_delta numeric(10,2) not null default 0,
  material_stock int not null default 0,
  sort_order int not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_th text not null,
  hex text not null,
  price_delta numeric(10,2) not null default 0,
  tone text not null default 'soft',
  sort_order int not null default 0,
  is_in_stock boolean not null default true
);

create table if not exists public.stems (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_th text not null,
  description text,
  category text not null check (category in ('strength', 'style', 'length', 'color')),
  price_delta numeric(10,2) not null default 0,
  production_days_delta int not null default 0,
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.wrapping_options (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_th text not null,
  description text,
  price_delta numeric(10,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table if not exists public.ribbon_options (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_th text not null,
  price_delta numeric(10,2) not null default 0,
  color text not null default 'transparent',
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table if not exists public.decoration_options (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_th text not null,
  description text,
  price_delta numeric(10,2) not null default 0,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  quantity numeric(12,2) not null default 0,
  unit text not null,
  alert_threshold numeric(12,2) not null default 0,
  unit_cost numeric(10,2) not null default 0,
  supplier text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.design_option_materials (
  id uuid primary key default gen_random_uuid(),
  option_type text not null check (option_type in ('product_type', 'flower_type', 'color', 'stem', 'wrapping', 'ribbon', 'decoration')),
  option_id text not null,
  material_id uuid not null references public.materials(id) on delete cascade,
  quantity_per_unit numeric(12,2) not null default 1,
  created_at timestamptz not null default now(),
  unique (option_type, option_id, material_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  order_number text not null unique,
  verification_token uuid not null default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  line_id text not null,
  email text,
  pickup_method text not null,
  pickup_date date not null,
  pickup_time time not null,
  pickup_location text not null,
  estimated_delivery_date date,
  tracking_number text,
  tracking_carrier text,
  tracking_url text,
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  deposit_amount numeric(10,2) not null default 0,
  payment_status text not null default 'deposit_due' check (payment_status in ('pending', 'deposit_due', 'awaiting_slip_review', 'paid', 'failed', 'refunded')),
  order_status text not null default 'pending_review' check (order_status in ('pending_review', 'design_confirmed', 'awaiting_payment', 'preparing_materials', 'in_production', 'quality_check', 'ready', 'completed', 'cancelled')),
  production_score int not null default 1,
  customer_note text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  flower_type_id uuid references public.flower_types(id),
  quantity int not null,
  unit_price numeric(10,2) not null,
  customization_json jsonb not null,
  line_total numeric(10,2) not null
);

create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_method text not null check (payment_method in ('cash', 'promptpay', 'bank_transfer')),
  amount numeric(10,2) not null,
  payment_type text not null check (payment_type in ('deposit', 'full', 'refund')),
  slip_url text,
  slip_path text,
  status text not null default 'pending' check (status in ('pending', 'awaiting_review', 'paid', 'failed', 'refunded')),
  verification_message text,
  verified_amount numeric(10,2),
  qr_payload text,
  receiver_target text,
  receiver_matched boolean,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

alter table public.orders
  add column if not exists estimated_delivery_date date,
  add column if not exists tracking_number text,
  add column if not exists tracking_carrier text,
  add column if not exists tracking_url text;

alter table public.payment_records
  add column if not exists slip_path text,
  add column if not exists verification_message text,
  add column if not exists verified_amount numeric(10,2),
  add column if not exists qr_payload text,
  add column if not exists receiver_target text,
  add column if not exists receiver_matched boolean,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  image_path text,
  image_width int,
  image_height int,
  image_format text,
  image_size int,
  product_id uuid references public.products(id),
  flower_type_id uuid references public.flower_types(id),
  flower text,
  color text,
  color_slug text,
  bouquet_size text,
  price numeric(10,2),
  production_score int not null default 1,
  configuration_json jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('gallery', 'product')),
  item_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create table if not exists public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  request_type text not null default 'self_delete' check (request_type in ('self_delete', 'admin_review')),
  status text not null default 'pending' check (status in ('pending', 'self_deleted', 'requires_review', 'rejected')),
  reason text,
  has_paid_order boolean not null default false,
  deleted_orders int not null default 0,
  deleted_favorites int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists line_id text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.products add column if not exists image_tone text not null default '#FCE4EC';
alter table public.products add column if not exists sort_order int not null default 0;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists image_path text;
alter table public.products add column if not exists image_width int;
alter table public.products add column if not exists image_height int;
alter table public.products add column if not exists image_format text;
alter table public.products add column if not exists image_size int;
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.configurator_product_types add column if not exists description text;
alter table public.configurator_product_types add column if not exists base_price numeric(10,2) not null default 0;
alter table public.configurator_product_types add column if not exists base_quantity int not null default 1;
alter table public.configurator_product_types add column if not exists production_score int not null default 1;
alter table public.configurator_product_types add column if not exists production_days int not null default 1;
alter table public.configurator_product_types add column if not exists image_tone text not null default '#FCE4EC';
alter table public.configurator_product_types add column if not exists image_url text;
alter table public.configurator_product_types add column if not exists image_path text;
alter table public.configurator_product_types add column if not exists image_width int;
alter table public.configurator_product_types add column if not exists image_height int;
alter table public.configurator_product_types add column if not exists image_format text;
alter table public.configurator_product_types add column if not exists image_size int;
alter table public.configurator_product_types add column if not exists sort_order int not null default 0;
alter table public.configurator_product_types add column if not exists is_active boolean not null default true;
alter table public.configurator_product_types add column if not exists updated_at timestamptz not null default now();
alter table public.gallery_items add column if not exists image_path text;
alter table public.gallery_items add column if not exists image_width int;
alter table public.gallery_items add column if not exists image_height int;
alter table public.gallery_items add column if not exists image_format text;
alter table public.gallery_items add column if not exists image_size int;
alter table public.gallery_items add column if not exists flower text;
alter table public.gallery_items add column if not exists color text;
alter table public.gallery_items add column if not exists production_score int not null default 1;
alter table public.gallery_items add column if not exists updated_at timestamptz not null default now();
alter table public.admin_users add column if not exists role text not null default 'admin';
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_users_username_key'
      and conrelid = 'public.admin_users'::regclass
  ) then
    alter table public.admin_users
      add constraint admin_users_username_key unique (username);
  end if;
end $$;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_users_role_check'
      and conrelid = 'public.admin_users'::regclass
  ) then
    alter table public.admin_users
      add constraint admin_users_role_check check (role in ('owner', 'superadmin', 'admin'));
  end if;
end $$;
alter table public.flower_types add column if not exists description text;
alter table public.flower_types add column if not exists sort_order int not null default 0;
alter table public.colors add column if not exists tone text not null default 'soft';
alter table public.colors add column if not exists sort_order int not null default 0;
alter table public.stems add column if not exists description text;
alter table public.stems add column if not exists sort_order int not null default 0;
alter table public.wrapping_options add column if not exists description text;
alter table public.wrapping_options add column if not exists sort_order int not null default 0;
alter table public.decoration_options add column if not exists description text;
alter table public.decoration_options add column if not exists sort_order int not null default 0;

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_admin_users_username on public.admin_users (username);
create index if not exists idx_admin_users_role on public.admin_users (role);
create index if not exists idx_admin_users_active on public.admin_users (is_active);
create index if not exists idx_products_active on public.products (is_active);
create index if not exists idx_configurator_product_types_active on public.configurator_product_types (is_active);
create index if not exists idx_flower_types_available on public.flower_types (is_available);
create index if not exists idx_colors_stock on public.colors (is_in_stock);
create index if not exists idx_stems_category on public.stems (category);
create index if not exists idx_wrapping_options_active on public.wrapping_options (is_active);
create index if not exists idx_ribbon_options_active on public.ribbon_options (is_active);
create index if not exists idx_decoration_options_active on public.decoration_options (is_active);
create index if not exists idx_materials_status on public.materials (status);
create index if not exists idx_design_option_materials_option on public.design_option_materials (option_type, option_id);
create index if not exists idx_design_option_materials_material on public.design_option_materials (material_id);
create index if not exists idx_orders_order_number on public.orders (order_number);
create index if not exists idx_orders_auth_user_id on public.orders (auth_user_id);
create index if not exists idx_orders_phone on public.orders (phone);
create index if not exists idx_orders_pickup_date on public.orders (pickup_date);
create index if not exists idx_orders_status on public.orders (order_status);
create index if not exists idx_orders_payment_status on public.orders (payment_status);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_payment_records_order_id on public.payment_records (order_id);
create index if not exists idx_gallery_items_public on public.gallery_items (is_public);
create index if not exists idx_customer_favorites_user_id on public.customer_favorites (user_id);
create index if not exists idx_customer_favorites_lookup on public.customer_favorites (item_type, item_id);
create index if not exists idx_data_deletion_requests_user_id on public.data_deletion_requests (user_id);
create index if not exists idx_data_deletion_requests_email on public.data_deletion_requests (email);
create index if not exists idx_data_deletion_requests_status on public.data_deletion_requests (status);

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.configurator_product_types enable row level security;
alter table public.flower_types enable row level security;
alter table public.colors enable row level security;
alter table public.stems enable row level security;
alter table public.wrapping_options enable row level security;
alter table public.ribbon_options enable row level security;
alter table public.decoration_options enable row level security;
alter table public.site_settings enable row level security;
alter table public.materials enable row level security;
alter table public.design_option_materials enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_records enable row level security;
alter table public.gallery_items enable row level security;
alter table public.customer_favorites enable row level security;
alter table public.data_deletion_requests enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

create or replace function public.verify_admin_login(
  p_username text,
  p_password text
)
returns table (
  id uuid,
  username text,
  display_name text,
  role text
)
language sql
stable
security definer
set search_path = public
as $$
  select admin_users.id, admin_users.username, admin_users.display_name, admin_users.role
  from public.admin_users
  where lower(admin_users.username) = lower(trim(p_username))
    and admin_users.is_active = true
    and admin_users.password_hash = extensions.crypt(p_password, admin_users.password_hash)
  limit 1;
$$;

create or replace function public.upsert_admin_user(
  p_id uuid,
  p_username text,
  p_display_name text,
  p_role text,
  p_password text,
  p_is_active boolean
)
returns table (
  id uuid,
  username text,
  display_name text,
  role text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_id uuid;
begin
  if p_id is null then
    insert into public.admin_users (
      username,
      display_name,
      role,
      password_hash,
      is_active
    ) values (
      lower(trim(p_username)),
      coalesce(nullif(trim(p_display_name), ''), trim(p_username)),
      case when p_role in ('owner', 'superadmin', 'admin') then p_role else 'admin' end,
      extensions.crypt(coalesce(nullif(p_password, ''), extensions.gen_random_uuid()::text), extensions.gen_salt('bf')),
      coalesce(p_is_active, true)
    )
    on conflict on constraint admin_users_username_key do update set
      display_name = excluded.display_name,
      role = excluded.role,
      password_hash = case
        when p_password is null or p_password = '' then public.admin_users.password_hash
        else excluded.password_hash
      end,
      is_active = excluded.is_active,
      updated_at = now()
    returning public.admin_users.id into next_id;
  else
    update public.admin_users as au
    set
      username = lower(trim(p_username)),
      display_name = coalesce(nullif(trim(p_display_name), ''), trim(p_username)),
      role = case when p_role in ('owner', 'superadmin', 'admin') then p_role else 'admin' end,
      password_hash = case
        when p_password is null or p_password = '' then au.password_hash
        else extensions.crypt(p_password, extensions.gen_salt('bf'))
      end,
      is_active = coalesce(p_is_active, true),
      updated_at = now()
    where au.id = p_id
    returning au.id into next_id;
  end if;

  return query
    select au.id, au.username, au.display_name, au.role, au.is_active, au.created_at, au.updated_at
    from public.admin_users as au
    where au.id = next_id;
end;
$$;

drop policy if exists "Admin session read admin users" on public.admin_users;
drop policy if exists "Public catalog read" on public.products;
drop policy if exists "Public configurator product types read" on public.configurator_product_types;
drop policy if exists "Public flower read" on public.flower_types;
drop policy if exists "Public colors read" on public.colors;
drop policy if exists "Public stems read" on public.stems;
drop policy if exists "Public wrapping read" on public.wrapping_options;
drop policy if exists "Public ribbon read" on public.ribbon_options;
drop policy if exists "Public decoration read" on public.decoration_options;
drop policy if exists "Public site settings read" on public.site_settings;
drop policy if exists "Public gallery read" on public.gallery_items;
drop policy if exists "Guest can create orders" on public.orders;
drop policy if exists "Guest can create order items" on public.order_items;
drop policy if exists "Customer token can read order" on public.orders;
drop policy if exists "Users can read own orders" on public.orders;
drop policy if exists "Users can read own order items" on public.order_items;
drop policy if exists "Users can read own payments" on public.payment_records;
drop policy if exists "Admin full access orders" on public.orders;
drop policy if exists "Admin full access order items" on public.order_items;
drop policy if exists "Admin full access payments" on public.payment_records;
drop policy if exists "Admin full access materials" on public.materials;
drop policy if exists "Admin full access design option materials" on public.design_option_materials;
drop policy if exists "Admin full access products" on public.products;
drop policy if exists "Admin full access configurator product types" on public.configurator_product_types;
drop policy if exists "Admin full access flowers" on public.flower_types;
drop policy if exists "Admin full access colors" on public.colors;
drop policy if exists "Admin full access stems" on public.stems;
drop policy if exists "Admin full access wrapping" on public.wrapping_options;
drop policy if exists "Admin full access ribbons" on public.ribbon_options;
drop policy if exists "Admin full access decorations" on public.decoration_options;
drop policy if exists "Admin full access site settings" on public.site_settings;
drop policy if exists "Admin full access gallery" on public.gallery_items;
drop policy if exists "Users can read own favorites" on public.customer_favorites;
drop policy if exists "Users can create own favorites" on public.customer_favorites;
drop policy if exists "Users can delete own favorites" on public.customer_favorites;
drop policy if exists "Admin full access customer favorites" on public.customer_favorites;
drop policy if exists "Users can create own data deletion requests" on public.data_deletion_requests;
drop policy if exists "Users can read own data deletion requests" on public.data_deletion_requests;
drop policy if exists "Admin full access data deletion requests" on public.data_deletion_requests;

create policy "Public catalog read" on public.products for select using (is_active);
create policy "Public configurator product types read" on public.configurator_product_types for select using (is_active);
create policy "Admin session read admin users" on public.admin_users for select using (false);
create policy "Public flower read" on public.flower_types for select using (is_available);
create policy "Public colors read" on public.colors for select using (true);
create policy "Public stems read" on public.stems for select using (true);
create policy "Public wrapping read" on public.wrapping_options for select using (is_active);
create policy "Public ribbon read" on public.ribbon_options for select using (is_active);
create policy "Public decoration read" on public.decoration_options for select using (is_active);
create policy "Public site settings read" on public.site_settings for select using (true);
create policy "Public gallery read" on public.gallery_items for select using (is_public);

create policy "Guest can create orders" on public.orders for insert with check (true);
create policy "Guest can create order items" on public.order_items for insert with check (true);
create policy "Customer token can read order" on public.orders for select using (auth.uid() = auth_user_id);
create policy "Users can read own orders" on public.orders for select using (auth.uid() = auth_user_id);
create policy "Users can read own order items" on public.order_items for select using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.auth_user_id = auth.uid()
  )
);
create policy "Users can read own payments" on public.payment_records for select using (
  exists (
    select 1
    from public.orders
    where orders.id = payment_records.order_id
      and orders.auth_user_id = auth.uid()
  )
);
create policy "Admin full access orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access payments" on public.payment_records for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access materials" on public.materials for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access design option materials" on public.design_option_materials for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access configurator product types" on public.configurator_product_types for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access flowers" on public.flower_types for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access colors" on public.colors for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access stems" on public.stems for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access wrapping" on public.wrapping_options for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access ribbons" on public.ribbon_options for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access decorations" on public.decoration_options for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access site settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin full access gallery" on public.gallery_items for all using (public.is_admin()) with check (public.is_admin());
create policy "Users can read own favorites" on public.customer_favorites for select using (auth.uid() = user_id);
create policy "Users can create own favorites" on public.customer_favorites for insert with check (auth.uid() = user_id);
create policy "Users can delete own favorites" on public.customer_favorites for delete using (auth.uid() = user_id);
create policy "Admin full access customer favorites" on public.customer_favorites for all using (public.is_admin()) with check (public.is_admin());
create policy "Users can create own data deletion requests" on public.data_deletion_requests for insert with check (auth.uid() = user_id);
create policy "Users can read own data deletion requests" on public.data_deletion_requests for select using (auth.uid() = user_id);
create policy "Admin full access data deletion requests" on public.data_deletion_requests for all using (public.is_admin()) with check (public.is_admin());
