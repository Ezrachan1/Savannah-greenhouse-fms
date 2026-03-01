import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    customer_type: 'individual',
    address: '',
    kra_pin: '',
    credit_limit: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customers', { params: { search } });
      setCustomers(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', formData);
        toast.success('Customer created');
      }
      setShowModal(false);
      resetForm();
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      customer_type: customer.customer_type || 'individual',
      address: customer.address || '',
      kra_pin: customer.kra_pin || '',
      credit_limit: customer.credit_limit || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deleted');
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', customer_type: 'individual', address: '', kra_pin: '', credit_limit: '' });
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount || 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage customer database</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Customer
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name, phone, or email..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()} className="input pl-10" />
          </div>
          <button onClick={fetchCustomers} className="btn-secondary">Search</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No customers found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Type</th>
                <th>Total Purchases</th>
                <th>Balance Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="font-mono text-sm">{customer.customer_code}</td>
                  <td className="font-medium">{customer.name}</td>
                  <td>
                    <div className="text-sm">
                      {customer.phone && <div className="flex items-center gap-1 text-gray-600"><PhoneIcon className="w-3 h-3" />{customer.phone}</div>}
                      {customer.email && <div className="flex items-center gap-1 text-gray-500"><EnvelopeIcon className="w-3 h-3" />{customer.email}</div>}
                    </div>
                  </td>
                  <td className="capitalize">{customer.customer_type}</td>
                  <td>{formatCurrency(customer.total_purchases)}</td>
                  <td className={parseFloat(customer.current_balance) > 0 ? 'text-red-600 font-medium' : ''}>{formatCurrency(customer.current_balance)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(customer)} className="p-1 text-gray-500 hover:text-primary-600"><PencilSquareIcon className="w-5 h-5" /></button>
                      <button onClick={() => handleDelete(customer.id)} className="p-1 text-gray-500 hover:text-red-600"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="Full name or company name" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" placeholder="0712345678" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" placeholder="email@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Customer Type</label>
                  <select value={formData.customer_type} onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })} className="select">
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                    <option value="farm">Farm</option>
                    <option value="dealer">Dealer/Reseller</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">KRA PIN</label>
                  <input type="text" value={formData.kra_pin} onChange={(e) => setFormData({ ...formData, kra_pin: e.target.value.toUpperCase() })} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input" rows={2} />
              </div>
              <div>
                <label className="label">Credit Limit (KES)</label>
                <input type="number" value={formData.credit_limit} onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })} className="input" placeholder="0 for cash only" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">{editingCustomer ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
