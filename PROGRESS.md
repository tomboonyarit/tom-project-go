# Progress Log — ระบบรับ Order ตลาดนัด

> Last updated: 30 พ.ค. 2026

## สถานะปัจจุบัน

| Layer | Status |
|-------|--------|
| Go Backend (`api/`) | ✅ DB connection พร้อม, auto-load `.env` |
| Database Connection (Supabase) | ✅ เชื่อมต่อสำเร็จ (pooler session mode, ap-northeast-1) |
| Database Schema (Migration) | ✅ รันเสร็จ — 10 tables + 6 enum types |
| Research | ✅ งานวิจัยเสร็จ → `docs/RESEARCH.md` |
| Frontend (`web/`) | ❌ ยังไม่ได้ทำ |

---
## ✅ สิ่งที่ทำเสร็จแล้ว

### 1. Go Backend — Database Connection
```
api/
├── main.go              ← HTTP server, graceful shutdown, /health
├── config/config.go     ← โหลด DATABASE_URL, PORT, auto-load .env
├── db/db.go             ← pgxpool connection (pgx/v5)
├── db/migrations/001_init.sql  ← Schema migration
├── .env                 ← Connection string จริง (pooler mode)
├── .gitignore           ← .env อยู่ใน gitignore แล้ว
├── go.mod / go.sum      ← dependency: pgx/v5
└── cmd/
    ├── migrate/main.go  ← Script รัน migration
    └── verify/main.go   ← Script ตรวจสอบตาราง
```

### 2. Database Schema — 10 ตาราง
```
api/db/migrations/001_init.sql
```

**ระบบสมาชิก:** `users` (customer / vendor / admin)  
**ระบบตลาดนัด:** `markets`, `booths`, `categories`, `products`  
**ระบบ Order:** `orders`, `order_items`, `order_status_history`  
**ตะกร้า:** `carts`, `cart_items`

**Enum Types:** `user_role`, `market_status`, `booth_status`, `order_status`, `payment_status`, `payment_method`

### 3. การเชื่อมต่อ
- เชื่อมต่อ Supabase ผ่าน **Session Pooler** (IPv4)
- Region: `ap-northeast-1` (Tokyo)
- Auto-load `.env` — แค่ `go run .` ก็ทำงานได้เลย

---
## ⚠️ ขั้นตอนถัดไป (Next Steps)

### ลำดับที่ควรทำ:

1. **สร้าง Go Models** (struct ให้ตรงกับตาราง)
   - `api/models/user.go`
   - `api/models/market.go`
   - `api/models/product.go`
   - `api/models/order.go`

2. **สร้าง Repository Layer** (database queries)
   - `api/repository/` — CRUD functions แต่ละตาราง

3. **สร้าง API Endpoints** (REST handlers)
   - `api/handler/` — HTTP handlers
   - Auth: register, login (JWT)
   - Markets: CRUD
   - Products: CRUD
   - Orders: create, list, update status

4. **Frontend** (Next.js)
   - เริ่มหลังจาก API พร้อม

---
## 📝 หมายเหตุ

- Go module: `api` (go 1.26.3)
- Database: Supabase PostgreSQL via Session Pooler (`pgx/v5`)
- Port: 8080 (แก้ได้ใน `.env`)
- สั่งรัน: `cd api && go run .`
- Connection String ปัจจุบัน: Session pooler mode (`?sslmode=require`)

---
## 🔑 คำสำคัญเวลากลับมา

- "ต่อจาก PROGRESS.md"
- "ทำ Go models"
- "สร้าง API endpoints"
- "run migration Supabase" (ทำแล้ว ไม่ต้อง run อีก)
- "เชื่อมต่อ Supabase"
