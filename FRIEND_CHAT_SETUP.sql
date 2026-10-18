-- StudyTogether private friend chat.
-- This uses st_* names so it does not interfere with any existing friends tables.

create table if not exists public.st_friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique(sender_id, receiver_id)
);

create table if not exists public.st_friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_id <> friend_id),
  unique(user_id, friend_id)
);

create table if not exists public.friend_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  message text,
  message_type text not null default 'text' check (message_type in ('text','image')),
  image_url text,
  created_at timestamptz not null default now(),
  check (
    (message_type = 'text' and message is not null and length(trim(message)) > 0)
    or
    (message_type = 'image' and image_url is not null)
  )
);

create index if not exists st_friend_requests_receiver_idx on public.st_friend_requests(receiver_id,status,created_at desc);
create index if not exists st_friendships_user_idx on public.st_friendships(user_id,created_at desc);
create index if not exists friend_messages_pair_idx on public.friend_messages(sender_id,receiver_id,created_at);

alter table public.st_friend_requests enable row level security;
alter table public.st_friendships enable row level security;
alter table public.friend_messages enable row level security;

drop policy if exists "ST friend requests select" on public.st_friend_requests;
drop policy if exists "ST friend requests insert" on public.st_friend_requests;
drop policy if exists "ST friend requests update" on public.st_friend_requests;
drop policy if exists "ST friend requests delete" on public.st_friend_requests;
create policy "ST friend requests select" on public.st_friend_requests for select to authenticated using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "ST friend requests insert" on public.st_friend_requests for insert to authenticated with check (sender_id = auth.uid());
create policy "ST friend requests update" on public.st_friend_requests for update to authenticated using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());
create policy "ST friend requests delete" on public.st_friend_requests for delete to authenticated using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "ST friendships select" on public.st_friendships;
drop policy if exists "ST friendships insert" on public.st_friendships;
drop policy if exists "ST friendships delete" on public.st_friendships;
create policy "ST friendships select" on public.st_friendships for select to authenticated using (user_id = auth.uid() or friend_id = auth.uid());
create policy "ST friendships insert" on public.st_friendships for insert to authenticated with check (user_id = auth.uid() or friend_id = auth.uid());
create policy "ST friendships delete" on public.st_friendships for delete to authenticated using (user_id = auth.uid() or friend_id = auth.uid());

drop policy if exists "ST friend messages select" on public.friend_messages;
drop policy if exists "ST friend messages insert" on public.friend_messages;
create policy "ST friend messages select" on public.friend_messages for select to authenticated using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "ST friend messages insert" on public.friend_messages for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.st_friendships f
    where (f.user_id = auth.uid() and f.friend_id = receiver_id)
       or (f.friend_id = auth.uid() and f.user_id = receiver_id)
  )
);

insert into storage.buckets (id,name,public)
values ('friend-chat-images','friend-chat-images',true)
on conflict (id) do update set public = true;

drop policy if exists "ST friend photo upload" on storage.objects;
drop policy if exists "ST friend photo view" on storage.objects;
drop policy if exists "ST friend photo delete" on storage.objects;
create policy "ST friend photo upload" on storage.objects for insert to authenticated with check (bucket_id = 'friend-chat-images');
create policy "ST friend photo view" on storage.objects for select to public using (bucket_id = 'friend-chat-images');
create policy "ST friend photo delete" on storage.objects for delete to authenticated using (bucket_id = 'friend-chat-images');

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname='public' and tablename='st_friend_requests') then
    alter publication supabase_realtime add table public.st_friend_requests;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname='public' and tablename='st_friendships') then
    alter publication supabase_realtime add table public.st_friendships;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname='public' and tablename='friend_messages') then
    alter publication supabase_realtime add table public.friend_messages;
  end if;
end $$;

notify pgrst, 'reload schema';
