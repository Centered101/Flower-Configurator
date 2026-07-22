# Flower Configurator

เว็บแอปต้นแบบสำหรับพรีออเดอร์ดอกไม้ประดิษฐ์จากลวดกำมะหยี่แบบกำหนดเอง รองรับภาษาไทยเป็นหลัก และออกแบบให้ขั้นตอนลูกค้าทำงานครบตั้งแต่เลือกแบบจนถึงส่งคำสั่งพรีออเดอร์

## เทคโนโลยีที่ใช้

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- React Hook Form + Zod
- Lucide Icons
- Supabase schema/storage/seed สำหรับต่อระบบหลังบ้านจริง

## เริ่มต้นใช้งาน

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000`

## หน้าที่มีในเวอร์ชันต้นแบบ

- `/` หน้าแรกพร้อมส่วนเปิดตัว ขั้นตอนการสั่ง สินค้ายอดนิยม ราคาเริ่มต้น และคิวว่าง
- `/design` ระบบออกแบบ 7 ขั้นตอน พร้อมตัวอย่าง SVG บันทึกอัตโนมัติ สรุปราคา และแถบยอดรวมบนมือถือ
- `/checkout` สั่งซื้อแบบไม่ต้องเข้าสู่ระบบ พร้อมตรวจข้อมูลและปฏิทินคิว
- `/order/success` สรุปคำสั่งซื้อ เลขออเดอร์ และปุ่ม copy/print
- `/track` ติดตามสถานะด้วยเลขออเดอร์และเบอร์โทร 4 ตัวท้าย
- `/gallery` แกลเลอรีผลงาน พร้อมโหลดค่าการออกแบบเดิมเข้าเครื่องมือออกแบบ
- `/admin` ภาพรวมผู้ดูแล ตารางคำสั่งซื้อ คิวการผลิต และรายการวัสดุเบื้องต้น

## Supabase

คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่า Supabase เมื่อพร้อมเชื่อมต่อจริง

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

ห้ามใช้ `SUPABASE_SERVICE_ROLE_KEY` ในคอมโพเนนต์ฝั่งลูกค้าหรือโค้ดที่ทำงานในเบราว์เซอร์

ไฟล์ Supabase แยกตามหน้าที่:

- `supabase/schema.sql` สำหรับ tables, functions, indexes และ RLS policies
- `supabase/storage.sql` สำหรับ Storage buckets และ storage object policies
- `supabase/seed.sql` สำหรับ insert/upsert ข้อมูลเริ่มต้น ตอนนี้ตั้งใจปล่อยว่างพร้อม comment ตัวอย่าง เพราะระบบให้กรอกข้อมูลผ่านหน้า admin

## หมายเหตุเวอร์ชันต้นแบบ

ระบบคำสั่งซื้อในเวอร์ชันนี้บันทึกลง `localStorage` เพื่อให้ทดลองขั้นตอนได้ทันทีโดยไม่ต้องตั้ง Supabase ก่อน ขั้นต่อไปควรย้ายการสร้างออเดอร์ไป Server Action/API Route, เขียนลง Supabase, เพิ่ม Supabase Storage สำหรับรูปตัวอย่าง/รูปความคืบหน้า และเปิด RLS ตาม `supabase/schema.sql`
