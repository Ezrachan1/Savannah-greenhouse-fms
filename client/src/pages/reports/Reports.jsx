import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  DocumentChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CubeIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export default function Reports() {
  const [activeReport, setActiveReport] = useState('sales');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const reports = [
    { id: 'sales', name: 'Sales Report', icon: CurrencyDollarIcon, endpoint: '/reports/sales' },
    { id: 'expenses', name: 'Expense Report', icon: DocumentChartBarIcon, endpoint: '/reports/expenses' },
    { id: 'profit-loss', name: 'Profit & Loss', icon: DocumentChartBarIcon, endpoint: '/reports/profit-loss' },
    { id: 'production', name: 'Production Report', icon: CubeIcon, endpoint: '/reports/production' },
    { id: 'payroll', name: 'Payroll Report', icon: UserGroupIcon, endpoint: '/reports/payroll' },
  ];

  useEffect(() => {
    fetchReport();
  }, [activeReport, dateRange]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const report = reports.find(r => r.id === activeReport);
      const response = await api.get(report.endpoint, { params: dateRange });
      setReportData(response.data.data);
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const report = reports.find(r => r.id === activeReport);
      const response = await api.get(`${report.endpoint}/export`, { 
        params: dateRange,
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeReport}-report-${dateRange.start_date}-to-${dateRange.end_date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Export failed. Try again later.');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount || 0);
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const renderSalesReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="stat-label">Total Sales</p>
          <p className="stat-value">{formatCurrency(reportData?.summary?.total_sales)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Collected</p>
          <p className="stat-value text-green-600">{formatCurrency(reportData?.summary?.total_collected)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Outstanding</p>
          <p className="stat-value text-red-600">{formatCurrency(reportData?.summary?.total_outstanding)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Transactions</p>
          <p className="stat-value">{reportData?.summary?.transaction_count || 0}</p>
        </div>
      </div>
      
      {reportData?.by_payment_method && reportData.by_payment_method.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">By Payment Method</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Payment Method</th>
                <th>Count</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {reportData.by_payment_method.map((item, i) => (
                <tr key={i}>
                  <td className="capitalize">{item.payment_method || 'Unknown'}</td>
                  <td>{item.count}</td>
                  <td className="font-semibold">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reportData?.transactions && reportData.transactions.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">Recent Transactions</h3>
          <table className="table text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Sale #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reportData.transactions.slice(0, 20).map((sale) => (
                <tr key={sale.id}>
                  <td>{formatDate(sale.sale_date)}</td>
                  <td className="font-mono">{sale.sale_number}</td>
                  <td>{sale.customer_name || 'Walk-in'}</td>
                  <td className="font-semibold">{formatCurrency(sale.total_amount)}</td>
                  <td className="text-green-600">{formatCurrency(sale.amount_paid)}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sale.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                      sale.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {sale.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reportData.transactions.length > 20 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Showing 20 of {reportData.transactions.length} transactions. Export for full list.
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderExpenseReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">Total Expenses</p>
          <p className="stat-value text-red-600">{formatCurrency(reportData?.summary?.total_expenses)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Approved</p>
          <p className="stat-value">{formatCurrency(reportData?.summary?.approved_expenses)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Pending</p>
          <p className="stat-value text-amber-600">{formatCurrency(reportData?.summary?.pending_expenses)}</p>
        </div>
      </div>
      
      {reportData?.by_category && reportData.by_category.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">By Category</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {reportData.by_category.map((item, i) => (
                <tr key={i}>
                  <td>{item.category || 'Uncategorized'}</td>
                  <td>{item.count}</td>
                  <td className="font-semibold">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reportData?.expenses && reportData.expenses.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">Expense Details</h3>
          <table className="table text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Expense #</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {reportData.expenses.slice(0, 20).map((expense) => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.expense_date)}</td>
                  <td className="font-mono">{expense.expense_number}</td>
                  <td>{expense.category?.name || '-'}</td>
                  <td className="max-w-xs truncate">{expense.description}</td>
                  <td className="font-semibold">{formatCurrency(expense.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderProfitLoss = () => (
    <div className="card">
      <h3 className="font-semibold text-lg mb-6">Profit & Loss Statement</h3>
      <p className="text-sm text-gray-500 mb-4">
        Period: {formatDate(dateRange.start_date)} to {formatDate(dateRange.end_date)}
      </p>
      <div className="space-y-4">
        <div className="flex justify-between py-2 border-b">
          <span className="font-medium">Revenue (Sales)</span>
          <span className="font-semibold text-green-600">{formatCurrency(reportData?.revenue)}</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="font-medium">Cost of Goods Sold</span>
          <span className="font-semibold text-red-600">({formatCurrency(reportData?.cogs)})</span>
        </div>
        <div className="flex justify-between py-2 border-b bg-gray-50 px-2 rounded">
          <span className="font-semibold">Gross Profit</span>
          <span className="font-bold">{formatCurrency(reportData?.gross_profit)}</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="font-medium">Operating Expenses</span>
          <span className="font-semibold text-red-600">({formatCurrency(reportData?.operating_expenses)})</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="font-medium">Payroll Expenses</span>
          <span className="font-semibold text-red-600">({formatCurrency(reportData?.payroll_expense)})</span>
        </div>
        <div className="flex justify-between py-3 bg-primary-50 px-2 rounded">
          <span className="font-bold text-lg">Net Profit</span>
          <span className={`font-bold text-lg ${(reportData?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(reportData?.net_profit)}
          </span>
        </div>
        {reportData?.vat_payable !== undefined && (
          <div className="flex justify-between py-2 mt-4 border-t">
            <span className="text-gray-600">VAT Collected</span>
            <span className="font-medium">{formatCurrency(reportData?.vat_collected)}</span>
          </div>
        )}
        {reportData?.vat_payable !== undefined && (
          <div className="flex justify-between py-2">
            <span className="text-gray-600">VAT Paid on Expenses</span>
            <span className="font-medium">({formatCurrency(reportData?.vat_paid)})</span>
          </div>
        )}
        {reportData?.vat_payable !== undefined && (
          <div className="flex justify-between py-2 border-t font-semibold">
            <span>Net VAT Payable to KRA</span>
            <span className={reportData?.vat_payable >= 0 ? 'text-red-600' : 'text-green-600'}>
              {formatCurrency(reportData?.vat_payable)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const renderProductionReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="stat-label">Total Batches</p>
          <p className="stat-value">{reportData?.summary?.total_batches || 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Seeds Sown</p>
          <p className="stat-value">{(reportData?.summary?.total_seeds || 0).toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Ready for Sale</p>
          <p className="stat-value text-green-600">{(reportData?.summary?.ready_seedlings || 0).toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Avg. Germination %</p>
          <p className="stat-value">{(reportData?.summary?.avg_germination_rate || 0).toFixed(1)}%</p>
        </div>
      </div>
      
      {reportData?.by_status && reportData.by_status.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">By Status</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Batches</th>
                <th>Seedlings</th>
              </tr>
            </thead>
            <tbody>
              {reportData.by_status.map((item, i) => (
                <tr key={i}>
                  <td className="capitalize">{item.status}</td>
                  <td>{item.batch_count}</td>
                  <td className="font-semibold">{(item.total_seedlings || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reportData?.by_crop && reportData.by_crop.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">By Crop</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Crop</th>
                <th>Batches</th>
                <th>Seeds Sown</th>
                <th>Current Qty</th>
              </tr>
            </thead>
            <tbody>
              {reportData.by_crop.map((item, i) => (
                <tr key={i}>
                  <td>{item.crop_name}</td>
                  <td>{item.batch_count}</td>
                  <td>{(item.total_seeds || 0).toLocaleString()}</td>
                  <td className="font-semibold">{(item.current_quantity || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderPayrollReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="stat-label">Total Gross</p>
          <p className="stat-value">{formatCurrency(reportData?.summary?.total_gross)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Deductions</p>
          <p className="stat-value text-red-600">{formatCurrency(reportData?.summary?.total_deductions)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Net</p>
          <p className="stat-value text-green-600">{formatCurrency(reportData?.summary?.total_net)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Employees</p>
          <p className="stat-value">{reportData?.summary?.employee_count || 0}</p>
        </div>
      </div>

      {reportData?.statutory && (
        <div className="card">
          <h3 className="font-semibold mb-4">Statutory Deductions</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">PAYE</p>
              <p className="font-bold text-lg">{formatCurrency(reportData.statutory.paye)}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">NHIF</p>
              <p className="font-bold text-lg">{formatCurrency(reportData.statutory.nhif)}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">NSSF</p>
              <p className="font-bold text-lg">{formatCurrency(reportData.statutory.nssf)}</p>
            </div>
          </div>
        </div>
      )}

      {reportData?.entries && reportData.entries.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">Payroll Details</h3>
          <table className="table text-sm">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Basic</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {reportData.entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.employee?.first_name} {entry.employee?.last_name}</td>
                  <td>{formatCurrency(entry.basic_salary)}</td>
                  <td>{formatCurrency(entry.gross_salary)}</td>
                  <td className="text-red-600">{formatCurrency(entry.total_deductions)}</td>
                  <td className="font-semibold text-green-600">{formatCurrency(entry.net_salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderReport = () => {
    if (loading) return <div className="p-8 text-center text-gray-500">Loading report...</div>;
    if (!reportData) return <div className="p-8 text-center text-gray-500">No data available</div>;

    switch (activeReport) {
      case 'sales': return renderSalesReport();
      case 'expenses': return renderExpenseReport();
      case 'profit-loss': return renderProfitLoss();
      case 'production': return renderProductionReport();
      case 'payroll': return renderPayrollReport();
      default: return null;
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Financial and management reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-4">Report Type</h3>
            <div className="space-y-2">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setActiveReport(report.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeReport === report.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <report.icon className="w-5 h-5" />
                  <span>{report.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Date Range</h3>
            <div className="space-y-3">
              <div>
                <label className="label">From</label>
                <input type="date" value={dateRange.start_date} onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">To</label>
                <input type="date" value={dateRange.end_date} onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })} className="input" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card mb-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{reports.find(r => r.id === activeReport)?.name}</h2>
              <div className="flex gap-2">
                <button onClick={fetchReport} className="btn-secondary text-sm" disabled={loading}>
                  <ArrowPathIcon className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button onClick={handleExport} className="btn-primary text-sm" disabled={exporting || !reportData}>
                  <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                  {exporting ? 'Exporting...' : 'Export Excel'}
                </button>
              </div>
            </div>
          </div>
          {renderReport()}
        </div>
      </div>
    </div>
  );
}
