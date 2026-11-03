# Business Directory Frontend

A responsive React interface for the Business Document API. It supports business search and filtering, directory pagination, business creation and editing, deletion, and document uploads.

## Run locally

1. Install frontend dependencies with `npm install`.
2. Start the API from `api/` with `python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000`.
3. Start the frontend from the repository root with `npm run dev`.
4. In the frontend, open **API connection**, use `/api` (the Vite development server proxies it to `http://localhost:8000`) and enter `BUSINESS_API_KEY` from `api/.env`.

For local development, `api/.env` uses SQLite and creates tables at startup. The SQLite database file is kept under `api/` and ignored by Git. For deployments on different origins, use the full API URL and allow the frontend origin through the API's CORS configuration. The API key is stored in session storage for the current browser tab and sent as the `X-API-Key` header.

## API coverage

The frontend uses `GET/POST /businesses`, `PATCH/DELETE /businesses/{business_id}`, `GET /document-types`, and `POST /businesses/{business_id}/documents`. The API does not expose a route for listing documents already attached to a business, so the frontend can show and download files uploaded during the current session, but cannot discover older files.

Uploads are limited to 10 MB, matching the API. The API supports business name, registration number, description, industry, address, city, province, postal code, country, phone, email, and website fields.
