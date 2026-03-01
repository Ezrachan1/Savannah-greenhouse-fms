import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  EyeIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    payment_status: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchSales();
  }, [filters]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sales', { params: filters });
      setSales(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount || 0);
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const statusColors = {
    draft: 'badge-gray',
    confirmed: 'badge-info',
    completed: 'badge-success',
    cancelled: 'badge-danger',
  };

  const paymentColors = {
    unpaid: 'badge-danger',
    partial: 'badge-warning',
    paid: 'badge-success',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">View and manage sales orders</p>
        </div>
        <Link to="/sales/new" className="btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          New Sale
        </Link>
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="select">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={filters.payment_status} onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })} className="select">
            <option value="">All Payments</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
          <input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} className="input" placeholder="From Date" />
          <input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} className="input" placeholder="To Date" />
          <button onClick={() => setFilters({ status: '', payment_status: '', start_date: '', end_date: '' })} className="btn-secondary">Clear</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No sales found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Sale #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="font-medium font-mono">{sale.sale_number}</td>
                  <td>{formatDate(sale.sale_date)}</td>
                  <td>{sale.customer?.name || 'Walk-in'}</td>
                  <td>{sale.items?.length || 0}</td>
                  <td className="font-semibold">{formatCurrency(sale.total_amount)}</td>
                  <td><span className={statusColors[sale.status] || 'badge-gray'}>{sale.status}</span></td>
                  <td><span className={paymentColors[sale.payment_status] || 'badge-gray'}>{sale.payment_status}</span></td>
                  <td>
                    <Link to={`/sales/${sale.id}`} className="p-1 text-gray-500 hover:text-primary-600 inline-flex">
                      <EyeIcon className="w-5 h-5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
