-- ไฟล์นี้ใช้สำหรับ insert/upsert ข้อมูลเริ่มต้นลงตารางเท่านั้น
-- ค่าเริ่มต้นที่เปิดใช้จริงคือผู้ดูแลร้านคนแรก เพื่อให้เข้า admin ได้หลังติดตั้ง
-- ระบบไม่ใส่สินค้า สี ก้าน การจัดช่อ หรือผลงานจริงไว้ล่วงหน้า
-- ให้เพิ่มข้อมูลร้านจริงผ่านหน้า admin เพื่อหลีกเลี่ยง hardcoded mock data

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
-- ใช้เป็นแนวทางเท่านั้น ถ้าไม่ต้องการ seed ข้อมูลสินค้า ให้เพิ่มผ่านหน้า admin/products
-- insert into public.products (slug, name, description, base_price, base_quantity)
-- values ('your-real-product-slug', 'ชื่อสินค้าจริง', 'รายละเอียดสินค้าจริง', 0, 1)
-- on conflict (slug) do update set
--   name = excluded.name,
--   description = excluded.description,
--   base_price = excluded.base_price,
--   base_quantity = excluded.base_quantity;

-- ตัวเลือกประเภทสินค้าสำหรับหน้าออกแบบ ให้เก็บแยกจาก public.products:
-- ถ้าไม่ต้องการ seed ตัวเลือกหน้าออกแบบ ให้เพิ่มผ่านหน้า admin/configurator
-- insert into public.configurator_product_types (
--   slug, name_th, description, base_price, base_quantity, production_score, production_days, image_url, image_path, image_width, image_height, image_format, image_size, sort_order
-- ) values (
--   'bouquet-3', 'ช่อ 3 ดอก', 'ตัวเลือกสำหรับหน้าออกแบบ', 49, 3, 3, 2, null, null, null, null, null, null, 0
-- ) on conflict (slug) do update set
--   name_th = excluded.name_th,
--   description = excluded.description,
--   base_price = excluded.base_price,
--   base_quantity = excluded.base_quantity,
--   production_score = excluded.production_score,
--   production_days = excluded.production_days,
--   image_url = excluded.image_url,
--   image_path = excluded.image_path,
--   image_width = excluded.image_width,
--   image_height = excluded.image_height,
--   image_format = excluded.image_format,
--   image_size = excluded.image_size,
--   sort_order = excluded.sort_order;

-- ตัวอย่างสต็อกวัสดุ:
-- ให้เพิ่มวัสดุจริงผ่านหน้า admin/materials แล้วค่อยเชื่อมวัสดุกับตัวเลือกในหน้า admin/configurator
-- ถ้าต้องการ seed วัสดุ สามารถเพิ่ม insert into public.materials (...) ในไฟล์นี้ได้
