# Complete Startup Guide

## 🚀 Running the Full Application

### Prerequisites
- Python 3.8+
- Node.js 14+
- PostgreSQL running
- `.env` files configured

---

## 📊 Startup Sequence

### 1️⃣ Start Backend (Terminal 1)

```bash
cd invoice-processor/backend
python main.py
```

**Expected Output:**
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Verify Backend:**
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

---

### 2️⃣ Start Frontend (Terminal 2)

```bash
cd invoice-processor/frontend
npm run dev
```

**Expected Output:**
```
  VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

---

## ✅ Verify Everything is Running

### Checklist
- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:5173
- [ ] PostgreSQL database is accessible
- [ ] Can access http://localhost:5173/login
- [ ] Backend API docs at http://localhost:8000/docs

---

## 🌐 Application URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Main application |
| Backend API | http://localhost:8000/api | API endpoints |
| API Docs | http://localhost:8000/docs | Swagger UI |
| ReDoc | http://localhost:8000/redoc | ReDoc documentation |

---

## 🔑 Default Test Account

After running the application:

1. Click "Register here" on login page
2. Create account:
   - **Email**: test@example.com
   - **Password**: Test123!
   - **Name**: Test User
3. Login with credentials
4. Upload an invoice PDF/image to test

---

## 💾 Database Status

Check if database is running:

```bash
psql -U postgres -d invoice_db -c "SELECT 1"
```

Should return: `1` (success)

---

## 🛠️ Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# If port is in use, kill process or change port in main.py
```

### Frontend won't connect
```bash
# Verify API URL in .env
VITE_API_URL=http://localhost:8000/api

# Check backend is running
curl http://localhost:8000/health
```

### Database connection error
```bash
# Test connection
psql -U postgres

# Create database if missing
createdb -U postgres invoice_db
```

---

## 📁 Project Root Structure

```
invoice-processor/
├── backend/              (Python/FastAPI)
│   ├── main.py
│   ├── .env              (Create from .env.example)
│   └── requirements.txt
│
├── frontend/             (React/Vite)
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── .env              (Create from .env.example)
│
└── Documentation files...
```

---

## 🔄 Running with Docker

Optional: Run everything with Docker Compose

```bash
docker-compose up
```

This starts:
- PostgreSQL on 5432
- Backend on 8000
- Frontend on 3000 (inside container)

Access at: http://localhost:3000

---

## 📝 Environment Checklist

### Backend (.env)
```
✅ DATABASE_URL=postgresql://postgres:password@localhost/invoice_db
✅ SECRET_KEY=your-secret-key
✅ GEMINI_API_KEY=your-api-key
✅ ALGORITHM=HS256
✅ ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend (.env)
```
✅ VITE_API_URL=http://localhost:8000/api
```

---

## 🧪 Test the Application

### 1. Register
- Go to http://localhost:5173/register
- Create new account

### 2. Login
- Go to http://localhost:5173/login
- Enter credentials

### 3. Upload Invoice
- Click "Choose File"
- Select PDF or image
- Add optional prompt
- Click upload

### 4. View Results
- Wait for "✅ Completed" status
- Click "Preview" to see HTML report
- Click "Download" to save HTML

---

## 📊 Ports Summary

| Service | Port | Status Command |
|---------|------|---|
| Frontend | 5173 | curl http://localhost:5173 |
| Backend | 8000 | curl http://localhost:8000/health |
| PostgreSQL | 5432 | psql -U postgres -d invoice_db |

---

## 🚀 Next Steps

1. Ensure both terminals are running
2. Navigate to http://localhost:5173
3. Register and login
4. Upload your first invoice
5. Verify Gemini AI extracts data correctly

---

## ⏹️ Stopping the Application

### Terminal 1 (Backend)
```bash
Ctrl + C
```

### Terminal 2 (Frontend)
```bash
Ctrl + C
```

---

**Ready to go!** 🎉 Your complete Invoice Processor application is now running!
