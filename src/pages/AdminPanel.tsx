import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, LayoutDashboard, Calendar, Shield, Search, Loader2, Edit, Trash2, X, AlertCircle, Save, Image, Upload, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminPanel() {
  const { profile, logoUrl, updateLogo, logoHeight, updateLogoHeight, logoText, updateLogoText } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'workspaces' | 'system'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Brand setting states
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoSuccess, setLogoSuccess] = useState(false);
  const [logoError, setLogoError] = useState('');

  // Logo text states
  const [tempLogoText, setTempLogoText] = useState('');
  const [logoTextSaving, setLogoTextSaving] = useState(false);
  const [logoTextSuccess, setLogoTextSuccess] = useState(false);
  const [logoTextError, setLogoTextError] = useState('');

  useEffect(() => {
    if (logoText) {
      setTempLogoText(logoText);
    }
  }, [logoText]);
  
  // Modals state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingWorkspace, setEditingWorkspace] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation states
  const [userDisplayNameError, setUserDisplayNameError] = useState('');
  const [userEmailError, setUserEmailError] = useState('');
  const [workspaceNameError, setWorkspaceNameError] = useState('');
  const [workspaceOwnerError, setWorkspaceOwnerError] = useState('');

  useEffect(() => {
    if (editingUser) {
      setUserDisplayNameError('');
      setUserEmailError('');
    }
  }, [editingUser]);

  useEffect(() => {
    if (editingWorkspace) {
      setWorkspaceNameError('');
      setWorkspaceOwnerError('');
    }
  }, [editingWorkspace]);

  const fetchData = async () => {
    if (profile?.role !== 'admin') return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [usersRes, workspacesRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/workspaces', { headers })
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
      if (workspacesRes.ok) setWorkspaces(await workspacesRes.json());
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const handleDeleteUser = async (userId: string) => {
    if (userId === profile?.uid) {
      alert("You cannot delete your own admin account.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting user');
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!window.confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setWorkspaces(workspaces.filter(w => w.id !== workspaceId));
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete workspace');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting workspace');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    let hasError = false;
    if (!editingUser.displayName || !editingUser.displayName.trim()) {
      setUserDisplayNameError('Nama lengkap wajib diisi');
      hasError = true;
    }
    if (!editingUser.email || !editingUser.email.trim()) {
      setUserEmailError('Email wajib diisi');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingUser.email)) {
      setUserEmailError('Format email tidak sesuai (contoh: user@gmail.com)');
      hasError = true;
    }

    if (hasError) return;
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          displayName: editingUser.displayName,
          email: editingUser.email,
          role: editingUser.role
        })
      });
      
      if (res.ok) {
        setEditingUser(null);
        fetchData(); // refresh list
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update user');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace) return;

    let hasError = false;
    if (!editingWorkspace.name || !editingWorkspace.name.trim()) {
      setWorkspaceNameError('Nama workspace wajib diisi');
      hasError = true;
    }
    if (!editingWorkspace.ownerId) {
      setWorkspaceOwnerError('Owner wajib dipilih');
      hasError = true;
    }

    if (hasError) return;
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/workspaces/${editingWorkspace.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingWorkspace.name,
          description: editingWorkspace.description,
          ownerId: editingWorkspace.ownerId
        })
      });
      
      if (res.ok) {
        setEditingWorkspace(null);
        fetchData(); // refresh list
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update workspace');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <Shield className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400">You must be a system administrator to view this page.</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredWorkspaces = workspaces.filter(w => 
    w.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-500" />
            System Administration
          </h1>
          <p className="text-gray-400 mt-1">Manage all users and workspaces across the platform.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'users' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Users className="w-4 h-4" />
          All Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('workspaces')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'workspaces' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          All Workspaces ({workspaces.length})
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'system' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Image className="w-4 h-4" />
          System Logo
        </button>
      </div>

      {activeTab !== 'system' && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden"
        >
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">User</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Email</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Role</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Uni'} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-white/10" />
                          <span className="font-bold text-white">{user.displayName || 'No Name'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-400 text-sm">{user.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                          user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setEditingUser(user)}
                            className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'workspaces' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Workspace</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Owner</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Invite Code</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredWorkspaces.map((workspace) => (
                    <tr key={workspace.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-white">{workspace.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{workspace.description || 'No description'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-300">{workspace.ownerName || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{workspace.ownerEmail}</p>
                      </td>
                      <td className="p-4">
                        <span className="bg-black/30 px-2 py-1 rounded-md text-xs font-mono text-gray-400 border border-white/10">
                          {workspace.inviteCode}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setEditingWorkspace(workspace)}
                            className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                            title="Edit Workspace"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteWorkspace(workspace.id)}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Delete Workspace"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredWorkspaces.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">No workspaces found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-purple-500/10 rounded-2xl">
                  <Image className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">System Brand Settings</h3>
                  <p className="text-gray-400 text-sm mt-0.5">Manage application-wide branding assets like the platform logo.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Current Active Logo</span>
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl shadow-inner max-w-full w-full flex items-center justify-center min-h-[140px]">
                    <img 
                      src={logoUrl} 
                      alt="Current Platform Logo" 
                      referrerPolicy="no-referrer"
                      style={{ height: `${logoHeight}px` }}
                      className="max-w-full object-contain" 
                    />
                  </div>
                  <p className="text-xs text-gray-500 truncate max-w-xs">{logoUrl}</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-center space-y-6">
                  <div>
                    <h4 className="font-bold text-white mb-2">Adjust Logo Size</h4>
                    <p className="text-gray-400 text-xs mb-4">
                      Drag the slider to adjust the logo height inside the sidebar in real-time.
                    </p>
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl">
                      <input 
                        type="range" 
                        min="20" 
                        max="100" 
                        value={logoHeight}
                        onChange={async (e) => {
                          const val = parseInt(e.target.value, 10);
                          try {
                            await updateLogoHeight(val);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="flex-1 accent-purple-500 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                      />
                      <span className="font-mono text-sm font-bold bg-white/10 px-3 py-1 rounded-lg min-w-[60px] text-center">
                        {logoHeight}px
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    <h4 className="font-bold text-white mb-2">Adjust Logo Text</h4>
                    <p className="text-gray-400 text-xs mb-4">
                      Change the text that appears to the right of the logo in the sidebar.
                    </p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={tempLogoText}
                        onChange={(e) => setTempLogoText(e.target.value)}
                        placeholder="e.g. Uni - LLMedia"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all text-sm bg-[#15171C]"
                      />
                      <button 
                        onClick={async () => {
                          setLogoTextSaving(true);
                          setLogoTextSuccess(false);
                          setLogoTextError('');
                          try {
                            await updateLogoText(tempLogoText);
                            setLogoTextSuccess(true);
                            setTimeout(() => setLogoTextSuccess(false), 3000);
                          } catch (err: any) {
                            setLogoTextError(err.message || 'Failed to update logo text');
                          } finally {
                            setLogoTextSaving(false);
                          }
                        }}
                        disabled={logoTextSaving}
                        className="px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {logoTextSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                    </div>
                    {logoTextError && (
                      <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {logoTextError}
                      </p>
                    )}
                    {logoTextSuccess && (
                      <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        Logo text updated successfully!
                      </p>
                    )}
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    <h4 className="font-bold text-white mb-2">Upload New Logo</h4>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">
                      Upload an image file (PNG, JPG, SVG, WebP, GIF) to change the main logo across the entire app. The logo will be automatically hosted on the <strong>Kroombox CDN</strong>.
                    </p>

                    <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-4 py-3 transition-all flex items-center justify-center gap-2 w-full text-center disabled:opacity-50">
                      {logoUploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Uploading to Kroombox CDN...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Select & Upload Logo
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setLogoUploading(true);
                          setLogoError('');
                          setLogoSuccess(false);
                          try {
                            await updateLogo(file);
                            setLogoSuccess(true);
                            setTimeout(() => setLogoSuccess(false), 3000);
                          } catch (err: any) {
                            setLogoError(err.message || 'Failed to upload logo');
                          } finally {
                            setLogoUploading(false);
                          }
                        }}
                        disabled={logoUploading}
                      />
                    </label>

                    {logoError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2 mt-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{logoError}</span>
                      </div>
                    )}

                    {logoSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2 mt-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Logo updated successfully!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingUser(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#15171C] border border-white/10 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Edit className="w-5 h-5 text-purple-400" /> Edit User
                </h2>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="space-y-4" noValidate>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Display Name</label>
                  <input 
                    type="text"
                    value={editingUser.displayName || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingUser({...editingUser, displayName: val});
                      if (!val) {
                        setUserDisplayNameError('Nama lengkap wajib diisi');
                      } else {
                        setUserDisplayNameError('');
                      }
                    }}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none transition-all ${
                      userDisplayNameError ? 'border-red-500/50 focus:border-purple-500' : 'border-white/10 focus:border-purple-500'
                    }`}
                  />
                  {userDisplayNameError && (
                    <span className="text-[11px] text-red-400 mt-1 block font-medium opacity-90 transition-all">
                      {userDisplayNameError}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Email Address</label>
                  <input 
                    type="email"
                    value={editingUser.email || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingUser({...editingUser, email: val});
                      if (!val) {
                        setUserEmailError('Email wajib diisi');
                      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                        setUserEmailError('Format email tidak sesuai (contoh: user@gmail.com)');
                      } else {
                        setUserEmailError('');
                      }
                    }}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none transition-all ${
                      userEmailError ? 'border-red-500/50 focus:border-purple-500' : 'border-white/10 focus:border-purple-500'
                    }`}
                  />
                  {userEmailError && (
                    <span className="text-[11px] text-red-400 mt-1 block font-medium opacity-90 transition-all">
                      {userEmailError}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Role</label>
                  <select 
                    value={editingUser.role}
                    onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none appearance-none"
                  >
                    <option value="user" className="bg-[#15171C]">User</option>
                    <option value="admin" className="bg-[#15171C]">Admin</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4 mt-6 border-t border-white/10">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Workspace Modal */}
      <AnimatePresence>
        {editingWorkspace && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingWorkspace(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#15171C] border border-white/10 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-400" /> Edit Workspace
                </h2>
                <button onClick={() => setEditingWorkspace(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateWorkspace} className="space-y-4" noValidate>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Workspace Name</label>
                  <input 
                    type="text"
                    value={editingWorkspace.name || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingWorkspace({...editingWorkspace, name: val});
                      if (!val) {
                        setWorkspaceNameError('Nama workspace wajib diisi');
                      } else {
                        setWorkspaceNameError('');
                      }
                    }}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none transition-all ${
                      workspaceNameError ? 'border-red-500/50 focus:border-blue-500' : 'border-white/10 focus:border-blue-500'
                    }`}
                  />
                  {workspaceNameError && (
                    <span className="text-[11px] text-red-400 mt-1 block font-medium opacity-90 transition-all">
                      {workspaceNameError}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Description</label>
                  <textarea 
                    value={editingWorkspace.description || ''}
                    onChange={e => setEditingWorkspace({...editingWorkspace, description: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none h-24 resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Owner</label>
                  <select 
                    value={editingWorkspace.ownerId || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingWorkspace({...editingWorkspace, ownerId: val});
                      if (!val) {
                        setWorkspaceOwnerError('Owner wajib dipilih');
                      } else {
                        setWorkspaceOwnerError('');
                      }
                    }}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none transition-all ${
                      workspaceOwnerError ? 'border-red-500/50 focus:border-blue-500' : 'border-white/10 focus:border-blue-500'
                    }`}
                  >
                    <option value="" className="bg-[#15171C]">Select Owner</option>
                    <option value={editingWorkspace.ownerId} className="bg-[#15171C]">{editingWorkspace.ownerName} (Current)</option>
                    {users.filter(u => u.id !== editingWorkspace.ownerId).map(user => (
                      <option key={user.id} value={user.id} className="bg-[#15171C]">{user.displayName} ({user.email})</option>
                    ))}
                  </select>
                  {workspaceOwnerError && (
                    <span className="text-[11px] text-red-400 mt-1 block font-medium opacity-90 transition-all">
                      {workspaceOwnerError}
                    </span>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4 mt-6 border-t border-white/10">
                  <button type="button" onClick={() => setEditingWorkspace(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
