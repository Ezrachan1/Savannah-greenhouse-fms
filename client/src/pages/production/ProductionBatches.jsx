import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  EyeIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

export default function ProductionBatches() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [greenhouses, setGreenhouses] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', greenhouse_id: '', crop_id: '' });
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    crop_id: '',
    greenhouse_id: '',
    seeds_sown: '',
    trays_used: '',
    sowing_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesRes, ghRes, cropsRes] = await Promise.all([
        api.get('/production/batches', { params: filters }),
        api.get('/greenhouses'),
        api.get('/crops'),
      ]);
      setBatches(batchesRes.data.data || []);
      setGreenhouses(ghRes.data.data || []);
      setCrops(cropsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/production/batches', formData);
      toast.success('Batch created successfully');
      setShowModal(false);
      setFormData({ crop_id: '', greenhouse_id: '', seeds_sown: '', trays_used: '', sowing_date: new Date().toISOString().split('T')[0], notes: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create batch');
    }
  };

  const statusColors = {
    sown: 'badge-info',
    germinating: 'badge-warning',
    growing: 'badge-success',
    ready: 'bg-green-600 text-white px-2 py-1 rounded text-xs',
    selling: 'bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs',
    completed: 'badge-gray',
    failed: 'badge-danger',
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Production Batches</h1>
          <p className="page-subtitle">Track seedling production from sowing to sale</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          New Batch
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="select">
            <option value="">All Statuses</option>
            <option value="sown">Sown</option>
            <option value="germinating">Germinating</option>
            <option value="growing">Growing</option>
            <option value="ready">Ready for Sale</option>
            <option value="selling">Selling</option>
            <option value="completed">Completed</option>
          </select>
          <select value={filters.greenhouse_id} onChange={(e) => setFilters({ ...filters, greenhouse_id: e.target.value })} className="select">
            <option value="">All Greenhouses</option>
            {greenhouses.map((gh) => <option key={gh.id} value={gh.id}>{gh.name}</option>)}
          </select>
          <select value={filters.crop_id} onChange={(e) => setFilters({ ...filters, crop_id: e.target.value })} className="select">
            <option value="">All Crops</option>
            {crops.map((crop) => <option key={crop.id} value={crop.id}>{crop.name}</option>)}
          </select>
          <button onClick={() => setFilters({ status: '', greenhouse_id: '', crop_id: '' })} className="btn-secondary">Clear</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No batches found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Batch #</th>
                <th>Crop</th>
                <th>Greenhouse</th>
                <th>Sown</th>
                <th>Seeds</th>
                <th>Current Qty</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/production/${batch.id}`)}>
                  <td className="font-medium font-mono">{batch.batch_number}</td>
                  <td>{batch.crop?.name || '-'}</td>
                  <td>{batch.greenhouse?.name || '-'}</td>
                  <td>{formatDate(batch.sowing_date)}</td>
                  <td>{batch.seeds_sown?.toLocaleString()}</td>
                  <td className="font-semibold">{batch.current_quantity?.toLocaleString()}</td>
                  <td><span className={statusColors[batch.status] || 'badge-gray'}>{batch.status}</span></td>
                  <td>
                    <Link to={`/production/${batch.id}`} className="p-1 text-gray-500 hover:text-primary-600 inline-flex" onClick={(e) => e.stopPropagation()}>
                      <EyeIcon className="w-5 h-5" />
                    </Link>
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
              <h2 className="text-xl font-semibold">Create New Batch</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Crop *</label>
                  <select value={formData.crop_id} onChange={(e) => setFormData({ ...formData, crop_id: e.target.value })} className="select" required>
                    <option value="">Select Crop</option>
                    {crops.map((crop) => <option key={crop.id} value={crop.id}>{crop.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Greenhouse *</label>
                  <select value={formData.greenhouse_id} onChange={(e) => setFormData({ ...formData, greenhouse_id: e.target.value })} className="select" required>
                    <option value="">Select Greenhouse</option>
                    {greenhouses.filter(g => g.status === 'active').map((gh) => <option key={gh.id} value={gh.id}>{gh.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Seeds Sown *</label>
                  <input type="number" value={formData.seeds_sown} onChange={(e) => setFormData({ ...formData, seeds_sown: e.target.value })} className="input" required />
                </div>
                <div>
                  <label className="label">Trays Used</label>
                  <input type="number" value={formData.trays_used} onChange={(e) => setFormData({ ...formData, trays_used: e.target.value })} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Sowing Date *</label>
                <input type="date" value={formData.sowing_date} onChange={(e) => setFormData({ ...formData, sowing_date: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input" rows={3} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Create Batch</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
