import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [accountData, setAccountData] = useState({ password: '', role_id: '' });
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    national_id: '',
    employment_type: 'permanent',
    department: '',
    job_title: '',
    basic_salary: '',
    hire_date: '',
    bank_name: '',
    bank_account: '',
    kra_pin: '',
    nhif_number: '',
    nssf_number: '',
  });

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employees', { params: { search } });
      setEmployees(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/users/roles/list');
      setRoles(response.data.data || []);
    } catch (error) {
      console.error('Failed to load roles');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, formData);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/employees', formData);
        toast.success('Employee added successfully');
      }
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save employee');
    }
  };

  const handleEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      national_id: emp.national_id || '',
      employment_type: emp.employment_type || 'permanent',
      department: emp.department || '',
      job_title: emp.job_title || '',
      basic_salary: emp.basic_salary || '',
      hire_date: emp.hire_date?.split('T')[0] || '',
      bank_name: emp.bank_name || '',
      bank_account: emp.bank_account_number || '',
      kra_pin: emp.kra_pin || '',
      nhif_number: emp.nhif_number || '',
      nssf_number: emp.nssf_number || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      national_id: '',
      employment_type: 'permanent',
      department: '',
      job_title: '',
      basic_salary: '',
      hire_date: '',
      bank_name: '',
      bank_account: '',
      kra_pin: '',
      nhif_number: '',
      nssf_number: '',
    });
  };

  const handleCreateAccount = (emp) => {
    if (!emp.email) {
      toast.error('Employee must have an email address to create a login account');
      return;
    }
    setSelectedEmployee(emp);
    setAccountData({ password: '', role_id: roles[0]?.id || '' });
    setShowAccountModal(true);
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/employees/${selectedEmployee.id}/create-account`, accountData);
      toast.success('User account created successfully');
      if (response.data.data.defaultPassword) {
        toast.success(`Default password: ${response.data.data.defaultPassword}`, { duration: 10000 });
      }
      setShowAccountModal(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create account');
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount || 0);

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-yellow-100 text-yellow-800',
    terminated: 'bg-red-100 text-red-800',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Employees</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Employee
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchEmployees()}
              className="input pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No employees found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">ID</th>
                <th className="text-left">Name</th>
                <th className="text-left">Contact</th>
                <th className="text-left">Department</th>
                <th className="text-left">Type</th>
                <th className="text-left">Salary</th>
                <th className="text-left">Status</th>
                <th className="text-left">Account</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 font-mono text-sm">{emp.employee_number}</td>
                  <td className="font-medium">{emp.first_name} {emp.last_name}</td>
                  <td>
                    <div className="text-sm">
                      {emp.phone && <div>{emp.phone}</div>}
                      {emp.email && <div className="text-gray-500">{emp.email}</div>}
                    </div>
                  </td>
                  <td>{emp.job_title || '-'}</td>
                  <td className="capitalize">{emp.employment_type}</td>
                  <td>{formatCurrency(emp.basic_salary)}</td>
                  <td><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[emp.status] || 'bg-gray-100'}`}>{emp.status}</span></td>
                  <td>
                    {emp.user_id ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <UserCircleIcon className="w-4 h-4" />
                        <span className="text-xs">Has Account</span>
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleCreateAccount(emp)} 
                        className="text-primary-600 hover:text-primary-800 flex items-center gap-1"
                        title="Create login account"
                      >
                        <UserPlusIcon className="w-4 h-4" />
                        <span className="text-xs">Create</span>
                      </button>
                    )}
                  </td>
                  <td>
                    <button onClick={() => handleEdit(emp)} className="p-1 text-gray-500 hover:text-primary-600">
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="input" required />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="input" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">National ID</label>
                  <input type="text" value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Hire Date *</label>
                  <input type="date" value={formData.hire_date} onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} className="input" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Department</label>
                  <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Job Title</label>
                  <input type="text" value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Employment Type</label>
                  <select value={formData.employment_type} onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })} className="select">
                    <option value="permanent">Permanent</option>
                    <option value="contract">Contract</option>
                    <option value="casual">Casual</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="label">Basic Salary (KES)</label>
                  <input type="number" value={formData.basic_salary} onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Bank Name</label>
                  <input type="text" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Bank Account Number</label>
                  <input type="text" value={formData.bank_account} onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">KRA PIN</label>
                  <input type="text" value={formData.kra_pin} onChange={(e) => setFormData({ ...formData, kra_pin: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">NHIF Number</label>
                  <input type="text" value={formData.nhif_number} onChange={(e) => setFormData({ ...formData, nhif_number: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">NSSF Number</label>
                  <input type="text" value={formData.nssf_number} onChange={(e) => setFormData({ ...formData, nssf_number: e.target.value })} className="input" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">{editingEmployee ? 'Update' : 'Add'} Employee</button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showAccountModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Create Login Account</h2>
              <p className="text-sm text-gray-500 mt-1">
                For: {selectedEmployee.first_name} {selectedEmployee.last_name}
              </p>
            </div>
            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Email (from employee record)</label>
                <input type="email" value={selectedEmployee.email} className="input bg-gray-50" disabled />
              </div>
              <div>
                <label className="label">Password</label>
                <input 
                  type="password" 
                  value={accountData.password} 
                  onChange={(e) => setAccountData({ ...accountData, password: e.target.value })} 
                  className="input" 
                  placeholder="Leave blank for default (Password@123)"
                />
                <p className="text-xs text-gray-500 mt-1">Default: Password@123</p>
              </div>
              <div>
                <label className="label">Role *</label>
                <select 
                  value={accountData.role_id} 
                  onChange={(e) => setAccountData({ ...accountData, role_id: e.target.value })} 
                  className="select"
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.display_name || role.name}</option>
                  ))}
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>Note:</strong> This will create a system login account for the employee. 
                They will be able to log in using their email and the password you set.
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Create Account</button>
                <button type="button" onClick={() => setShowAccountModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
