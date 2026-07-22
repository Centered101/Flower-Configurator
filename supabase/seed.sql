-- ไฟล์นี้ใช้สำหรับ insert/upsert ข้อมูลเริ่มต้นลงตารางเท่านั้น
-- ระบบไม่ใส่ข้อมูลสินค้า สี ก้าน การจัดช่อ หรือผลงานตัวอย่างไว้ล่วงหน้า
-- ให้เพิ่มข้อมูลจริงผ่านหน้า admin เพื่อหลีกเลี่ยง hardcoded mock data

-- ผู้ดูแลร้านคนแรก:
--   username: admin
--   password: Admin123
--   role: owner
-- ควรเปลี่ยนรหัสผ่านในหน้า admin ทันทีหลังติดตั้งจริง

insert into public.admin_users (
  username,
  display_name,
  role,
  password_hash,
  is_active
) values (
  'admin',
  'เจ้าของร้าน',
  'owner',
  extensions.crypt('Admin123', extensions.gen_salt('bf')),
  true
) on conflict (username) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  is_active = excluded.is_active,
  updated_at = now();

-- ตัวอย่างสำหรับเพิ่มข้อมูลจริงในอนาคต:
-- insert into public.products (slug, name, description, base_price, base_quantity)
-- values ('your-real-product-slug', 'ชื่อสินค้าจริง', 'รายละเอียดสินค้าจริง', 0, 1)
-- on conflict (slug) do update set
--   name = excluded.name,
--   description = excluded.description,
--   base_price = excluded.base_price,
--   base_quantity = excluded.base_quantity;

-- ตัวเลือกประเภทสินค้าสำหรับหน้าออกแบบ ให้เก็บแยกจาก public.products:
-- insert into public.configurator_product_types (
--   slug, name_th, description, base_price, base_quantity, production_score, production_days
-- ) values (
--   'bouquet-3', 'ช่อ 3 ดอก', 'ตัวเลือกสำหรับหน้าออกแบบ', 49, 3, 3, 2
-- ) on conflict (slug) do update set
--   name_th = excluded.name_th,
--   description = excluded.description,
--   base_price = excluded.base_price,
--   base_quantity = excluded.base_quantity,
--   production_score = excluded.production_score,
--   production_days = excluded.production_days;
