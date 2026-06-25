import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Shield, 
  Save, 
  CheckCircle2, 
  Building2,
  Copy,
  Plus,
  Trash2,
  LogOut,
  Compass,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Settings() {
  const { 
    profile, 
    teams, 
    updateProfile, 
    leaveWorkspace, 
    deleteWorkspace,
    createWorkspace,
    joinWorkspace
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'workspaces'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Profile State
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  
  // Workspace Actions State
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [workspaceSuccess, setWorkspaceSuccess] = useState('');
  const [isWorkspaceActionLoading, setIsWorkspaceActionLoading] = useState(false);
  
  const [createWorkspaceError, setCreateWorkspaceError] = useState('');
  const [joinWorkspaceError, setJoinWorkspaceError] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhotoURL(profile.photoURL || '');
    }
  }, [profile]);

  useEffect(() => {
    setCreateWorkspaceError('');
    setJoinWorkspaceError('');
  }, [activeTab]);

  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val);
    if (!val.trim()) {
      setDisplayNameError('Nama lengkap wajib diisi');
    } else {
      setDisplayNameError('');
    }
  };

  const handleCreateWorkspaceNameChange = (val: string) => {
    setNewWorkspaceName(val);
    if (!val.trim()) {
      setCreateWorkspaceError('Nama workspace wajib diisi');
    } else {
      setCreateWorkspaceError('');
    }
  };

  const handleJoinWorkspaceCodeChange = (val: string) => {
    setInviteCodeInput(val);
    if (!val.trim()) {
      setJoinWorkspaceError('Kode undangan wajib diisi');
    } else {
      setJoinWorkspaceError('');
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName || !displayName.trim()) {
      setDisplayNameError('Nama lengkap wajib diisi');
      return;
    }
    setIsSaving(true);
    setError('');
    setSaveSuccess(false);
    try {
      await updateProfile(displayName, photoURL);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      
      setPhotoURL(data.url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName || !newWorkspaceName.trim()) {
      setCreateWorkspaceError('Nama workspace wajib diisi');
      return;
    }
    setIsWorkspaceActionLoading(true);
    setWorkspaceError('');
    setWorkspaceSuccess('');
    try {
      await createWorkspace(newWorkspaceName);
      setWorkspaceSuccess(`Workspace "${newWorkspaceName}" created successfully!`);
      setNewWorkspaceName('');
      setTimeout(() => setWorkspaceSuccess(''), 4000);
    } catch (err: any) {
      setWorkspaceError(err.message || 'Failed to create workspace');
    } finally {
      setIsWorkspaceActionLoading(false);
    }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput || !inviteCodeInput.trim()) {
      setJoinWorkspaceError('Kode undangan wajib diisi');
      return;
    }
    setIsWorkspaceActionLoading(true);
    setWorkspaceError('');
    setWorkspaceSuccess('');
    try {
      await joinWorkspace(inviteCodeInput.trim().toUpperCase());
      setWorkspaceSuccess('Joined workspace successfully!');
      setInviteCodeInput('');
      setTimeout(() => setWorkspaceSuccess(''), 4000);
    } catch (err: any) {
      setWorkspaceError(err.message || 'Failed to join workspace');
    } finally {
      setIsWorkspaceActionLoading(false);
    }
  };

  const handleLeaveWorkspace = async (workspaceId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to leave the workspace "${name}"?`)) return;
    setIsWorkspaceActionLoading(true);
    setWorkspaceError('');
    setWorkspaceSuccess('');
    try {
      await leaveWorkspace(workspaceId);
      setWorkspaceSuccess(`Left workspace "${name}".`);
      setTimeout(() => setWorkspaceSuccess(''), 4000);
    } catch (err: any) {
      setWorkspaceError(err.message || 'Failed to leave workspace');
    } finally {
      setIsWorkspaceActionLoading(false);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string, name: string) => {
    if (!window.confirm(`WARNING: Are you sure you want to delete "${name}"? This action is permanent and cannot be undone.`)) return;
    setIsWorkspaceActionLoading(true);
    setWorkspaceError('');
    setWorkspaceSuccess('');
    try {
      await deleteWorkspace(workspaceId);
      setWorkspaceSuccess(`Deleted workspace "${name}".`);
      setTimeout(() => setWorkspaceSuccess(''), 4000);
    } catch (err: any) {
      setWorkspaceError(err.message || 'Failed to delete workspace');
    } finally {
      setIsWorkspaceActionLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'User Profile', icon: User },
    { id: 'workspaces', label: 'Workspaces', icon: Building2 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-white">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-400 mt-1">Manage your account profile and team workspaces.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === tab.id 
                ? "bg-white/10 text-white shadow-lg" 
                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8">
                {/* Profile Card Summary */}
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative group w-24 h-24">
                      <img 
                        src={photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Uni'} 
                        alt="" 
                        referrerPolicy="no-referrer"
                        className="w-24 h-24 rounded-3xl border-2 border-white/10 object-cover bg-white/5 shadow-inner"
                      />
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <label className="cursor-pointer text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-all bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 border border-purple-500/25 rounded-xl flex items-center gap-1">
                      <span>Upload Image</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChange}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{displayName || profile?.displayName || 'User Profile'}</h3>
                    <p className="text-gray-500 text-sm">{profile?.email}</p>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                      <Shield className="w-3 h-3 text-purple-400" />
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">{profile?.role || 'User'}</span>
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="grid grid-cols-1 gap-6 pt-8 border-t border-white/5 max-w-xl">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => handleDisplayNameChange(e.target.value)}
                      placeholder="Enter your name"
                      className={`w-full bg-white/5 border rounded-xl px-4 py-3 focus:outline-none transition-all text-white ${
                        displayNameError ? 'border-red-500/50 focus:border-purple-500' : 'border-white/10 focus:border-purple-500'
                      }`}
                    />
                    {displayNameError && (
                      <span className="text-[11px] text-red-400 mt-1 block font-medium opacity-90 transition-all">
                        {displayNameError}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Email Address (Read-Only)</label>
                    <input 
                      type="email" 
                      value={profile?.email || ''}
                      disabled
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 opacity-50 cursor-not-allowed text-white"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'workspaces' && (
            <motion.div
              key="workspaces"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Workspace Action Loader / Error */}
              {(workspaceError || workspaceSuccess || isWorkspaceActionLoading) && (
                <div className="space-y-2">
                  {workspaceError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                      {workspaceError}
                    </div>
                  )}
                  {workspaceSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm">
                      {workspaceSuccess}
                    </div>
                  )}
                </div>
              )}

              {/* Workspaces List Card */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-500/10 rounded-2xl">
                    <Building2 className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">My Workspaces</h3>
                    <p className="text-gray-500 text-sm">View and manage the workspaces you've created or joined.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-6 border-t border-white/5">
                  {teams.length > 0 ? (
                    teams.map((w) => (
                      <div 
                        key={w.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-lg text-white">{w.name}</h4>
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              w.role === 'admin' 
                                ? "bg-purple-500/15 text-purple-400 border border-purple-500/20" 
                                : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                            )}>
                              {w.role === 'admin' ? 'Owner / Admin' : 'Member'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Invite Code:</span>
                            <span className="font-mono bg-black/30 px-2 py-0.5 rounded font-bold text-gray-300">{w.inviteCode}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(w.inviteCode);
                                alert(`Invite code "${w.inviteCode}" copied!`);
                              }}
                              className="text-gray-400 hover:text-white transition-colors"
                              title="Copy Invite Code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          {w.role === 'admin' ? (
                            <button
                              onClick={() => handleDeleteWorkspace(w.id, w.name)}
                              disabled={isWorkspaceActionLoading}
                              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLeaveWorkspace(w.id, w.name)}
                              disabled={isWorkspaceActionLoading}
                              className="px-4 py-2 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-gray-400 hover:text-red-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              Leave
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-white/2 border border-dashed border-white/10 rounded-2xl text-gray-500 italic text-sm">
                      You are not currently in any workspaces. Create or join one below to get started!
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Create Workspace Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-purple-500/10 rounded-xl">
                      <Plus className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Create a Workspace</h4>
                      <p className="text-gray-500 text-xs">Start a new space to organize content plans and team members.</p>
                    </div>
                  </div>
                  <form onSubmit={handleCreateWorkspace} className="space-y-4" noValidate>
                    <div>
                      <input 
                        type="text" 
                        value={newWorkspaceName}
                        onChange={(e) => handleCreateWorkspaceNameChange(e.target.value)}
                        placeholder="e.g. Media Production Team"
                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-white ${
                          createWorkspaceError ? 'border-red-500/50 focus:border-purple-500' : 'border-white/10 focus:border-purple-500'
                        }`}
                      />
                      {createWorkspaceError && (
                        <span className="text-[11px] text-red-400 mt-1 block font-medium opacity-90 transition-all">
                          {createWorkspaceError}
                        </span>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isWorkspaceActionLoading}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      Create Workspace
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Join Workspace Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                      <Compass className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Join a Workspace</h4>
                      <p className="text-gray-500 text-xs">Enter a 6-character invite code from a team owner.</p>
                    </div>
                  </div>
                  <form onSubmit={handleJoinWorkspace} className="space-y-4" noValidate>
                    <div>
                      <input 
                        type="text" 
                        maxLength={10}
                        value={inviteCodeInput}
                        onChange={(e) => handleJoinWorkspaceCodeChange(e.target.value)}
                        placeholder="e.g. A1B2C3"
                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-white font-mono uppercase tracking-wider ${
                          joinWorkspaceError ? 'border-red-500/50 focus:border-emerald-500' : 'border-white/10 focus:border-emerald-500'
                        }`}
                      />
                      {joinWorkspaceError && (
                        <span className="text-[11px] text-red-400 mt-1 block font-medium opacity-90 transition-all">
                          {joinWorkspaceError}
                        </span>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isWorkspaceActionLoading}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      Join Workspace
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Success notification toast */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 px-6 py-4 bg-emerald-500 text-white rounded-2xl shadow-2xl flex items-center gap-3 z-[100]"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-sm">Profile updated successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

