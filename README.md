# Farm Management System (FMS) - Complete Project Guide

## 🎯 Project Overview

This is a comprehensive Farm Management System for **Savannah Propagation Nursery** with:
- Offline-first architecture with IndexedDB sync
- KRA eTIMS integration for compliant invoicing
- Payroll management with NSSF/NHIF deductions
- Real-time dashboards and financial reporting
- Role-based access control

---

## 📁 Project Structure Summary

```
farm-management-system/
├── client/                    # React Frontend (Vite)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── store/             # Redux store
│   │   ├── db/                # Dexie.js (IndexedDB)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Helper functions
│   │   └── styles/            # Global styles
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── server/                    # Node.js Backend (Express)
│   ├── src/
│   │   ├── config/            # Configuration
│   │   ├── controllers/       # Route controllers
│   │   ├── middleware/        # Express middleware
│   │   ├── models/            # Sequelize models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── seeders/           # Database seeders
│   │   └── app.js             # Entry point
│   ├── package.json
│   └── .env.example
│
└── docs/                      # Documentation
```

---

## 🚀 Setup Instructions

### Step 1: Create Project Folders

```bash
mkdir farm-management-system
cd farm-management-system
mkdir client server docs
```

### Step 2: Backend Setup

```bash
cd server
npm init -y
```

**Install dependencies:**
```bash
npm install express cors dotenv helmet morgan compression pg pg-hstore sequelize bcryptjs jsonwebtoken express-validator multer uuid dayjs puppeteer express-rate-limit
npm install -D nodemon sequelize-cli
```

**Update package.json scripts:**
```json
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "seed": "node src/seeders/seed.js"
  }
}
```

### Step 3: Frontend Setup

```bash
cd ../client
npm create vite@latest . -- --template react
npm install react-router-dom axios dayjs @reduxjs/toolkit react-redux redux-persist dexie dexie-react-hooks @headlessui/react @heroicons/react recharts react-hook-form @hookform/resolvers zod clsx tailwind-merge uuid react-hot-toast
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 4: Database Setup

**Create PostgreSQL database:**
```sql
CREATE DATABASE farm_management_system;
```

**Configure .env file** (copy from .env.example):
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### Step 5: Seed Database

```bash
cd server
npm run seed
```

### Step 6: Run Application

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

---

## 📋 Files to Create

Copy the following files from this project to your local machine:

### Backend Files (`server/`)

1. `.env.example` - Environment configuration
2. `src/app.js` - Main Express application
3. `src/config/database.js` - Database configuration
4. `src/models/*.js` - All Sequelize models (22 files)
5. `src/middleware/*.js` - Authentication, error handling, etc.
6. `src/routes/*.js` - API routes (14 files)
7. `src/seeders/seed.js` - Database seeder

### Frontend Files (`client/`)

1. `vite.config.js` - Vite configuration
2. `tailwind.config.js` - Tailwind CSS configuration
3. `src/styles/index.css` - Global styles
4. `src/main.jsx` - React entry point
5. `src/App.jsx` - Main App component with routes
6. `src/store/index.js` - Redux store
7. `src/store/slices/*.js` - Redux slices
8. `src/services/api.js` - Axios API service
9. `src/db/index.js` - Dexie.js configuration
10. `src/components/layout/*.jsx` - Layout components
11. `src/components/common/*.jsx` - Common components
12. `src/pages/**/*.jsx` - Page components

---

## 🔐 Default Login Credentials

After seeding the database:
- **Email:** admin@savannahpropagation.co.ke
- **Password:** Admin@123456

⚠️ **Change this password immediately after first login!**

---

## 📝 Implementation Checklist

### Phase 1: Foundation ✅
- [x] Database schema & models
- [x] Authentication system
- [x] User management
- [x] Main layout & navigation

### Phase 2: Core Operations (Next Steps)
- [ ] Expand Greenhouse management page
- [ ] Complete Seedling production tracking
- [ ] Build Inventory management with stock alerts

### Phase 3: Sales & Finance
- [ ] Customer management
- [ ] Sales & invoicing interface
- [ ] KRA eTIMS integration (requires KRA credentials)

### Phase 4: HR & Payroll
- [ ] Employee management
- [ ] Payroll processing interface
- [ ] Payslip generation (PDF)

### Phase 5: Reporting & Dashboard
- [ ] Financial reports (P&L, Balance Sheet)
- [ ] Export to Excel functionality
- [ ] Enhanced dashboard analytics

### Phase 6: Offline Capability
- [ ] Complete IndexedDB caching
- [ ] Sync engine implementation
- [ ] Conflict resolution UI

---

## 🔧 Key Customizations

### Company Branding
Update these settings in the database or `.env`:
- Company name
- Company address
- Company logo
- KRA PIN

### Tax Rates
Settings are stored in the database and can be updated via Settings page:
- VAT rate (default: 16%)
- NSSF rates (Tier I & II)
- NHIF brackets
- PAYE tax brackets

### "Powered by AgriNova" Placement
As requested, this is placed:
1. **Login page:** Below the "Sign In" button
2. **All other pages:** In the footer bar at the bottom

---

## 📚 API Endpoints Reference

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/login` | User login |
| `GET /api/v1/dashboard/overview` | Dashboard stats |
| `GET /api/v1/greenhouses` | List greenhouses |
| `GET /api/v1/production/batches` | List batches |
| `GET /api/v1/inventory/items` | List inventory |
| `POST /api/v1/sales` | Create sale |
| `GET /api/v1/payroll/periods` | List payroll periods |
| `GET /api/v1/reports/profit-loss` | P&L report |

See `server/src/routes/*.js` for complete API documentation.

---

## 🔒 KRA eTIMS Integration Notes

The system is prepared for eTIMS integration. You will need:

1. **KRA eTIMS Device Credentials**
   - Device ID
   - TIN (Tax Identification Number)
   - Private key certificate

2. **Configuration**
   - Update `server/src/config/etims.js`
   - Place certificates in `server/certs/`

3. **Implementation**
   - Complete `server/src/services/etims/` service
   - Test with KRA sandbox first

---

## 🤝 Support

For questions or issues, contact the development team or refer to:
- [KRA eTIMS Documentation](https://www.kra.go.ke/etims)
- [Sequelize Documentation](https://sequelize.org/)
- [React Documentation](https://react.dev/)

---

## 📄 License

This project was developed for Savannah Propagation Nursery.
Powered by AgriNova Technology Solutions.
