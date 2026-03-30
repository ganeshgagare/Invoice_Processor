# Frontend Setup - Vite + Tailwind CSS

## 📋 Quick Setup (3 Steps)

### 1️⃣ Install Dependencies
```bash
cd frontend
npm install
```

### 2️⃣ Configure Environment
```bash
cp .env.example .env
```

Verify `.env` contains:
```
VITE_API_URL=http://localhost:8000/api
```

### 3️⃣ Start Development Server
```bash
npm run dev
```

**Frontend runs at**: http://localhost:5173

---

## 🎨 What's New

✅ **Vite** - Lightning fast build tool
✅ **Tailwind CSS** - Utility-first styling
✅ **Modern Stack** - Latest React best practices
✅ **Optimized** - Smaller bundle size

---

## 📦 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Check code quality
```

---

## 🔗 Make Sure Backend is Running

Before starting frontend, ensure backend is running:

```bash
cd backend
python main.py
```

Backend should be at: http://localhost:8000

---

## ✅ Verification

1. Frontend runs: http://localhost:5173
2. You can see login page
3. Backend API is accessible

If any issues, check:
- VITE_API_URL in .env file
- Backend server is running
- No conflicting ports

---

## 🚀 Full Application Flow

**Terminal 1:**
```bash
cd backend
python main.py
```

**Terminal 2:**
```bash
cd frontend
npm run dev
```

Then open: http://localhost:5173

---

**Pro Tip:** Vite hot-reloads on save, so changes appear instantly! 🔥
