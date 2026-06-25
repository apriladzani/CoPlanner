import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';

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

// GET /api/planner/:workspaceId
router.get('/:workspaceId', requireAuth, requireWorkspaceMember, async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId;
    
    const [plans] = await pool.execute(`
      SELECT cp.id, cp.workspaceId, cp.title, cp.type, cp.status, cp.assignedTo, cp.backedUpBy,
             DATE_FORMAT(cp.targetDate, '%Y-%m-%d') as targetDate,
             cp.description, cp.createdAt,
             u.displayName as assignedName, u2.displayName as backedUpByName 
      FROM content_plans cp
      LEFT JOIN users u ON cp.assignedTo = u.id
      LEFT JOIN users u2 ON cp.backedUpBy = u2.id
      WHERE cp.workspaceId = ?
      ORDER BY cp.targetDate ASC
    `, [workspaceId]);
    
    res.json(plans);
  } catch (error) {
    console.error('Error fetching content plans:', error);
    res.status(500).json({ message: 'Failed to fetch content plans' });
  }
});

// POST /api/planner/:workspaceId
router.post('/:workspaceId', requireAuth, requireWorkspaceMember, async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { title, type, status, assignedTo, targetDate, description } = req.body;
    const id = crypto.randomUUID();
    
    await pool.execute(
      `INSERT INTO content_plans (id, workspaceId, title, type, status, assignedTo, targetDate, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, workspaceId, title, type || 'Video', status || 'Pending', assignedTo || null, targetDate || null, description || '']
    );
    
    res.status(201).json({ message: 'Content plan created', id });
  } catch (error) {
    console.error('Error creating content plan:', error);
    res.status(500).json({ message: 'Failed to create content plan' });
  }
});

// PUT /api/planner/:workspaceId/:planId
router.put('/:workspaceId/:planId', requireAuth, requireWorkspaceMember, async (req, res) => {
  try {
    const { planId, workspaceId } = req.params;
    const { status, title, type, assignedTo, targetDate, description } = req.body;
    
    // Allow partial updates depending on what was sent
    const updates = [];
    const values = [];
    
    if (status) { updates.push('status = ?'); values.push(status); }
    if (title) { updates.push('title = ?'); values.push(title); }
    if (type) { updates.push('type = ?'); values.push(type); }
    if (assignedTo !== undefined) { updates.push('assignedTo = ?'); values.push(assignedTo || null); }
    if (targetDate) { updates.push('targetDate = ?'); values.push(targetDate); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    values.push(planId, workspaceId);
    
    await pool.execute(
      `UPDATE content_plans SET ${updates.join(', ')} WHERE id = ? AND workspaceId = ?`,
      values
    );
    
    res.json({ message: 'Content plan updated' });
  } catch (error) {
    console.error('Error updating content plan:', error);
    res.status(500).json({ message: 'Failed to update content plan' });
  }
});

// POST /api/planner/:workspaceId/:planId/backup
router.post('/:workspaceId/:planId/backup', requireAuth, requireWorkspaceMember, async (req, res) => {
  try {
    const { planId, workspaceId } = req.params;
    const userId = req.user.userId;
    
    // Get plan details to ensure it exists and hasn't been backed up
    const [plans] = await pool.execute(
      'SELECT assignedTo, backedUpBy, status FROM content_plans WHERE id = ? AND workspaceId = ?',
      [planId, workspaceId]
    );
    
    if (plans.length === 0) {
      return res.status(404).json({ message: 'Content plan not found' });
    }
    
    const plan = plans[0];
    if (plan.backedUpBy) {
      return res.status(400).json({ message: 'Content plan already backed up' });
    }
    if (plan.assignedTo === userId) {
      return res.status(400).json({ message: 'Cannot backup your own content plan' });
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Update plan
      await connection.execute(
        'UPDATE content_plans SET status = ?, backedUpBy = ? WHERE id = ?',
        ['Uploaded', userId, planId]
      );
      
      // Update debts
      if (plan.assignedTo) {
        // Check if there is an existing unpaid debt where current user (userId) owes plan.assignedTo
        const [existingDebts] = await connection.execute(
          "SELECT id FROM content_debts WHERE workspaceId = ? AND owedBy = ? AND owedTo = ? AND status = 'unpaid' ORDER BY createdAt ASC LIMIT 1",
          [workspaceId, userId, plan.assignedTo]
        );

        if (existingDebts.length > 0) {
          // Resolve the existing debt (so userId no longer owes plan.assignedTo)
          await connection.execute(
            "UPDATE content_debts SET status = 'paid' WHERE id = ?",
            [existingDebts[0].id]
          );
        } else {
          // Otherwise, insert a new debt where plan.assignedTo owes userId
          const debtId = crypto.randomUUID();
          await connection.execute(
            'INSERT INTO content_debts (id, workspaceId, planId, owedBy, owedTo) VALUES (?, ?, ?, ?, ?)',
            [debtId, workspaceId, planId, plan.assignedTo, userId]
          );
        }
      }
      
      await connection.commit();
      res.json({ message: 'Content backed up successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error backing up content plan:', error);
    res.status(500).json({ message: 'Failed to backup content plan' });
  }
});

// DELETE /api/planner/:workspaceId/:planId
router.delete('/:workspaceId/:planId', requireAuth, requireWorkspaceMember, async (req, res) => {
  try {
    const { planId, workspaceId } = req.params;
    
    await pool.execute(
      'DELETE FROM content_plans WHERE id = ? AND workspaceId = ?',
      [planId, workspaceId]
    );
    
    res.json({ message: 'Content plan deleted' });
  } catch (error) {
    console.error('Error deleting content plan:', error);
    res.status(500).json({ message: 'Failed to delete content plan' });
  }
});

export default router;
