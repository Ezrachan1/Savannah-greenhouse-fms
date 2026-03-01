/**
 * Greenhouse Detail Page
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  CubeIcon,
  CalendarIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

export default function GreenhouseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [greenhouse, setGreenhouse] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ghRes, batchesRes] = await Promise.all([
        api.get(`/greenhouses/${id}`),
        api.get('/production/batches', { params: { greenhouse_id: id } }),
      ]);
      setGreenhouse(ghRes.data.data);
      setBatches(batchesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load greenhouse details');
      navigate('/greenhouses');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      decommissioned: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.inactive}`}>
        {status}
      </span>
    );
  };

  const getBatchStatusBadge = (status) => {
    const styles = {
      sown: 'badge-info',
      germinating: 'badge-warning',
      growing: 'badge-success',
      ready: 'bg-green-600 text-white px-2 py-1 rounded text-xs',
      selling: 'bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs',
      completed: 'badge-gray',
      failed: 'badge-danger',
    };
    return <span className={styles[status] || 'badge-gray'}>{status}</span>;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!greenhouse) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Greenhouse not found</p>
        <Link to="/greenhouses" className="btn-primary mt-4">
          Back to Greenhouses
        </Link>
      </div>
    );
  }

  const activeBatches = batches.filter(b => ['sown', 'germinating', 'growing', 'ready', 'selling'].includes(b.status));
  const totalSeedlings = activeBatches.reduce((sum, b) => sum + (b.current_quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/greenhouses"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title">{greenhouse.name}</h1>
              {getStatusBadge(greenhouse.status)}
            </div>
            <p className="page-subtitle">{greenhouse.code}</p>
          </div>
        </div>
        <Link
          to={`/greenhouses?edit=${greenhouse.id}`}
          className="btn-secondary"
        >
          <PencilSquareIcon className="w-5 h-5 mr-2" />
          Edit
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <CubeIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="stat-label">Active Batches</p>
              <p className="stat-value">{activeBatches.length}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CubeIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="stat-label">Total Seedlings</p>
              <p className="stat-value">{totalSeedlings.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPinIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="stat-label">Capacity</p>
              <p className="stat-value">{greenhouse.capacity_trays || '-'} trays</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="stat-label">Type</p>
              <p className="stat-value capitalize">{greenhouse.type?.replace('-', ' ')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Greenhouse Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Dimensions</dt>
              <dd className="font-medium">
                {greenhouse.length_meters && greenhouse.width_meters
                  ? `${greenhouse.length_meters}m × ${greenhouse.width_meters}m`
                  : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Area</dt>
              <dd className="font-medium">
                {greenhouse.length_meters && greenhouse.width_meters
                  ? `${(greenhouse.length_meters * greenhouse.width_meters).toFixed(1)} m²`
                  : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Covering</dt>
              <dd className="font-medium">{greenhouse.covering_material || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Irrigation</dt>
              <dd className="font-medium">
                {greenhouse.has_irrigation 
                  ? greenhouse.irrigation_type || 'Yes' 
                  : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Created</dt>
              <dd className="font-medium">{formatDate(greenhouse.created_at)}</dd>
            </div>
          </dl>
          {greenhouse.description && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">{greenhouse.description}</p>
            </div>
          )}
        </div>

        {/* Active Batches */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Production Batches</h2>
            <Link to="/production" className="text-primary-600 text-sm hover:underline">
              View All
            </Link>
          </div>
          
          {batches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CubeIcon className="w-12 h-12 mx-auto text-gray-300" />
              <p className="mt-2">No batches in this greenhouse</p>
              <Link to="/production" className="btn-primary mt-4 inline-flex">
                Create Batch
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Batch #</th>
                    <th>Crop</th>
                    <th>Sown</th>
                    <th>Qty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.slice(0, 10).map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <Link
                          to={`/production/${batch.id}`}
                          className="font-medium font-mono text-primary-600 hover:underline"
                        >
                          {batch.batch_number}
                        </Link>
                      </td>
                      <td>{batch.crop?.name || '-'}</td>
                      <td>{formatDate(batch.sowing_date)}</td>
                      <td className="font-semibold">
                        {batch.current_quantity?.toLocaleString()}
                      </td>
                      <td>{getBatchStatusBadge(batch.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
