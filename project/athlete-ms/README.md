# ⚒️ Iron Forge — Athlete Management System

A complete full-stack web application for managing athlete profiles, performance stats, achievements, and training details — built for Iron Forge Gym.

---

## 🗂️ Folder Structure

```
athlete-management-system/
├── backend/
│   ├── config/
│   │   └── db.js                  # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js                # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js                # Signup, Login, Me, Change-password
│   │   └── athlete.js             # Profile CRUD, achievements, stats, training
│   ├── .env.example               # Environment variable template
│   ├── package.json
│   ├── schema.sql                 # Complete database schema
│   └── server.js                  # Express entry point
│
└── frontend/
    ├── css/
    │   └── styles.css             # Global styles
    ├── js/
    │   └── api.js                 # API helper, auth utils, toast notifications
    ├── index.html                 # Landing page (Home + About + Features + Plans + CTA)
    ├── signup.html                # Registration page
    ├── login.html                 # Login page
    └── profile.html               # Protected athlete dashboard
```

---

## ⚙️ Prerequisites

| Tool     | Version       |
|----------|---------------|
| Node.js  | v18+          |
| npm      | v8+           |
| MySQL    | v8.0+         |

---

## 🚀 Local Setup (Step-by-Step)

### 1. Clone / Download the project

```bash
cd athlete-management-system
```

### 2. Set up MySQL Database

Open MySQL and run:

```sql
-- Create database and all tables
source backend/schema.sql;
```

Or copy-paste the contents of `backend/schema.sql` into MySQL Workbench / HeidiSQL / phpMyAdmin.

(Optional for local demo admin account):
```sql
source backend/seed.dev.sql;
```

### 3. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=athlete_management

JWT_SECRET=change_this_to_a_long_random_string_min_32_characters
JWT_EXPIRES_IN=7d

CLIENT_URL=http://localhost:5500
```

> **Important:** Change `JWT_SECRET` to a strong random string (32+ chars) before using in production.

### 4. Install backend dependencies

```bash
cd backend
npm install
```

### 5. Start the backend server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The API will be running at: `http://localhost:5000`  
Health check: `http://localhost:5000/api/health`

### 6. Open the frontend

You have two options:

**Option A — VS Code Live Server (recommended)**
1. Install the "Live Server" extension in VS Code
2. Right-click `frontend/index.html` → "Open with Live Server"
3. It opens at `http://127.0.0.1:5500`

**Option B — Python simple server**
```bash
cd frontend
python3 -m http.server 5500
# Open: http://localhost:5500
```

> **Note:** The backend CORS is pre-configured to allow `localhost:5500` and `localhost:3000`.

---

## 📡 API Endpoints

### Auth Routes (`/api/auth`)

| Method | Endpoint              | Auth | Description           |
|--------|-----------------------|------|-----------------------|
| POST   | `/signup`             | ❌   | Register new user     |
| POST   | `/login`              | ❌   | Login, returns JWT    |
| GET    | `/me`                 | ✅   | Get current user info |
| POST   | `/change-password`    | ✅   | Update password       |

### Athlete Routes (`/api/athlete`) — All require JWT

| Method | Endpoint                    | Description                          |
|--------|-----------------------------|--------------------------------------|
| GET    | `/profile`                  | Get full athlete profile             |
| PUT    | `/profile`                  | Update profile & personal info       |
| PUT    | `/training`                 | Update training details              |
| POST   | `/achievements`             | Add new achievement                  |
| DELETE | `/achievements/:id`         | Delete an achievement                |
| POST   | `/stats`                    | Add performance stat/record          |
| DELETE | `/stats/:id`                | Delete a performance stat            |

---

## 🗄️ Database Schema

### Tables

| Table                | Description                                       |
|----------------------|---------------------------------------------------|
| `users`              | Authentication — email, hashed password, role    |
| `athlete_profiles`   | Full athlete profile (personal, physical, sports) |
| `achievements`       | Medals, titles, competition results               |
| `performance_stats`  | Personal records, test results                    |
| `training_details`   | Schedule, goals, diet, supplements                |

---

## 🔐 Security Features

- **bcrypt** password hashing (salt rounds: 12)
- **JWT** tokens with configurable expiry
- **Rate limiting** on auth routes (20 requests per 15 min)
- **express-validator** for all input validation
- **CORS** restricted to specified origins
- Protected routes via `authMiddleware`

---

## 🌐 Pages

| Page            | URL                    | Auth Required |
|-----------------|------------------------|---------------|
| Home            | `index.html`           | ❌            |
| Sign Up         | `signup.html`          | ❌            |
| Login           | `login.html`           | ❌            |
| Athlete Profile | `profile.html`         | ✅ (JWT)      |

---

## 🏋️ Athlete Dashboard Sections

Once logged in, the dashboard includes:

1. **Overview** — Quick stats, recent achievements, training summary, profile completion
2. **Personal Info** — Name, DOB, gender, nationality, location, bio, physical stats
3. **Sports Profile** — Sport category, discipline, level, team, coach, experience, membership plan
4. **Achievements** — Add/delete medals, titles, competition results with level tagging
5. **Performance Stats** — Track personal records (PRs), test results with units and dates
6. **Training Details** — Schedule, duration, time preference, program, goals, diet, supplements, injuries
7. **Contact Info** — Phone, emergency contact, social media links
8. **Security** — Change password, sign out

---

## 🧪 Testing the App

1. Go to `http://localhost:5500/signup.html`
2. Create a new account
3. You'll be automatically redirected to `profile.html`
4. Fill in your athlete details across all tabs
5. Add achievements and performance records
6. Log out and test sign-in via `login.html`

---

## 📦 Backend Dependencies

```json
"bcryptjs"           — Password hashing
"cors"               — Cross-origin requests
"dotenv"             — Environment variables
"express"            — Web framework
"express-rate-limit" — Brute-force protection
"express-validator"  — Input validation
"jsonwebtoken"       — JWT authentication
"mysql2"             — MySQL driver (Promise-based)
```

---

## 🚢 Production Deployment Notes

1. Set `NODE_ENV=production` in `.env`
2. Use a strong, random `JWT_SECRET` (32+ characters)
3. Set `CLIENT_URL` to your actual domain
4. Use HTTPS (add SSL via nginx/Caddy reverse proxy)
5. Consider using environment variables from your hosting platform (not `.env` files)
6. Backend can serve the `frontend/` directory statically (already configured in `server.js`)

---

## 📞 Contact

Iron Forge GYM  
📧 contact@ironforgegym.com  
🌐 www.ironforgegym.com  
📱 @gymironforge
