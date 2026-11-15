-- Run this once in the Supabase SQL Editor.
-- One row per player name holding their best score. Players can read the board,
-- but the only way to write is submit_score(), which can never lower a score
-- or touch another player's row.

create table if not exists public.scores (
  name text primary key check (char_length(name) between 1 and 10 and name ~ '^[A-Z0-9 ]+$'),
  score int not null check (score between 0 and 5000),
  updated_at timestamptz not null default now()
);

alter table public.scores enable row level security;

grant select on public.scores to anon;

drop policy if exists "anyone can read scores" on public.scores;
create policy "anyone can read scores" on public.scores for select using (true);

create or replace function public.submit_score(p_name text, p_score int)
returns void
language sql
security definer
set search_path = public
as $$
  insert into scores (name, score)
  values (upper(trim(p_name)), p_score)
  on conflict (name) do update
    set score = greatest(scores.score, excluded.score),
        updated_at = now();
$$;

revoke all on function public.submit_score(text, int) from public;
grant execute on function public.submit_score(text, int) to anon;
