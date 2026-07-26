# Cake Bloom

เว็บพรีออเดอร์ดอกไม้ลวดกำมะหยี่แบบกำหนดเอง ระบบใช้ภาษาไทยเป็นหลัก แยกหน้าลูกค้าและหน้าผู้ดูแลร้านชัดเจน รองรับการออกแบบดอกไม้เอง สั่งซื้อแบบสำเร็จรูป ติดตามคำสั่งซื้อ อัปโหลดสลิปมัดจำ และจัดการข้อมูลผ่าน Supabase

## เทคโนโลยีที่ใช้

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Database และ Storage
- Chart.js สำหรับกราฟในหน้า admin
- Sonner สำหรับข้อความแจ้งเตือน
- AOS สำหรับ animation เฉพาะส่วนที่เหมาะสม
- Lucide Icons และ Font Awesome

## เริ่มต้นใช้งาน

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000`

## การตั้งค่า env

คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าจริง

ค่าหลักที่ต้องมี:

- `NEXT_PUBLIC_SITE_URL` ลิงก์เว็บจริง ใช้กับ SEO รูปแชร์ลิงก์ และลิงก์ใน LINE
- `NEXT_PUBLIC_BRAND_NAME` ชื่อร้านที่แสดงหน้าเว็บ
- `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` สำหรับฝั่งลูกค้า
- `SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` สำหรับ API ฝั่ง server
- `ADMIN_SESSION_SECRET` ใช้เซ็น session ของผู้ดูแลร้าน

ค่าที่ตั้งผ่านหน้า admin ได้ และ env ใช้เป็น fallback:

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_ADMIN_GROUP_ID`
- `PROMPTPAY_ID`
- `PAYMENT_ACCOUNT_NAME`
- `PAYMENT_QR_IMAGE_URL`

