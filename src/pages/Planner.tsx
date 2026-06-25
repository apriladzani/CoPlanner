import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import NoTeamView from '../components/NoTeamView';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Clock, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ContentItem {
  id: string;
  title: string;
  description: string;
  status: 'Pending' | 'Uploaded' | 'Missed' | 'Claimed';
  assignedTo: string;
  assignedName: string;
  backedUpBy?: string;
  backedUpByName?: string;
  date: string; // From API it will be targetDate
  targetDate?: string;
  type: string;
}

export default function Planner() {
  const { profile, selectedTeamId } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, title: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [members, setMembers] = useState<any[]>([]);
  const [newContent, setNewContent] = useState({ 
    title: '', 
    type: 'Video', 
    description: '', 
    status: 'Pending' as ContentItem['status'],
    assignedTo: profile?.uid || ''
  });

  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    if (isModalOpen) {
      setTitleError('');
    }
  }, [isModalOpen]);

  const handleTitleChange = (val: string) => {
    setNewContent(prev => ({ ...prev, title: val }));
    if (!val.trim()) {
      setTitleError('Judul wajib diisi');
    } else {
      setTitleError('');
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const fetchContent = async () => {
    if (!selectedTeamId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/planner/${selectedTeamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Map database targetDate to the date format we use in UI
        const formatted = data.map((item: any) => {
          let dateStr = '';
          if (item.targetDate) {
            if (typeof item.targetDate === 'string') {
              dateStr = item.targetDate.substring(0, 10);
            } else {
              dateStr = format(new Date(item.targetDate), 'yyyy-MM-dd');
            }
          } else {
            dateStr = format(new Date(item.createdAt), 'yyyy-MM-dd');
          }
          return {
            ...item,
            date: dateStr
          };
        });
        setContent(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch planner content', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!selectedTeamId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/workspaces/${selectedTeamId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
        if (!newContent.assignedTo && profile?.uid) {
          setNewContent(prev => ({ ...prev, assignedTo: profile.uid }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch members', err);
    }
  };

  useEffect(() => {
    fetchContent();
    fetchMembers();
  }, [selectedTeamId]);

  const handleAddContent = async () => {
    if (!newContent.title || !newContent.title.trim()) {
      setTitleError('Judul wajib diisi');
      return;
    }
    if (!selectedDate || !selectedTeamId) return;
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const targetDateStr = format(selectedDate, 'yyyy-MM-dd');
      
      if (selectedItem) {
        // UPDATE
        const res = await fetch(`/api/planner/${selectedTeamId}/${selectedItem.id}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...newContent,
            targetDate: targetDateStr
          })
        });
        if (res.ok) fetchContent();
      } else {
        // CREATE
        const res = await fetch(`/api/planner/${selectedTeamId}`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...newContent,
            targetDate: targetDateStr
          })
        });
        if (res.ok) fetchContent();
      }
    } catch (err) {
      console.error('Error saving content:', err);
      alert('Failed to save content plan');
    } finally {
      setIsSubmitting(false);
      setIsModalOpen(false);
      setSelectedItem(null);
      setNewContent({ title: '', type: 'Video', description: '', status: 'Pending', assignedTo: profile?.uid || '' });
    }
  };

  const handleBackup = async (planId: string) => {
    if (!selectedTeamId) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/planner/${selectedTeamId}/${planId}/backup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error('Server returned an invalid response. Please try again.');
      }

      if (res.ok) {
        fetchContent();
        setIsModalOpen(false);
      } else {
        alert(data.message || 'Failed to backup content');
      }
    } catch (err: any) {
      console.error('Error backing up:', err);
      alert(err.message || 'An unexpected error occurred while backing up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (e: React.MouseEvent, id: string, currentStatus: ContentItem['status']) => {
    e.stopPropagation();
    if (!selectedTeamId) return;
    const newStatus = currentStatus === 'Uploaded' ? 'Pending' : 'Uploaded';
    
    // Optimistic update
    setContent(content.map(item => item.id === id ? { ...item, status: newStatus } : item));
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/planner/${selectedTeamId}/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error('Error updating status:', err);
      fetchContent(); // Revert on error
    }
  };

  const handleDeleteContent = async () => {
    if (!itemToDelete || !selectedTeamId) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/planner/${selectedTeamId}/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setContent(content.filter(item => item.id !== itemToDelete.id));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to delete content plan');
      }
    } catch (err) {
      console.error('Error deleting content:', err);
      alert('An unexpected error occurred while deleting the content plan');
    } finally {
      setIsDeleteConfirmOpen(false);
      setItemToDelete(null);
      setIsModalOpen(false);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setItemToDelete({ id, title });
    setIsDeleteConfirmOpen(true);
  };

  if (!selectedTeamId) {
    return <NoTeamView />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center text-white">
        <div>
          <h1 className="text-3xl font-bold">Content Planner</h1>
          <p className="text-gray-400 mt-1">Manage and sync production schedule for this workspace.</p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-1 rounded-2xl">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold px-4 min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px]">
        {loading && (
          <div className="absolute inset-0 z-10 bg-[#0F1115]/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          </div>
        )}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-[#0F1115] p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
            {day}
          </div>
        ))}
        {days.map((day, i) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayContent = content.filter(item => item.date === dayStr);
          return (
            <div 
              key={i} 
              className={cn(
                "min-h-[160px] bg-[#0F1115] p-4 border-r border-b border-white/5 transition-all hover:bg-white/[0.02] cursor-pointer group relative text-white",
                !isSameDay(day, currentDate) && "text-gray-600"
              )}
              onClick={() => {
                setSelectedDate(day);
                setIsModalOpen(true);
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={cn(
                  "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                  isToday(day) ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "text-gray-400 group-hover:text-white"
                )}>
                  {format(day, 'd')}
                </span>
                {dayContent.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-white/5 rounded-full text-gray-500">
                    {dayContent.length} Items
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {dayContent.map(item => (
                  <div 
                    key={item.id} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                      setSelectedDate(new Date(item.date + 'T00:00:00'));
                      setNewContent({
                        title: item.title,
                        type: item.type,
                        description: item.description || '',
                        status: item.status,
                        assignedTo: item.assignedTo || profile?.uid || ''
                      });
                      setIsModalOpen(true);
                    }}
                    className={cn(
                      "p-2 rounded-lg text-[11px] font-medium border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group/item",
                      item.status === 'Uploaded' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                      item.status === 'Missed' ? "bg-red-500/10 border-red-500/20 text-red-400" :
                      item.status === 'Claimed' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                      "bg-white/5 border-white/10 text-gray-300 hover:border-purple-500/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="truncate">{item.title}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => openDeleteConfirm(e, item.id, item.title)}
                          className="p-1 hover:bg-red-500/20 rounded-md text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover/item:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div 
                          className="flex-shrink-0 cursor-pointer"
                          onClick={(e) => updateStatus(e, item.id, item.status)}
                        >
                          {item.status === 'Uploaded' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <div className="relative">
                              <Clock className="w-3 h-3 text-gray-500 group-hover/item:opacity-0" />
                              <CheckCircle2 className="w-3 h-3 text-purple-400 absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-[9px] text-gray-500 font-medium">
                      {item.assignedName ? (
                        <span>Assigned: <span className="text-gray-300">{item.assignedName}</span></span>
                      ) : (
                        <span>Unassigned</span>
                      )}
                      {item.backedUpByName && (
                        <div className="text-purple-400 mt-0.5">Backed up by {item.backedUpByName}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-4 h-4 text-purple-400" />
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#15171C] border border-white/10 rounded-3xl p-8 shadow-2xl text-white"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{selectedItem ? 'Edit Content Plan' : 'Plan Content'}</h2>
                {selectedItem && (
                  <button 
                    onClick={(e) => openDeleteConfirm(e, selectedItem.id, selectedItem.title)}
                    className="p-2 hover:bg-red-500/10 rounded-xl text-gray-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Content Title</label>
                  <input 
                    type="text" 
                    value={newContent.title}
                    onChange={e => handleTitleChange(e.target.value)}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 focus:outline-none transition-all text-white ${
                      titleError ? 'border-red-500/50 focus:border-purple-500' : 'border-white/10 focus:border-purple-500'
                    }`}
                    placeholder="Enter title..."
                  />
                  {titleError && (
                    <span className="text-[11px] text-red-400 mt-1 block font-medium opacity-90 transition-all">
                      {titleError}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Type</label>
                    <select 
                      value={newContent.type}
                      onChange={e => setNewContent({ ...newContent, type: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all appearance-none text-white bg-[#15171C]"
                    >
                      <option value="Video">Video</option>
                      <option value="Post">Social Post</option>
                      <option value="Article">Article</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Initial Status</label>
                    <select 
                      value={newContent.status}
                      onChange={e => setNewContent({ ...newContent, status: e.target.value as ContentItem['status'] })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all appearance-none text-white bg-[#15171C]"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Uploaded">Already Uploaded</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Assigned To</label>
                    <select 
                      value={newContent.assignedTo}
                      onChange={e => setNewContent({ ...newContent, assignedTo: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all appearance-none text-white bg-[#15171C]"
                    >
                      <option value="">Select Assignee</option>
                      {members.map(member => (
                        <option key={member.userId} value={member.userId}>
                          {member.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Description</label>
                    <textarea 
                      value={newContent.description}
                      onChange={e => setNewContent({ ...newContent, description: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 h-12 focus:outline-none focus:border-purple-500 transition-all resize-none text-white"
                      placeholder="Add details..."
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedItem(null);
                      setNewContent({ title: '', type: 'Video', description: '', status: 'Pending', assignedTo: profile?.uid || '' });
                    }}
                    className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all text-white"
                  >
                    Cancel
                  </button>
                  {selectedItem && selectedItem.assignedTo && selectedItem.assignedTo !== profile?.uid && !selectedItem.backedUpBy && selectedItem.status !== 'Uploaded' && (
                    <button 
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleBackup(selectedItem.id)}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold hover:shadow-lg transition-all text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      Takeover / Backup
                    </button>
                  )}
                  <button 
                    disabled={isSubmitting}
                    onClick={handleAddContent}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/20 transition-all text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {selectedItem ? 'Update Plan' : 'Create Plan'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setIsDeleteConfirmOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#1A1D23] border border-white/10 rounded-3xl p-8 shadow-2xl text-center text-white"
            >
              <h3 className="text-xl font-bold mb-2">Delete Content Plan?</h3>
              <p className="text-gray-400 text-sm mb-8">
                Are you sure you want to delete <span className="text-white font-bold">"{itemToDelete?.title}"</span>?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all text-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteContent}
                  className="flex-1 py-3 bg-red-500 rounded-xl font-bold hover:bg-red-600 transition-all text-white"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
