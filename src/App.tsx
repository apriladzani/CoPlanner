/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Film,
  Database,
  Activity,
  TrendingDown,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  Check,
  Users,
  AlertCircle,
  Plus,
  Copy,
  Shield,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Planner from './pages/Planner';
import AIGenerator from './pages/AIGenerator';
import StoryboardStudio from './pages/StoryboardStudio';
import Repository from './pages/Repository';
import DebtTracker from './pages/DebtTracker';
import Settings from './pages/Settings';
import TeamActivity from './pages/TeamActivity';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminPanel from './pages/AdminPanel';
import ForgotPassword from './pages/ForgotPassword';
import { WorkspaceModal } from './components/WorkspaceModal';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
  link?: string;
}

// Removed MOCK_TEAMS, using real data from context

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    userId: 'mock-user-123',
    title: 'Welcome to Uni - LLMedia!',
    message: 'Start managing your content studio today.',
    type: 'success',
    read: false,
    timestamp: new Date(),
  }
];

// --- Components ---

const Sidebar = () => {
  const { profile, selectedTeamId, logout, logoUrl, logoHeight, logoText } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, requiresTeam: true },
    { name: 'Content Planner', path: '/planner', icon: Calendar, requiresTeam: true },
    { name: 'AI Generator', path: '/ai', icon: Sparkles, requiresTeam: false },
    { name: 'Storyboard Studio', path: '/storyboard', icon: Film, requiresTeam: false },
    { name: 'Repository', path: '/repository', icon: Database, requiresTeam: true },
    { name: 'Team Activity', path: '/activity', icon: Activity, requiresTeam: true },
    { name: 'Debt Tracker', path: '/debt', icon: TrendingDown, requiresTeam: true },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, requiresTeam: false },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ name: 'Admin Panel', path: '/admin', icon: Shield, requiresTeam: false });
  }

  return (
    <aside className="w-64 h-screen bg-[#0F1115] border-r border-white/5 flex flex-col fixed left-0 top-0 z-50">
      <div className="px-8 py-6 flex items-center justify-start gap-3 border-b border-white/5 mb-4">
        <img 
          src={logoUrl} 
          alt="Uni - LLMedia Logo" 
          referrerPolicy="no-referrer"
          style={{ height: `${logoHeight}px` }}
          className="max-w-[120px] w-auto object-contain" 
        />
        {logoText && (
          <span className="font-bold text-base text-white truncate max-w-[100px]" title={logoText}>
            {logoText}
          </span>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1 text-sm">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isDisabled = item.requiresTeam && !selectedTeamId && profile?.role !== 'admin';

          if (isDisabled) {
            return null;
          }

          // If admin, hide all workspace-related nav items
          if (profile?.role === 'admin' && item.name !== 'Dashboard' && item.name !== 'Settings' && item.name !== 'Admin Panel') {
            return null;
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-white/10 text-white shadow-lg shadow-black/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-purple-400" : "group-hover:text-purple-400")} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <img src={profile?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Uni'} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-white/10" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.displayName}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{profile?.role}</p>
          </div>
          <button onClick={logout} className="p-2 text-gray-400 hover:text-red-400 transition-colors ml-auto">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

const Header = () => {
  const { profile, selectedTeamId, setSelectedTeamId, teams, invitations, respondToInvitation } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  // Real invitations mapped to the notification UI
  const unreadCount = invitations.length;

  const currentWorkspace = teams.find(t => t.id === selectedTeamId);

  const handleRespond = async (invitationId: string, status: 'accepted' | 'declined') => {
    try {
      await respondToInvitation(invitationId, status);
    } catch (err: any) {
      alert(err.message || 'Failed to respond to invitation');
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <header className="h-16 border-b border-white/5 bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-8 ml-64">
      <div className="flex items-center gap-6">
        {isAdmin ? (
          <h2 className="text-sm font-medium text-purple-400 uppercase tracking-widest flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Admin System Control
          </h2>
        ) : (
          <>
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Workspace</h2>

            {teams.length > 0 ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                <Users className="w-4 h-4 text-purple-400" />
                <select
                  value={selectedTeamId || ''}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="bg-transparent text-sm font-bold focus:outline-none cursor-pointer text-white w-40 truncate"
                >
                  {teams.map(team => (
                    <option key={team.id} value={team.id} className="bg-[#15171C] text-white">
                      {team.name}
                    </option>
                  ))}
                </select>
                {currentWorkspace && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentWorkspace.inviteCode);
                      alert(`Invite Code ${currentWorkspace.inviteCode} copied to clipboard!`);
                    }}
                    className="ml-2 text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1 bg-black/30 px-2 py-1 rounded-md transition-colors"
                    title="Copy Invite Code"
                  >
                    {currentWorkspace.inviteCode}
                    <Copy className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => setIsWorkspaceModalOpen(true)}
                  className="ml-2 p-1 hover:bg-white/10 rounded-md transition-colors text-purple-400"
                  title="Add Workspace"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 text-red-400/50 italic">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">No Workspace</span>
                </div>
                <button
                  onClick={() => setIsWorkspaceModalOpen(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  Create / Join
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        {!isAdmin && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-400 hover:text-white transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full border-2 border-[#0F1115]"></span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-[#15171C] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                      <h3 className="font-bold text-sm">Invitations</h3>
                      <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-1 rounded-md font-bold">
                        {unreadCount} Pending
                      </span>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {invitations.length > 0 ? (
                        <div className="divide-y divide-white/5">
                          {invitations.map((inv) => (
                            <div
                              key={inv.id}
                              className="p-4 hover:bg-white/5 transition-colors relative group bg-purple-500/5"
                            >
                              <div className="flex flex-col gap-3">
                                <div className="flex-1">
                                  <p className="text-xs font-bold mb-1 text-white">
                                    Workspace Invitation
                                  </p>
                                  <p className="text-[11px] text-gray-400 leading-relaxed">
                                    <strong className="text-purple-400">{inv.inviterName}</strong> invited you to join <strong className="text-white">{inv.workspaceName}</strong>.
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-1">
                                    {new Date(inv.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex gap-2 w-full">
                                  <button
                                    onClick={() => handleRespond(inv.id, 'accepted')}
                                    className="flex-1 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                                  >
                                    <Check className="w-3 h-3" />
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleRespond(inv.id, 'declined')}
                                    className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                    Decline
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500 text-xs italic">
                          No pending invitations.
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
        <div className="h-8 w-[1px] bg-white/5 mx-2"></div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500">Status</p>
            <p className="text-xs font-medium text-emerald-400">Local Mode</p>
          </div>
        </div>
      </div>
      <WorkspaceModal isOpen={isWorkspaceModalOpen} onClose={() => setIsWorkspaceModalOpen(false)} />
    </header>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0F1115] text-white">
      <Sidebar />
      <Header />
      <main className="ml-64 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <Layout>{children}</Layout>;
};

const WorkspaceRoute = ({ children }: { children: React.ReactNode }) => {
  const { selectedTeamId } = useAuth();

  if (!selectedTeamId) {
    // Return to dashboard if they try to access workspace-only routes
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F1115] flex items-center justify-center p-4">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Application Error</h2>
            <p className="text-gray-400 text-sm">{this.state.error?.message || "Something went wrong."}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-white text-black font-bold rounded-2xl hover:bg-gray-100 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Main App ---
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/planner" element={<WorkspaceRoute><Planner /></WorkspaceRoute>} />
                  <Route path="/ai" element={<AIGenerator />} />
                  <Route path="/storyboard" element={<StoryboardStudio />} />
                  <Route path="/repository" element={<WorkspaceRoute><Repository /></WorkspaceRoute>} />
                  <Route path="/activity" element={<WorkspaceRoute><TeamActivity /></WorkspaceRoute>} />
                  <Route path="/debt" element={<WorkspaceRoute><DebtTracker /></WorkspaceRoute>} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
