create table public.shared_items (
  id int primary key default 1 check (id = 1),
  items jsonb not null,
  seed_version int not null default 5,
  updated_at timestamptz not null default now()
);

alter table public.shared_items enable row level security;

create policy "public read" on public.shared_items for select using (true);
create policy "public write" on public.shared_items for insert with check (true);
create policy "public update" on public.shared_items for update using (true);

alter publication supabase_realtime add table public.shared_items;
