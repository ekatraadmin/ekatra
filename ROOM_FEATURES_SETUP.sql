-- StudyTogether room features setup
-- Run this in Supabase SQL Editor.

-- 1) Room chat image fields.
alter table public.messages
  add column if not exists message_type text not null default 'text';

alter table public.messages
  add column if not exists image_url text;

-- 2) Helpful indexes.
create index if not exists messages_room_created_idx
  on public.messages(room_id, created_at);

create index if not exists room_members_room_idx
  on public.room_members(room_id);

create index if not exists room_members_user_idx
  on public.room_members(user_id);

-- 3) Room chat image bucket.
insert into storage.buckets (id, name, public)
values ('room-chat-images', 'room-chat-images', true)
on conflict (id) do update set public = true;

-- 4) Storage policies. Policy names are unique and safe to recreate.
drop policy if exists "StudyTogether room images upload" on storage.objects;
drop policy if exists "StudyTogether room images read" on storage.objects;
drop policy if exists "StudyTogether room images delete" on storage.objects;

create policy "StudyTogether room images upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'room-chat-images'
  and exists (
    select 1
    from public.room_members rm
    where rm.room_id::text = (storage.foldername(name))[1]
      and rm.user_id = auth.uid()
  )
);

create policy "StudyTogether room images read"
on storage.objects
for select
to public
using (bucket_id = 'room-chat-images');

create policy "StudyTogether room images delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'room-chat-images'
  and owner_id = auth.uid()
);

-- 5) room_members insert policy. This lets an authenticated user join as themselves.
drop policy if exists "Users can join rooms" on public.room_members;
create policy "Users can join rooms"
on public.room_members
for insert
to authenticated
with check (user_id = auth.uid());

-- 6) Room-members can read membership rows for rooms they belong to.
drop policy if exists "Members can view room members" on public.room_members;
drop policy if exists "Authenticated users can view room members" on public.room_members;
create policy "Authenticated users can view room members"
on public.room_members
for select
to authenticated
using (true);

-- 7) Members can leave their own membership row.
drop policy if exists "Users can leave rooms" on public.room_members;
create policy "Users can leave rooms"
on public.room_members
for delete
to authenticated
using (user_id = auth.uid());

-- 8) Chat: members can read and create messages in their rooms.
drop policy if exists "Room members can read messages" on public.messages;
create policy "Room members can read messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = messages.room_id
      and rm.user_id = auth.uid()
  )
);

drop policy if exists "Room members can send messages" on public.messages;
create policy "Room members can send messages"
on public.messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.room_members rm
    where rm.room_id = messages.room_id
      and rm.user_id = auth.uid()
  )
);

-- 9) Shared timer: room members can read/update their room timer.
drop policy if exists "Room members can view room sessions" on public.room_sessions;
create policy "Room members can view room sessions"
on public.room_sessions
for select
to authenticated
using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = room_sessions.room_id
      and rm.user_id = auth.uid()
  )
);

drop policy if exists "Room members can create room sessions" on public.room_sessions;
create policy "Room members can create room sessions"
on public.room_sessions
for insert
to authenticated
with check (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = room_sessions.room_id
      and rm.user_id = auth.uid()
  )
);

drop policy if exists "Room members can update room sessions" on public.room_sessions;
create policy "Room members can update room sessions"
on public.room_sessions
for update
to authenticated
using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = room_sessions.room_id
      and rm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = room_sessions.room_id
      and rm.user_id = auth.uid()
  )
);

-- 10) Realtime tables used by the app.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_members') then
    alter publication supabase_realtime add table public.room_members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_sessions') then
    alter publication supabase_realtime add table public.room_sessions;
  end if;
end $$;

notify pgrst, 'reload schema';
