import React, { createContext, useContext, useState, useEffect } from 'react';

// --- Types ---
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'admin' | 'creator' | 'editor' | 'user';
  debtBalance: number;
  rotationIndex: number;
  notificationsEnabled?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  role: 'admin' | 'member';
}

export interface Invitation {
  id: string;
  workspaceId: string;
  inviterId: string;
  inviteeEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  workspaceName: string;
  inviterName: string;
}

export interface AuthContextType {
  user: { uid: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  selectedTeamId: string | null;
  setSelectedTeamId: (id: string | null) => void;
  teams: Workspace[];
  invitations: Invitation[];
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  createWorkspace: (name: string) => Promise<void>;
  joinWorkspace: (inviteCode: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  fetchInvitations: () => Promise<void>;
  respondToInvitation: (invitationId: string, status: 'accepted' | 'declined') => Promise<void>;
  updateProfile: (displayName: string, photoURL: string) => Promise<void>;
  leaveWorkspace: (workspaceId: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  logoUrl: string;
  logoHeight: number;
  logoText: string;
  fetchLogo: () => Promise<void>;
  updateLogo: (file: File) => Promise<void>;
  updateLogoHeight: (height: number) => Promise<void>;
  updateLogoText: (text: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [teams, setTeams] = useState<Workspace[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => localStorage.getItem('selectedTeamId'));
  const [logoUrl, setLogoUrl] = useState<string>('https://api-cdn.kroombox.com/api/bridge/view/5853f9a859dd15e8');
  const [logoHeight, setLogoHeight] = useState<number>(48);
  const [logoText, setLogoText] = useState<string>('Uni - LLMedia');

  const fetchLogo = async () => {
    try {
      const res = await fetch('/api/auth/logo');
      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.logoUrl);
        if (data.logoHeight !== undefined) {
          setLogoHeight(data.logoHeight);
        }
        if (data.logoText !== undefined) {
          setLogoText(data.logoText);
        }
      }
    } catch (err) {
      console.error('Failed to fetch logo', err);
    }
  };

  const updateLogo = async (file: File) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    const formData = new FormData();
    formData.append('logo', file);
    const res = await fetch('/api/admin/logo', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update logo');
    setLogoUrl(data.logoUrl);
  };

  const updateLogoHeight = async (height: number) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    const res = await fetch('/api/admin/logo-height', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ height })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update logo height');
    setLogoHeight(data.logoHeight);
  };

  const updateLogoText = async (text: string) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    const res = await fetch('/api/admin/logo-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update logo text');
    setLogoText(data.logoText);
  };

  // Save selected team to local storage when it changes
  useEffect(() => {
    if (selectedTeamId) {
      localStorage.setItem('selectedTeamId', selectedTeamId);
    } else {
      localStorage.removeItem('selectedTeamId');
    }
  }, [selectedTeamId]);

  const loadWorkspaces = async (token: string) => {
    try {
      const res = await fetch('/api/workspaces', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        
        // Auto select first team if none selected
        if (data.length > 0) {
          const currentId = localStorage.getItem('selectedTeamId');
          const isValidId = data.some((t: Workspace) => t.id === currentId);
          if (!currentId || !isValidId) {
            setSelectedTeamId(data[0].id);
          }
        } else {
          setSelectedTeamId(null);
        }
      }
    } catch (err) {
      console.error('Failed to load workspaces', err);
    }
  };

  const refreshWorkspaces = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      await loadWorkspaces(token);
      await fetchInvitations();
    }
  };

  const fetchInvitations = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/workspaces/invitations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data);
      }
    } catch (err) {
      console.error('Failed to load invitations', err);
    }
  };

  const respondToInvitation = async (invitationId: string, status: 'accepted' | 'declined') => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/workspaces/invitations/${invitationId}/respond`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to respond to invitation');
    }
    
    await fetchInvitations();
    if (status === 'accepted' && token) {
      await loadWorkspaces(token);
    }
  };

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const userData = await res.json();
          setUser({ uid: userData.uid });
          setProfile(userData);
          await loadWorkspaces(token);
          await fetchInvitations();
        } else {
          localStorage.removeItem('token');
        }
      } catch (err) {
        console.error('Failed to load user', err);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
    fetchLogo();
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Login failed');

    localStorage.setItem('token', data.token);
    setUser({ uid: data.user.uid });
    setProfile(data.user);
    await loadWorkspaces(data.token);
    await fetchInvitations();
  };

  const registerUser = async (email: string, password: string, displayName: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Registration failed');

    localStorage.setItem('token', data.token);
    setUser({ uid: data.user.uid });
    setProfile(data.user);
    await loadWorkspaces(data.token);
    await fetchInvitations();
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('selectedTeamId');
    setUser(null);
    setProfile(null);
    setTeams([]);
    setInvitations([]);
    setSelectedTeamId(null);
  };

  const createWorkspace = async (name: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create workspace');
    
    await loadWorkspaces(token!);
    setSelectedTeamId(data.id); // Auto switch to newly created workspace
  };

  const joinWorkspace = async (inviteCode: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/workspaces/join', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ inviteCode })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to join workspace');
    
    await loadWorkspaces(token!);
    setSelectedTeamId(data.id); // Auto switch to joined workspace
  };

  const updateProfile = async (displayName: string, photoURL: string) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ displayName, photoURL })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update profile');
    
    setProfile(data);
  };

  const leaveWorkspace = async (workspaceId: string) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    if (!profile) throw new Error('No profile found');
    const res = await fetch(`/api/workspaces/${workspaceId}/members/${profile.uid}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to leave workspace');
    
    await loadWorkspaces(token);
  };

  const deleteWorkspace = async (workspaceId: string) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete workspace');
    
    await loadWorkspaces(token);
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, 
      selectedTeamId, setSelectedTeamId, teams, invitations,
      signIn, register: registerUser, logout,
      createWorkspace, joinWorkspace, refreshWorkspaces,
      fetchInvitations, respondToInvitation,
      updateProfile, leaveWorkspace, deleteWorkspace,
      logoUrl, logoHeight, logoText, fetchLogo, updateLogo, updateLogoHeight, updateLogoText
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
