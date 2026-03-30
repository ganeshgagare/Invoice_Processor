# Quick Start Guide

## Prerequisites
- Python 3.8+
- Node.js 14+
- PostgreSQL
- Google Gemini API Key

## Setup Backend (Python/FastAPI)

### 1. Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Create .env file
```bash
cp .env.example .env
```

### 3. Edit .env with your values
```
DATABASE_URL=postgresql://username:password@localhost:5432/invoice_db
SECRET_KEY=your-secret-key-here
GEMINI_API_KEY=your-gemini-api-key
```

### 4. Create PostgreSQL database
```bash
createdb invoice_db
```

### 5. Start backend server
```bash
python main.py
```

**Backend runs at**: http://localhost:8000
**API Docs**: http://localhost:8000/docs

---

## Setup Frontend (React)

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Create .env file
```bash
cp .env.example .env
```

### 3. Start frontend
```bash
npm start
```

**Frontend runs at**: http://localhost:3000

---

## Getting Gemini API Key

1. Go to https://aistudio.google.com/
2. Click "Get API key"
3. Create new API key
4. Add to .env file as `GEMINI_API_KEY`

---

## Testing the Application

### 1. Register a new account
- Go to http://localhost:3000/register
- Fill in email, password, name
- Click Register

### 2. Login
- Go to http://localhost:3000/login
- Use your registered credentials

### 3. Upload an invoice
- Click "Choose File"
- Select a PDF or image
- Add optional prompt
- Click upload

### 4. View results
- Wait for processing
- Click "Preview" to see HTML report
- Click "Download" to save HTML file

---

## API Endpoints Quick Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get user info |
| POST | /api/invoices/upload | Upload invoice |
| GET | /api/invoices/list | List invoices |
| GET | /api/invoices/{id} | Get invoice details |
| GET | /api/invoices/{id}/html | Get HTML report |
| DELETE | /api/invoices/{id} | Delete invoice |

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
# Change port in main.py or kill process:
# Windows: netstat -ano | findstr :8000
# Mac/Linux: lsof -i :8000
```

### Database error
```bash
# Verify PostgreSQL is running
# Check DATABASE_URL in .env
# Try creating database again:
createdb invoice_db
```

### Frontend won't connect to backend
```bash
# Ensure backend is running on port 8000
# Check REACT_APP_API_URL in .env
# Both should be http://localhost:8000/api
```

### Gemini API errors
```bash
# Verify API key is valid
# Check you have quota remaining
# Try regenerating the API key
```

---

## Default Ports

- Backend: **8000**
- Frontend: **3000**
- PostgreSQL: **5432**

## File Structure

```
backend/
├── routes/
├── utils/
├── models.py
├── main.py
└── requirements.txt

frontend/
├── src/
│   ├── pages/
│   ├── components/
│   ├── services/
│   └── contexts/
├── public/
└── package.json
```

## Key Features Implemented

✅ JWT Authentication
✅ User Registration & Login
✅ Invoice Upload (PDF, images)
✅ Gemini AI Integration
✅ HTML Report Generation
✅ Protected Routes
✅ Invoice Management
✅ Responsive UI

---

For detailed information, see [README.md](README.md)
