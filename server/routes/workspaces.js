import express from 'express';
import crypto from 'crypto';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Generate a random 6-character invite code
const generateInviteCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g., 'A1B2C3'
};

// Get all workspaces for the current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [workspaces] = await pool.execute(`
      SELECT w.id, w.name, w.inviteCode, wm.role 
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspaceId
      WHERE wm.userId = ?
    `, [userId]);

    res.json(workspaces);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ message: 'Failed to fetch workspaces' });
  }
});

// Create a new workspace
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Workspace name is required' });
    }

    const workspaceId = crypto.randomUUID();
    const inviteCode = generateInviteCode();

    // Start a transaction since we need to insert into two tables
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Create workspace
      await connection.execute(`
        INSERT INTO workspaces (id, name, inviteCode, ownerId) 
        VALUES (?, ?, ?, ?)
      `, [workspaceId, name, inviteCode, userId]);

      // 2. Add creator as admin in workspace_members
      await connection.execute(`
        INSERT INTO workspace_members (workspaceId, userId, role) 
        VALUES (?, ?, 'admin')
      `, [workspaceId, userId]);

      await connection.commit();
      
      res.status(201).json({
        id: workspaceId,
        name,
        inviteCode,
        role: 'admin'
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ message: 'Failed to create workspace' });
  }
});

// Join a workspace via invite code
router.post('/join', requireAuth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.userId;

    if (!inviteCode) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    // Find workspace by invite code
    const [workspaces] = await pool.execute('SELECT * FROM workspaces WHERE inviteCode = ?', [inviteCode]);
    
    if (workspaces.length === 0) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    const workspace = workspaces[0];

    // Check if user is already a member
    const [members] = await pool.execute(
      'SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspace.id, userId]
    );

    if (members.length > 0) {
      return res.status(400).json({ message: 'You are already a member of this workspace' });
    }

    // Add user as member
    await pool.execute(`
      INSERT INTO workspace_members (workspaceId, userId, role) 
      VALUES (?, ?, 'member')
    `, [workspace.id, userId]);

    res.status(200).json({
      id: workspace.id,
      name: workspace.name,
      inviteCode: workspace.inviteCode,
      role: 'member'
    });
  } catch (error) {
    console.error('Error joining workspace:', error);
    res.status(500).json({ message: 'Failed to join workspace' });
  }
});

// Get members of a workspace
router.get('/:id/members', requireAuth, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const userId = req.user.userId;

    // First check if current user is a member
    const [membersCheck] = await pool.execute(
      'SELECT role FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspaceId, userId]
    );

    if (membersCheck.length === 0) {
      return res.status(403).json({ message: 'Not authorized to view members' });
    }

    // Fetch all members with user details
    const [members] = await pool.execute(`
      SELECT u.id as userId, u.displayName, u.photoURL, u.email, wm.role 
      FROM workspace_members wm
      JOIN users u ON wm.userId = u.id
      WHERE wm.workspaceId = ?
    `, [workspaceId]);

    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ message: 'Failed to fetch members' });
  }
});

// Delete a workspace (Admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const userId = req.user.userId;

    // Check if user is admin
    const [membersCheck] = await pool.execute(
      'SELECT role FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspaceId, userId]
    );

    if (membersCheck.length === 0 || membersCheck[0].role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete the workspace' });
    }

    // Delete workspace (CASCADE will handle members and invitations)
    await pool.execute('DELETE FROM workspaces WHERE id = ?', [workspaceId]);

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    res.status(500).json({ message: 'Failed to delete workspace' });
  }
});

// Remove a member or Leave workspace
router.delete('/:id/members/:targetUserId', requireAuth, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const targetUserId = req.params.targetUserId;
    const currentUserId = req.user.userId;

    // A user can remove themselves (leave), or an admin can remove anyone
    if (targetUserId !== currentUserId) {
      const [adminCheck] = await pool.execute(
        'SELECT role FROM workspace_members WHERE workspaceId = ? AND userId = ?',
        [workspaceId, currentUserId]
      );
      if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can kick other members' });
      }
    }

    // Prevent owner from leaving without deleting workspace (or passing ownership, but we don't have that yet)
    // Actually, we can check if the target user is the LAST admin or the owner.
    const [targetCheck] = await pool.execute(
      'SELECT role FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspaceId, targetUserId]
    );
    
    if (targetCheck.length > 0 && targetCheck[0].role === 'admin' && targetUserId === currentUserId) {
       return res.status(400).json({ message: 'As the owner, you must delete the workspace instead of leaving.' });
    }

    await pool.execute(
      'DELETE FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspaceId, targetUserId]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Failed to remove member' });
  }
});

// --- INVITATIONS SYSTEM ---

// Get all pending invitations for current user
router.get('/invitations', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email; // Wait, auth token only has userId and role.
    // I need to fetch the email first.
    const [users] = await pool.execute('SELECT email FROM users WHERE id = ?', [req.user.userId]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    const email = users[0].email;

    const [invitations] = await pool.execute(`
      SELECT i.id, i.workspaceId, i.inviterId, i.inviteeEmail, i.status, i.createdAt, 
             w.name as workspaceName, u.displayName as inviterName
      FROM workspace_invitations i
      JOIN workspaces w ON i.workspaceId = w.id
      JOIN users u ON i.inviterId = u.id
      WHERE i.inviteeEmail = ? AND i.status = 'pending'
    `, [email]);

    res.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ message: 'Failed to fetch invitations' });
  }
});

// Invite a user by email
router.post('/:id/invite', requireAuth, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { email } = req.body;
    const inviterId = req.user.userId;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user is admin of workspace
    const [members] = await pool.execute(
      'SELECT role FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspaceId, inviterId]
    );

    if (members.length === 0 || members[0].role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can send invites' });
    }

    // Insert invitation
    const invitationId = crypto.randomUUID();
    await pool.execute(`
      INSERT INTO workspace_invitations (id, workspaceId, inviterId, inviteeEmail)
      VALUES (?, ?, ?, ?)
    `, [invitationId, workspaceId, inviterId, email]);

    res.status(201).json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ message: 'Failed to send invitation' });
  }
});

// Respond to an invitation
router.post('/invitations/:id/respond', requireAuth, async (req, res) => {
  try {
    const invitationId = req.params.id;
    const { status } = req.body; // 'accepted' or 'declined'
    const userId = req.user.userId;

    if (status !== 'accepted' && status !== 'declined') {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get invitation details
    const [invitations] = await pool.execute(
      'SELECT * FROM workspace_invitations WHERE id = ? AND status = "pending"',
      [invitationId]
    );

    if (invitations.length === 0) {
      return res.status(404).json({ message: 'Invitation not found or already processed' });
    }

    const invitation = invitations[0];

    // Verify the email matches the current user
    const [users] = await pool.execute('SELECT email FROM users WHERE id = ?', [userId]);
    if (users[0].email !== invitation.inviteeEmail) {
      return res.status(403).json({ message: 'Not authorized to respond to this invitation' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update invitation status
      await connection.execute(
        'UPDATE workspace_invitations SET status = ? WHERE id = ?',
        [status, invitationId]
      );

      // If accepted, add to workspace_members
      if (status === 'accepted') {
        // check if already member
        const [existing] = await connection.execute(
          'SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?',
          [invitation.workspaceId, userId]
        );
        
        if (existing.length === 0) {
          await connection.execute(`
            INSERT INTO workspace_members (workspaceId, userId, role)
            VALUES (?, ?, 'member')
          `, [invitation.workspaceId, userId]);
        }
      }

      await connection.commit();
      res.json({ message: `Invitation ${status}` });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ message: 'Failed to process invitation' });
  }
});

export default router;
