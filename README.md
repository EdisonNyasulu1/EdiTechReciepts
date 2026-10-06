# EdiTech Graphix Business Suite

Receipts, invoices, **quotations** and simple bookkeeping for EdiTech Graphix.

- **Frontend**: React + Vite (hosted on Vercel)
- **Backend**: Node.js + Express API (hosted on Render, Railway or similar)
- **Database**: Neon Postgres

What it does: log in, generate a Receipt / Invoice / Quotation on your branded template, download it as **JPG or PDF**, or **share it on WhatsApp**. Every document is saved so you can re-open it later from the Financials tab. Track expenses, see revenue and profit, export CSV, back up and restore.

---

## 1. Project layout

```
editech-business-suite/
├── backend/                 Express API
│   ├── server.js            starts the server
│   ├── app.js               middleware + routes wiring
│   ├── config.js            reads and validates .env (stops with a clear message if wrong)
│   ├── buildConfig.js       the validation rules (unit tested)
│   ├── db.js                Postgres connection
│   ├── migrate.js           applies database migrations     -> npm run migrate
│   ├── seed.js              creates / updates a login user  -> npm run seed
│   ├── validators.js        checks all incoming data
│   ├── routes/              auth.js (login/logout/me), api.js (data, transactions, expenses)
│   ├── middleware/          auth, rate limiting + origin guard, error handling
│   ├── migrations/          000_initial, 001_quotations, 002_integrity_checks
│   └── test/                backend tests
├── frontend/                React app
│   ├── public/              the two template images + favicon
│   ├── vercel.json          hosting config (EDIT the backend address, see section 5)
│   └── src/
│       ├── components/      forms, preview, financials, expenses, tools
│       ├── utils/           renderDocument.js (draws on your templates), format.js, documents.js (+ tests)
│       ├── data/presets.js  the EdiTech rate card
│       └── styles/
├── render.yaml              one-click backend setup on Render
└── .github/workflows/ci.yml runs tests + build on every push
```

---

## 2. Run it on your computer (Windows / PowerShell)

