# Vite + Tailwind CSS Migration Guide

## ✅ What's Changed

Your React frontend has been updated from **Create React App** to **Vite** and styled with **Tailwind CSS**.

### Benefits:
- ⚡ **Vite**: 10-100x faster build times
- 📦 **Smaller bundle size**
- 🎨 **Tailwind CSS**: Utility-first styling
- 🚀 **Better development experience**

---

## 🚀 Getting Started

### Step 1: Install Dependencies
```bash
cd frontend
npm install
```

### Step 2: Create .env File
```bash
cp .env.example .env
```

Verify it contains:
```
VITE_API_URL=http://localhost:8000/api
```

### Step 3: Run Development Server
```bash
npm run dev
```

**Frontend** will be at: http://localhost:5173 (Vite default)

---

## 📝 Key Changes

### Environment Variables
**Old (Create React App):**
```
REACT_APP_API_URL=http://localhost:8000/api
```

**New (Vite):**
```
VITE_API_URL=http://localhost:8000/api
```

Access in code:
```javascript
import.meta.env.VITE_API_URL
```

### Config Files

| File | Purpose |
|------|---------|
| vite.config.js | Vite build configuration |
| tailwind.config.js | Tailwind CSS customization |
| postcss.config.js | PostCSS plugins for Tailwind |
| index.html | Entry point (moved from public/) |

### Entry Point
**Old:** `src/index.jsx`
**New:** `src/main.jsx`

---

## 🎨 Styling with Tailwind CSS

### Custom CSS Classes

We've created utility classes in `src/index.css`:

```html
<!-- Buttons -->
<button class="btn-primary">Primary Button</button>
<button class="btn-secondary">Secondary Button</button>
<button class="btn-danger">Delete Button</button>

<!-- Forms -->
<input class="input-field" type="text" />
<label class="form-label">Label</label>

<!-- Cards -->
<div class="card">Card Content</div>
```

### Tailwind Utilities

All standard Tailwind classes are available:

```html
<!-- Spacing -->
<div class="p-4 m-2">Padding & Margin</div>

<!-- Colors -->
<div class="bg-gradient-primary text-white">Gradient Background</div>

<!-- Responsive -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">Responsive Grid</div>

<!-- Flex -->
<div class="flex justify-between items-center">Flexbox</div>
```

---

## 📦 NPM Scripts

```bash
# Development
npm run dev          # Start dev server on http://localhost:5173

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Linting
npm run lint         # Run ESLint
```

---

## 🔗 Port Changes

Since Vite uses a different default port:

| Service | Old Port | New Port |
|---------|----------|----------|
| Frontend | 3000 | 5173 |
| Backend | 8000 | 8000 |
| Database | 5432 | 5432 |

Update any bookmarks or references to `http://localhost:3000`!

---

## 📂 File Structure

```
frontend/
├── index.html              (Vite entry point - moved from public/)
├── src/
│   ├── main.jsx            (React root - renamed from index.jsx)
│   ├── App.jsx
│   ├── index.css           (Tailwind + custom classes)
│   ├── pages/              (Auth, Dashboard)
│   ├── components/         (ProtectedRoute)
│   ├── contexts/           (AuthContext)
│   └── services/           (API)
├── vite.config.js          (NEW)
├── tailwind.config.js      (NEW)
├── postcss.config.js       (NEW)
├── package.json            (Updated)
└── .env                    (Updated for Vite)
```

---

## 🚨 Common Issues

### Issue: "import.meta.env is undefined"
**Solution:** Make sure you're using `import.meta.env.VITE_*` format

### Issue: Styles not loading
**Solution:** Clear cache and rebuild:
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: Can't find modules
**Solution:** Restart dev server:
```bash
npm run dev
```

---

## 🔄 Migration Checklist

- ✅ Vite configuration created
- ✅ Tailwind CSS configured
- ✅ Components refactored with Tailwind
- ✅ Environment variables updated
- ✅ Entry point changed to `main.jsx`
- ✅ index.html moved to root
- ✅ npm scripts updated

---

## 📚 Resources

- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Documentation](https://react.dev/)

---

## 🎯 Next Steps

1. Run `npm install` to install new dependencies
2. Start with `npm run dev`
3. Frontend will open at http://localhost:5173
4. Make sure backend is running on http://localhost:8000
5. Test login and invoice upload

---

**Version:** 2.0.0 (Vite+Tailwind)
**Last Updated:** January 2024
