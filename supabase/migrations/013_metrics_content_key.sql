alter table public.metrics
  add column if not exists content_key text;

update public.metrics
set content_key = coalesce(content_key, metadata ->> 'video_id')
where content_key is null
  and metadata ? 'video_id';

alter table public.metrics
  drop constraint if exists metrics_name_source_asset_id_date_key;

alter table public.metrics
  add constraint metrics_name_source_asset_id_date_content_key_key
  unique (name, source, asset_id, date, content_key);

create index if not exists idx_metrics_content_key on public.metrics(content_key);
