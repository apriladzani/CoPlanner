import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user belongs to the workspace
const requireWorkspaceMember = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.user.userId;
    
    // Admins bypass this check
    const [user] = await pool.execute('SELECT role FROM users WHERE id = ?', [userId]);
    if (user.length > 0 && user[0].role === 'admin') {
      return next();
    }
    
    const [memberCheck] = await pool.execute(
      'SELECT role FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspaceId, userId]
    );
    
    if (memberCheck.length === 0) {
      return res.status(403).json({ message: 'Forbidden: Not a member of this workspace' });
    }
    
    next();
  } catch (error) {
    console.error('Workspace verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/debt/:workspaceId
router.get('/:workspaceId', requireAuth, requireWorkspaceMember, async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId;
    
    // Get all debts
    const [debts] = await pool.execute(`
      SELECT cd.id, cd.planId, cp.title as planTitle, cd.createdAt, cd.status,
             u1.id as owedById, u1.displayName as owedByName, u1.photoURL as owedByPhoto,
             u2.id as owedToId, u2.displayName as owedToName, u2.photoURL as owedToPhoto
      FROM content_debts cd
      JOIN users u1 ON cd.owedBy = u1.id
      JOIN users u2 ON cd.owedTo = u2.id
      JOIN content_plans cp ON cd.planId = cp.id
      WHERE cd.workspaceId = ?
      ORDER BY cd.createdAt DESC
    `, [workspaceId]);
    
    // Group them or just return the flat list, frontend can aggregate
    res.json(debts);
  } catch (error) {
    console.error('Error fetching debt tracker data:', error);
    res.status(500).json({ message: 'Failed to fetch debt tracker data' });
  }
});

// POST /api/debt/:workspaceId/:debtId/resolve
router.post('/:workspaceId/:debtId/resolve', requireAuth, requireWorkspaceMember, async (req, res) => {
  try {
    const { debtId, workspaceId } = req.params;
    const { status } = req.body;
    const targetStatus = status === 'unpaid' ? 'unpaid' : 'paid';
    
    await pool.execute(
      "UPDATE content_debts SET status = ? WHERE id = ? AND workspaceId = ?",
      [targetStatus, debtId, workspaceId]
    );
    
    res.json({ message: `Debt status updated to ${targetStatus}` });
  } catch (error) {
    console.error('Error resolving debt:', error);
    res.status(500).json({ message: 'Failed to resolve debt' });
  }
});

export default router;
