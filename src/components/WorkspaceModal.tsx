import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Hash, Users, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { createWorkspace, joinWorkspace } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (mode === 'create') {
        await createWorkspace(inputValue);
        setSuccessMsg('Workspace created successfully!');
      } else {
        await joinWorkspace(inputValue);
        setSuccessMsg('Successfully joined workspace!');
      }
      
      // Close modal after short delay to show success
      setTimeout(() => {
        onClose();
        setInputValue('');
        setSuccessMsg('');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#15171C] border border-white/10 rounded-3xl p-6 z-[100] shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Workspace Settings</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex p-1 bg-black/40 rounded-xl mb-6">
              <button
                onClick={() => { setMode('create'); setError(''); setInputValue(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  mode === 'create' ? 'bg-purple-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Create New
              </button>
              <button
                onClick={() => { setMode('join'); setError(''); setInputValue(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  mode === 'join' ? 'bg-purple-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Join Existing
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-sm">
                <Check className="w-4 h-4 shrink-0" />
                <p>{successMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {mode === 'create' ? 'Workspace Name' : 'Invite Code'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {mode === 'create' ? <Users className="w-5 h-5 text-gray-500" /> : <Hash className="w-5 h-5 text-gray-500" />}
                  </div>
                  <input
                    type="text"
                    required
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                    className="w-full bg-[#0F1115] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
                    placeholder={mode === 'create' ? "e.g. My Awesome Team" : "e.g. A1B2C3"}
                  />
                </div>
                {mode === 'join' && (
                  <p className="text-xs text-gray-500 mt-2 ml-1">Ask your team admin for the 6-character invite code.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="w-full bg-white text-black font-bold rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-gray-100 transition-all disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'create' ? <Plus className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                    {mode === 'create' ? 'Create Workspace' : 'Join Workspace'}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
