import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import NoTeamView from '../components/NoTeamView';
import { Search, Plus, Folder, Video, FileText, Image as ImageIcon, Download, Tag, ExternalLink, Loader2, Trash2, Edit, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Asset {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: string;
  createdAt: string;
  uploaderName?: string;
  tags?: string[];
}

export default function Repository() {
  const { profile, selectedTeamId } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'video' | 'image' | 'script'>('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const [newAsset, setNewAsset] = useState({ name: '', type: 'image', url: '', tags: '' });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (isAddModalOpen) {
      setNameError('');
    }
  }, [isAddModalOpen]);

  const handleNameChange = (val: string) => {
    setNewAsset(prev => ({ ...prev, name: val }));
    if (!val.trim()) {
      setNameError('Nama asset wajib diisi');
    } else {
      setNameError('');
    }
  };

  const fetchAssets = async () => {
    if (!selectedTeamId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/repository/${selectedTeamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssets(data.map((item: any) => ({ ...item, tags: ['asset'] })));
      }
    } catch (err) {
      console.error('Failed to fetch repository files', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [selectedTeamId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) { // 50MB Limit
        alert('File size exceeds 50MB limit. Please select a smaller file.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setFileToUpload(file);
      setNewAsset(prev => ({ ...prev, name: file.name.split('.')[0] }));
    }
  };

  const handleSaveAsset = async () => {
    if (!newAsset.name || !newAsset.name.trim()) {
      setNameError('Nama asset wajib diisi');
      return;
    }
    if (!selectedTeamId) return;
    if (!editingAsset && !fileToUpload) {
      alert("Please upload a file.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', newAsset.name);
      formData.append('type', newAsset.type);
      if (fileToUpload) {
        formData.append('file', fileToUpload);
      }

      const token = localStorage.getItem('token');
      const urlPath = editingAsset
        ? `/api/repository/${selectedTeamId}/${editingAsset.id}`
        : `/api/repository/${selectedTeamId}`;
      const method = editingAsset ? 'PUT' : 'POST';

      const res = await fetch(urlPath, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save file record');
      }

      fetchAssets();
      closeModal();
    } catch (err: any) {
      console.error('Error saving file:', err);
      alert(err.message || 'Failed to save file record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingAsset(null);
    setNewAsset({ name: '', type: 'image', url: '', tags: '' });
    setFileToUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setNewAsset({
      name: asset.name,
      type: asset.type,
      url: asset.url,
      tags: ''
    });
    setFileToUpload(null);
    setIsAddModalOpen(true);
  };

  const handleDeleteAsset = async (fileId: string) => {
    if (!selectedTeamId) return;
    if (!window.confirm("Are you sure you want to permanently delete this asset?")) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/repository/${selectedTeamId}/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAssets(assets.filter(a => a.id !== fileId));
      }
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || asset.type.toLowerCase() === filter;
    return matchesSearch && matchesFilter;
  });

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'script': return <FileText className="w-5 h-5" />;
      default: return <Folder className="w-5 h-5" />;
    }
  };

  if (!selectedTeamId) {
    return <NoTeamView />;
  }

  return (
    <div className="space-y-8 relative min-h-[500px]">
      <div className="flex justify-between items-end text-white">
        <div>
          <h1 className="text-3xl font-bold">Content Repository</h1>
          <p className="text-gray-400 mt-1">Centralized library for all your production assets in this workspace.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Asset
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-purple-500 transition-all text-white"
          />
        </div>
        <div className="flex gap-2 bg-white/5 border border-white/10 p-1 rounded-2xl overflow-x-auto">
          {['all', 'video', 'image', 'script'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all whitespace-nowrap",
                filter === f ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAssets.map((asset) => (
            <motion.div
              layout
              key={asset.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden group hover:border-white/20 transition-all flex flex-col"
            >
              <div className="aspect-video bg-white/[0.02] border-b border-white/5 relative flex items-center justify-center overflow-hidden">
                {asset.type.toLowerCase() === 'image' && asset.url.startsWith('data:image') ? (
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : asset.type.toLowerCase() === 'image' && asset.url.startsWith('http') ? (
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                ) : (
                  <div className="text-gray-700 group-hover:text-purple-500/20 transition-colors">
                    {getIcon(asset.type)}
                  </div>
                )}

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => openEditModal(asset)}
                    className="p-2 bg-blue-500/80 backdrop-blur-md rounded-xl hover:bg-blue-600 shadow-lg"
                    title="Edit Asset"
                  >
                    <Edit className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => handleDeleteAsset(asset.id)}
                    className="p-2 bg-red-500/80 backdrop-blur-md rounded-xl hover:bg-red-600 shadow-lg"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-white truncate">{asset.name}</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Uploaded by {asset.uploaderName || 'Unknown'}</p>
                  </div>
                  <div className={cn(
                    "p-2 rounded-lg bg-white/5",
                    asset.type.toLowerCase() === 'video' ? "text-purple-400" : asset.type.toLowerCase() === 'image' ? "text-blue-400" : "text-emerald-400"
                  )}>
                    {getIcon(asset.type)}
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 flex gap-2">
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-white"
                  >
                    {asset.type.toLowerCase() === 'image' ? (
                      <ImageIcon className="w-3 h-3" />
                    ) : (
                      <ExternalLink className="w-3 h-3" />
                    )}
                    {asset.type.toLowerCase() === 'image' ? 'Open Image' : 'Visit Link'}
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
          {filteredAssets.length === 0 && (
            <div className="col-span-full p-12 text-center border border-white/10 rounded-3xl bg-white/[0.02]">
              <Folder className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No assets found in this workspace.</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#15171C] border border-white/10 rounded-3xl p-8 shadow-2xl text-white"
            >
              <h2 className="text-2xl font-bold mb-6">{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Asset Type</label>
                    <select
                      value={newAsset.type}
                      onChange={e => {
                        setNewAsset({ ...newAsset, type: e.target.value as any });
                        setFileToUpload(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all appearance-none text-white bg-[#15171C]"
                    >
                      <option value="image">Image (Foto)</option>
                      <option value="video">Video</option>
                      <option value="script">Document / Script</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                    {newAsset.type === 'image' ? 'Upload Image (Max 50MB)' : newAsset.type === 'video' ? 'Upload Video (Max 50MB)' : 'Upload Document / Script (Max 50MB)'}
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/10 border-dashed rounded-xl cursor-pointer hover:bg-white/5 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 text-gray-500 mb-2" />
                      <p className="text-sm text-gray-400 px-4 text-center truncate max-w-xs">
                        {fileToUpload
                          ? fileToUpload.name
                          : editingAsset
                            ? 'Keep existing file or upload new'
                            : `Click to upload ${newAsset.type === 'image' ? 'image' : newAsset.type === 'video' ? 'video' : 'document'}`}
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={
                        newAsset.type === 'image'
                          ? 'image/*'
                          : newAsset.type === 'video'
                            ? 'video/*'
                            : '.pdf,.docx,.doc,.txt,.xlsx,.xls,.csv,.pptx,.ppt'
                      }
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Asset Name</label>
                  <input
                    type="text"
                    value={newAsset.name}
                    onChange={e => handleNameChange(e.target.value)}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 focus:outline-none transition-all text-white ${nameError ? 'border-red-500/50 focus:border-purple-500' : 'border-white/10 focus:border-purple-500'
                      }`}
                    placeholder="Enter asset name..."
                  />
                  {nameError && (
                    <span className="text-[11px] text-red-400 mt-1 block font-medium opacity-90 transition-all">
                      {nameError}
                    </span>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all text-white"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting || (!editingAsset && !fileToUpload)}
                    onClick={handleSaveAsset}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/20 transition-all text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {editingAsset ? 'Save Changes' : 'Add Asset'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
