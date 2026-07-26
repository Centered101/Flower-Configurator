-- Storage buckets และ policies สำหรับไฟล์รูปภาพ
-- ใช้ไฟล์นี้แยกจาก schema ตารางหลัก เพื่อจัดการ storage ได้ชัดเจน
--
-- gallery-images เป็น public เพราะใช้กับรูปที่คนภายนอกต้องเห็นได้ เช่น
-- สินค้า ผลงาน รูปประเภทสินค้า และรูปเวลาแชร์ลิงก์ใน admin/settings
-- รูปแชร์ลิงก์จะเก็บไว้ใต้ path: seo/
--
-- order-reference-images, order-progress-images และ payment-slips เป็น private
-- เพราะเกี่ยวกับคำสั่งซื้อ ลูกค้า หรือหลักฐานการชำระเงิน

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values
(
  'order-reference-images',
  'order-reference-images',
  false,
  8388608,
  array['image/webp', 'image/avif']
),
(
  'order-progress-images',
  'order-progress-images',
  false,
  8388608,
  array['image/webp', 'image/avif']
),
(
  'payment-slips',
  'payment-slips',
  false,
  8388608,
  array['image/webp', 'image/avif']
),
(
  'gallery-images',
  'gallery-images',
  true,
  8388608,
  array['image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read gallery images" on storage.objects;
drop policy if exists "Admin can manage gallery images" on storage.objects;
drop policy if exists "Guest can upload order reference images" on storage.objects;
drop policy if exists "Admin can read order reference images" on storage.objects;
drop policy if exists "Admin can manage order reference images" on storage.objects;
drop policy if exists "Admin can manage order progress images" on storage.objects;
drop policy if exists "Users can upload payment slips" on storage.objects;
drop policy if exists "Users can read own payment slips" on storage.objects;
drop policy if exists "Admin can manage payment slips" on storage.objects;

create policy "Public can read gallery images"
on storage.objects
for select
using (bucket_id = 'gallery-images');

create policy "Admin can manage gallery images"
on storage.objects
for all
using (
  bucket_id = 'gallery-images'
  and public.is_admin()
)
with check (
  bucket_id = 'gallery-images'
  and public.is_admin()
);

create policy "Guest can upload order reference images"
on storage.objects
for insert
with check (
  bucket_id = 'order-reference-images'
  and lower(storage.extension(name)) in ('webp', 'avif')
);

create policy "Admin can read order reference images"
on storage.objects
for select
using (
  bucket_id = 'order-reference-images'
  and public.is_admin()
);

create policy "Admin can manage order reference images"
on storage.objects
for all
using (
  bucket_id = 'order-reference-images'
  and public.is_admin()
)
with check (
  bucket_id = 'order-reference-images'
  and public.is_admin()
);

create policy "Admin can manage order progress images"
on storage.objects
for all
using (
  bucket_id = 'order-progress-images'
  and public.is_admin()
)
with check (
  bucket_id = 'order-progress-images'
  and public.is_admin()
);

create policy "Users can upload payment slips"
on storage.objects
for insert
with check (
  bucket_id = 'payment-slips'
  and lower(storage.extension(name)) in ('webp', 'avif')
  and auth.uid()::text = split_part(name, '/', 1)
);

create policy "Users can read own payment slips"
on storage.objects
for select
using (
  bucket_id = 'payment-slips'
  and auth.uid()::text = split_part(name, '/', 1)
);

create policy "Admin can manage payment slips"
on storage.objects
for all
using (
  bucket_id = 'payment-slips'
  and public.is_admin()
)
with check (
  bucket_id = 'payment-slips'
  and public.is_admin()
);
