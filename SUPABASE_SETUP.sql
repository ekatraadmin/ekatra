-- StudyTogether room setup / migration
-- Safe to run more than once where possible.

-- 1. Chat photo metadata
alter table public.messages
  add column if not exists message_type text not null default 'text',
  add column if not exists image_url text;

-- 2. Chat image storage bucket
insert into storage.buckets (id, name, public)
values ('room-chat-images', 'room-chat-images', true)
on conflict (id) do update set public = true;

-- 3. Storage policies

drop policy if exists "StudyTogether users upload room chat images" on storage.objects;
create policy "StudyTogether users upload room chat images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'room-chat-images'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "StudyTogether users view room chat images" on storage.objects;
create policy "StudyTogether users view room chat images"
on storage.objects
for select
to public
using (bucket_id = 'room-chat-images');

drop policy if exists "StudyTogether users delete their room chat images" on storage.objects;
create policy "StudyTogether users delete their room chat images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'room-chat-images'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- 4. Room owner delete permission

drop policy if exists "Creators can delete their rooms" on public.rooms;
create policy "Creators can delete their rooms"
on public.rooms
for delete
to authenticated
using (owner_id = auth.uid());

-- 5. Public rooms disappear automatically when the last member leaves.
create or replace function public.delete_empty_public_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.room_members
    where room_id = old.room_id
  ) then
    delete from public.rooms
    where id = old.room_id
      and type = 'public';
  end if;

  return old;
end;
$$;

drop trigger if exists trg_delete_empty_public_room on public.room_members;
create trigger trg_delete_empty_public_room
after delete on public.room_members
for each row
execute function public.delete_empty_public_room();

-- 6. Keep these tables in Supabase Realtime.
-- If a table is already in the publication, these statements may return
-- a duplicate-object error in some projects; run only the ones you need.
-- room_sessions, messages and room_members should already be enabled.

notify pgrst, 'reload schema';
