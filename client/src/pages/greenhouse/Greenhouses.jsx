import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export default function Greenhouses() {
  const [greenhouses, setGreenhouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGreenhouse, setEditingGreenhouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'tunnel',
    status: 'active',
    capacity_trays: '',
    length_meters: '',
    width_meters: '',
    description: '',
  });

  useEffect(() => {
    fetchGreenhouses();
  }, []);

  const fetchGreenhouses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/greenhouses', { params: { search } });
      setGreenhouses(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load greenhouses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGreenhouse) {
        await api.put(`/greenhouses/${editingGreenhouse.id}`, formData);
        toast.success('Greenhouse updated successfully');
      } else {
        await api.post('/greenhouses', formData);
        toast.success('Greenhouse created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchGreenhouses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (greenhouse) => {
    setEditingGreenhouse(greenhouse);
    setFormData({
      name: greenhouse.name || '',
      code: greenhouse.code || '',
      type: greenhouse.type || 'tunnel',
      status: greenhouse.status || 'active',
      capacity_trays: greenhouse.capacity_trays || '',
      length_meters: greenhouse.length_meters || '',
      width_meters: greenhouse.width_meters || '',
      description: greenhouse.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this greenhouse?')) return;
    try {
      await api.delete(`/greenhouses/${id}`);
      toast.success('Greenhouse deleted');
      fetchGreenhouses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const resetForm = () => {
    setEditingGreenhouse(null);
    setFormData({
      name: '',
      code: '',
      type: 'tunnel',
      status: 'active',
      capacity_trays: '',
      length_meters: '',
      width_meters: '',
      description: '',
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const statusColors = {
    active: 'badge-success',
    inactive: 'badge-gray',
    maintenance: 'badge-warning',
    decommissioned: 'badge-danger',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Greenhouses</h1>
          <p className="page-subtitle">Manage your greenhouse facilities</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Greenhouse
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search greenhouses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchGreenhouses()}
              className="input pl-10"
            />
          </div>
          <button onClick={fetchGreenhouses} className="btn-secondary">Search</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : greenhouses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No greenhouses found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {greenhouses.map((gh) => (
                <tr key={gh.id}>
                  <td className="font-medium">{gh.code}</td>
                  <td>{gh.name}</td>
                  <td className="capitalize">{gh.type?.replace('-', ' ')}</td>
                  <td>{gh.capacity_trays ? `${gh.capacity_trays} trays` : '-'}</td>
                  <td><span className={statusColors[gh.status] || 'badge-gray'}>{gh.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(gh)} className="p-1 text-gray-500 hover:text-primary-600">
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(gh.id)} className="p-1 text-gray-500 hover:text-red-600">
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
              <h2 className="text-xl font-semibold">{editingGreenhouse ? 'Edit Greenhouse' : 'Add Greenhouse'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Code *</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="input" placeholder="GH-01" required />
                </div>
                <div>
                  <label className="label">Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="Greenhouse 1" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="select">
                    <option value="tunnel">Tunnel</option>
                    <option value="gothic">Gothic</option>
                    <option value="multi-span">Multi-span</option>
                    <option value="shade-net">Shade Net</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="select">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Length (m)</label>
                  <input type="number" step="0.01" value={formData.length_meters} onChange={(e) => setFormData({ ...formData, length_meters: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Width (m)</label>
                  <input type="number" step="0.01" value={formData.width_meters} onChange={(e) => setFormData({ ...formData, width_meters: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Capacity (trays)</label>
                  <input type="number" value={formData.capacity_trays} onChange={(e) => setFormData({ ...formData, capacity_trays: e.target.value })} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">{editingGreenhouse ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
