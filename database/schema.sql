-- Run this SQL in the Supabase SQL Editor.

create table if not exists public.users (
	 id uuid primary key,
	 name text not null,
	 email text unique not null,
	 password_hash text not null,
	 created_at timestamptz not null default now()
);

create table if not exists public.invoices (
	id uuid primary key,
	user_id uuid not null references public.users(id) on delete cascade,
	invoice_number text not null,
	customer_name text not null,
	amount numeric(12, 2) not null default 0,
	status text not null default 'synced',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists invoices_user_id_created_at_idx
	on public.invoices (user_id, created_at desc);

alter table public.invoices enable row level security;

drop policy if exists "Users can read their own invoices" on public.invoices;
create policy "Users can read their own invoices"
	on public.invoices for select
	using (auth.uid() = user_id);

drop policy if exists "Users can create their own invoices" on public.invoices;
create policy "Users can create their own invoices"
	on public.invoices for insert
	with check (auth.uid() = user_id);

drop policy if exists "Users can update their own invoices" on public.invoices;
create policy "Users can update their own invoices"
	on public.invoices for update
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);
