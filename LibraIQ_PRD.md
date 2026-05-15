# LibraIQ — Product Requirements Document

**Version:** 1.0.0 | **Status:** Draft | **Stack:** Next.js · Prisma · PostgreSQL · Docker

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Scope](#2-project-scope)
3. [Stakeholders & User Roles](#3-stakeholders--user-roles)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Database Schema](#6-database-schema)
7. [System Architecture](#7-system-architecture)
8. [Implementation Plan & Phases](#8-implementation-plan--phases)
9. [Complete Dependency List](#9-complete-dependency-list)
10. [Risks & Potential Obstacles](#10-risks--potential-obstacles)
11. [API Endpoint Reference](#11-api-endpoint-reference)
12. [Environment Variables](#12-environment-variables)
13. [Testing Strategy](#13-testing-strategy)
14. [Glossary](#14-glossary)

---

## 1. Executive Summary

LibraIQ is a next-generation library management platform that transcends conventional cataloguing tools. Built on a modern Next.js 14 + Prisma + PostgreSQL stack, it delivers end-to-end book lending and acquisition workflows, layered with AI-powered recommendation engines, a pre-trained ML model for genre/description-based discovery, a gamification framework that rewards reading behaviour, and automated cron-driven email reminders for due dates and overdue notices.

The system targets public libraries serving general members and administrative librarians. It implements a three-tier role model (Super Admin · Librarian · Member), a fully responsive web interface with PWA support for mobile, and a separate Python FastAPI microservice that hosts the pre-trained ML model. The entire stack runs locally and in production via Docker Compose — a single `docker compose up --build` command boots all services.

### Core Value Proposition

- AI-driven personalised recommendations surface books members actually want to read
- ML model microservice accepts free-text genre or description input and returns ranked book suggestions
- Gamification (points + levels + badges) drives engagement and long-term retention
- Automated reminders eliminate manual follow-up and reduce overdue rates
- Unified admin dashboard gives librarians real-time visibility across the entire catalogue
- Zero cloud lock-in — runs on any machine with Docker installed

---

## 2. Project Scope

### 2.1 In Scope

- Complete authentication system (email/password + OAuth, JWT sessions, role-based access control)
- Book catalogue management: add, edit, delete, search, filter, and paginate books
- Lending lifecycle: borrow, renew, return, and overdue tracking
- Ownership marking: members can mark books as personally purchased/owned
- AI recommendation engine: collaborative filtering based on individual reading history (OpenAI API)
- ML microservice: FastAPI service hosting the pre-trained model, accepting genre type or free-text description, returning ranked recommendations
- Gamification engine: points per book read, level tiers, badge awards, and public leaderboard
- Cron jobs: multi-stage email reminders (3 days before due, 1 day before, on due date, overdue escalation)
- Admin dashboard: catalogue overview, borrowing stats, member management, gamification leaderboard
- Progressive Web App (PWA): installable on mobile, offline catalogue browsing
- Full Docker Compose setup: all services containerised, single-command startup

### 2.2 Out of Scope (v1)

- Native mobile application (iOS / Android)
- Full e-commerce / payment gateway integration
- Multi-tenant SaaS (single institution in v1)
- Digital content delivery (e-books, audiobooks)
- Inter-library loan workflows
- Cloud provider deployments (Vercel, Railway, AWS, etc.)

---

## 3. Stakeholders & User Roles

| Role | Description | Key Permissions |
|---|---|---|
| Super Admin | Platform administrator with unrestricted access | All permissions; user role management; system config; cron control |
| Librarian | Staff responsible for catalogue and lending desk | Add/edit/delete books; manage borrowings; view all member records; send manual reminders |
| Member | Registered library patron (general public) | Browse catalogue; borrow/return/renew; view own history; receive recommendations; earn points & badges |
| Guest (unauthenticated) | Anonymous visitor | Browse public catalogue (read-only); register for an account |

---

## 4. Functional Requirements

### 4.1 Authentication & Authorisation

- **FR-AUTH-01:** Users shall register with email, password (bcrypt hashed), first name, last name, and role assignment by a Super Admin or Librarian.
- **FR-AUTH-02:** The system shall support OAuth 2.0 login via Google and GitHub through NextAuth.js.
- **FR-AUTH-03:** JWT-based session tokens shall expire after 24 hours; refresh tokens shall last 7 days.
- **FR-AUTH-04:** Password reset shall be delivered via a time-limited (15 min) tokenised email link.
- **FR-AUTH-05:** All protected routes shall enforce role-based middleware; unauthorised access returns HTTP 403.
- **FR-AUTH-06:** Failed login attempts exceeding 5 in 10 minutes shall trigger a 15-minute account lockout.

### 4.2 Book Catalogue Management

- **FR-CAT-01:** Librarians and Super Admins shall add books with: ISBN, title, author(s), genre tags, publisher, year, total copies, cover image URL, and synopsis.
- **FR-CAT-02:** The catalogue shall support full-text search across title, author, ISBN, and genre.
- **FR-CAT-03:** Books shall be filterable by genre, availability status, publication year range, and language.
- **FR-CAT-04:** Each book shall display real-time available copy count derived from active borrowings.
- **FR-CAT-05:** Bulk CSV import of books shall be supported for initial catalogue seeding.

### 4.3 Lending & Borrowing

- **FR-LEND-01:** Members shall borrow available books; the system shall decrement available copies atomically.
- **FR-LEND-02:** Default lending period shall be 14 days, configurable per book category by a Librarian.
- **FR-LEND-03:** Members shall renew a borrowing up to 2 times provided no reservation queue exists.
- **FR-LEND-04:** Members shall return books; the system shall record the return timestamp and restore available copies.
- **FR-LEND-05:** Overdue borrowings shall accrue a configurable daily late fee (stored, not charged in v1).
- **FR-LEND-06:** Members shall be able to reserve a currently borrowed book; reservations shall be notified via email upon return.
- **FR-LEND-07:** Book ownership marking shall create an OWNED record linked to the member, separate from borrowing stock.

### 4.4 AI Recommendation Engine

- **FR-AI-01:** Upon each book return or reading-history update, the system shall trigger an asynchronous recommendation refresh for the member.
- **FR-AI-02:** Recommendations shall be generated by calling the OpenAI API (GPT model) with a structured prompt containing the member's top genres, favourite authors, and recent titles.
- **FR-AI-03:** The system shall cache AI recommendations in Redis (TTL 24 hours) to minimise API costs.
- **FR-AI-04:** Each member's recommendation shelf shall display a minimum of 5 and maximum of 20 books.
- **FR-AI-05:** Members may thumbs-up or thumbs-down individual recommendations; feedback shall feed into the next refresh prompt.

### 4.5 ML Model Microservice

- **FR-ML-01:** A separate Python FastAPI service shall host the pre-trained ML model and expose a `POST /predict` endpoint.
- **FR-ML-02:** The endpoint shall accept a JSON body with either a genre type (string) or a free-text description (string) and return an ordered list of book recommendations with confidence scores.
- **FR-ML-03:** The Next.js backend shall act as a proxy to the ML service; members shall never call the ML service directly.
- **FR-ML-04:** The ML service shall be protected by a shared secret API key passed in the `Authorization` header.
- **FR-ML-05:** Response latency target for the ML endpoint shall be under 2 seconds at the 95th percentile.

### 4.6 Gamification Engine

- **FR-GAME-01:** Members shall earn points as follows: borrowing a book = 10 pts; returning on time = 20 pts; completing a genre first time = 15 pts; receiving a badge = 50 pts.
- **FR-GAME-02:** Levels shall be tiered: Novice (0–199 pts), Explorer (200–499), Scholar (500–999), Bibliophile (1000–1999), Grand Archivist (2000+).
- **FR-GAME-03:** Badges shall be awarded automatically on trigger events: "First Borrow", "10 Books Read", "Genre Master" (5+ books in one genre), "Speed Reader" (return within 3 days), "Loyal Reader" (6 consecutive months active).
- **FR-GAME-04:** A public leaderboard shall rank members by total points with pagination (top 50 visible to all authenticated users).
- **FR-GAME-05:** Members shall receive an in-app notification and email when they level up or earn a new badge.

### 4.7 Cron Jobs & Email Notifications

- **FR-CRON-01:** A daily cron job (02:00 UTC) shall query all borrowings due in 3 days and dispatch reminder emails.
- **FR-CRON-02:** A second daily cron job (02:30 UTC) shall query all borrowings due the following day and dispatch final reminder emails.
- **FR-CRON-03:** An on-due-date cron job (06:00 UTC) shall notify members whose books are due today.
- **FR-CRON-04:** An overdue cron job (08:00 UTC) shall notify members with overdue books daily for up to 14 days, then escalate to the Librarian.
- **FR-CRON-05:** All outbound emails shall use Resend with React Email templates.
- **FR-CRON-06:** Members shall be able to opt out of reminder emails from their profile settings.

### 4.8 Admin Dashboard

- **FR-ADMIN-01:** Dashboard shall display KPI cards: total books, active borrowings, overdue count, new members this month.
- **FR-ADMIN-02:** Librarians shall view, filter, and export borrowing records to CSV.
- **FR-ADMIN-03:** Super Admins shall promote/demote users between Member and Librarian roles.
- **FR-ADMIN-04:** Dashboard shall include a live leaderboard widget showing the top 10 members by points.
- **FR-ADMIN-05:** Cron job logs shall be viewable within the admin UI showing last run time, records processed, and errors.

---

## 5. Non-Functional Requirements

| ID | Category | Requirement | Target |
|---|---|---|---|
| NFR-01 | Performance | API response time (p95) for catalogue search | < 300 ms |
| NFR-02 | Performance | ML microservice recommendation latency (p95) | < 2 s |
| NFR-03 | Performance | Page initial load (LCP on 4G) | < 2.5 s |
| NFR-04 | Scalability | Concurrent active users supported without degradation | ≥ 500 |
| NFR-05 | Availability | System uptime SLA | 99.5% monthly |
| NFR-06 | Security | All data in transit encrypted | TLS 1.3 |
| NFR-07 | Security | Passwords stored using bcrypt with salt rounds | ≥ 12 rounds |
| NFR-08 | Security | API rate limiting per IP | 100 req/min |
| NFR-09 | Accessibility | WCAG compliance level | 2.1 AA |
| NFR-10 | Maintainability | Test coverage (unit + integration) | ≥ 75% |
| NFR-11 | Compliance | User data handling | GDPR-aware (data export & delete) |
| NFR-12 | Reliability | Cron job failure alerting | Email alert to Super Admin within 5 min |

---

## 6. Database Schema

### 6.1 Model Overview

| Model | Purpose |
|---|---|
| User | Authenticated platform user; holds role, profile, and gamification totals |
| Book | Catalogue entry: metadata, copies, genre tags |
| BookGenre | Many-to-many join between Book and Genre |
| Genre | Controlled vocabulary of genres |
| Borrowing | Tracks each borrow/return lifecycle including renewals and fees |
| Reservation | Queue of members waiting for a currently borrowed book |
| Ownership | Records a member marking a book as personally purchased |
| AIRecommendation | Cached AI-generated book recommendations per member |
| MLRecommendation | Cached ML microservice results per member query |
| RecommendationFeedback | Thumbs up/down feedback on individual AI recommendations |
| Badge | Definition of achievable badges |
| UserBadge | Join table: badges awarded to users with timestamp |
| PointTransaction | Immutable ledger of every point gain/loss event |
| CronLog | Audit trail for every cron job execution |
| Notification | In-app notifications for users |
| EmailOptOut | Records members who have opted out of email reminders |

### 6.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role         { SUPER_ADMIN  LIBRARIAN  MEMBER }
enum BorrowStatus { ACTIVE  RETURNED  OVERDUE  RENEWED }
enum NotifType    { BADGE_EARNED  LEVEL_UP  DUE_REMINDER  OVERDUE  RESERVATION_READY }

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String?
  firstName    String
  lastName     String
  role         Role     @default(MEMBER)
  totalPoints  Int      @default(0)
  level        String   @default("Novice")
  avatarUrl    String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  borrowings    Borrowing[]
  reservations  Reservation[]
  ownerships    Ownership[]
  aiRecs        AIRecommendation[]
  mlRecs        MLRecommendation[]
  badges        UserBadge[]
  pointTxns     PointTransaction[]
  notifications Notification[]
  emailOptOut   EmailOptOut?
}

model Book {
  id            String   @id @default(cuid())
  isbn          String   @unique
  title         String
  authors       String[]
  publisher     String
  publishedYear Int
  synopsis      String?
  coverUrl      String?
  language      String   @default("English")
  totalCopies   Int      @default(1)
  createdAt     DateTime @default(now())

  genres       BookGenre[]
  borrowings   Borrowing[]
  reservations Reservation[]
  ownerships   Ownership[]
}

model Genre {
  id    String      @id @default(cuid())
  name  String      @unique
  books BookGenre[]
}

model BookGenre {
  bookId  String
  genreId String
  book    Book   @relation(fields: [bookId],  references: [id])
  genre   Genre  @relation(fields: [genreId], references: [id])
  @@id([bookId, genreId])
}

model Borrowing {
  id           String       @id @default(cuid())
  userId       String
  bookId       String
  status       BorrowStatus @default(ACTIVE)
  borrowedAt   DateTime     @default(now())
  dueDate      DateTime
  returnedAt   DateTime?
  renewalCount Int          @default(0)
  lateFee      Decimal?     @db.Decimal(8, 2)

  user Book @relation(fields: [userId], references: [id])
  book Book @relation(fields: [bookId], references: [id])

  @@index([userId, status])
  @@index([dueDate, status])
}

model Reservation {
  id          String   @id @default(cuid())
  userId      String
  bookId      String
  reservedAt  DateTime @default(now())
  notifiedAt  DateTime?

  user User @relation(fields: [userId], references: [id])
  book Book @relation(fields: [bookId], references: [id])
  @@unique([userId, bookId])
}

model Ownership {
  id         String   @id @default(cuid())
  userId     String
  bookId     String
  ownedSince DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
  book Book @relation(fields: [bookId], references: [id])
  @@unique([userId, bookId])
}

model AIRecommendation {
  id          String   @id @default(cuid())
  userId      String
  bookIds     String[]
  generatedAt DateTime @default(now())
  expiresAt   DateTime

  user     User                     @relation(fields: [userId], references: [id])
  feedback RecommendationFeedback[]
}

model MLRecommendation {
  id          String   @id @default(cuid())
  userId      String
  query       String
  bookIds     String[]
  scores      Float[]
  generatedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model RecommendationFeedback {
  id               String           @id @default(cuid())
  recommendationId String
  bookId           String
  isPositive       Boolean
  createdAt        DateTime         @default(now())

  recommendation AIRecommendation @relation(fields: [recommendationId], references: [id])
}

model Badge {
  id          String      @id @default(cuid())
  key         String      @unique
  name        String
  description String
  iconUrl     String?
  pointValue  Int         @default(50)
  users       UserBadge[]
}

model UserBadge {
  userId    String
  badgeId   String
  awardedAt DateTime @default(now())

  user  User  @relation(fields: [userId],  references: [id])
  badge Badge @relation(fields: [badgeId], references: [id])
  @@id([userId, badgeId])
}

model PointTransaction {
  id        String   @id @default(cuid())
  userId    String
  delta     Int
  reason    String
  refId     String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
  @@index([userId, createdAt])
}

model Notification {
  id        String     @id @default(cuid())
  userId    String
  type      NotifType
  message   String
  isRead    Boolean    @default(false)
  createdAt DateTime   @default(now())

  user User @relation(fields: [userId], references: [id])
  @@index([userId, isRead])
}

model EmailOptOut {
  id        String   @id @default(cuid())
  userId    String   @unique
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model CronLog {
  id        String   @id @default(cuid())
  jobName   String
  runAt     DateTime @default(now())
  processed Int
  errors    Int      @default(0)
  notes     String?

  @@index([jobName, runAt])
}
```

---

## 7. System Architecture

### 7.1 High-Level Architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Server components, client interactions, PWA shell, React Email templates |
| API Layer | Next.js Route Handlers | REST endpoints under `/api/*`; JWT middleware; rate limiting |
| ORM / DB | Prisma + PostgreSQL | Type-safe queries, migrations, connection pooling |
| Auth | NextAuth.js v5 | Session management, OAuth providers, JWT strategy |
| ML Service | Python FastAPI | Hosts pre-trained recommendation model; exposes `POST /predict` |
| AI Service | OpenAI API | GPT-based personalised recommendation prompt calls |
| Email | Resend + React Email | Transactional email delivery with branded HTML templates |
| Cron | node-cron (in Next.js) | Scheduled jobs for reminders and overdue checks |
| Cache | Redis | AI recommendation cache, rate-limit counters, session store |
| Storage | Local volume / S3-compatible | Book cover image uploads |
| Containerisation | Docker + Docker Compose | All services run as containers; single-command local and production startup |

### 7.2 Docker Compose Service Map

All services are defined in a single `docker-compose.yml`. Running `docker compose up --build` starts the entire stack.

| Service name | Image / Build | Ports | Notes |
|---|---|---|---|
| `web` | Build from `./Dockerfile` (Next.js) | 3000:3000 | Main application; depends on `db` and `redis` |
| `ml` | Build from `./ml/Dockerfile` (FastAPI) | 8000:8000 | ML microservice; mounts model weights as read-only volume |
| `db` | `postgres:16-alpine` | 5432:5432 | PostgreSQL; data persisted via named volume `postgres_data` |
| `redis` | `redis:7-alpine` | 6379:6379 | In-memory cache; no persistence needed in dev |

### 7.3 Dockerfile Strategy

**Next.js App (`./Dockerfile`) — 3-stage build:**

- **Stage 1 — deps:** Install only production `node_modules`
- **Stage 2 — builder:** Run `next build` with `NODE_ENV=production`
- **Stage 3 — runner:** Copy `.next/standalone` output; run as non-root user
- Result: ~150 MB final image using Next.js standalone output mode

**FastAPI ML Service (`./ml/Dockerfile`):**

- Base: `python:3.11-slim`
- Install `requirements.txt`; copy model weights (joblib/pickle file) into image
- CMD: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Result: self-contained image; model weights baked in or mounted as a volume

### 7.4 Environment Variables in Docker

All secrets are supplied via a `.env` file at project root and injected into containers via `env_file` directive in `docker-compose.yml`. The `.env` file is never committed to source control — a `.env.example` file with placeholder values is committed instead.

### 7.5 ML Microservice Contract

| Field | Type | Description |
|---|---|---|
| `POST /predict` | — | Prediction endpoint |
| Request: `genre` | string (optional) | Genre keyword e.g. `"Science Fiction"` |
| Request: `description` | string (optional) | Free-text description of desired book type |
| Response: `recommendations` | array | Ordered list of `{ isbn, title, authors, confidence }` |
| Response: `model_version` | string | Semantic version of the deployed model |

---

## 8. Implementation Plan & Phases

> The project is divided into 5 phases spanning an estimated 20 weeks. Each phase builds on the previous and produces a shippable milestone.

### Phase 1 — Foundation, Docker & Auth (Weeks 1–3)

- Scaffold Next.js 14 project with App Router, TypeScript, and Tailwind CSS
- Configure ESLint, Prettier, and Husky pre-commit hooks
- Write `Dockerfile` for the Next.js app (3-stage: deps → builder → runner)
- Write `docker-compose.yml` wiring up `web`, `db` (PostgreSQL), and `redis` services
- Verify full stack starts with `docker compose up --build` from a clean checkout
- Initialise Prisma, connect to the Dockerised PostgreSQL, and run initial schema migration inside the container
- Implement NextAuth.js: email/password + Google + GitHub OAuth providers
- Build registration, login, forgot-password, and reset-password pages
- Implement JWT middleware and role-based route protection

**✅ Deliverable:** Full authenticated shell running via Docker Compose — single `docker compose up` boots the entire stack

### Phase 2 — Catalogue & Lending Core (Weeks 4–8)

- Build book model: CRUD API routes + admin forms with Zod validation
- Implement full-text search with PostgreSQL `tsvector` + GIN index
- Build catalogue browsing UI: search bar, genre filter chips, availability badges, pagination
- Implement borrowing lifecycle: borrow, renew, return API endpoints with atomic copy-count updates
- Build member borrowing history and current loans pages
- Implement reservation queue: place reservation, notify on return via email
- Implement ownership marking (purchased/owned flag)
- Build Librarian dashboard: borrowing records table, overdue flagging, CSV export

**✅ Deliverable:** Fully functional library management system (feature-parity with a traditional LMS)

### Phase 3 — AI & ML Recommendations (Weeks 9–12)

- Write `Dockerfile` for the FastAPI ML microservice; add `ml` service to `docker-compose.yml`
- Load pre-trained ML model inside the container; verify `POST /predict` responds correctly
- Add shared-secret auth header validation on the microservice
- Build Next.js proxy API route to ML service; implement error fallback
- Implement OpenAI API integration for collaborative-filtering recommendations
- Build prompt-engineering layer using member genre history and reading patterns
- Implement Redis caching for AI recommendations (24-hour TTL)
- Build "For You" recommendation shelf on member homepage
- Add thumbs-up / thumbs-down feedback UI and persist to `RecommendationFeedback` table
- Build "Discover by Genre / Description" search page using the ML microservice

**✅ Deliverable:** Dual AI/ML recommendation system live for all members

### Phase 4 — Gamification Engine (Weeks 13–16)

- Seed `Badge` definitions table; implement badge-award service with trigger evaluation
- Implement `PointTransaction` ledger: write point events on borrow, return, badge award
- Build level-calculation service; update `User.level` on every point transaction
- Build member profile page: points balance, current level, earned badges with icons
- Build public leaderboard page: top 50 members sorted by total points, paginated
- Implement in-app notifications (`Notification` model) for level-up and badge events
- Send level-up and badge-award confirmation emails via Resend
- Add leaderboard widget to admin dashboard

**✅ Deliverable:** Gamification layer fully operational; leaderboard publicly visible

### Phase 5 — Cron Jobs, Polish & Launch (Weeks 17–20)

- Implement `node-cron` job scheduler within Next.js: 4 scheduled jobs (3-day, 1-day, due-today, overdue)
- Build React Email templates for each notification type with library branding
- Implement email opt-out settings on member profile; respect opt-out in all cron dispatches
- Build `CronLog` audit table and admin UI log viewer
- Add Super Admin alerting on cron job failure
- Implement PWA: `manifest.json`, service worker, offline catalogue cache
- Perform accessibility audit (WCAG 2.1 AA) and fix violations
- Write unit and integration tests to reach 75% coverage threshold
- Validate `docker compose up --build` starts cleanly on a fresh machine with only a `.env` file provided
- Add `docker-compose.prod.yml` override: disable volume mounts, set `restart: always` on all services
- Production hardening: rate limiting, CSP headers, error monitoring

**✅ Deliverable:** Production-ready LibraIQ — fully containerised, runs on any machine with Docker installed

---

## 9. Complete Dependency List

### 9.1 Next.js Application — Production Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | ^14.2.x | React framework with App Router, SSR, and API routes |
| `react` | ^18.3.x | UI component library |
| `react-dom` | ^18.3.x | React DOM renderer |
| `typescript` | ^5.x | Static type checking |
| `@prisma/client` | ^5.x | Type-safe PostgreSQL ORM client |
| `next-auth` | ^5.x (beta) | Authentication: sessions, OAuth, JWT |
| `bcryptjs` | ^2.4.x | Password hashing |
| `zod` | ^3.x | Schema validation for API inputs |
| `openai` | ^4.x | OpenAI SDK for GPT API calls |
| `resend` | ^3.x | Transactional email delivery |
| `@react-email/components` | ^0.x | Email template components |
| `react-email` | ^2.x | Email rendering and preview |
| `node-cron` | ^3.x | Cron job scheduler |
| `ioredis` | ^5.x | Redis client — connects to the `redis` Docker container |
| `axios` | ^1.x | HTTP client for ML microservice calls |
| `date-fns` | ^3.x | Date manipulation utilities |
| `sharp` | ^0.33.x | Image optimisation (Next.js requirement) |
| `tailwindcss` | ^3.x | Utility-first CSS framework |
| `@tailwindcss/typography` | ^0.5.x | Prose typography plugin |
| `clsx` | ^2.x | Conditional className utility |
| `lucide-react` | ^0.x | Icon library |
| `@radix-ui/react-dialog` | ^1.x | Accessible modal dialogs |
| `@radix-ui/react-dropdown-menu` | ^2.x | Accessible dropdown menus |
| `@radix-ui/react-toast` | ^1.x | Accessible toast notifications |
| `react-hook-form` | ^7.x | Performant form state management |
| `@hookform/resolvers` | ^3.x | Zod integration for react-hook-form |
| `recharts` | ^2.x | Chart library for admin dashboard |
| `next-pwa` | ^5.x | PWA plugin for Next.js |

### 9.2 Next.js Application — Development Dependencies

| Package | Version | Purpose |
|---|---|---|
| `prisma` | ^5.x | Prisma CLI for migrations and schema management |
| `@types/node` | ^20.x | Node.js type definitions |
| `@types/react` | ^18.x | React type definitions |
| `@types/bcryptjs` | ^2.x | bcryptjs type definitions |
| `@types/node-cron` | ^3.x | node-cron type definitions |
| `eslint` | ^8.x | JavaScript/TypeScript linter |
| `eslint-config-next` | ^14.x | Next.js ESLint ruleset |
| `prettier` | ^3.x | Code formatter |
| `husky` | ^9.x | Git pre-commit hooks |
| `lint-staged` | ^15.x | Run linters on staged files only |
| `jest` | ^29.x | Unit and integration test runner |
| `@testing-library/react` | ^14.x | React component testing utilities |
| `@testing-library/jest-dom` | ^6.x | Custom Jest matchers for DOM |
| `ts-jest` | ^29.x | TypeScript preprocessor for Jest |
| `msw` | ^2.x | API mocking for tests (Mock Service Worker) |

### 9.3 Python ML Microservice (`requirements.txt`)

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | >=0.111 | ASGI web framework for the prediction API |
| `uvicorn[standard]` | >=0.29 | ASGI server |
| `pydantic` | >=2.7 | Request/response schema validation |
| `numpy` | >=1.26 | Numerical computing for model inference |
| `pandas` | >=2.2 | Data manipulation for preprocessing |
| `scikit-learn` | >=1.4 | ML utilities (if model uses sklearn pipeline) |
| `joblib` | >=1.4 | Model serialisation/deserialisation |
| `python-dotenv` | >=1.0 | Environment variable management |
| `httpx` | >=0.27 | Async HTTP client for outbound calls |

### 9.4 Infrastructure & Services

| Tool / Service | Version / Tier | Purpose |
|---|---|---|
| Docker Engine | 26+ | Container runtime — required on every machine that runs the app |
| Docker Compose | v2 (bundled with Docker Desktop) | Orchestrates all services with a single command |
| `postgres:16-alpine` | Docker image | Relational database; data persisted via named Docker volume |
| `redis:7-alpine` | Docker image | In-memory cache for recommendations and rate limiting |
| Resend | Free (3,000 emails/mo) | Transactional email delivery — external SaaS |
| OpenAI API | Pay-as-you-go | GPT calls for AI recommendations — external API, key in `.env` |
| MinIO (optional) | Docker image | S3-compatible local storage for book cover images in full offline dev |

---

## 10. Risks & Potential Obstacles

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | OpenAI API costs spike under heavy usage | Medium | High | Cache all AI responses in Redis (24h TTL); implement per-user daily request cap; monitor spend with OpenAI usage alerts |
| R-02 | ML container cold-start latency on first request after restart | Medium | Medium | Add a `HEALTHCHECK` in the `ml` Dockerfile; `docker-compose depends_on` with `condition: service_healthy` on the web service; show loading skeleton on UI |
| R-03 | Pre-trained ML model accuracy degrades on unseen data | Medium | Medium | Version-stamp the model file; log prediction confidence scores; plan a retraining pipeline if accuracy drops below threshold |
| R-04 | PostgreSQL full-text search performance at scale | Low | High | Add GIN index on `tsvector` column at migration time; benchmark with realistic dataset; add Meilisearch as a fifth Docker service if needed |
| R-05 | node-cron jobs silently fail inside the web container | Medium | High | Persist `CronLog` on every run; add a health endpoint that reports last-run timestamps; check with `docker compose logs web` |
| R-06 | Email deliverability / Resend rate limits | Low | Medium | Implement exponential back-off retry queue; log failed sends; validate member email at registration |
| R-07 | NextAuth.js v5 breaking changes (still in beta) | Medium | Medium | Pin to a specific beta version in `package.json`; maintain dedicated auth integration tests; update only intentionally |
| R-08 | Concurrent borrowing race condition (over-lending) | Medium | High | Wrap copy-count decrement in a Prisma transaction with `SELECT FOR UPDATE`; add database-level check constraint |
| R-09 | Docker volume data loss on `docker compose down -v` | Low | High | Document that `-v` destroys data; use named volumes (not anonymous); add a db backup script as an npm script |
| R-10 | Environment variable mismatch between `.env.example` and `.env` | Medium | Medium | Use a startup validation library (`envalid` or `zod-env`) that crashes the container on boot if required vars are missing — fail fast, not silently |

---

## 11. API Endpoint Reference

### 11.1 Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create new member account |
| POST | `/api/auth/[...nextauth]` | Public | NextAuth.js handler (login, OAuth callback, logout) |
| POST | `/api/auth/forgot-password` | Public | Send password reset email |
| POST | `/api/auth/reset-password` | Public | Confirm password reset with token |

### 11.2 Books & Catalogue

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/books` | Member+ | List books with search, filter, pagination |
| POST | `/api/books` | Librarian+ | Add new book to catalogue |
| GET | `/api/books/[id]` | Member+ | Get single book detail |
| PATCH | `/api/books/[id]` | Librarian+ | Update book metadata |
| DELETE | `/api/books/[id]` | Super Admin | Soft-delete book from catalogue |
| POST | `/api/books/import` | Librarian+ | Bulk CSV import |

### 11.3 Borrowing & Lending

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/borrowings` | Member+ | Borrow a book |
| GET | `/api/borrowings/me` | Member+ | Get current member's borrowings |
| PATCH | `/api/borrowings/[id]/renew` | Member+ | Renew a borrowing |
| PATCH | `/api/borrowings/[id]/return` | Member+ | Return a book |
| GET | `/api/borrowings` | Librarian+ | Get all borrowings (admin view) |
| POST | `/api/reservations` | Member+ | Place reservation on borrowed book |
| POST | `/api/ownership` | Member+ | Mark book as personally owned |

### 11.4 Recommendations

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/recommendations/ai` | Member+ | Get cached AI recommendations for current user |
| POST | `/api/recommendations/ai/refresh` | Member+ | Force-refresh AI recommendations |
| POST | `/api/recommendations/ml` | Member+ | Get ML recommendations by genre or description |
| POST | `/api/recommendations/feedback` | Member+ | Submit thumbs-up/down on a recommendation |

### 11.5 Gamification

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/gamification/me` | Member+ | Get current user's points, level, and badges |
| GET | `/api/gamification/leaderboard` | Member+ | Get top 50 members ranked by points |
| GET | `/api/gamification/badges` | Member+ | List all available badges and earned status |

---

## 12. Environment Variables

All variables are defined in a `.env` file at project root. Docker Compose injects them into every container via `env_file: .env`. A `.env.example` with placeholder values is committed to source control; the real `.env` is gitignored.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Points to the `db` container: `postgresql://libraiq:secret@db:5432/libraiq` |
| `POSTGRES_USER` | Yes | PostgreSQL user — consumed by the `db` container on first init |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password — consumed by the `db` container on first init |
| `POSTGRES_DB` | Yes | Database name — consumed by the `db` container on first init |
| `REDIS_URL` | Yes | Points to the `redis` container: `redis://redis:6379` |
| `NEXTAUTH_SECRET` | Yes | Random 32-byte hex string for NextAuth.js JWT signing |
| `NEXTAUTH_URL` | Yes | Base URL e.g. `http://localhost:3000` in dev |
| `GOOGLE_CLIENT_ID` | OAuth | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth | Google OAuth 2.0 Client Secret |
| `GITHUB_CLIENT_ID` | OAuth | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | OAuth | GitHub OAuth App Client Secret |
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT recommendation calls |
| `ML_SERVICE_URL` | Yes | Points to the `ml` container: `http://ml:8000` |
| `ML_SERVICE_SECRET` | Yes | Shared secret for ML microservice `Authorization` header |
| `RESEND_API_KEY` | Yes | Resend transactional email API key |
| `EMAIL_FROM` | Yes | Sender address for all outbound emails |
| `CRON_SECRET` | Yes | Bearer token to protect manual cron trigger endpoints |

---

## 13. Testing Strategy

### 13.1 Unit Tests (Jest + ts-jest)

- Utility functions: point calculation, level promotion logic, badge trigger evaluation
- Zod validation schemas: boundary tests for all API input validators
- Date helpers: due-date calculation, overdue detection, cron window checks

### 13.2 Integration Tests (Jest + MSW)

- Auth flows: registration, login, password reset, OAuth callback
- Borrowing lifecycle: borrow → renew → return with copy-count assertions
- Gamification: point award triggers, badge award conditions, level promotion
- Recommendation cache: hit/miss behaviour, TTL expiry, refresh flow

### 13.3 End-to-End Tests (Playwright)

- Member journey: register → search catalogue → borrow → return → view badge earned
- Admin journey: add book → manage borrowing → view leaderboard
- ML recommendation: enter genre description → view ranked results

### 13.4 Running Tests Inside Docker

```bash
# Run unit + integration tests inside the web container
docker compose run --rm web npm test

# Run e2e tests (requires the full stack to be running)
docker compose up -d
npx playwright test
```

---

## 14. Glossary

| Term | Definition |
|---|---|
| LMS | Library Management System |
| Borrowing | The act of a member checking out a book for a defined period |
| Renewal | Extending a borrowing period before the due date |
| Reservation | A queue entry placed by a member for a currently borrowed book |
| Ownership | A record indicating a member has personally purchased a book |
| TTL | Time-to-Live — the duration a cached record remains valid before expiry |
| GIN Index | Generalised Inverted Index — PostgreSQL index type optimised for full-text search |
| CUID | Collision-resistant Unique Identifier — Prisma's default ID strategy |
| ASGI | Asynchronous Server Gateway Interface — Python async web server standard |
| PWA | Progressive Web App — a web app installable on mobile via a browser |
| p95 / p99 | 95th / 99th percentile latency — measures tail response times |
| OAuth | Open Authorisation — protocol for third-party login delegation |
| JWT | JSON Web Token — compact signed token for session management |
| Docker Compose | Tool for defining and running multi-container Docker applications |
| Named Volume | A Docker-managed persistent storage volume that survives container restarts |

---

*— End of Document —*
