/**
 * Settings Page
 */

import { useState, useEffect } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserCircleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [companySettings, setCompanySettings] = useState({
    'company.name': '',
    'company.address': '',
    'company.phone': '',
    'company.email': '',
    'company.website': '',
    'company.kra_pin': '',
    'company.registration_number': '',
    'company.logo_url': '',
  });

  const [systemSettings, setSystemSettings] = useState({
    'system.currency': 'KES',
    'system.currency_symbol': 'KES',
    'system.date_format': 'DD/MM/YYYY',
    'system.fiscal_year_start': '01',
    'system.low_stock_threshold': '10',
    'tax.vat_rate': '16',
  });

  const [etimsSettings, setEtimsSettings] = useState({
    'etims.enabled': false,
    'etims.device_serial': '',
    'etims.branch_id': '',
    'etims.username': '',
    'etims.password': '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings');
      const settings = response.data.data || {};
      
      // Parse settings by category
      setCompanySettings({
        'company.name': settings['company.name'] || 'Savannah Propagation Nursery',
        'company.address': settings['company.address'] || '',
        'company.phone': settings['company.phone'] || '',
        'company.email': settings['company.email'] || '',
        'company.website': settings['company.website'] || '',
        'company.kra_pin': settings['company.kra_pin'] || '',
        'company.registration_number': settings['company.registration_number'] || '',
        'company.logo_url': settings['company.logo_url'] || '',
      });

      setSystemSettings({
        'system.currency': settings['system.currency'] || 'KES',
        'system.currency_symbol': settings['system.currency_symbol'] || 'KES',
        'system.date_format': settings['system.date_format'] || 'DD/MM/YYYY',
        'system.fiscal_year_start': settings['system.fiscal_year_start'] || '01',
        'system.low_stock_threshold': settings['system.low_stock_threshold'] || '10',
        'tax.vat_rate': settings['tax.vat_rate'] || '16',
      });

      setEtimsSettings({
        'etims.enabled': settings['etims.enabled'] === 'true' || settings['etims.enabled'] === true,
        'etims.device_serial': settings['etims.device_serial'] || '',
        'etims.branch_id': settings['etims.branch_id'] || '',
        'etims.username': settings['etims.username'] || '',
        'etims.password': settings['etims.password'] || '',
      });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/settings', companySettings);
      toast.success('Company settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystem = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/settings', systemSettings);
      toast.success('System settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEtims = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/settings', etimsSettings);
      toast.success('eTIMS settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'company', name: 'Company', icon: BuildingOfficeIcon },
    { id: 'system', name: 'System', icon: Cog6ToothIcon },
    { id: 'etims', name: 'KRA eTIMS', icon: DocumentTextIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your system preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'company' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-6">Company Information</h2>
              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Company Name</label>
                    <input
                      type="text"
                      value={companySettings['company.name']}
                      onChange={(e) => setCompanySettings({ ...companySettings, 'company.name': e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Registration Number</label>
                    <input
                      type="text"
                      value={companySettings['company.registration_number']}
                      onChange={(e) => setCompanySettings({ ...companySettings, 'company.registration_number': e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Address</label>
                  <textarea
                    value={companySettings['company.address']}
                    onChange={(e) => setCompanySettings({ ...companySettings, 'company.address': e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Phone</label>
                    <input
                      type="tel"
                      value={companySettings['company.phone']}
                      onChange={(e) => setCompanySettings({ ...companySettings, 'company.phone': e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={companySettings['company.email']}
                      onChange={(e) => setCompanySettings({ ...companySettings, 'company.email': e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Website</label>
                    <input
                      type="url"
                      value={companySettings['company.website']}
                      onChange={(e) => setCompanySettings({ ...companySettings, 'company.website': e.target.value })}
                      className="input"
                      placeholder="https://"
                    />
                  </div>
                  <div>
                    <label className="label">KRA PIN</label>
                    <input
                      type="text"
                      value={companySettings['company.kra_pin']}
                      onChange={(e) => setCompanySettings({ ...companySettings, 'company.kra_pin': e.target.value.toUpperCase() })}
                      className="input"
                      placeholder="P000000000X"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-6">System Settings</h2>
              <form onSubmit={handleSaveSystem} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Currency</label>
                    <select
                      value={systemSettings['system.currency']}
                      onChange={(e) => setSystemSettings({ ...systemSettings, 'system.currency': e.target.value })}
                      className="select"
                    >
                      <option value="KES">Kenya Shilling (KES)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Currency Symbol</label>
                    <input
                      type="text"
                      value={systemSettings['system.currency_symbol']}
                      onChange={(e) => setSystemSettings({ ...systemSettings, 'system.currency_symbol': e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date Format</label>
                    <select
                      value={systemSettings['system.date_format']}
                      onChange={(e) => setSystemSettings({ ...systemSettings, 'system.date_format': e.target.value })}
                      className="select"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Fiscal Year Start (Month)</label>
                    <select
                      value={systemSettings['system.fiscal_year_start']}
                      onChange={(e) => setSystemSettings({ ...systemSettings, 'system.fiscal_year_start': e.target.value })}
                      className="select"
                    >
                      <option value="01">January</option>
                      <option value="04">April</option>
                      <option value="07">July</option>
                      <option value="10">October</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Default VAT Rate (%)</label>
                    <input
                      type="number"
                      value={systemSettings['tax.vat_rate']}
                      onChange={(e) => setSystemSettings({ ...systemSettings, 'tax.vat_rate': e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Low Stock Threshold</label>
                    <input
                      type="number"
                      value={systemSettings['system.low_stock_threshold']}
                      onChange={(e) => setSystemSettings({ ...systemSettings, 'system.low_stock_threshold': e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'etims' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-2">KRA eTIMS Integration</h2>
              <p className="text-gray-500 text-sm mb-6">
                Configure your KRA eTIMS settings for tax-compliant invoicing
              </p>
              
              <form onSubmit={handleSaveEtims} className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="etims_enabled"
                    checked={etimsSettings['etims.enabled']}
                    onChange={(e) => setEtimsSettings({ ...etimsSettings, 'etims.enabled': e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600"
                  />
                  <label htmlFor="etims_enabled" className="font-medium">
                    Enable eTIMS Integration
                  </label>
                </div>

                {etimsSettings['etims.enabled'] && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Device Serial Number</label>
                        <input
                          type="text"
                          value={etimsSettings['etims.device_serial']}
                          onChange={(e) => setEtimsSettings({ ...etimsSettings, 'etims.device_serial': e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Branch ID</label>
                        <input
                          type="text"
                          value={etimsSettings['etims.branch_id']}
                          onChange={(e) => setEtimsSettings({ ...etimsSettings, 'etims.branch_id': e.target.value })}
                          className="input"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">eTIMS Username</label>
                        <input
                          type="text"
                          value={etimsSettings['etims.username']}
                          onChange={(e) => setEtimsSettings({ ...etimsSettings, 'etims.username': e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">eTIMS Password</label>
                        <input
                          type="password"
                          value={etimsSettings['etims.password']}
                          onChange={(e) => setEtimsSettings({ ...etimsSettings, 'etims.password': e.target.value })}
                          className="input"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <strong>Note:</strong> Ensure your KRA eTIMS device is properly configured 
                        and connected before enabling this integration. All sales invoices will be 
                        automatically transmitted to KRA once enabled.
                      </p>
                    </div>
                  </>
                )}

                <div className="pt-4 border-t">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-gray-500">Get notified when inventory items are running low</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Production Ready Alerts</p>
                    <p className="text-sm text-gray-500">Get notified when seedling batches are ready for sale</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Payment Due Reminders</p>
                    <p className="text-sm text-gray-500">Get notified about upcoming and overdue payments</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Email Reports</p>
                    <p className="text-sm text-gray-500">Receive weekly summary reports via email</p>
                  </div>
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                </div>

                <div className="pt-4 border-t">
                  <button type="button" className="btn-primary">
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
