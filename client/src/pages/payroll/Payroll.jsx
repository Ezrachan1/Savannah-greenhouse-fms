import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

export default function Payroll() {
  const [periods, setPeriods] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [entries, setEntries] = useState([]);
  const [formData, setFormData] = useState({
    period_name: '',
    start_date: '',
    end_date: '',
    payment_date: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [periodsRes, employeesRes] = await Promise.all([
        api.get('/payroll/periods'),
        api.get('/employees'),
      ]);
      setPeriods(periodsRes.data.data || []);
      setEmployees(employeesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payroll/periods', formData);
      toast.success('Payroll period created');
      setShowModal(false);
      setFormData({ period_name: '', start_date: '', end_date: '', payment_date: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create period');
    }
  };

  const handleGeneratePayroll = async (periodId) => {
    try {
      await api.post(`/payroll/periods/${periodId}/generate`);
      toast.success('Payroll generated successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate payroll');
    }
  };

  const handleApprovePayroll = async (periodId) => {
    if (!confirm('Are you sure you want to approve this payroll?')) return;
    try {
      await api.post(`/payroll/periods/${periodId}/approve`);
      toast.success('Payroll approved successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve payroll');
    }
  };

  const handleMarkPaid = async (periodId) => {
    if (!confirm('Are you sure you want to mark this payroll as paid? This action cannot be undone.')) return;
    try {
      await api.post(`/payroll/periods/${periodId}/mark-paid`);
      toast.success('Payroll marked as paid');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark payroll as paid');
    }
  };

  const handleViewEntries = async (period) => {
    try {
      const response = await api.get(`/payroll/periods/${period.id}/entries`);
      setSelectedPeriod(period);
      setEntries(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load payroll entries');
    }
  };

  const handleProcessPayroll = async (periodId) => {
    if (!confirm('Are you sure you want to process this payroll? This will mark all entries as paid.')) return;
    try {
      await api.post(`/payroll/periods/${periodId}/process`);
      toast.success('Payroll processed successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process payroll');
    }
  };

  const handleDeletePeriod = async (periodId) => {
    if (!confirm('Are you sure you want to delete this payroll period? This will also delete all entries.')) return;
    try {
      await api.delete(`/payroll/periods/${periodId}`);
      toast.success('Payroll period deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete period');
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount || 0);
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const statusColors = {
    open: 'bg-blue-100 text-blue-800',
    processing: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    paid: 'bg-gray-100 text-gray-800',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Process payroll and statutory deductions</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          New Period
        </button>
      </div>

      {selectedPeriod ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <button onClick={() => { setSelectedPeriod(null); setEntries([]); }} className="text-gray-600 hover:text-gray-900 mb-2">
                ← Back to Periods
              </button>
              <h2 className="text-xl font-semibold">{selectedPeriod.period_name}</h2>
              <p className="text-gray-500">{formatDate(selectedPeriod.start_date)} - {formatDate(selectedPeriod.end_date)}</p>
            </div>
            {selectedPeriod.status === 'generated' && (
              <button onClick={() => handleProcessPayroll(selectedPeriod.id)} className="btn-primary">
                Process Payroll
              </button>
            )}
          </div>

          <div className="card overflow-hidden">
            {entries.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No payroll entries found</div>
            ) : (
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Basic</th>
                    <th>Allowances</th>
                    <th>Gross</th>
                    <th>PAYE</th>
                    <th>NHIF</th>
                    <th>NSSF</th>
                    <th>Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="font-medium">{entry.employee?.first_name} {entry.employee?.last_name}</td>
                      <td>{formatCurrency(entry.basic_salary)}</td>
                      <td>{formatCurrency(entry.total_allowances)}</td>
                      <td>{formatCurrency(entry.gross_salary)}</td>
                      <td className="text-red-600">{formatCurrency(entry.paye)}</td>
                      <td className="text-red-600">{formatCurrency(entry.nhif)}</td>
                      <td className="text-red-600">{formatCurrency(entry.nssf_employee)}</td>
                      <td className="font-semibold text-green-600">{formatCurrency(entry.net_salary)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td>Totals</td>
                    <td>{formatCurrency(entries.reduce((sum, e) => sum + (e.basic_salary || 0), 0))}</td>
                    <td>{formatCurrency(entries.reduce((sum, e) => sum + (e.total_allowances || 0), 0))}</td>
                    <td>{formatCurrency(entries.reduce((sum, e) => sum + (e.gross_salary || 0), 0))}</td>
                    <td className="text-red-600">{formatCurrency(entries.reduce((sum, e) => sum + (e.paye || 0), 0))}</td>
                    <td className="text-red-600">{formatCurrency(entries.reduce((sum, e) => sum + (e.nhif || 0), 0))}</td>
                    <td className="text-red-600">{formatCurrency(entries.reduce((sum, e) => sum + (e.nssf_employee || 0), 0))}</td>
                    <td className="text-green-600">{formatCurrency(entries.reduce((sum, e) => sum + (e.net_salary || 0), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : periods.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No payroll periods found</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Date Range</th>
                  <th>Payment Date</th>
                  <th>Employees</th>
                  <th>Total Net</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.id}>
                    <td className="font-medium">{period.period_name}</td>
                    <td>{formatDate(period.start_date)} - {formatDate(period.end_date)}</td>
                    <td>{formatDate(period.payment_date)}</td>
                    <td>{period.employee_count || 0}</td>
                    <td className="font-semibold">{formatCurrency(period.total_net)}</td>
                    <td><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[period.status] || 'bg-gray-100 text-gray-800'}`}>{period.status}</span></td>
                    <td>
                      <div className="flex gap-2">
                        {period.status === 'open' && (
                          <button onClick={() => handleGeneratePayroll(period.id)} className="btn-secondary text-xs py-1 px-2">Generate</button>
                        )}
                        {period.status === 'processing' && (
                          <button onClick={() => handleApprovePayroll(period.id)} className="btn-primary text-xs py-1 px-2">Approve</button>
                        )}
                        {period.status === 'approved' && (
                          <button onClick={() => handleMarkPaid(period.id)} className="bg-green-600 text-white text-xs py-1 px-2 rounded hover:bg-green-700">Mark Paid</button>
                        )}
                        <button onClick={() => handleViewEntries(period)} className="p-1 text-gray-500 hover:text-primary-600" title="View Entries">
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        {(period.status === 'open' || period.status === 'processing') && (
                          <button onClick={() => handleDeletePeriod(period.id)} className="p-1 text-gray-500 hover:text-red-600" title="Delete Period">
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Create Payroll Period</h2>
            </div>
            <form onSubmit={handleCreatePeriod} className="p-6 space-y-4">
              <div>
                <label className="label">Period Name *</label>
                <input type="text" value={formData.period_name} onChange={(e) => setFormData({ ...formData, period_name: e.target.value })} className="input" placeholder="e.g., January 2026" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date *</label>
                  <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="input" required />
                </div>
                <div>
                  <label className="label">End Date *</label>
                  <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="input" required />
                </div>
              </div>
              <div>
                <label className="label">Payment Date</label>
                <input type="date" value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} className="input" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Create</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
