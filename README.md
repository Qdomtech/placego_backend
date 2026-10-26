# PlaceGo Backend (Node.js + Express + MongoDB)

REST API for the PlaceGo website. It handles:

- **Contact form enquiries**: saved to MongoDB, email to your team, auto-reply to the visitor
- **Website content**: Products, Industries, Clients, Testimonials (edit from the admin panel, no code changes needed)
- **Admin login**: JWT based, used by `admin.html` in the frontend
- **Security**: Helmet headers, CORS allow-list, rate limiting, input validation, spam honeypot, bcrypt passwords

---

## 1. Requirements

- Node.js **18 or newer** (`node -v`)
- A MongoDB database. Either:
  - **MongoDB Atlas** (free cloud database, recommended): https://www.mongodb.com/atlas
  - or MongoDB installed locally

## 2. Setup (step by step)

```bash
# 1. Install packages
npm install

# 2. Create your config file
cp .env.example .env        # Windows: copy .env.example .env

# 3. Open .env and fill in:
#    MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD (and SMTP settings for email)

# 4. Create the admin account
npm run create-admin

# 5. Load starter content (products, industries, clients, testimonials)
npm run seed

# 6. Start the API
npm run dev        # development (auto-restart on file change)
npm start          # production
```

Open http://localhost:5000/api/health. You should see `"status":"ok"` and `"database":"connected"`.

### Generate a strong JWT secret
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Getting a MongoDB Atlas URI
1. Create a free cluster on Atlas.
2. *Database Access* → add a user with a password.
3. *Network Access* → add your server's IP (or `0.0.0.0/0` while testing).
4. *Connect* → *Drivers* → copy the `mongodb+srv://...` string, put your password in it, add `/placego` before the `?`.

### Email setup (optional)
If `SMTP_HOST` is empty, enquiries are still saved and visible in the admin panel; only emails are skipped.

| Provider | SMTP_HOST | PORT | SECURE | Notes |
|---|---|---|---|---|
| Gmail / Google Workspace | smtp.gmail.com | 465 | true | Use an **App Password** (Google account → Security → 2-Step Verification → App passwords) |
| Hostinger email | smtp.hostinger.com | 465 | true | Your mailbox email + password |
| Zoho Mail | smtp.zoho.in | 465 | true | |

---

## 3. Project structure

```
placego-backend/
├── server.js                 # starts the server
├── .env.example              # copy to .env
├── src/
│   ├── app.js                # express app, middleware, routes
│   ├── config/db.js          # MongoDB connection
│   ├── models/               # Admin, Contact, Product, Industry, Client, Testimonial
│   ├── routes/
│   │   ├── auth.js           # /api/auth
│   │   ├── contact.js        # /api/contact
│   │   └── resource.js       # generic CRUD used for products/industries/clients/testimonials
│   ├── controllers/          # auth + contact logic
│   ├── middleware/           # auth (JWT), validation, rate limits, error handling
│   ├── utils/mailer.js       # nodemailer emails (team notification + auto-reply)
│   └── scripts/              # createAdmin.js, seed.js, seedData.js
```

---

## 4. API reference

Base URL: `http://localhost:5000/api`
Admin routes need the header `Authorization: Bearer <token>` (token comes from `/auth/login`).

### Health
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/health` | Public | Server and database status |

### Auth
| Method | Path | Access | Body |
|---|---|---|---|
| POST | `/auth/login` | Public | `{ "email", "password" }` → `{ token, admin }` |
| GET | `/auth/me` | Admin | Current admin |
| PUT | `/auth/password` | Admin | `{ "currentPassword", "newPassword" }` |

### Contact enquiries
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/contact` | Public | `{ name, email, phone?, company?, service?, message }` (5 per 15 min per IP) |
| GET | `/contact` | Admin | List. Query: `page`, `limit`, `status` (new/contacted/closed), `search` |
| GET | `/contact/stats` | Admin | `{ total, unread, new, contacted, closed, last7Days }` |
| GET | `/contact/:id` | Admin | One enquiry |
| PATCH | `/contact/:id` | Admin | `{ status?, isRead?, notes? }` |
| DELETE | `/contact/:id` | Admin | Delete |

### Website content
Same routes for `/products`, `/industries`, `/clients`, `/testimonials`:

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/products` | Public | Visible items, sorted by `order` |
| GET | `/products?all=true` | Admin | All items including hidden |
| GET | `/products/:id` | Public | One item |
| POST | `/products` | Admin | Create |
| PUT | `/products/:id` | Admin | Update |
| DELETE | `/products/:id` | Admin | Delete |

Fields:
- **Product**: `name`, `tag`, `description`, `features[]`, `featured`, `order`, `isActive`
- **Industry**: `name`, `icon`, `points[]`, `segments`, `order`, `isActive`
- **Client**: `name`, `sector`, `logoUrl`, `website`, `order`, `isActive`
- **Testimonial**: `quote`, `name`, `designation`, `company`, `order`, `isActive`

### Example
```bash
curl -X POST http://localhost:5000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Rahul Sharma","email":"rahul@example.com","service":"Data Engineering","message":"We need a data platform for our retail stores."}'
```

---

## 5. Deployment

### Option A: Render / Railway (easiest)
1. Push this folder to a GitHub repo.
2. Create a new **Web Service**, pick the repo.
3. Build command: `npm install` · Start command: `npm start`
4. Add all variables from `.env` in the dashboard (set `NODE_ENV=production`).
5. Run `npm run create-admin` and `npm run seed` once from the service shell.
6. Add a custom domain such as `api.placego.online`.

### Option B: VPS (Ubuntu) with PM2 + Nginx
```bash
npm install --omit=dev
npm install -g pm2
pm2 start server.js --name placego-api
pm2 save && pm2 startup
```
Nginx site for `api.placego.online`:
```nginx
server {
  server_name api.placego.online;
  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
Then add HTTPS: `sudo certbot --nginx -d api.placego.online`

### Option C: Hostinger / cPanel "Setup Node.js App"
Application root = this folder, startup file = `server.js`, add the environment variables, click *Run NPM Install*, then *Start*.

### After deploying
- Put your frontend domain(s) in `CORS_ORIGINS`.
- Set `API_BASE_URL` in the frontend's `js/config.js` to your API URL.

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| `MongoDB connection failed` | Check `MONGODB_URI`, password, and Atlas *Network Access* IP list |
| Browser shows CORS error | Add the exact frontend origin (with `https://`, no trailing slash) to `CORS_ORIGINS` |
| Admin login says incorrect password | Run `npm run create-admin` again; it resets the password from `.env` |
| Emails not arriving | Check the server log for `SMTP check failed`; for Gmail use an App Password |
| `Too many messages` | Rate limit hit; wait 15 minutes or adjust `src/middleware/rateLimit.js` |
