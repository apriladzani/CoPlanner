import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import NoTeamView from '../components/NoTeamView';
import { TrendingDown, TrendingUp, Award, AlertCircle, ChevronRight, BarChart3, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// MOCK_MEMBERS removed

interface DebtRecord {
  id: string;
  planId: string;
  planTitle: string;
  createdAt: string;
  owedById: string;
  owedByName: string;
  owedByPhoto: string;
  owedToId: string;
  owedToName: string;
  owedToPhoto: string;
  status: 'unpaid' | 'paid';
}

export default function DebtTracker() {
  const { selectedTeamId, profile } = useAuth();
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [isResolving, setIsResolving] = useState<string | null>(null);

  const fetchDebts = async () => {
    if (!selectedTeamId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/debt/${selectedTeamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDebts(data);
      }
    } catch (err) {
      console.error('Failed to fetch debt tracker data', err);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, [selectedTeamId]);

  const handleToggleResolve = async (debtId: string, targetStatus: 'paid' | 'unpaid') => {
    if (!selectedTeamId) return;
    setIsResolving(debtId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/debt/${selectedTeamId}/${debtId}/resolve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: targetStatus })
      });
      if (res.ok) {
        fetchDebts();
      } else {
        alert('Failed to update debt status');
      }
    } catch (err) {
      console.error('Error updating debt status', err);
    } finally {
      setIsResolving(null);
    }
  };

  if (!selectedTeamId) {
    return <NoTeamView />;
  }

  // Calculate some stats
  const totalDebts = debts.filter(d => d.status === 'unpaid').length;
  const myDebts = debts.filter(d => d.owedById === profile?.uid && d.status === 'unpaid');
  const owedToMe = debts.filter(d => d.owedToId === profile?.uid && d.status === 'unpaid');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Content Debt Tracker</h1>
        <p className="text-gray-400 mt-1">1-to-1 accountability for missed content uploads.</p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-medium">
          <Info className="w-4 h-4" />
          Dashboard Score: On Time (+10) • Backup (+5) • Missed (-10)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h4 className="font-bold text-white mb-2">You Owe</h4>
          <p className="text-2xl font-bold text-red-400">{myDebts.length} Contents</p>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <TrendingDown className="w-8 h-8" />
          </div>
          <h4 className="font-bold text-white mb-2">Owed To You</h4>
          <p className="text-2xl font-bold text-emerald-400">{owedToMe.length} Contents</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center items-center text-center">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Award className="w-24 h-24" />
          </div>
          <h3 className="text-lg font-bold mb-2 relative z-10 text-white">Team Active Debts</h3>
          <p className="text-4xl font-black text-white relative z-10">{totalDebts}</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold flex items-center gap-3 text-white">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            Workspace Debts Log
          </h3>
        </div>

        {debts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 italic border border-white/5 rounded-2xl bg-white/[0.02]">
            No active debts. Great job team! Everyone is on track.
          </div>
        ) : (
          <div className="space-y-4">
            {debts.map((debt, i) => (
              <motion.div 
                key={debt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "flex flex-col md:flex-row items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.08] transition-all gap-6",
                  debt.status === 'paid' && "opacity-60 border-emerald-500/10 bg-emerald-500/[0.01]"
                )}
              >
                <div className="flex items-center gap-6 flex-1">
                  {/* Owed By User */}
                  <div className="flex flex-col items-center gap-2">
                    <img src={debt.owedByPhoto || 'https://picsum.photos/seed/user/200'} alt="" className="w-12 h-12 rounded-full border-2 border-red-500/50" />
                    <span className="text-sm font-bold text-white">{debt.owedByName}</span>
                  </div>
                  
                  {/* Arrow & Context */}
                  <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className="h-0.5 w-full bg-gradient-to-r from-red-500/50 via-gray-500/50 to-emerald-500/50 absolute top-1/2 -translate-y-1/2 -z-10" />
                    <div className="bg-[#15171C] px-4 py-1 rounded-full border border-white/10 text-xs text-gray-400 whitespace-nowrap">
                      Owes 1 Content
                    </div>
                    <div className="text-[10px] text-gray-500 mt-2 max-w-[200px] truncate" title={debt.planTitle}>
                      For: {debt.planTitle}
                    </div>
                  </div>

                  {/* Owed To User */}
                  <div className="flex flex-col items-center gap-2">
                    <img src={debt.owedToPhoto || 'https://picsum.photos/seed/user/200'} alt="" className="w-12 h-12 rounded-full border-2 border-emerald-500/50" />
                    <span className="text-sm font-bold text-white">{debt.owedToName}</span>
                  </div>
                </div>

                <div className="flex-shrink-0 w-full md:w-auto">
                  {debt.status === 'paid' ? (
                    <div className="flex flex-col md:flex-row items-center gap-2">
                      <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold text-center w-full md:w-auto">
                        Resolved
                      </div>
                      {(debt.owedById === profile?.uid || debt.owedToId === profile?.uid) && (
                        <button
                          onClick={() => handleToggleResolve(debt.id, 'unpaid')}
                          disabled={isResolving === debt.id}
                          className="w-full md:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold transition-all border border-white/5"
                        >
                          Mark Unresolved
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {(debt.owedById === profile?.uid || debt.owedToId === profile?.uid) ? (
                        <button
                          onClick={() => handleToggleResolve(debt.id, 'paid')}
                          disabled={isResolving === debt.id}
                          className="w-full md:w-auto px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                        >
                          {isResolving === debt.id ? 'Resolving...' : 'Mark Resolved'}
                        </button>
                      ) : (
                        <div className="px-4 py-2 bg-white/5 text-gray-500 rounded-xl text-sm font-medium text-center">
                          Needs Action
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

