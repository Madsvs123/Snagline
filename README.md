# Snagline

Snagline is a single-operator issue tracker for defects and tasks in your own software projects. Register one owner account, keep a list of projects, and file issues with a title, description, status, severity, labels, and an optional milestone. Each issue can collect comments and an activity trail when it is opened, commented on, or moved to a new status.

Search and status filters narrow the issue list. The dashboard shows counts by status and a chart of issues by severity.

## Who it is for

Snagline is for one person tracking bugs and tasks on software they maintain. One owner account is the whole workspace. It does not invite teammates, store customer records, or handle regulated personal data.

## Stack

- Backend: Django 5, Django REST Framework, SimpleJWT, and django-filter. SQLite is the default database. psycopg is listed for optional Postgres and is not vendored.
- Frontend: React 18, TypeScript, and Vite, with react-router-dom, TanStack Query, TanStack Table, Zustand, Axios, React Hook Form, Zod, Lucide, date-fns, and Recharts.

## How to run

From the `backend` directory:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

From the `frontend` directory, in a second terminal:

```powershell
npm install
npm run dev
```

Open http://localhost:5173 and create the owner account. Registration also creates a default Inbox project with bug, task, and improvement labels.

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`. Copy `.env.example` to `.env` only if you need to override the local defaults. Do not commit `.env`.

Django admin is at http://127.0.0.1:8000/admin/ after `manage.py createsuperuser`.

### Tests

From the `backend` directory:

```powershell
.\.venv\Scripts\python.exe manage.py test
```

The suite registers an owner, files an issue, adds a comment, changes status, and checks search and status filters.

### Frontend production build

From the `frontend` directory:

```powershell
npx vite build
```

`npm run build` also typechecks with `tsc` before Vite builds.

### Optional Postgres

Set `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, and `POSTGRES_PORT`. When `POSTGRES_DB` is set, Django uses Postgres through the psycopg driver listed in `backend/requirements.txt`. When it is empty, Snagline stays on SQLite.

## Layout

- `backend/` — Django project (`config`), owner auth (`accounts`), and the tracker API (`tracker`)
- `frontend/` — React application

## API

- `POST /api/auth/register/` creates the owner, the Inbox project, and a JWT pair
- `POST /api/auth/token/` and `POST /api/auth/token/refresh/`
- `GET /api/auth/me/`
- `GET /api/dashboard/`
- `/api/projects/`, `/api/labels/`, `/api/milestones/`, `/api/issues/`, `/api/comments/`, `/api/activity/`

Issue lists accept `search`, `status`, `severity`, `project`, `milestone`, and `label` query parameters.
