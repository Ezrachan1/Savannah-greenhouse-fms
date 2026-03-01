import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

export default function BatchDetail() {
  const { id } = useParams();
  const [batch, setBatch] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [logData, setLogData] = useState({ activity_type: 'quality_check', description: '', quantity_lost: '' });
  const [qtyData, setQtyData] = useState({ quantity: '', reason: '' });

  useEffect(() => {
    fetchBatch();
  }, [id]);

  const fetchBatch = async () => {
    try {
      setLoading(true);
      const [batchRes, logsRes] = await Promise.all([
        api.get(`/production/batches/${id}`),
        api.get(`/production/batches/${id}/logs`),
      ]);
      setBatch(batchRes.data.data);
      setLogs(logsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load batch details');
    } finally {
      setLoading(false);
    }
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/production/batches/${id}/logs`, logData);
      toast.success('Log added successfully');
      setShowLogModal(false);
      setLogData({ activity_type: 'quality_check', description: '', quantity_lost: '' });
      fetchBatch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add log');
    }
  };

  const handleQtySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/production/batches/${id}/quantity`, qtyData);
      toast.success('Quantity updated');
      setShowQtyModal(false);
      setQtyData({ quantity: '', reason: '' });
      fetchBatch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update quantity');
    }
  };

  const openQtyModal = () => {
    setQtyData({ quantity: batch?.current_quantity || 0, reason: '' });
    setShowQtyModal(true);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/production/batches/${id}/status`, { status: newStatus });
      toast.success('Status updated');
      fetchBatch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const formatDateTime = (date) => date ? new Date(date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!batch) return <div className="p-8 text-center text-gray-500">Batch not found</div>;

  return (
    <div>
      <Link to="/production" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Back to Batches
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">{batch.batch_number}</h1>
                <p className="text-gray-500">{batch.crop?.name} - {batch.greenhouse?.name}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                batch.status === 'ready' ? 'bg-green-100 text-green-800' :
                batch.status === 'growing' ? 'bg-blue-100 text-blue-800' :
                batch.status === 'completed' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {batch.status}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Seeds Sown</p>
                <p className="text-lg font-semibold">{batch.seeds_sown?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Qty</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold text-primary-600">{batch.current_quantity?.toLocaleString()}</p>
                  <button onClick={openQtyModal} className="p-1 text-gray-400 hover:text-primary-600" title="Adjust Quantity">
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sowing Date</p>
                <p className="text-lg font-semibold">{formatDate(batch.sowing_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Trays Used</p>
                <p className="text-lg font-semibold">{batch.trays_used || '-'}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Production Logs</h2>
              <button onClick={() => setShowLogModal(true)} className="btn-primary text-sm">
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Log
              </button>
            </div>
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No logs yet</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="border-l-4 border-primary-500 pl-4 py-2">
                    <div className="flex justify-between">
                      <span className="font-medium capitalize">{log.activity_type?.replace('_', ' ')}</span>
                      <span className="text-sm text-gray-500">{formatDateTime(log.created_at)}</span>
                    </div>
                    {log.description && <p className="text-gray-600 text-sm mt-1">{log.description}</p>}
                    {log.quantity_lost > 0 && (
                      <p className="text-sm font-medium text-red-600">
                        -{log.quantity_lost} seedlings lost
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {batch.status === 'sown' && (
                <button onClick={() => handleStatusChange('germinating')} className="btn-secondary w-full">Mark Germinating</button>
              )}
              {batch.status === 'germinating' && (
                <button onClick={() => handleStatusChange('growing')} className="btn-secondary w-full">Mark Growing</button>
              )}
              {batch.status === 'growing' && (
                <button onClick={() => handleStatusChange('ready')} className="btn-primary w-full">Mark Ready for Sale</button>
              )}
              {batch.status === 'ready' && (
                <button onClick={() => handleStatusChange('selling')} className="btn-primary w-full">Start Selling</button>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Batch Info</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Created</dt>
                <dd>{formatDate(batch.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Expected Germination</dt>
                <dd>{formatDate(batch.expected_germination_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Expected Ready</dt>
                <dd>{formatDate(batch.expected_ready_date)}</dd>
              </div>
              {batch.notes && (
                <div>
                  <dt className="text-gray-500 mb-1">Notes</dt>
                  <dd className="text-gray-700">{batch.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add Production Log</h2>
            </div>
            <form onSubmit={handleLogSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Activity Type</label>
                <select value={logData.activity_type} onChange={(e) => setLogData({ ...logData, activity_type: e.target.value })} className="select">
                  <option value="germination_check">Germination Check</option>
                  <option value="watering">Watering</option>
                  <option value="fertilizing">Fertilizing</option>
                  <option value="pest_control">Pest Control</option>
                  <option value="disease_treatment">Disease Treatment</option>
                  <option value="thinning">Thinning</option>
                  <option value="transplanting">Transplanting</option>
                  <option value="hardening">Hardening</option>
                  <option value="quality_check">Quality Check</option>
                  <option value="loss_recorded">Loss Recorded</option>
                  <option value="status_update">Status Update</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Quantity Lost (if any)</label>
                <input type="number" value={logData.quantity_lost} onChange={(e) => setLogData({ ...logData, quantity_lost: e.target.value })} className="input" placeholder="Number of seedlings lost" min="0" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={logData.description} onChange={(e) => setLogData({ ...logData, description: e.target.value })} className="input" rows={3} placeholder="Details about this activity..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Add Log</button>
                <button type="button" onClick={() => setShowLogModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQtyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Adjust Quantity</h2>
            </div>
            <form onSubmit={handleQtySubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Current Quantity *</label>
                <input 
                  type="number" 
                  value={qtyData.quantity} 
                  onChange={(e) => setQtyData({ ...qtyData, quantity: e.target.value })} 
                  className="input" 
                  min="0" 
                  required 
                />
                <p className="text-sm text-gray-500 mt-1">Previous: {batch?.current_quantity?.toLocaleString()}</p>
              </div>
              <div>
                <label className="label">Reason for adjustment</label>
                <textarea 
                  value={qtyData.reason} 
                  onChange={(e) => setQtyData({ ...qtyData, reason: e.target.value })} 
                  className="input" 
                  rows={2} 
                  placeholder="e.g., Physical count correction, germination count..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Update Quantity</button>
                <button type="button" onClick={() => setShowQtyModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
