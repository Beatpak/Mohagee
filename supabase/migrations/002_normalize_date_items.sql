create table if not exists public.app_meta (
  id int primary key default 1 check (id = 1),
  seed_version int not null default 5,
  updated_at timestamptz not null default now()
);

create table if not exists public.date_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('region', 'food', 'dessert', 'dateSpot')),
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (category, label)
);

create index if not exists date_items_category_sort_idx on public.date_items (category, sort_order);

do $$
begin
  if to_regclass('public.shared_items') is not null then
    insert into public.app_meta (id, seed_version, updated_at)
    select 1, seed_version, updated_at
    from public.shared_items
    where id = 1
    on conflict (id) do update
    set
      seed_version = excluded.seed_version,
      updated_at = excluded.updated_at;

    insert into public.date_items (category, label, sort_order)
    select 'region', value, ordinality::int - 1
    from public.shared_items,
      jsonb_array_elements_text(items->'region') with ordinality
    where id = 1
    on conflict (category, label) do nothing;

    insert into public.date_items (category, label, sort_order)
    select 'food', value, ordinality::int - 1
    from public.shared_items,
      jsonb_array_elements_text(items->'food') with ordinality
    where id = 1
    on conflict (category, label) do nothing;

    insert into public.date_items (category, label, sort_order)
    select 'dessert', value, ordinality::int - 1
    from public.shared_items,
      jsonb_array_elements_text(items->'dessert') with ordinality
    where id = 1
    on conflict (category, label) do nothing;

    insert into public.date_items (category, label, sort_order)
    select 'dateSpot', value, ordinality::int - 1
    from public.shared_items,
      jsonb_array_elements_text(items->'dateSpot') with ordinality
    where id = 1
    on conflict (category, label) do nothing;

    if exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'shared_items'
    ) then
      alter publication supabase_realtime drop table public.shared_items;
    end if;
    drop table public.shared_items;
  end if;
end $$;

insert into public.app_meta (id, seed_version)
values (1, 5)
on conflict (id) do nothing;

alter table public.app_meta enable row level security;
alter table public.date_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'app_meta' and policyname = 'public read meta'
  ) then
    create policy "public read meta" on public.app_meta for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'app_meta' and policyname = 'public write meta'
  ) then
    create policy "public write meta" on public.app_meta for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'app_meta' and policyname = 'public update meta'
  ) then
    create policy "public update meta" on public.app_meta for update using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'date_items' and policyname = 'public read items'
  ) then
    create policy "public read items" on public.date_items for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'date_items' and policyname = 'public write items'
  ) then
    create policy "public write items" on public.date_items for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'date_items' and policyname = 'public update items'
  ) then
    create policy "public update items" on public.date_items for update using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'date_items' and policyname = 'public delete items'
  ) then
    create policy "public delete items" on public.date_items for delete using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'date_items'
  ) then
    alter publication supabase_realtime add table public.date_items;
  end if;
end $$;
