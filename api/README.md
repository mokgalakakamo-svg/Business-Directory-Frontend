# Local development

The API can run locally with SQLite so PostgreSQL credentials are not needed:

1. Copy `.env.example` to `.env` and replace `BUSINESS_API_KEY` with a long random secret.
2. Start the service from this directory with `python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000`.
3. The API creates its tables at startup in `business_directory.sqlite3`.

To use PostgreSQL instead, remove `DATABASE_URL` and `AUTO_CREATE_TABLES` from `.env`, set the `DB_*` values, and run `alembic upgrade head` before starting the API.

The API routes and data model are described below. All routes require the `X-API-Key` header.