You need **Node.js 18.18 or newer** (https://nodejs.org, the LTS version). Check with `node --version`.

> Put the project in a simple folder such as `C:\Projects\editech-business-suite` (not inside `Downloads`, and not a folder inside a folder with the same name).

### Step 1: Backend

```powershell
cd C:\Projects\editech-business-suite\backend
npm install
copy .env.example .env
```

Open `backend\.env` in Notepad and fill in:

| Setting | What to put |
|---|---|
| `DATABASE_URL` | Neon dashboard -> your project -> **Connect** -> copy the connection string |
| `JWT_SECRET` | Run `npm run gen-secret`, copy the long text it prints |

Leave the other lines as they are for local use. Then:

```powershell
npm run migrate        # creates/updates the tables (safe to run again)
npm run seed -- admin 'ChooseAStrongPassword1!' 'Edison Nyasulu'
npm run dev            # API now runs on http://localhost:5000
```

Use **single quotes** around the password in PowerShell, so characters like `$` and `#` are kept exactly as typed. The password must be at least 10 characters.

Check it works: open http://localhost:5000/api/health, you should see `{"ok":true,...}`.

### Step 2: Frontend (second PowerShell window)

```powershell
cd C:\Projects\editech-business-suite\frontend
npm install
npm run dev
```

Open **http://localhost:5173** and sign in. No `.env` is needed for the frontend locally: it sends `/api/...` to the same address and Vite forwards it to your backend on port 5000.

### Useful commands

| Where | Command | Does |
|---|---|---|
| backend | `npm test` | runs the backend tests |
| frontend | `npm test` | runs the frontend tests (amount-in-words, totals, drawing) |
| frontend | `npm run build` | makes the production build in `frontend/dist` |
| project root | `npm run install:all` | installs both |
| project root | `npm test` | runs all tests |

> **Tip:** use a **separate Neon branch** (Neon dashboard -> Branches) for local testing so you never touch your live data.

---

## 3. Settings (`backend/.env`)

| Setting | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | | Neon connection string |
| `JWT_SECRET` | yes | | at least 16 characters (32 in production). `npm run gen-secret` |
| `NODE_ENV` | | `development` | `production` on the server |
| `PORT` | | `5000` | hosts like Render set this for you |
| `CLIENT_URL` | production | `http://localhost:5173` | your website address. Several allowed, separated by commas |
| `COOKIE_SAMESITE` | | `lax` locally, `none` in production | use `lax` when Vercel forwards `/api` (recommended, section 5) |
| `SESSION_HOURS` | | `8` | how long a login lasts |
| `LOGIN_MAX_ATTEMPTS` | | `10` | failed logins per IP per 15 minutes |
| `DB_SSL` | | automatic | on for Neon, off for `localhost` |

The server **refuses to start** with a clear message if something important is missing or unsafe, instead of failing later.

---

## 4. Put it on GitHub

```powershell
cd C:\Projects\editech-business-suite
git init
git add .
git status          # check that .env is NOT listed (it is ignored on purpose)
git commit -m "EdiTech Business Suite"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/editech-business-suite.git
git push -u origin main
```

Create the empty repository on github.com first (no README, no .gitignore). After your first `npm install`, **commit the two `package-lock.json` files** too, since they make installs identical everywhere.

> **Never commit `.env`.** If a password or secret was ever pushed, change it right away (Neon: reset the database password; backend: generate a new `JWT_SECRET`).

GitHub Actions (`.github/workflows/ci.yml`) will run the tests and a production build on every push.

---

## 5. Deploy

Order: **database -> backend -> frontend -> connect them**.

### A. Database (Neon)
Already done. Use the production connection string for `DATABASE_URL` on the server.

### B. Backend on Render
1. render.com -> **New +** -> **Blueprint** -> choose your GitHub repo (it reads `render.yaml`).
   *(Or **New Web Service** manually: Root Directory `backend`, Build `npm install --omit=dev && npm run migrate`, Start `npm start`, Health Check Path `/api/health`.)*
2. When asked, paste `DATABASE_URL`. For `CLIENT_URL` put a temporary value like `https://temporary.example` (you will fix it in step D).
3. After the deploy, open `https://YOUR-SERVICE.onrender.com/api/health`. You should see `ok`.
4. **Create your login on the live database.** Run this on your computer, pointing at the live database for just this one command:
   ```powershell
   cd backend
   $env:DATABASE_URL = 'paste-the-production-connection-string'
   npm run seed -- admin 'ChooseAStrongPassword1!' 'Edison Nyasulu'
   Remove-Item Env:DATABASE_URL
   ```

> Render's free plan sleeps after inactivity, so the first request after a break can take about 30-60 seconds. A paid plan removes this.

### C. Frontend on Vercel
1. **Before pushing**, open `frontend/vercel.json` and replace `YOUR-BACKEND-HOST.onrender.com` with your real Render address. Commit and push.
2. vercel.com -> **Add New Project** -> import the repo -> set **Root Directory** to `frontend` (framework: Vite) -> Deploy. No environment variables are needed.

This makes the browser talk to `/api` on your Vercel address and Vercel forwards it to Render, so the login cookie is first-party. That is what makes login work reliably on iPhones/Safari, which block cross-site cookies.

### D. Connect them
On Render -> your service -> **Environment**: set `CLIENT_URL` to your Vercel address (e.g. `https://editech-graphix.vercel.app`, no trailing path). Save (it redeploys). If you also use your own domain, list both, separated by a comma.

### E. Final check
Open your Vercel address -> sign in -> create a quotation -> download PDF -> check **Financials** shows it.

**If you prefer NOT to use the Vercel forwarding:** set `VITE_API_URL=https://YOUR-BACKEND/api` as a Vercel environment variable, set `COOKIE_SAMESITE=none` on Render, and expect problems on Safari.

---

## 6. Customising

| I want to... | Edit |
|---|---|
| change service names or prices | `frontend/src/data/presets.js` |
| replace a template image | keep the **same size and proportions**, replace the file in `frontend/public/` (`Editech-Graphix-Receipt-v2.1.jpg`, `Editech-Graphix-Quotation.jpg`) |
| move where text lands on a template | `frontend/src/utils/renderDocument.js` (coordinates are listed per field) |
| change numbering (`QT-001`, `INV-001`) | `nextDocNumber` in `frontend/src/utils/format.js` |
| change the 5-item limit | the template only has 5 rows, so a new template and `MAX_QUOTE_ITEMS` in `utils/documents.js` |

Template images are stored at web size (about 2200-2800 px wide). Do not use the original 7000 px+ files: phones can run out of memory drawing them.

Invoices use the receipt template with the title swapped to "INVOICE" (the other labels still say "Receipt"). A dedicated invoice template can be added later.

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| `npm error Missing script: "dev"` | You are in a folder without a `package.json`. Run `dir` to check: `backend` must contain `package.json` and `server.js`. Also check you did not extract the zip into a folder-inside-a-folder. |
| `bcrypt ... install-scripts blocked` / `node-gyp rebuild` | This project uses **bcryptjs** (pure JavaScript, nothing to compile). The warning comes from an old `node_modules`. Delete `node_modules` and `package-lock.json` in that folder, then run `npm install` again. |
| Server stops with "Invalid configuration" | Read the list it prints, then fix `backend/.env`. |
| `Cannot reach the database` | Check `DATABASE_URL`; in Neon make sure the project is active (it may be waking up, so try again in 10 seconds). |
| Login works locally but not when hosted | `CLIENT_URL` on the server must exactly match your Vercel address; check `vercel.json` has your real backend address. |
| Login loops or "session expired" on phones | Use the Vercel forwarding setup in section 5 and set `COOKIE_SAMESITE=lax`. |
| Blank receipt/quotation preview | The template image is missing or renamed in `frontend/public/`. |
| `Too many failed sign-in attempts` | Wait 15 minutes, or raise `LOGIN_MAX_ATTEMPTS`. |
| Old records have no "View" button | They were saved before full details were stored. New ones always have it. |

---

## 8. Security notes

- Passwords are stored as bcrypt hashes; the login cookie is `HttpOnly` and `Secure` in production.
- Failed logins are rate-limited; all input is validated; errors never reveal database details.
- State-changing requests are only accepted from your own website address.
- Change the default admin password if it was ever shared in chat, email or a screenshot: run `npm run seed -- admin 'NewPassword' 'Full Name'` again.
- Keep `.env` out of Git. Share secrets only through your hosting provider's settings page.

## 9. API overview

All routes except login/health need the login cookie.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | sign in |
| POST | `/api/auth/logout` | sign out |
| GET | `/api/auth/me` | who is signed in |
| GET | `/api/data` | all transactions + expenses |
| POST | `/api/transactions` | save a receipt / invoice / quotation (409 if the number already exists) |
| DELETE | `/api/transactions/:id` | delete one |
| POST | `/api/expenses` | add an expense |
| DELETE | `/api/expenses/:id` | delete one |
| GET | `/api/health`, `/api/health/db` | uptime checks (no login) |
