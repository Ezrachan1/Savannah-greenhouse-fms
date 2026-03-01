import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function NewSale() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    notes: '',
  });
  
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, batchesRes] = await Promise.all([
        api.get('/customers'),
        api.get('/production/batches', { params: { status: 'ready,selling' } }),
      ]);
      setCustomers(customersRes.data.data || []);
      setBatches(batchesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { batch_id: '', quantity: '', unit_price: '', crop_name: '' }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    if (field === 'batch_id') {
      const batch = batches.find(b => b.id === value);
      if (batch) {
        newItems[index].unit_price = batch.crop?.default_price || 0;
        newItems[index].crop_name = batch.crop?.name || '';
        newItems[index].available = batch.current_quantity || 0;
      }
    }
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    
    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.batch_id) {
        toast.error(`Item ${i + 1}: Please select a batch`);
        return;
      }
      if (!item.quantity || parseInt(item.quantity) <= 0) {
        toast.error(`Item ${i + 1}: Quantity must be greater than 0`);
        return;
      }
      if (!item.unit_price || parseFloat(item.unit_price) <= 0) {
        toast.error(`Item ${i + 1}: Unit price must be greater than 0`);
        return;
      }
      if (parseInt(item.quantity) > (item.available || 0)) {
        toast.error(`Item ${i + 1}: Quantity exceeds available stock (${item.available})`);
        return;
      }
    }
    
    try {
      setSubmitting(true);
      const saleData = {
        ...formData,
        customer_id: formData.customer_id || null,
        items: items.map(item => ({
          seedling_batch_id: item.batch_id,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
        })),
      };
      
      const response = await api.post('/sales', saleData);
      toast.success('Sale created successfully');
      navigate(`/sales/${response.data.data.id}`);
    } catch (error) {
      console.error('Sale creation error:', error.response?.data);
      const errorMsg = error.response?.data?.message || 'Failed to create sale';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount || 0);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div>
      <button onClick={() => navigate('/sales')} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Back to Sales
      </button>

      <div className="card">
        <h1 className="text-xl font-semibold mb-6">Create New Sale</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Customer</label>
              <select value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} className="select">
                <option value="">Walk-in Customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sale Date</label>
              <input type="date" value={formData.sale_date} onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="select">
                <option value="cash">Cash</option>
                <option value="mpesa">M-Pesa</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input" placeholder="Optional notes" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Sale Items</h2>
              <button type="button" onClick={addItem} className="btn-secondary text-sm">
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>
            
            {items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg text-gray-500">
                No items added. Click "Add Item" to start.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Crop</th>
                    <th>Available</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <select value={item.batch_id} onChange={(e) => updateItem(index, 'batch_id', e.target.value)} className="select" required>
                          <option value="">Select Batch</option>
                          {batches.map((b) => <option key={b.id} value={b.id}>{b.batch_number}</option>)}
                        </select>
                      </td>
                      <td>{item.crop_name || '-'}</td>
                      <td>{item.available?.toLocaleString() || '-'}</td>
                      <td>
                        <input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="input w-24" min="1" max={item.available} required />
                      </td>
                      <td>
                        <input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} className="input w-28" required />
                      </td>
                      <td className="font-semibold">{formatCurrency((item.quantity || 0) * (item.unit_price || 0))}</td>
                      <td>
                        <button type="button" onClick={() => removeItem(index)} className="p-1 text-red-500 hover:text-red-700">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="5" className="text-right font-semibold">Total:</td>
                    <td className="font-bold text-lg">{formatCurrency(calculateTotal())}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <button type="submit" disabled={submitting || items.length === 0} className="btn-primary">
              {submitting ? 'Creating...' : 'Create Sale'}
            </button>
            <button type="button" onClick={() => navigate('/sales')} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
