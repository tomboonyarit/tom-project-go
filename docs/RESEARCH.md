# งานวิจัย: ระบบรับ Order ตลาดนัด

> วันที่: 25 พ.ค. 2026

---

## 1. ประเภทตลาดนัดไทย

| ประเภท | ลักษณะ | ตัวอย่าง |
|--------|--------|----------|
| **ตลาดนัดสุดสัปดาห์** | เปิดเฉพาะ ส.-อา. ร้านค้าหมุนเวียน | จตุจักร, สวนจตุจักร |
| **ตลาดนัดกลางคืน** | เปิดเย็น-ค่ำ เน้นอาหาร/แฟชั่น | ตลาดรถไฟ, เลียบด่วน |
| **ตลาดนัดชุมชน** | เปิดเฉพาะบางวัน หมุนเวียน | ตลาดนัดท้องถิ่น |
| **ตลาดนัดออนไลน์** | Marketplace รวมร้านค้า | Shopee, Lazada, TikTok Shop |

**Key Insight:** ผู้ขายส่วนใหญ่เป็นรายย่อย ใช้ **มือถือ** เป็นหลักในการทำงาน LINE OA เป็นช่องทางสื่อสารหลักกับลูกค้า

---

## 2. Pre-Order Workflow (Customer Journey)

```
ลูกค้าสั่งซื้อล่วงหน้า → ร้านค้ายืนยันออเดอร์ → ระบบจัดการออเดอร์
→ เปิดตลาด(วันนัด) → ลูกค้ารับสินค้าที่ตลาด
```

### Order Status ที่ควรมี:
1. **pending** — รอตรวจสอบ
2. **confirmed** — ยืนยันแล้ว
3. **preparing** — กำลังจัดเตรียม
4. **ready_for_pickup** — พร้อมรับสินค้า (ใช้วันตลาด)
5. **completed** — รับแล้ว
6. **cancelled** — ยกเลิก

### Pickup Model:
- ลูกค้าสั่ง+จ่ายล่วงหน้า → ไปรับที่บูธวันตลาด
- ใช้ **QR Code / Order ID** เป็นหลักฐาน
- ร้านค้าสแกน QR ยืนยันการส่งมอบ

---

## 3. ช่องทางชำระเงินยอดนิยม

| วิธี | ความนิยม | หมายเหตุ |
|------|---------|----------|
| **PromptPay QR** | 🔥 สูงมาก | ฟรี ใช้ทุกธนาคาร |
| **เงินสด** | สูง (หน้าร้าน) | หลักเวลาไปตลาด |
| **Mobile Banking** | สูง | โอนผ่านแอปธนาคาร |
| **TrueMoney Wallet** | ปานกลาง | คนไม่มีบัญชีธนาคาร |
| **ShopeePay / Lazada Wallet** | ปานกลาง | ใน Ecosystem |

---

## 4. โมเดลธุรกิจ

| โมเดล | คำอธิบาย | อัตราทั่วไป |
|-------|----------|-------------|
| **Commission** | หัก % จากยอดขาย | 3-10% ต่อออเดอร์ |
| **Flat Fee** | ค่าเช่าระบบรายเดือน | 500-3,000 บ./เดือน |
| **Transaction Fee** | ค่าธรรมเนียมต่อรายการ | 5-10 บ./ธุรกรรม |
| **Freemium** | ใช้ฟรี → จ่ายสำหรับฟีเจอร์เสริม | - |

### ข้อควรระวังด้านกฎหมาย:
- หากระบบ**เก็บเงินลูกค้าไว้ล่วงหน้า** (Top-up Wallet) → ต้องมีใบอนุญาต e-Money
- ทางออก: ใช้ PromptPay Tag30 (Bill Payment) — ไม่ต้องถือเงินลูกค้า
- **WHT 3%** หัก ณ ที่จ่ายเวลาโอนเงินให้ร้านค้า
- **VAT 7%** ตามกฎหมาย

---

## 5. Core Modules ที่แนะนำ

```
ระบบรับ Order ตลาดนัด
├── Market Management — จัดการตลาด, Event, วันเปิด
├── Vendor/Store Management — จัดการร้านค้า, บูธ, สินค้า
├── Order Management — รับออเดอร์, Tracking, QR Pickup
├── Payment — PromptPay, Bank Transfer, หลักฐานโอน
├── Customer App — สั่งซื้อ, ติดตาม, QR รับของ (Mobile-First)
├── Vendor App — POS, รับออเดอร์, สแกน QR (Mobile-First)
├── Admin Dashboard — รายงาน, Commission, Settlement
├── Notification — LINE OA, Push Notification
├── Loyalty — แต้มสะสมใช้ได้ทุกร้านในตลาด
└── Settlement — สรุปยอด, โอนเงินร้านค้าสิ้นรอบ
```

---

## 6. Key Success Factors

1. ⚡ **Mobile-First** — ร้านค้าใช้มือถือ 100% ไม่มีคอม
2. 💬 **LINE Integration** — คนไทยใช้ LINE เป็นหลัก
3. 💸 **PromptPay** — ระบบชำระพื้นฐาน ฟรี
4. 📱 **QR Code Pickup** — ลดผิดพลาด สะดวก
5. 🤖 **Settlement Automation** — โอนเงินร้านค้าอัตโนมัติ + คำนวณ WHT
6. 📊 **Scalable** — รองรับหลายตลาด หลายร้าน

---

## 7. References

| แหล่ง | รายละเอียด |
|-------|-----------|
| `github.com/camponggogo/Market_Place_System` | Open-source ระบบตลาดนัด Python/FastAPI (ไทย) |
| `bot.or.th` | ข้อมูลระบบ PromptPay |
| `blog.carry.co.th` | เทคนิค Pre-Order ขายของ |
| `tmogroup.asia` | Top Online Marketplaces Thailand 2025 |
| ZORT, MyOrder, BigSeller, BentoWeb | แพลตฟอร์มจัดการออเดอร์ไทย |
| ShopeeFood / GrabFood | Scheduled Order โมเดล |
