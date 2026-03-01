import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export default function Crops() {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'vegetables',
    variety: '',
    germination_days: '',
    transplant_days: '',
    default_price: '',
    seeds_per_tray: '',
    description: '',
  });

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    try {
      setLoading(true);
      const response = await api.get('/crops', { params: { search } });
      setCrops(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load crops');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCrop) {
        await api.put(`/crops/${editingCrop.id}`, formData);
        toast.success('Crop updated successfully');
      } else {
        await api.post('/crops', formData);
        toast.success('Crop created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchCrops();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (crop) => {
    setEditingCrop(crop);
    setFormData({
      name: crop.name || '',
      code: crop.code || '',
      category: crop.category || 'vegetables',
      variety: crop.variety || '',
      germination_days: crop.germination_days || '',
      transplant_days: crop.transplant_days || '',
      default_price: crop.default_price || '',
      seeds_per_tray: crop.seeds_per_tray || '',
      description: crop.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this crop?')) return;
    try {
      await api.delete(`/crops/${id}`);
      toast.success('Crop deleted');
      fetchCrops();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const resetForm = () => {
    setEditingCrop(null);
    setFormData({
      name: '',
      code: '',
      category: 'vegetables',
      variety: '',
      germination_days: '',
      transplant_days: '',
      default_price: '',
      seeds_per_tray: '',
      description: '',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Crops</h1>
          <p className="page-subtitle">Manage crop types and varieties</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Crop
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search crops..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCrops()}
              className="input pl-10"
            />
          </div>
          <button onClick={fetchCrops} className="btn-secondary">Search</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : crops.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No crops found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>Variety</th>
                <th>Germ. Days</th>
                <th>Price/Seedling</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {crops.map((crop) => (
                <tr key={crop.id}>
                  <td className="font-medium">{crop.code}</td>
                  <td>{crop.name}</td>
                  <td className="capitalize">{crop.category}</td>
                  <td>{crop.variety || '-'}</td>
                  <td>{crop.germination_days || '-'}</td>
                  <td>{crop.default_price ? formatCurrency(crop.default_price) : '-'}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(crop)} className="p-1 text-gray-500 hover:text-primary-600">
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(crop.id)} className="p-1 text-gray-500 hover:text-red-600">
                        <TrashIcon className="w-5 h-5" />
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
              <h2 className="text-xl font-semibold">{editingCrop ? 'Edit Crop' : 'Add Crop'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Code *</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="input" placeholder="TOM" required />
                </div>
                <div>
                  <label className="label">Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="Tomato" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="select">
                    <option value="vegetables">Vegetables</option>
                    <option value="fruits">Fruits</option>
                    <option value="herbs">Herbs</option>
                    <option value="flowers">Flowers</option>
                    <option value="forestry">Forestry</option>
                  </select>
                </div>
                <div>
                  <label className="label">Variety</label>
                  <input type="text" value={formData.variety} onChange={(e) => setFormData({ ...formData, variety: e.target.value })} className="input" placeholder="Safari F1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Germination Days</label>
                  <input type="number" value={formData.germination_days} onChange={(e) => setFormData({ ...formData, germination_days: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Transplant Days</label>
                  <input type="number" value={formData.transplant_days} onChange={(e) => setFormData({ ...formData, transplant_days: e.target.value })} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Price/Seedling (KES)</label>
                  <input type="number" step="0.01" value={formData.default_price} onChange={(e) => setFormData({ ...formData, default_price: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Seeds/Tray</label>
                  <input type="number" value={formData.seeds_per_tray} onChange={(e) => setFormData({ ...formData, seeds_per_tray: e.target.value })} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">{editingCrop ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
