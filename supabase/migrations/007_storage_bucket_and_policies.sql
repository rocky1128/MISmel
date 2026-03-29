insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

create policy "authenticated users can read evidence files"
on storage.objects
for select
to authenticated
using (bucket_id = 'evidence');

create policy "contributors can upload evidence files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidence'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'mel_manager', 'department_owner', 'contributor')
  )
);

create policy "contributors can update own evidence files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'evidence'
  and owner = auth.uid()
)
with check (
  bucket_id = 'evidence'
  and owner = auth.uid()
);
