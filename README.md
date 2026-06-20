# Chat — анонимный веб-чат

Monorepo: NestJS + Socket.io (backend), React + Vite (frontend), Redis, PostgreSQL.

## Структура

```
apps/backend    — NestJS API + WebSocket
apps/frontend   — React SPA
packages/shared — общие типы и WS-контракты
```

Архитектурный план: `D:\Projects\docs\ARCHITECTURE.md`

## Локальная разработка

Все команды — из корня репозитория `D:\Projects\chat`.

```powershell
copy .env.example .env
npm install
npm run build -w @chat/shared
```

### PostgreSQL и Redis

Нужны запущенные PostgreSQL (порт 5432) и Redis (порт 6379).

**Вариант A — Docker Desktop** (если установлен):

```powershell
docker compose up postgres redis
```

**Вариант B — без Docker:** установите [PostgreSQL](https://www.postgresql.org/download/windows/) и [Redis для Windows](https://github.com/microsoftarchive/redis/releases) (или Memurai), создайте БД `chat` и пользователя по `.env`, либо поправьте `DATABASE_URL` / `REDIS_URL`.

### Миграции и запуск

```powershell
# Миграции БД (один раз, postgres должен быть уже запущен)
npm run prisma:deploy -w @chat/backend

# Терминал 2 — backend
npm run dev:backend

# Терминал 3 — frontend
npm run dev:frontend
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:3000/health

## Docker (весь стек)

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:3000/health
