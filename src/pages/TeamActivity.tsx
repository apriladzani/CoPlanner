import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  Plus, 
  Mail, 
  Check, 
  X, 
  Trash2, 
  UserPlus, 
  ChevronRight, 
  Shield, 
  User,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Team {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[];
  createdAt: any;
}

interface Invitation {
  id: string;
  teamId: string;
  teamName: string;
  inviterId: string;
  inviterName: string;
  inviteeEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}

interface TeamMember {
  userId: string;
  teamId: string;
  role: 'admin' | 'creator' | 'editor';
  debtBalance: number;
  rotationIndex: number;
  displayName: string;
  photoURL: string;
}

// Removed MOCK_TEAMS

// Removed MOCK_MEMBERS

// --- Component ---
const TeamActivity: React.FC = () => {
  const { user, profile, selectedTeamId, setSelectedTeamId, teams: contextTeams, fetchInvitations, refreshWorkspaces } = useAuth();
  // We use contextTeams directly instead of local state for teams
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const selectedTeam = contextTeams.find(t => t.id === selectedTeamId) || null;
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState('');
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear validation error when selectedTeamId changes
  useEffect(() => {
    setInviteEmailError('');
    setInviteEmail('');
  }, [selectedTeamId]);

  const handleInviteEmailChange = (val: string) => {
    setInviteEmail(val);
    if (!val.trim()) {
      setInviteEmailError('Email wajib diisi');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setInviteEmailError('Format email tidak sesuai (contoh: user@gmail.com)');
    } else {
      setInviteEmailError('');
    }
  };

  // Fetch actual team members when selectedTeamId changes
  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedTeamId) {
        setTeamMembers([]);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/workspaces/${selectedTeamId}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data.map((m: any) => ({
            ...m,
            teamId: selectedTeamId
          })));
        }
      } catch (err) {
        console.error('Failed to fetch members', err);
      }
    };
    
    fetchMembers();
  }, [selectedTeamId]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || isProcessing) return;

    setIsProcessing(true);
    const teamId = `team-${Date.now()}`;
    const newTeam: Team = {
      id: teamId,
      name: newTeamName,
      description: newTeamDesc,
      ownerId: user?.uid || 'mock-user-123',
      members: [user?.uid || 'mock-user-123'],
      createdAt: new Date()
    };
    
    // Add current user as a member of the new team
    const newMember: TeamMember = {
      userId: user?.uid || 'mock-user-123',
      teamId: teamId,
      role: 'admin',
      debtBalance: 0,
      rotationIndex: 0,
      displayName: profile?.displayName || 'Uni User',
      photoURL: profile?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Uni'
    };

    // Note: Creating teams is now handled via the Header modal
    setIsCreatingTeam(false);
    setIsProcessing(false);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.trim()) {
      setInviteEmailError('Email wajib diisi');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteEmailError('Format email tidak sesuai (contoh: user@gmail.com)');
      return;
    }
    if (!selectedTeam || isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/workspaces/${selectedTeam.id}/invite`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send invite');
      
      alert(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      
      // If we invited ourselves (for testing), update notification bell immediately
      if (profile?.email === inviteEmail && fetchInvitations) {
        await fetchInvitations();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptInvite = (invitation: Invitation) => {
    setInvitations(invitations.filter(i => i.id !== invitation.id));
  };

  const handleDeclineInvite = (invitationId: string) => {
    setInvitations(invitations.filter(i => i.id !== invitationId));
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/workspaces/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete workspace');
      }
      
      await refreshWorkspaces();
      if (selectedTeamId === teamId) setSelectedTeamId(null);
      setTeamToDelete(null);
    } catch (err: any) {
      setError(err.message);
      setTeamToDelete(null);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/workspaces/${selectedTeam?.id}/members/${member.userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to remove member');
      }
      
      // If user removes themselves, clear selected team
      if (member.userId === user?.uid) {
        await refreshWorkspaces();
        setSelectedTeamId(null);
      } else {
        // Otherwise just update the members list visually
        setTeamMembers(teamMembers.filter(m => m.userId !== member.userId));
      }
      setMemberToRemove(null);
    } catch (err: any) {
      setError(err.message);
      setMemberToRemove(null);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Activity</h1>
          <p className="text-gray-400 mt-1">Manage your team settings and members.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Invitations Section */}
      {invitations.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" />
            Pending Invitations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invitations.map((invite) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-bold">{invite.teamName}</p>
                  <p className="text-xs text-gray-400">Invited by {invite.inviterName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptInvite(invite)}
                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeclineInvite(invite.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-8">
        {/* Team Details */}
        <div className="col-span-1">
          <AnimatePresence mode="wait">
            {selectedTeam ? (
              <motion.div
                key={selectedTeam.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedTeam.name}</h2>
                    <p className="text-gray-400 mt-2">{selectedTeam.description || 'No description provided.'}</p>
                  </div>
                  {selectedTeam.role === 'admin' ? (
                    <button
                      onClick={() => setTeamToDelete(selectedTeam.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                      title="Delete Workspace"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const me = teamMembers.find(m => m.userId === user?.uid);
                        if (me) setMemberToRemove(me);
                      }}
                      className="p-2 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                      title="Leave Workspace"
                    >
                      <User className="w-4 h-4" />
                      Leave Team
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Members List */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Members</h3>
                    <div className="space-y-3">
                      {teamMembers.map((member) => (
                        <div key={`${member.teamId}-${member.userId}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                          <img src={member.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Uni'} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-white/10" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-white">{member.displayName}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {member.role === 'admin' ? 'Owner' : 'User'}
                            </p>
                          </div>
                          {member.role === 'admin' ? (
                            <Shield className="w-4 h-4 text-purple-400" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-600" />
                              {selectedTeam.role === 'admin' && (
                                <button
                                  onClick={() => setMemberToRemove(member)}
                                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                  title="Remove member"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Invite Form */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Invite Member</h3>
                    <form onSubmit={handleSendInvite} className="space-y-4" noValidate>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          type="email"
                          placeholder="Email address"
                          value={inviteEmail}
                          onChange={(e) => handleInviteEmailChange(e.target.value)}
                          className={`w-full bg-white/5 border rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none transition-all text-white ${
                            inviteEmailError ? 'border-red-500/50 focus:border-purple-500' : 'border-white/10 focus:border-purple-500'
                          }`}
                        />
                      </div>
                      {inviteEmailError && (
                        <span className="text-[11px] text-red-400 mt-1 block font-medium opacity-90 transition-all">
                          {inviteEmailError}
                        </span>
                      )}
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-3 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-5 h-5" />
                            Send Invitation
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-white/5 border border-dashed border-white/10 rounded-3xl p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-white">No Team Selected</h3>
                <p className="text-gray-500 mt-2 max-w-xs">Select a team from the list or create a new one to start collaborating.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Team Modal */}
      <AnimatePresence>
        {isCreatingTeam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatingTeam(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-[#15171C] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Create New Team</h2>
                <button onClick={() => setIsCreatingTeam(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <form onSubmit={handleCreateTeam} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Team Name</label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-purple-500/50 transition-all text-white"
                    placeholder="e.g. Marketing Squad"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Description (Optional)</label>
                  <textarea
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-purple-500/50 transition-all min-h-[100px] resize-none text-white"
                    placeholder="What is this team about?"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isProcessing ? 'Creating...' : 'Create Team'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {teamToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTeamToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-[#15171C] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Delete Team?</h2>
              <p className="text-gray-400 text-sm mb-8">
                This action cannot be undone. All team data will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTeamToDelete(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteTeam(teamToDelete)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Remove Member Confirmation Modal */}
      <AnimatePresence>
        {memberToRemove && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMemberToRemove(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-[#15171C] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <User className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">
                {memberToRemove?.userId === user?.uid ? 'Leave Workspace?' : 'Remove Member?'}
              </h2>
              <p className="text-gray-400 text-sm mb-8">
                {memberToRemove?.userId === user?.uid 
                  ? 'Are you sure you want to leave this workspace? You will lose access to all content until invited again.'
                  : `Are you sure you want to remove ${memberToRemove?.displayName} from the team?`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMemberToRemove(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveMember(memberToRemove)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamActivity;
