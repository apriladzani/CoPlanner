import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import NoTeamView from '../components/NoTeamView';
import { 
  Film, 
  User as UserIcon, 
  TrendingDown, 
  Calendar, 
  Activity, 
  ArrowUpRight, 
  BarChart3, 
  X, 
  Download, 
  FileText, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Plus,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ContentItem {
  id: string;
  title: string;
  status: 'Pending' | 'Uploaded' | 'Missed' | 'Claimed';
  assignedTo: string;
  assignedName: string;
  date: string;
  type: string;
  backedUpBy?: string;
}

const MOCK_CONTENT: ContentItem[] = [
  { id: '1', title: 'Viral Video Reel', status: 'Uploaded', assignedTo: 'mock-user-123', assignedName: 'Uni User', date: format(new Date(), 'yyyy-MM-dd'), type: 'Video' },
  { id: '2', title: 'Product Showcase', status: 'Pending', assignedTo: 'mock-user-123', assignedName: 'Uni User', date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), type: 'Video' },
];

const MOCK_ACTIVITY = [
  { userName: 'Uni User', action: 'Planned New Content', details: 'Created "Viral Video Reel"', timestamp: new Date() },
  { userName: 'Uni User', action: 'Uploaded Content', details: 'Finished "Viral Video Reel"', timestamp: new Date() },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#15171C] border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-sm font-bold flex items-center gap-2" style={{ color: p.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
              {p.name}: {p.value === 1 ? 'Yes' : 'No'}
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { profile, selectedTeamId } = useAuth();
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal States
  const [isNewContentOpen, setIsNewContentOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Form State
  const [newContent, setNewContent] = useState({
    title: '',
    type: 'Video',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: ''
  });

  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    if (isNewContentOpen) {
      setTitleError('');
    }
  }, [isNewContentOpen]);

  const handleTitleChange = (val: string) => {
    setNewContent({ ...newContent, title: val });
    if (!val.trim()) {
      setTitleError('Judul wajib diisi');
    } else {
      setTitleError('');
    }
  };

  // Admin Stats
  const [adminStats, setAdminStats] = useState<{ totalUsers: number, totalWorkspaces: number } | null>(null);

  useEffect(() => {
    const fetchAdminStats = async () => {
      if (profile?.role === 'admin') {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            setAdminStats(await res.json());
          }
        } catch (err) {
          console.error('Failed to fetch admin stats', err);
        }
      }
    };
    fetchAdminStats();
  }, [profile]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!selectedTeamId || profile?.role === 'admin') return;
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        const [membersRes, contentRes, debtsRes] = await Promise.all([
          fetch(`/api/workspaces/${selectedTeamId}/members`, { headers }),
          fetch(`/api/planner/${selectedTeamId}`, { headers }),
          fetch(`/api/debt/${selectedTeamId}`, { headers })
        ]);

        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setTeamMembers(membersData);
        }

        if (contentRes.ok) {
          const contentData = await contentRes.json();
          const formatted = contentData.map((item: any) => {
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
          
          // Derive Recent Activity
          const sortedContent = [...formatted].sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
          const activity = sortedContent.slice(0, 5).map(item => ({
            userName: item.assignedName || 'A team member',
            action: item.status === 'Uploaded' ? 'Uploaded Content' : 'Planned New Content',
            details: `"${item.title}"`,
            timestamp: new Date(item.createdAt || item.date)
          }));
          setRecentActivity(activity);
        }

        if (debtsRes.ok) {
          const debtsData = await debtsRes.json();
          setDebts(debtsData);
        }

      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [selectedTeamId, profile]);

  const last7Days = useMemo(() => {
    const end = startOfDay(new Date());
    const start = subDays(end, 6);
    return eachDayOfInterval({ start, end });
  }, []);

  const performanceData = useMemo(() => {
    return last7Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayContent = content.find(item => item.date === dayStr);
      
      return {
        name: format(day, 'EEE'),
        success: dayContent?.status === 'Uploaded' && !dayContent.backedUpBy ? 1 : 0,
        backup: dayContent?.status === 'Uploaded' && dayContent.backedUpBy ? 1 : 0,
        missed: dayContent?.status === 'Missed' || (!dayContent && day < startOfDay(new Date())) ? 1 : 0,
      };
    });
  }, [content, last7Days]);

  const stats = useMemo(() => {
    const totalContent = content.filter(c => c.status === 'Uploaded').length;
    const activeCreators = teamMembers.length;
    const totalDebt = debts.filter(d => d.status === 'unpaid').length;
    const upcoming = content.filter(c => c.status === 'Pending' && new Date(c.date + 'T00:00:00') >= startOfDay(new Date())).length;
    
    const totalScheduled = content.filter(c => new Date(c.date + 'T00:00:00') <= startOfDay(new Date())).length;
    const successful = content.filter(c => c.status === 'Uploaded' && !c.backedUpBy).length;
    const backup = content.filter(c => c.status === 'Uploaded' && c.backedUpBy).length;
    
    const consistencyRate = totalScheduled > 0 
      ? Math.round(((successful + backup) / totalScheduled) * 100) 
      : 0;

    return {
      totalContent,
      activeCreators,
      contentDebt: totalDebt,
      upcoming,
      consistencyRate
    };
  }, [content, teamMembers, debts]);

  const creatorStats = useMemo(() => {
    return teamMembers.map(user => {
      const userContent = content.filter(c => c.assignedTo === user.userId);
      const assignedDays = userContent.length;
      const onTimeUploads = userContent.filter(c => c.status === 'Uploaded' && !c.backedUpBy).length;
      const missedUploads = userContent.filter(c => c.status === 'Pending' && new Date(c.date + 'T00:00:00') < startOfDay(new Date())).length;
      const backupUploads = content.filter(c => c.backedUpBy === user.userId && c.status === 'Uploaded').length;
      
      const score = (onTimeUploads * 10) + (backupUploads * 5) - (missedUploads * 10);
      
      return {
        ...user,
        uid: user.userId,
        assignedDays,
        onTimeUploads,
        missedUploads,
        backupUploads,
        score
      };
    }).sort((a, b) => b.score - a.score);
  }, [content, teamMembers]);

  const handleCreateContent = async () => {
    if (!newContent.title || !newContent.title.trim()) {
      setTitleError('Judul wajib diisi');
      return;
    }
    if (!selectedTeamId) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/planner/${selectedTeamId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newContent.title,
          type: newContent.type,
          status: 'Pending',
          assignedTo: profile?.uid,
          targetDate: newContent.date,
          description: newContent.description
        })
      });

      if (res.ok) {
        const data = await res.json();
        const formattedDate = newContent.date;
        
        const newItem: ContentItem = {
          id: data.id,
          title: newContent.title,
          status: 'Pending',
          assignedTo: profile?.uid || '',
          assignedName: profile?.displayName || 'Unknown',
          date: formattedDate,
          type: newContent.type
        };

        setContent([...content, newItem]);
        
        setRecentActivity([
          { 
            userName: profile?.displayName || 'You', 
            action: 'Planned New Content', 
            details: `"${newContent.title}"`, 
            timestamp: new Date() 
          }, 
          ...recentActivity
        ].slice(0, 5));

        setIsNewContentOpen(false);
        setNewContent({
          title: '',
          type: 'Video',
          date: format(new Date(), 'yyyy-MM-dd'),
          description: ''
        });
      } else {
        alert('Failed to create content plan');
      }
    } catch (err) {
      console.error('Error creating content:', err);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const data = `Uni - LLMedia - Content Report\nGenerated: ${new Date().toLocaleString()}\n\nTotal Content: ${stats.totalContent}\nActive Creators: ${stats.activeCreators}\nContent Debt: ${stats.contentDebt}\nUpcoming: ${stats.upcoming}`;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uni-llmedia-report-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    
    setIsExporting(false);
    setIsExportOpen(false);
  };

  if (profile?.role === 'admin') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">System Dashboard</h1>
          <p className="text-gray-400 mt-1">Overview of the entire platform.</p>
        </div>

        {adminStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 p-8 rounded-3xl flex items-center justify-between hover:border-purple-500/50 transition-colors">
              <div>
                <p className="text-purple-300 font-bold uppercase tracking-widest text-sm mb-2">System Users</p>
                <h3 className="text-5xl font-bold text-white">{adminStats.totalUsers}</h3>
              </div>
              <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center">
                <UserIcon className="w-10 h-10 text-purple-400" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-600/20 to-emerald-600/20 border border-blue-500/30 p-8 rounded-3xl flex items-center justify-between hover:border-blue-500/50 transition-colors">
              <div>
                <p className="text-blue-300 font-bold uppercase tracking-widest text-sm mb-2">Total Workspaces</p>
                <h3 className="text-5xl font-bold text-white">{adminStats.totalWorkspaces}</h3>
              </div>
              <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center">
                <LayoutDashboard className="w-10 h-10 text-blue-400" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        )}
      </div>
    );
  }

  if (!selectedTeamId) {
    return <NoTeamView />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back!</h1>
          <p className="text-gray-400 mt-1">Here's what's happening today (Local Mode).</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsExportOpen(true)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all flex items-center gap-2 text-white"
          >
            <FileText className="w-4 h-4" />
            Export Report
          </button>
          <button 
            onClick={() => setIsNewContentOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-purple-500/20 transition-all flex items-center gap-2 text-white"
          >
            <Plus className="w-4 h-4" />
            New Content
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Content', value: stats.totalContent, trend: '+12%', icon: Film, color: 'text-purple-400' },
          { label: 'Active Creators', value: stats.activeCreators, trend: 'Stable', icon: UserIcon, color: 'text-blue-400' },
          { label: 'Content Debt', value: stats.contentDebt, trend: stats.contentDebt > 0 ? `+${stats.contentDebt}` : '0', icon: TrendingDown, color: 'text-emerald-400' },
          { label: 'Upcoming', value: stats.upcoming, trend: 'Next 7 days', icon: Calendar, color: 'text-orange-400' },
          { label: 'Consistency', value: `${stats.consistencyRate}%`, trend: 'Target 100%', icon: Activity, color: 'text-pink-400' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:border-white/20 transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-3 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-all", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-gray-500">{stat.trend}</span>
            </div>
            <p className="text-sm text-gray-400">{stat.label}</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6 text-white">
              <h3 className="text-lg font-bold">Content Performance</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Success</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Backup</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Missed</span>
                </div>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 600 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 600 }} 
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar 
                    dataKey="success" 
                    stackId="a"
                    fill="#A855F7" 
                    radius={[0, 0, 4, 4]}
                    name="Success"
                    barSize={20}
                  />
                  <Bar 
                    dataKey="backup" 
                    stackId="a"
                    fill="#EAB308" 
                    name="Backup"
                  />
                  <Bar 
                    dataKey="missed" 
                    stackId="a"
                    fill="#EF4444" 
                    radius={[4, 4, 0, 0]}
                    name="Missed"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6 text-white">
              <div>
                <h3 className="text-lg font-bold">Creator Leaderboard</h3>
                <p className="text-xs text-gray-500 mt-1">Score: On Time (+10) • Backup (+5) • Missed (-10)</p>
              </div>
              <BarChart3 className="w-4 h-4 text-gray-500" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="pb-4 text-[10px] text-gray-500 uppercase font-bold tracking-widest">Creator</th>
                    <th className="pb-4 text-[10px] text-gray-500 uppercase font-bold tracking-widest text-center">Assigned</th>
                    <th className="pb-4 text-[10px] text-gray-500 uppercase font-bold tracking-widest text-center">On Time</th>
                    <th className="pb-4 text-[10px] text-gray-500 uppercase font-bold tracking-widest text-center">Backup</th>
                    <th className="pb-4 text-[10px] text-gray-500 uppercase font-bold tracking-widest text-center">Missed</th>
                    <th className="pb-4 text-[10px] text-gray-500 uppercase font-bold tracking-widest text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {creatorStats.map((creator, i) => (
                    <tr key={creator.uid} className="group hover:bg-white/[0.02] transition-all">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <img src={creator.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Uni'} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-white/10" />
                          <span className="text-sm font-medium text-white">{creator.displayName}</span>
                        </div>
                      </td>
                      <td className="py-4 text-center text-sm text-gray-400">{creator.assignedDays}</td>
                      <td className="py-4 text-center text-sm text-emerald-400">{creator.onTimeUploads}</td>
                      <td className="py-4 text-center text-sm text-yellow-400">{creator.backupUploads}</td>
                      <td className="py-4 text-center text-sm text-red-400">{creator.missedUploads}</td>
                      <td className="py-4 text-right">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-xs font-bold",
                          creator.score >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                        )}>
                          {creator.score > 0 ? `+${creator.score}` : creator.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6 text-white">
            <h3 className="text-lg font-bold">Recent Activity</h3>
            <Activity className="w-4 h-4 text-gray-500" />
          </div>
          <div className="space-y-6">
            {recentActivity.length > 0 ? recentActivity.map((activity, i) => (
              <div key={i} className="flex gap-4 group">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-400 group-hover:border-purple-500/50 transition-all">
                  {activity.userName?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{activity.userName} {activity.action}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{activity.details}</p>
                  <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tighter">Just now</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-gray-500 text-sm italic">
                No recent activity to show.
              </div>
            )}
          </div>
          <button className="w-full mt-8 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all text-white">
            View All Activity
          </button>
        </div>
      </div>

      {/* New Content Modal */}
      <AnimatePresence>
        {isNewContentOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsNewContentOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#15171C] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">New Content Plan</h2>
                <button onClick={() => setIsNewContentOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Content Title</label>
                  <input 
                    type="text" 
                    value={newContent.title}
                    onChange={e => handleTitleChange(e.target.value)}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 focus:outline-none transition-all text-white ${
                      titleError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-purple-500'
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
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all appearance-none text-white"
                    >
                      <option value="Video">Video</option>
                      <option value="Post">Social Post</option>
                      <option value="Article">Article</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Target Date</label>
                    <input 
                      type="date" 
                      value={newContent.date}
                      onChange={e => setNewContent({ ...newContent, date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsNewContentOpen(false)}
                    className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateContent}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/20 transition-all text-white"
                  >
                    Create Plan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Report Modal */}
      <AnimatePresence>
        {isExportOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsExportOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#15171C] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-white">Export Activity Report</h2>
                <p className="text-gray-400 text-sm">
                  Generate a report of team activity and content production (Local Mode).
                </p>
                
                <div className="flex gap-3 pt-6">
                  <button 
                    onClick={() => setIsExportOpen(false)}
                    className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isExporting ? 'Generating...' : 'Download Report'}
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
