/**
 * ============================================
 * Dashboard Page
 * ============================================
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [overviewRes, chartRes, alertsRes] = await Promise.all([
        api.get('/dashboard/overview'),
        api.get('/dashboard/sales-chart', { params: { days: 30 } }),
        api.get('/dashboard/alerts'),
      ]);
      
      setData(overviewRes.data.data);
      setChartData(chartRes.data.data);
      setAlerts(alertsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton h-4 w-24 mb-2" />
              <div className="skeleton h-8 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's an overview of your farm.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data?.sales?.today)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">Month: {formatCurrency(data?.sales?.month)}</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unpaid Invoices</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data?.sales?.unpaid)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <ShoppingCartIcon className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ready for Sale</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(data?.production?.readyForSale || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">seedlings</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CubeIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {data?.production?.activeBatches} active batches
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Month's Profit</p>
              <p className={`text-2xl font-bold mt-1 ${data?.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data?.profit)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${data?.profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {data?.profit >= 0 ? (
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts and alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales chart */}
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-gray-900 mb-4">Sales Trend (Last 30 Days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="sale_date" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Sales']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#22c55e" 
                  fill="#22c55e" 
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Alerts</h3>
          <div className="space-y-4">
            {alerts?.lowStock?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-yellow-600 mb-2">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  <span className="font-medium text-sm">Low Stock Items</span>
                </div>
                <ul className="space-y-2">
                  {alerts.lowStock.slice(0, 3).map((item) => (
                    <li key={item.id} className="text-sm text-gray-600 pl-7">
                      {item.name} - {item.current_quantity} {item.unit} left
                    </li>
                  ))}
                </ul>
                {alerts.lowStock.length > 3 && (
                  <Link to="/inventory?filter=low-stock" className="text-sm text-primary-600 hover:underline pl-7">
                    +{alerts.lowStock.length - 3} more
                  </Link>
                )}
              </div>
            )}

            {alerts?.overduePayments?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  <span className="font-medium text-sm">Overdue Payments</span>
                </div>
                <ul className="space-y-2">
                  {alerts.overduePayments.slice(0, 3).map((sale) => (
                    <li key={sale.id} className="text-sm text-gray-600 pl-7">
                      {sale.customer_name} - {formatCurrency(sale.balance_due)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {alerts?.readyBatches?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <CubeIcon className="w-5 h-5" />
                  <span className="font-medium text-sm">Ready for Sale</span>
                </div>
                <ul className="space-y-2">
                  {alerts.readyBatches.slice(0, 3).map((batch) => (
                    <li key={batch.id} className="text-sm text-gray-600 pl-7">
                      {batch.batch_number} - {batch.current_quantity.toLocaleString()} seedlings
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!alerts?.lowStock?.length && !alerts?.overduePayments?.length && !alerts?.readyBatches?.length && (
              <p className="text-sm text-gray-500 text-center py-4">
                No alerts at this time
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/sales/new" className="btn-primary text-center py-3">
            New Sale
          </Link>
          <Link to="/production" className="btn-secondary text-center py-3">
            New Batch
          </Link>
          <Link to="/inventory" className="btn-secondary text-center py-3">
            Stock Entry
          </Link>
          <Link to="/expenses" className="btn-secondary text-center py-3">
            Record Expense
          </Link>
        </div>
      </div>
    </div>
  );
}
