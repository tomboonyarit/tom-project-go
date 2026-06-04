# MaekaOS — คู่มือ Deployment

## โครงสร้างโปรเจค

```
tom-project-go/
├── api/                  # Go Backend API
│   ├── main.go
│   ├── config/           # โหลด env vars
│   ├── db/               # เชื่อมต่อ DB + migrations
│   ├── handler/          # HTTP handlers
│   ├── repository/       # database queries
│   ├── models/           # data structures
│   ├── db/migrations/    # SQL migration files
│   ├── Dockerfile
│   ├── fly.toml
│   └── .env.example
│
├── web/                  # Next.js Frontend
│   ├── app/              # Pages (login, pos, orders, products, etc.)
│   ├── components/       # UI components
│   ├── lib/              # API client, auth, utils
│   ├── vercel.json
│   └── .env.local
│
└── DEPLOY.md             # ไฟล์นี้
```

---

## 1. Database — Supabase

### Setup Supabase

1. สมัครที่ [supabase.com](https://supabase.com)
2. สร้าง Project → จำ Project Ref ไว้
3. Settings → Database → Connection string → **Transaction pooler**
4. Copy connection string (รูปแบบ `postgresql://postgres.[REF]:[PASSWORD]@...supabase.com:5432/postgres`)

### เอา Connection String มาใช้

```env
# .env.example (api/.env สำหรับ dev local)
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxxx:password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require
JWT_SECRET=random-string-32-chars-minimum
```

---

## 2. API — Fly.io

### ครั้งแรก

```bash
cd api

# ติดตั้ง flyctl (ถ้ายังไม่มี): https://fly.io/docs/hands-on/install-flyctl/

# Login
flyctl auth login

# สร้าง app
flyctl apps create maekaos-api

# ตั้งค่า secrets
flyctl secrets set \
  DATABASE_URL="postgresql://postgres.xxx:password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require" \
  JWT_SECRET="your-random-secret"

# Deploy (ตัว fly.toml มี preset ไว้แล้ว)
flyctl deploy
```

### Deploy ครั้งต่อไป (หลังจากแก้ code)

```bash
cd api
flyctl deploy
```

### คำสั่งที่มีประโยชน์

```bash
# ดูสถานะ
flyctl status -a maekaos-api

# ดู log
flyctl logs -a maekaos-api

# รีสตาร์ท (กรณีเครื่องติด max restart)
flyctl machine restart <machine-id> -a maekaos-api

# แก้ไข secret
flyctl secrets set KEY=VALUE -a maekaos-api

# ดู secrets
flyctl secrets list -a maekaos-api
```

### ไฟล์ตั้งค่า (fly.toml)

| Setting | Value |
|---------|-------|
| App name | `maekaos-api` |
| Region | `sin` (Singapore) |
| Port | `8080` |
| Health check | `GET /health` ทุก 10 วิ |
| Auto-start | เปิด |
| Min machines | 1 |

---

## 3. Web Frontend — Vercel

### ครั้งแรก

```bash
cd web

# ติดตั้ง Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# ตั้งค่า env (production)
echo "https://maekaos-api.fly.dev/api" | vercel env add NEXT_PUBLIC_API_URL production

# Deploy
vercel --prod
```

### Deploy ครั้งต่อไป (หลังจากแก้ code)

```bash
cd web
vercel --prod
```

### ตั้งค่า Environment Variable บน Vercel Dashboard

- เข้า Vercel Dashboard → Project `web` → Settings → Environment Variables
- Key: `NEXT_PUBLIC_API_URL`
- Value: `https://maekaos-api.fly.dev/api`
- Environment: `Production`

---

## 4. Migrations

SQL migration อยู่ใน `api/db/migrations/` ตั้งชื่อเรียงเลขเช่น:
```
001_create_vendors.sql
002_create_products.sql
003_create_orders.sql
...
```

เวลา API start จะรัน migration โดยอัตโนมัติ (เรียงตามชื่อไฟล์ A-Z)

---

## 5. Environment Variables สรุป

### API (Fly.io Secrets)

| Key | Value | Required |
|-----|-------|----------|
| `DATABASE_URL` | Supabase connection string | ใช่ |
| `JWT_SECRET` | รหัสลับสำหรับ JWT (32+ chars) | ใช่ |
| `PORT` | `8080` (ตั้งแล้วใน fly.toml) | ไม่ต้อง (default) |

### Web (Vercel Env / .env.local)

| Key | Dev (local) | Production |
|-----|-------------|------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api` | `https://maekaos-api.fly.dev/api` |

---

## 6. URLs

| Service | URL |
|---------|-----|
| **API** | https://maekaos-api.fly.dev |
| **Web** | https://web-rho-jet.vercel.app |
| **Health Check** | https://maekaos-api.fly.dev/health |
| **Fly Monitoring** | https://fly.io/apps/maekaos-api/monitoring |

---

## 7. Troubleshooting

| ปัญหา | วิธีแก้ |
|-------|--------|
| API `write failed: EOF` | เช็ค `DATABASE_URL` ใช้ `.internal` ไม่ใช่ `.flycast` และต้อง `?sslmode=require` สำหรับ Supabase |
| API `stopped` / `warning` | `flyctl machine restart <id> -a maekaos-api` |
| Web `CORS error` | CORS ตั้ง `*` ไว้แล้วใน API ถ้ามีปัญหาเช็คว่า `NEXT_PUBLIC_API_URL` ถูกต้อง |
| Migration error | เช็คไฟล์ใน `api/db/migrations/` ไม่มี syntax error |
| Fly trial limit | เพิ่มบัตรที่ https://fly.io/trial |
