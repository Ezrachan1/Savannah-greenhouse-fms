import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  ArrowLeftIcon, 
  PrinterIcon, 
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline';

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: '', payment_method: 'cash', reference: '' });

  useEffect(() => {
    fetchSale();
  }, [id]);

  const fetchSale = async () => {
    try {
      const response = await api.get(`/sales/${id}`);
      setSale(response.data.data);
    } catch (error) {
      toast.error('Failed to load sale details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Are you sure you want to change status to "${newStatus}"?`)) return;
    try {
      await api.patch(`/sales/${id}/status`, { status: newStatus });
      toast.success(`Sale ${newStatus}`);
      fetchSale();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      await api.post(`/sales/${id}/payment`, paymentData);
      toast.success('Payment recorded');
      setShowPaymentModal(false);
      setPaymentData({ amount: '', payment_method: 'cash', reference: '' });
      fetchSale();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleMarkFullyPaid = async () => {
    try {
      await api.post(`/sales/${id}/payment`, { 
        amount: sale.balance_due, 
        payment_method: sale.payment_method || 'cash' 
      });
      toast.success('Payment recorded - Sale fully paid');
      fetchSale();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleVoid = async () => {
    const reason = prompt('Please enter reason for voiding this sale:');
    if (!reason) return;
    try {
      await api.post(`/sales/${id}/void`, { reason });
      toast.success('Sale voided');
      fetchSale();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to void sale');
    }
  };

  const openPaymentModal = () => {
    setPaymentData({ 
      amount: sale.balance_due.toString(), 
      payment_method: sale.payment_method || 'cash', 
      reference: '' 
    });
    setShowPaymentModal(true);
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount || 0);
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!sale) return <div className="p-8 text-center text-gray-500">Sale not found</div>;

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    voided: 'bg-red-100 text-red-800'
  };

  const paymentStatusColors = {
    pending: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800'
  };

  return (
    <div>
      {/* Print-only Invoice Header */}
      <div className="hidden print:block mb-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">Savannah Propagation Nursery</h1>
          <p className="text-gray-500">Mogotio Town, Nakuru County, Kenya</p>
        </div>
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold">TAX INVOICE</h2>
        </div>
      </div>

      <Link to="/sales" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 no-print">
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Back to Sales
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Header for print */}
          <div className="hidden print:flex justify-between mb-4">
            <div>
              <p className="text-sm"><strong>Invoice #:</strong> {sale.sale_number}</p>
              <p className="text-sm"><strong>Date:</strong> {formatDate(sale.sale_date)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm"><strong>Customer:</strong></p>
              <p className="text-sm">{sale.customer?.name || sale.customer_name || 'Walk-in Customer'}</p>
              {sale.customer?.phone && <p className="text-sm">{sale.customer.phone}</p>}
            </div>
          </div>
          
          <div className="card">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold">{sale.sale_number}</h1>
                <p className="text-gray-500">{formatDate(sale.sale_date)}</p>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[sale.status] || 'bg-gray-100'}`}>
                  {sale.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${paymentStatusColors[sale.payment_status] || 'bg-gray-100'}`}>
                  {sale.payment_status}
                </span>
              </div>
            </div>

            <h2 className="font-semibold mb-3">Sale Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Batch</th>
                    <th className="text-left">Crop</th>
                    <th className="text-left">Quantity</th>
                    <th className="text-left">Unit Price</th>
                    <th className="text-left">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono">{item.batch?.batch_number || item.item_code || '-'}</td>
                      <td>{item.batch?.crop?.name || item.item_name || '-'}</td>
                      <td>{parseFloat(item.quantity)?.toLocaleString()}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td className="font-semibold">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold mb-4">Summary</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500">Subtotal</dt>
                <dd className="font-medium">{formatCurrency(sale.subtotal)}</dd>
              </div>
              {parseFloat(sale.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <dt>Discount</dt>
                  <dd>-{formatCurrency(sale.discount_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">VAT (16%)</dt>
                <dd>{formatCurrency(sale.tax_amount)}</dd>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <dt>Total</dt>
                <dd>{formatCurrency(sale.total_amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Paid</dt>
                <dd className="text-green-600">{formatCurrency(sale.amount_paid)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Balance Due</dt>
                <dd className={parseFloat(sale.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(sale.balance_due)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">Customer</h2>
            {sale.customer ? (
              <div className="text-sm space-y-1">
                <p className="font-medium">{sale.customer.name}</p>
                {sale.customer.phone && <p className="text-gray-500">{sale.customer.phone}</p>}
                {sale.customer.email && <p className="text-gray-500">{sale.customer.email}</p>}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{sale.customer_name || 'Walk-in Customer'}</p>
            )}
          </div>

          <div className="card no-print">
            <h2 className="font-semibold mb-4">Actions</h2>
            <div className="space-y-2">
              {/* Status Change Actions */}
              {sale.status === 'draft' && (
                <button onClick={() => handleStatusChange('confirmed')} className="btn-primary w-full">
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  Confirm Sale
                </button>
              )}
              {sale.status === 'confirmed' && sale.payment_status === 'paid' && (
                <button onClick={() => handleStatusChange('completed')} className="btn-primary w-full">
                  <DocumentCheckIcon className="w-5 h-5 mr-2" />
                  Mark Completed
                </button>
              )}
              
              {/* Payment Actions */}
              {sale.status !== 'cancelled' && parseFloat(sale.balance_due) > 0 && (
                <>
                  <button onClick={openPaymentModal} className="btn-secondary w-full">
                    <BanknotesIcon className="w-5 h-5 mr-2" />
                    Record Payment
                  </button>
                  <button onClick={handleMarkFullyPaid} className="btn-secondary w-full text-green-700 border-green-300 hover:bg-green-50">
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    Mark Fully Paid ({formatCurrency(sale.balance_due)})
                  </button>
                </>
              )}
              
              {/* Void/Cancel Action */}
              {sale.status !== 'cancelled' && sale.status !== 'completed' && sale.status !== 'voided' && (
                <button onClick={handleVoid} className="btn-secondary w-full text-red-600 border-red-300 hover:bg-red-50">
                  <XCircleIcon className="w-5 h-5 mr-2" />
                  Void Sale
                </button>
              )}
              
              {/* Print */}
              <button onClick={() => window.print()} className="btn-secondary w-full">
                <PrinterIcon className="w-5 h-5 mr-2" />
                Print Invoice
              </button>
            </div>
          </div>

          {/* Status Info */}
          <div className="card bg-gray-50 no-print">
            <h3 className="font-medium text-sm text-gray-700 mb-2">Status Guide</h3>
            <ul className="text-xs text-gray-500 space-y-1">
              <li><span className="font-medium">Draft:</span> Sale created but not confirmed</li>
              <li><span className="font-medium">Confirmed:</span> Sale is active, awaiting payment</li>
              <li><span className="font-medium">Completed:</span> Fully paid and closed</li>
              <li><span className="font-medium">Cancelled:</span> Sale voided/cancelled</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>Thank you for your business!</p>
        <p className="mt-2">Savannah Propagation Nursery | Mogotio Town, Nakuru County</p>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Record Payment</h2>
            </div>
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div>
                <label className="label">Amount (KES) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={paymentData.amount} 
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })} 
                  className="input" 
                  required 
                />
                <p className="text-sm text-gray-500 mt-1">Balance due: {formatCurrency(sale.balance_due)}</p>
              </div>
              <div>
                <label className="label">Payment Method *</label>
                <select 
                  value={paymentData.payment_method} 
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })} 
                  className="select"
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              {(paymentData.payment_method === 'mpesa' || paymentData.payment_method === 'bank_transfer') && (
                <div>
                  <label className="label">Reference Number</label>
                  <input 
                    type="text" 
                    value={paymentData.reference} 
                    onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })} 
                    className="input" 
                    placeholder={paymentData.payment_method === 'mpesa' ? 'M-Pesa receipt code' : 'Bank reference'}
                  />
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Record Payment</button>
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
