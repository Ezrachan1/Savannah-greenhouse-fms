/**
 * ============================================
 * Farm Management System - Main App Component
 * ============================================
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Auth Pages
import Login from './pages/auth/Login';

// Main Pages
import Dashboard from './pages/dashboard/Dashboard';
import Greenhouses from './pages/greenhouse/Greenhouses';
import GreenhouseDetail from './pages/greenhouse/GreenhouseDetail';
import Crops from './pages/crops/Crops';
import ProductionBatches from './pages/production/ProductionBatches';
import BatchDetail from './pages/production/BatchDetail';
import Inventory from './pages/inventory/Inventory';
import Customers from './pages/customers/Customers';
import Sales from './pages/sales/Sales';
import NewSale from './pages/sales/NewSale';
import SaleDetail from './pages/sales/SaleDetail';
import Employees from './pages/employees/Employees';
import Payroll from './pages/payroll/Payroll';
import Expenses from './pages/expenses/Expenses';
import Reports from './pages/reports/Reports';
import Settings from './pages/settings/Settings';
import Profile from './pages/profile/Profile';

// Components
import ProtectedRoute from './components/common/ProtectedRoute';
import OfflineIndicator from './components/common/OfflineIndicator';

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <>
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1f2937',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />

      {/* Offline indicator */}
      <OfflineIndicator />

      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
            }
          />
        </Route>

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Greenhouse Management */}
          <Route path="/greenhouses" element={<Greenhouses />} />
          <Route path="/greenhouses/:id" element={<GreenhouseDetail />} />

          {/* Crop Management */}
          <Route path="/crops" element={<Crops />} />

          {/* Production Management */}
          <Route path="/production" element={<ProductionBatches />} />
          <Route path="/production/:id" element={<BatchDetail />} />

          {/* Inventory */}
          <Route path="/inventory" element={<Inventory />} />

          {/* Customers */}
          <Route path="/customers" element={<Customers />} />

          {/* Sales */}
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/new" element={<NewSale />} />
          <Route path="/sales/:id" element={<SaleDetail />} />

          {/* Employees */}
          <Route path="/employees" element={<Employees />} />

          {/* Payroll */}
          <Route path="/payroll" element={<Payroll />} />

          {/* Expenses */}
          <Route path="/expenses" element={<Expenses />} />

          {/* Reports */}
          <Route path="/reports" element={<Reports />} />

          {/* Settings */}
          <Route path="/settings" element={<Settings />} />

          {/* Profile */}
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Default redirect */}
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300">404</h1>
                <p className="text-gray-600 mt-4">Page not found</p>
                <a
                  href="/dashboard"
                  className="btn-primary mt-6 inline-block"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </>
  );
}

export default App;
