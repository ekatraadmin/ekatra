-- Run once in Supabase SQL Editor.
alter table public.study_goals
  add column if not exists description text,
  add column if not exists category text not null default 'academics',
  add column if not exists priority text not null default 'medium',
  add column if not exists target_date date,
  add column if not exists progress integer not null default 0,
  add column if not exists completed_at timestamptz;

update public.study_goals
set progress = case when completed = true then 100 when progress is null then 0 else progress end;

alter table public.study_goals drop constraint if exists study_goals_progress_check;
alter table public.study_goals add constraint study_goals_progress_check check (progress between 0 and 100);
alter table public.study_goals drop constraint if exists study_goals_priority_check;
alter table public.study_goals add constraint study_goals_priority_check check (priority in ('low','medium','high'));

alter table public.study_goals enable row level security;
drop policy if exists "Users can view their own study goals" on public.study_goals;
drop policy if exists "Users can create their own study goals" on public.study_goals;
drop policy if exists "Users can update their own study goals" on public.study_goals;
drop policy if exists "Users can delete their own study goals" on public.study_goals;
create policy "Users can view their own study goals" on public.study_goals for select to authenticated using (user_id = auth.uid());
create policy "Users can create their own study goals" on public.study_goals for insert to authenticated with check (user_id = auth.uid());
create policy "Users can update their own study goals" on public.study_goals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete their own study goals" on public.study_goals for delete to authenticated using (user_id = auth.uid());

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='study_goals') then
    alter publication supabase_realtime add table public.study_goals;
  end if;
end $$;
notify pgrst, 'reload schema';