ห้ามใส่ `SUPABASE_SERVICE_ROLE_KEY` หรือ secret key ใด ๆ ในตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_`

## Supabase

ไฟล์ Supabase แยกตามหน้าที่:

- `supabase/schema.sql` เก็บ tables, functions, indexes และ RLS policies
- `supabase/storage.sql` เก็บ Storage buckets และ storage object policies
- `supabase/seed.sql` เก็บผู้ดูแลร้านคนแรก และ comment ตัวอย่างสำหรับ seed ข้อมูลจริงในอนาคต

ลำดับแนะนำตอนตั้งฐานข้อมูลใหม่:

1. รัน `supabase/schema.sql`
2. รัน `supabase/storage.sql`
3. รัน `supabase/seed.sql` ถ้าต้องการข้อมูลเริ่มต้น
4. เข้า `/admin/login`
5. ตั้งค่า PromptPay, LINE, SEO และวิธีรับสินค้าใน `/admin/settings`

## Storage Buckets

- `gallery-images` เป็น public ใช้กับรูปสินค้า ผลงาน รูปประเภทสินค้า และรูปเวลาแชร์ลิงก์
- `order-reference-images` เป็น private ใช้กับรูปอ้างอิงจากลูกค้าตอนสั่งซื้อ
- `payment-slips` เป็น private ใช้กับสลิปมัดจำ
- `order-progress-images` เป็น private ใช้กับรูปความคืบหน้าคำสั่งซื้อ

รูปเวลาแชร์ลิงก์ในหน้า `/admin/settings` จะอัปโหลดไปที่ `gallery-images/seo` เพราะแอปอย่าง LINE, Facebook และ Google ต้องดึงรูปแบบ public ได้

## หน้าลูกค้า

- `/` หน้าแรก แสดงสินค้า/ผลงานจากระบบจริง กดถูกใจ และสั่งซื้อชิ้นงานสำเร็จรูปได้
- `/design` ออกแบบดอกไม้ 7 ขั้นตอน พร้อม SVG preview และสรุปราคา
- `/checkout` หน้าสั่งซื้อ ต้องรู้ข้อมูลลูกค้าและสร้างคำสั่งซื้อเข้าระบบ
- `/order/success` สรุปคำสั่งซื้อ สแกน QR มัดจำ อัปโหลดสลิป และติดตามสถานะ
- `/track` ติดตามคำสั่งซื้อด้วยเลขออเดอร์และตัวกรองช่วยค้นหา
- `/gallery` แสดงผลงานที่ผ่านมา กดถูกใจและสั่งซื้อจากผลงานได้
- `/login` สมัครและเข้าสู่ระบบลูกค้า
- `/profile` แก้ไขข้อมูลลูกค้า ดูประวัติคำสั่งซื้อ ดูผลงานที่ถูกใจ เปลี่ยนรหัสผ่าน และลบบัญชีตามเงื่อนไข

## หน้า Admin

- `/admin` ภาพรวมร้าน กราฟ คำสั่งซื้อ และ badge แจ้งเตือน
- `/admin/orders` ตรวจคำสั่งซื้อ ดูสลิป อนุมัติ/ไม่ผ่านสลิป อัปเดตสถานะ และดูรายละเอียดลูกค้า
- `/admin/queue` จัดการคิวผลิตและวันที่เต็ม
- `/admin/configurator` จัดการตัวเลือกหน้าออกแบบ เช่น ประเภทสินค้า ชนิดดอกไม้ สี ก้าน การจัดช่อ ของตกแต่ง และข้อความตรวจสอบ
- `/admin/products` จัดการสินค้าพร้อมสั่งซื้อ
- `/admin/materials` จัดการสต็อกวัสดุ และเชื่อมวัสดุกับตัวเลือกออกแบบ
- `/admin/gallery` จัดการผลงานที่ผ่านมา เชื่อมกับสินค้า/ชนิดดอกไม้ และอัปโหลดรูป
- `/admin/customers` ดูลูกค้า ข้อมูลติดต่อ และประวัติคำสั่งซื้อ
- `/admin/members` จัดการผู้ดูแลร้านและสิทธิ์
- `/admin/settings` ตั้งค่า PromptPay, LINE, SEO/รูปแชร์ลิงก์ และวิธีรับสินค้า

## สิทธิ์ผู้ดูแลร้าน

- เจ้าของร้าน: จัดการได้ทุกอย่าง รวมถึงตั้งเจ้าของร้านคนอื่น
- หัวหน้าผู้ดูแล: จัดการงานร้านทั่วไปและผู้ดูแลทั่วไปได้ แต่ตั้งเจ้าของร้านไม่ได้
- ผู้ดูแล: ดูและทำงานหน้าร้านตามที่ระบบเปิดให้ และแก้ไขบัญชีตัวเองได้

บัญชีผู้ดูแลแยกจากบัญชีลูกค้า เข้าผ่าน `/admin/login`

## การอัปโหลดรูปภาพ

ระบบรับรูปจากไฟล์และ URL แล้วแปลงเป็น `webp` หรือ `avif` ก่อนเก็บจริง รองรับ `jpg`, `jpeg`, `png`, `webp`, `avif`, `svg`

SVG จะถูกตรวจและแปลงเป็น raster ก่อนใช้งาน ไม่ใช้ SVG ตรง ๆ เป็นไฟล์หลัก

จุดอัปโหลดหลัก:

- รูปสินค้าและผลงาน: หน้า admin ของสินค้า/แกลเลอรี
- รูปประเภทสินค้า: `/admin/configurator`
- รูปเวลาแชร์ลิงก์: `/admin/settings`
- รูปอ้างอิงลูกค้า: `/checkout`
- สลิปมัดจำ: `/order/success`

## LINE แจ้งเตือน

ระบบลดจำนวนครั้งที่ส่ง LINE โดยแจ้งเตือนหลักตอนลูกค้าอัปโหลดสลิป พร้อมเลขคำสั่งซื้อ รายละเอียดสำคัญ และรูปสลิปในข้อความเดียว

ตั้งค่าได้ที่ `/admin/settings`

- รหัสเชื่อมต่อ LINE ต้องเป็น Channel access token ของ Messaging API
- รหัสผู้รับ LINE ใช้ได้ทั้ง User ID, Group ID หรือ Room ID
- ถ้าเป็นกลุ่ม รหัสควรขึ้นต้นด้วย `C` และบอทต้องอยู่ในกลุ่มนั้นแล้ว

## SEO และรูปแชร์ลิงก์

ตั้งค่าได้ที่ `/admin/settings`

แก้ไขได้:

- ชื่อเว็บไซต์
- คำอธิบายเว็บไซต์
- คำค้น
- ลิงก์เว็บไซต์
- รูปเวลาแชร์ลิงก์
- สีแถบบราวเซอร์

รูปเวลาแชร์ลิงก์อัปโหลดจากเครื่องหรือใส่ URL ได้ ระบบจะเก็บใน `gallery-images/seo` และใส่ลิงก์ให้ช่องรูปแชร์โดยอัตโนมัติ หลังจากนั้นต้องกดบันทึกการตั้งค่า

## ตรวจสอบก่อน deploy

```bash
npx tsc --noEmit
npm run build
```

ถ้าเจอ chunk 404 หรือ `Cannot find module './xxxx.js'` ในเครื่อง local ให้หยุด dev server แล้วเริ่มใหม่ อาการนี้มักเกิดจาก cache ของ `.next` ระหว่าง Fast Refresh ไม่ใช่ schema ของระบบ
