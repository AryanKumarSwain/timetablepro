# Backend Setup — School Timetable Management System

Production backend: **Prisma 6 + MySQL + iron-session** with multi-tenant `schoolId` isolation on every API route.

---

## 1. Prerequisites

- **Node.js 20+**
- **MySQL 8** (local, Docker, or cloud)

Create the database:

```sql
CREATE DATABASE school_timetable CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 2. Install dependencies (already in repo)

If starting fresh:

```powershell
cd E:\jd\TMS\school-timetable-management
npm install
```

Core packages:

| Package | Purpose |
|---------|---------|
| `prisma` / `@prisma/client@6` | ORM + MySQL |
| `iron-session` | Encrypted HTTP-only session cookie |
| `bcryptjs` | Password hashing |
| `tsx` | Run `prisma/seed.ts` |

---

## 3. Environment variables

```powershell
copy .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/school_timetable"
SESSION_SECRET="your-32-plus-character-random-secret-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Generate a session secret (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## 4. Push schema & seed

```powershell
npm run db:generate
npm run db:push
npm run db:seed
```

Optional migration workflow:

```powershell
npm run db:migrate
```

Browse data:

```powershell
npm run db:studio
```

---

## 5. Run the app

```powershell
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login)

| Role | Email | Password | Redirect |
|------|-------|----------|----------|
| Super Admin | `super@platform.edu` | `password` | `/super-admin/dashboard` |
| School Admin | `admin@school.edu` | `password` | `/admin/dashboard` |
| Teacher | `rajesh@school.edu` | `password` | `/teacher/schedule` |

---

## 6. Architecture map

```
app/api/auth/*          → Login, logout, session (iron-session cookie)
app/api/admin/substitution → Priority-weighted substitute ranking
app/api/admin/clone-day    → Clone attendance + replacements to next day
app/api/teachers|subjects|classes|periods|timetable|attendance|replacements
middleware.ts           → Protects /admin, /teacher, /super-admin, /api/*
lib/substitution-engine.ts → Hard filters + P1/P2/P3 ranking
lib/clone-day.ts        → Day rollover utility
lib/api-services.ts     → Client fetch wrappers (UI unchanged)
```

**Multi-tenant rule:** Every Prisma query in `/api/*` uses `requireSchoolContext()` or `requireSchoolAdmin()` and includes `where: { schoolId }`.

---

## 7. Substitution API

**POST** `/api/admin/substitution`

```json
{
  "date": "2026-05-23",
  "periodId": "<period-uuid>",
  "classId": "<class-uuid>",
  "originalTeacherId": "<teacher-uuid>",
  "subjectId": "<optional>"
}
```

Response: ranked `candidates` (priority 1 = same specialty, 2 = same department code prefix, 3 = general) plus `warnings` when a teacher would exceed 2 substitutions with the same class section in one day.

**GET** `/api/admin/substitution?date=&periodId=&classId=&originalTeacherId=` — preview without marking absent.

---

## 8. Clone day API

**POST** `/api/admin/clone-day`

```json
{ "date": "2026-05-23" }
```

Copies `TeacherAttendance` and `ReplacementAssignment` rows to the next calendar day (replacements reset to `PENDING`).

Client helper: `cloneOperationalDayToTomorrow()` in `lib/api-services.ts`.

---

## 9. UI migration notes

- **No Tailwind/component changes** — pages still import `@/lib/api-services`.
- `lib/mock-data.ts` is unused by API layer; safe to delete after verification.
- Teacher attendance is **per teacher per day** in MySQL (not per period). Daily Desk marks a teacher absent for the date when toggling a slot.
- `dayOfWeek` in schema: **1 = Monday … 6 = Saturday** (aligned with JS `getDay()` except Sunday → use 7 if you add Sunday slots).

---

## 10. Next iteration suggestions

- Super-admin CRUD: `/api/super-admin/schools`, `/api/super-admin/plans`
- Link `User` ↔ `Teacher` with explicit `teacherUserId` field
- Period-level partial absence (schema extension)
- Rate limiting on `/api/auth/login`
