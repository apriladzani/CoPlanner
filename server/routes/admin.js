import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = express.Router();

// Middleware to ensure user is a system admin
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const [users] = await pool.execute('SELECT role FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0 || users[0].role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/stats
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [[{ totalUsers }]] = await pool.execute('SELECT COUNT(*) as totalUsers FROM users');
    const [[{ totalWorkspaces }]] = await pool.execute('SELECT COUNT(*) as totalWorkspaces FROM workspaces');
    
    res.json({
      totalUsers,
      totalWorkspaces
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch admin stats' });
  }
});

// GET /api/admin/workspaces
router.get('/workspaces', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [workspaces] = await pool.execute(`
      SELECT w.id, w.name, w.description, w.ownerId, w.inviteCode, w.createdAt, u.displayName as ownerName, u.email as ownerEmail
      FROM workspaces w
      LEFT JOIN users u ON w.ownerId = u.id
      ORDER BY w.createdAt DESC
    `);
    
    res.json(workspaces);
  } catch (error) {
    console.error('Error fetching admin workspaces:', error);
    res.status(500).json({ message: 'Failed to fetch workspaces' });
  }
});

// GET /api/admin/users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT id, email, displayName, photoURL, role, createdAt
      FROM users
      ORDER BY createdAt DESC
    `);
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { displayName, email, role } = req.body;
    
    // Check if email already exists for another user
    if (email) {
      const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Email already in use by another user' });
      }
    }

    await pool.execute(
      'UPDATE users SET displayName = ?, email = ?, role = ? WHERE id = ?',
      [displayName, email, role, req.params.id]
    );
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }
    
    // First, delete their workspaces (if ON DELETE CASCADE is not set)
    await pool.execute('DELETE FROM workspaces WHERE ownerId = ?', [req.params.id]);
    
    // Then delete the user
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// PUT /api/admin/workspaces/:id
router.put('/workspaces/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, ownerId } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Workspace name is required' });
    }
    if (!ownerId) {
      return res.status(400).json({ message: 'Workspace owner is required' });
    }
    
    // Update workspace details
    await pool.execute(
      'UPDATE workspaces SET name = ?, description = ?, ownerId = ? WHERE id = ?',
      [name, description || null, ownerId, req.params.id]
    );

    // Ensure the new owner is actually a member and an admin of the workspace
    if (ownerId) {
      const [memberCheck] = await pool.execute(
        'SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?',
        [req.params.id, ownerId]
      );
      
      if (memberCheck.length === 0) {
        // Add them as admin if they aren't even a member
        await pool.execute(
          'INSERT INTO workspace_members (workspaceId, userId, role) VALUES (?, ?, ?)',
          [req.params.id, ownerId, 'admin']
        );
      } else if (memberCheck[0].role !== 'admin') {
        // Upgrade them to admin if they are just a member
        await pool.execute(
          'UPDATE workspace_members SET role = ? WHERE workspaceId = ? AND userId = ?',
          ['admin', req.params.id, ownerId]
        );
      }
    }

    res.json({ message: 'Workspace updated successfully' });
  } catch (error) {
    console.error('Error updating workspace:', error);
    res.status(500).json({ message: 'Failed to update workspace' });
  }
});

// DELETE /api/admin/workspaces/:id
router.delete('/workspaces/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Delete workspace
    await pool.execute('DELETE FROM workspaces WHERE id = ?', [req.params.id]);
    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    res.status(500).json({ message: 'Failed to delete workspace' });
  }
});

// POST /api/admin/logo
router.post('/logo', requireAuth, requireAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const blob = new Blob([fileBuffer], { type: req.file.mimetype });
    const formData = new FormData();
    formData.append('file', blob, req.file.originalname);
    formData.append('projectName', 'dsnf3252');
    if (process.env.CDN_FOLDER_IMAGE) {
      formData.append('parentId', process.env.CDN_FOLDER_IMAGE);
    }

    const cdnRes = await fetch(`${process.env.CDN_BASE_URL}/api/bridge/upload`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CDN_API_KEY
      },
      body: formData
    });

    // Delete temp file
    fs.unlinkSync(req.file.path);

    if (!cdnRes.ok) {
      const errText = await cdnRes.text();
      throw new Error(`CDN Upload failed: ${errText}`);
    }

    const cdnData = await cdnRes.json();
    if (!cdnData.success || !cdnData.fileId) {
      throw new Error(`CDN response was not successful: ${JSON.stringify(cdnData)}`);
    }

    const fileId = cdnData.fileId;
    const cdnUrl = `${process.env.CDN_BASE_URL}/api/bridge/view/${fileId}`;

    // Update settings table
    await pool.execute(
      'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      ['logo_url', cdnUrl, cdnUrl]
    );

    res.json({ logoUrl: cdnUrl });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    console.error('Error uploading logo to CDN:', error);
    res.status(500).json({ message: error.message || 'Failed to upload logo' });
  }
});

// POST /api/admin/logo-height
router.post('/logo-height', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { height } = req.body;
    if (height === undefined || isNaN(height)) {
      return res.status(400).json({ message: 'Invalid height value' });
    }
    const heightStr = height.toString();
    await pool.execute(
      'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      ['logo_height', heightStr, heightStr]
    );
    res.json({ logoHeight: parseInt(heightStr, 10) });
  } catch (error) {
    console.error('Error updating logo height:', error);
    res.status(500).json({ message: 'Failed to update logo height' });
  }
});

// POST /api/admin/logo-text
router.post('/logo-text', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (text === undefined) {
      return res.status(400).json({ message: 'Text is required' });
    }
    await pool.execute(
      'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      ['logo_text', text, text]
    );
    res.json({ logoText: text });
  } catch (error) {
    console.error('Error updating logo text:', error);
    res.status(500).json({ message: 'Failed to update logo text' });
  }
});

export default router;
