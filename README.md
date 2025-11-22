pp# Waiz - Eco Marketplace (Local Scaffold)

This repository is a local scaffold of the Waiz website (Baguio-focused eco marketplace) built with Node.js + Express and SQLite.

Quick start (Windows PowerShell):

1. Install dependencies

```powershell
cd c:\Users\Marianne\Downloads\waiz-ham
npm install
```

2. Initialize DB (the server auto-initializes DB using `server/db/init.sql` if the DB file is not present)

3. Start the server (development with auto-reload):

```powershell
npm run dev
```

4. Open the frontend in your browser:

http://localhost:3000

What is included:
- `server/` - Express server, REST API and SQLite DB initializer
- `frontend/` - Static frontend (index.html). The UI is simplified to demonstrate end-to-end flows (signup/login/chatbot)
- `server/db/init.sql` - schema and seed data for rates

Notes & next steps:
- This is a minimal scaffold to get you started. The frontend is intentionally simple and uses browser prompts for signup/login to keep things self-contained.
- Expand the frontend to use proper modals and SPA navigation; wire items, requests, messages UIs to the API endpoints.
- Add authentication tokens for persistent sessions.

If you want, I can:
- Wire the full frontend JS to the API (dashboard, items, messages, requests) instead of using prompts
- Add token-based auth (JWT)
- Add file upload for item images and map integration for addresses

