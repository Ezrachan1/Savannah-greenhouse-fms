import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category_id: '', low_stock: false });
  const [showModal, setShowModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [movementHistory, setMovementHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category_id: '',
    unit: 'pcs',
    current_quantity: '',
    reorder_level: '',
    unit_cost: '',
    description: '',
  });
  const [movementData, setMovementData] = useState({
    movement_type: 'stock_in',
    quantity: '',
    unit_cost: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, catsRes] = await Promise.all([
        api.get('/inventory/items', { params: filter }),
        api.get('/inventory/categories'),
      ]);
      setItems(itemsRes.data.data || []);
      setCategories(catsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await api.put(`/inventory/items/${selectedItem.id}`, formData);
        toast.success('Item updated');
      } else {
        await api.post('/inventory/items', formData);
        toast.success('Item created');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleMovement = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/inventory/items/${selectedItem.id}/movements`, movementData);
      toast.success('Stock movement recorded');
      setShowMovementModal(false);
      setMovementData({ movement_type: 'stock_in', quantity: '', unit_cost: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record movement');
    }
  };

  const openEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      category_id: item.category_id || '',
      unit: item.unit || 'pcs',
      current_quantity: item.current_quantity || '',
      reorder_level: item.minimum_quantity || '',
      unit_cost: item.cost_price || '',
      description: item.description || '',
    });
    setShowModal(true);
  };

  const openMovement = (item, type) => {
    setSelectedItem(item);
    setMovementData({ movement_type: type, quantity: '', unit_cost: item.cost_price || '', notes: '' });
    setShowMovementModal(true);
  };

  const openHistory = async (item) => {
    setSelectedItem(item);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const response = await api.get(`/inventory/items/${item.id}/movements`);
      setMovementHistory(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load movement history');
      setMovementHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedItem(null);
    setFormData({ name: '', code: '', category_id: '', unit: 'pcs', current_quantity: '', reorder_level: '', unit_cost: '', description: '' });
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount || 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage stock and supplies</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Item
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <select value={filter.category_id} onChange={(e) => setFilter({ ...filter, category_id: e.target.value })} className="select w-auto">
            <option value="">All Categories</option>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={filter.low_stock} onChange={(e) => setFilter({ ...filter, low_stock: e.target.checked })} className="rounded" />
            <span>Low Stock Only</span>
          </label>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No items found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>In Stock</th>
                <th>Unit</th>
                <th>Unit Cost</th>
                <th>Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="font-mono text-sm">{item.code}</td>
                  <td className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.name}
                      {parseFloat(item.current_quantity) <= parseFloat(item.minimum_quantity || 0) && (
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" title="Low Stock" />
                      )}
                    </div>
                  </td>
                  <td>{item.category?.name || '-'}</td>
                  <td className={parseFloat(item.current_quantity) <= parseFloat(item.minimum_quantity || 0) ? 'text-red-600 font-semibold' : 'font-semibold'}>
                    {parseFloat(item.current_quantity || 0).toLocaleString()}
                  </td>
                  <td>{item.unit}</td>
                  <td>{formatCurrency(item.cost_price)}</td>
                  <td>{formatCurrency(parseFloat(item.current_quantity || 0) * parseFloat(item.cost_price || 0))}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openMovement(item, 'stock_in')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Stock In">
                        <ArrowUpIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => openMovement(item, 'stock_out')} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Stock Out">
                        <ArrowDownIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => openHistory(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View History">
                        <ClockIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => openEdit(item)} className="p-1 text-gray-500 hover:text-primary-600">
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
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
              <h2 className="text-xl font-semibold">{selectedItem ? 'Edit Item' : 'Add Item'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">SKU *</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="input" required />
                </div>
                <div>
                  <label className="label">Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="select">
                    <option value="">Select Category</option>
                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="select">
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="ltrs">Litres</option>
                    <option value="bags">Bags</option>
                    <option value="boxes">Boxes</option>
                    <option value="rolls">Rolls</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Initial Qty</label>
                  <input type="number" value={formData.current_quantity} onChange={(e) => setFormData({ ...formData, current_quantity: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Reorder Level</label>
                  <input type="number" value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Unit Cost (KES)</label>
                  <input type="number" step="0.01" value={formData.unit_cost} onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">{selectedItem ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMovementModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">{movementData.movement_type === 'stock_in' ? 'Stock In' : 'Stock Out'}</h2>
              <p className="text-gray-500 text-sm">{selectedItem.name}</p>
            </div>
            <form onSubmit={handleMovement} className="p-6 space-y-4">
              <div>
                <label className="label">Quantity *</label>
                <input type="number" value={movementData.quantity} onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })} className="input" required min="1" />
              </div>
              {movementData.movement_type === 'stock_in' && (
                <div>
                  <label className="label">Unit Cost (KES)</label>
                  <input type="number" step="0.01" value={movementData.unit_cost} onChange={(e) => setMovementData({ ...movementData, unit_cost: e.target.value })} className="input" />
                </div>
              )}
              <div>
                <label className="label">Notes</label>
                <textarea value={movementData.notes} onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })} className="input" rows={2} placeholder="Reason for stock movement..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className={`flex-1 ${movementData.movement_type === 'stock_in' ? 'btn-primary' : 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg'}`}>
                  {movementData.movement_type === 'stock_in' ? 'Add Stock' : 'Remove Stock'}
                </button>
                <button type="button" onClick={() => setShowMovementModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Stock Movement History</h2>
                <p className="text-gray-500 text-sm">{selectedItem.name} ({selectedItem.code})</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : movementHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No movement history found</div>
              ) : (
                <table className="table text-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>Before</th>
                      <th>After</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementHistory.map((movement) => (
                      <tr key={movement.id}>
                        <td>{new Date(movement.movement_date).toLocaleDateString('en-GB')}</td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            movement.movement_type === 'purchase' || movement.movement_type === 'adjustment_add' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {movement.movement_type === 'purchase' ? 'Stock In' : 
                             movement.movement_type === 'usage' ? 'Stock Out' :
                             movement.movement_type === 'adjustment_add' ? 'Adjustment (+)' :
                             movement.movement_type === 'adjustment_sub' ? 'Adjustment (-)' :
                             movement.movement_type}
                          </span>
                        </td>
                        <td className={movement.movement_type === 'purchase' || movement.movement_type === 'adjustment_add' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {movement.movement_type === 'purchase' || movement.movement_type === 'adjustment_add' ? '+' : '-'}{movement.quantity}
                        </td>
                        <td>{movement.quantity_before}</td>
                        <td className="font-semibold">{movement.quantity_after}</td>
                        <td className="max-w-[150px] truncate" title={movement.notes || movement.reason || '-'}>
                          {movement.notes || movement.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t">
              <button onClick={() => setShowHistoryModal(false)} className="btn-secondary w-full">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
