# Farm Management System (FMS) - Complete Setup Guide

## Project Overview
A comprehensive Farm Management System for Savannah Propagation Nursery featuring:
- Offline-first architecture with sync capabilities
- KRA eTIMS integration for compliant invoicing
- Payroll management with NSSF/NHIF deductions
- Real-time dashboards and financial reporting
- Role-based access control

---

## Prerequisites

### Required Software
1. **Node.js** (v18+ LTS) - https://nodejs.org/
2. **PostgreSQL** (v15+) - https://www.postgresql.org/download/
3. **VS Code** - https://code.visualstudio.com/
4. **Git** - https://git-scm.com/

### VS Code Extensions (Recommended)
- ESLint
- Prettier
- PostgreSQL (by Chris Kolkman)
- Thunder Client (API testing)
- ES7+ React/Redux/React-Native snippets

---

## Project Structure

```
farm-management-system/
├── client/                    # React Frontend
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── common/        # Buttons, Inputs, Cards, etc.
│   │   │   ├── layout/        # Header, Sidebar, Footer
│   │   │   └── charts/        # Dashboard charts
│   │   ├── pages/             # Page components
│   │   │   ├── auth/          # Login, Register
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── greenhouse/    # Greenhouse management
│   │   │   ├── production/    # Seedling production
│   │   │   ├── inventory/     # Stock management
│   │   │   ├── sales/         # Sales & invoicing
│   │   │   ├── payroll/       # HR & Payroll
│   │   │   ├── expenses/      # Expenses & Cashbook
│   │   │   ├── reports/       # Financial reports
│   │   │   └── settings/      # System settings
│   │   ├── services/          # API services
│   │   ├── store/             # Redux store
│   │   │   ├── slices/        # Redux slices
│   │   │   └── offline/       # Offline sync logic
│   │   ├── db/                # Dexie.js (IndexedDB)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Helper functions
│   │   ├── styles/            # Global styles
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/                    # Node.js Backend
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   │   ├── database.js
│   │   │   ├── etims.js       # KRA eTIMS config
│   │   │   └── auth.js
│   │   ├── controllers/       # Route controllers
│   │   ├── middleware/        # Express middleware
│   │   ├── models/            # Sequelize models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   │   ├── etims/         # KRA integration
│   │   │   └── payroll/       # Payroll calculations
│   │   ├── utils/             # Helper functions
│   │   └── app.js
│   ├── migrations/            # Database migrations
│   ├── seeders/               # Seed data
│   ├── package.json
│   └── .env.example
│
└── docs/                      # Documentation
    ├── API.md
    ├── DATABASE.md
    └── DEPLOYMENT.md
```

---

## Step 1: Initialize Project Folders

Open your terminal in VS Code and run:

```bash
# Create main project folder
mkdir farm-management-system
cd farm-management-system

# Create subfolders
mkdir client server docs
```

---

## Step 2: Backend Setup

### 2.1 Initialize Node.js Backend

```bash
cd server
npm init -y
```

### 2.2 Install Backend Dependencies

```bash
# Core dependencies
npm install express cors dotenv helmet morgan compression

# Database
npm install pg pg-hstore sequelize

# Authentication
npm install bcryptjs jsonwebtoken express-validator

# File handling & utilities
npm install multer uuid dayjs

# PDF generation
npm install puppeteer

# Development dependencies
npm install -D nodemon sequelize-cli
```

### 2.3 Update package.json scripts

Edit `server/package.json` and replace the scripts section:

```json
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "db:migrate": "sequelize db:migrate",
    "db:seed": "sequelize db:seed:all",
    "db:reset": "sequelize db:migrate:undo:all && sequelize db:migrate && sequelize db:seed:all"
  }
}
```

---

## Step 3: Frontend Setup

### 3.1 Create React App with Vite

```bash
cd ../client
npm create vite@latest . -- --template react
```

When prompted, select:
- Framework: React
- Variant: JavaScript

### 3.2 Install Frontend Dependencies

```bash
# Core dependencies
npm install react-router-dom axios dayjs

# State management & offline
npm install @reduxjs/toolkit react-redux redux-persist dexie dexie-react-hooks

# UI Components
npm install @headlessui/react @heroicons/react

# Charts
npm install recharts

# Forms
npm install react-hook-form @hookform/resolvers zod

# Utilities
npm install clsx tailwind-merge uuid

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## Step 4: Database Setup

### 4.1 Create PostgreSQL Database

Open pgAdmin or use psql:

```sql
-- Create database
CREATE DATABASE farm_management_system;

-- Create user (optional, for dedicated access)
CREATE USER fms_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE farm_management_system TO fms_admin;
```

### 4.2 Configure Environment Variables

The `.env` file will be created in the next steps.

---

## Step 5: Development Workflow

### Running the Backend
```bash
cd server
npm run dev
```
Server runs on: http://localhost:5000

### Running the Frontend
```bash
cd client
npm run dev
```
Frontend runs on: http://localhost:5173

---

## Module Development Order (Recommended)

Follow this order for incremental development:

1. **Phase 1: Foundation**
   - Database schema & models
   - Authentication system
   - User management

2. **Phase 2: Core Operations**
   - Greenhouse management
   - Seedling production
   - Inventory management

3. **Phase 3: Sales & Finance**
   - Customer management
   - Sales & invoicing
   - KRA eTIMS integration

4. **Phase 4: HR & Payroll**
   - Employee management
   - Payroll processing
   - Statutory deductions

5. **Phase 5: Reporting & Dashboard**
   - Financial reports
   - Dashboard analytics
   - Export functionality

6. **Phase 6: Offline Capability**
   - IndexedDB setup
   - Sync engine
   - Conflict resolution

---

## Next Steps

Proceed to the following files in order:
1. `server/.env.example` - Environment configuration
2. `server/src/config/database.js` - Database connection
3. `server/src/models/` - Database models
4. Continue with controllers and routes...

Each file includes detailed comments explaining the code.
