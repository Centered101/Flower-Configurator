import { z } from "zod";

export const checkoutSchema = z.object({
  customerName: z.string().min(2, "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร"),
  phone: z.string().regex(/^[0-9]{9,10}$/, "กรุณากรอกเบอร์โทร 9-10 หลัก"),
  lineId: z.string().min(1, "กรุณากรอก LINE ID"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  pickupMethod: z.string().min(1, "กรุณาเลือกวิธีรับสินค้า"),
  pickupDate: z.string().min(1, "กรุณาเลือกวันที่รับ"),
  pickupTime: z.string().min(1, "กรุณาเลือกเวลา"),
  pickupLocation: z.string().min(1, "กรุณากรอกสถานที่รับ"),
  note: z.string().max(300, "หมายเหตุไม่ควรเกิน 300 ตัวอักษร").optional()
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
