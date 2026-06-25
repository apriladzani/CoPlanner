import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

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

// GET /api/repository/:workspaceId
router.get('/:workspaceId', requireAuth, requireWorkspaceMember, async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId;
    
    const [files] = await pool.execute(`
      SELECT rf.*, u.displayName as uploaderName 
      FROM repository_files rf
      LEFT JOIN users u ON rf.uploadedBy = u.id
      WHERE rf.workspaceId = ?
      ORDER BY rf.createdAt DESC
    `, [workspaceId]);
    
    res.json(files);
  } catch (error) {
    console.error('Error fetching repository files:', error);
    res.status(500).json({ message: 'Failed to fetch repository files' });
  }
});

// POST /api/repository/:workspaceId
router.post('/:workspaceId', requireAuth, requireWorkspaceMember, upload.single('file'), async (req, res) => {
  let tempFilePath = req.file ? req.file.path : null;
  try {
    const workspaceId = req.params.workspaceId;
    const { name, type } = req.body;
    const id = crypto.randomUUID();
    const uploadedBy = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Map asset type to Kroombox folder ID
    const resolvedType = type || 'image';
    let parentId = process.env.CDN_FOLDER_IMAGE;
    if (resolvedType === 'video') {
      parentId = process.env.CDN_FOLDER_VIDEO;
    } else if (resolvedType === 'script') {
      parentId = process.env.CDN_FOLDER_SCRIPT;
    }

    // Read the temporary file and prepare Form Data
    const fileBuffer = fs.readFileSync(req.file.path);
    const blob = new Blob([fileBuffer], { type: req.file.mimetype });
    const formData = new FormData();
    formData.append('file', blob, req.file.originalname);
    formData.append('projectName', 'dsnf3252');
    if (parentId) {
      formData.append('parentId', parentId);
    }

    // Upload to Kroombox CDN
    const cdnRes = await fetch(`${process.env.CDN_BASE_URL}/api/bridge/upload`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CDN_API_KEY
      },
      body: formData
    });

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
    const sizeStr = (req.file.size / 1024).toFixed(2) + ' KB';
    
    await pool.execute(
      `INSERT INTO repository_files (id, workspaceId, name, type, size, url, uploadedBy) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, workspaceId, name || req.file.originalname.split('.')[0], resolvedType, sizeStr, cdnUrl, uploadedBy]
    );
    
    res.status(201).json({ message: 'File record created', id });
  } catch (error) {
    console.error('Error creating file record:', error);
    res.status(500).json({ message: error.message || 'Failed to create file record' });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
});

// PUT /api/repository/:workspaceId/:fileId
router.put('/:workspaceId/:fileId', requireAuth, requireWorkspaceMember, upload.single('file'), async (req, res) => {
  let tempFilePath = req.file ? req.file.path : null;
  try {
    const { fileId, workspaceId } = req.params;
    const { name, type } = req.body;
    
    const updates = [];
    const values = [];
    
    if (name) { updates.push('name = ?'); values.push(name); }
    if (type) { updates.push('type = ?'); values.push(type); }
    
    if (req.file) {
      // 1. Fetch old URL and delete old asset from CDN
      const [oldFiles] = await pool.execute(
        'SELECT url, type FROM repository_files WHERE id = ? AND workspaceId = ?',
        [fileId, workspaceId]
      );
      if (oldFiles.length > 0) {
        const oldUrl = oldFiles[0].url;
        const match = oldUrl.match(/\/view\/([a-zA-Z0-9]+)/);
        if (match) {
          const oldCdnId = match[1];
          try {
            await fetch(`${process.env.CDN_BASE_URL}/api/bridge/files/${oldCdnId}`, {
              method: 'DELETE',
              headers: {
                'x-api-key': process.env.CDN_API_KEY
              }
            });
          } catch (err) {
            console.error('Failed to delete old CDN asset:', err);
          }
        }
      }
      
      // 2. Upload new file to CDN
      const resolvedType = type || (oldFiles.length > 0 ? oldFiles[0].type : 'image');
      let parentId = process.env.CDN_FOLDER_IMAGE;
      if (resolvedType === 'video') {
        parentId = process.env.CDN_FOLDER_VIDEO;
      } else if (resolvedType === 'script') {
        parentId = process.env.CDN_FOLDER_SCRIPT;
      }
      
      const fileBuffer = fs.readFileSync(req.file.path);
      const blob = new Blob([fileBuffer], { type: req.file.mimetype });
      const formData = new FormData();
      formData.append('file', blob, req.file.originalname);
      formData.append('projectName', 'dsnf3252');
      if (parentId) {
        formData.append('parentId', parentId);
      }
      
      const cdnRes = await fetch(`${process.env.CDN_BASE_URL}/api/bridge/upload`, {
        method: 'POST',
        headers: {
          'x-api-key': process.env.CDN_API_KEY
        },
        body: formData
      });
      
      if (!cdnRes.ok) {
        const errText = await cdnRes.text();
        throw new Error(`CDN Upload failed: ${errText}`);
      }
      
      const cdnData = await cdnRes.json();
      if (!cdnData.success || !cdnData.fileId) {
        throw new Error(`CDN Response was not successful: ${JSON.stringify(cdnData)}`);
      }
      
      const newUrl = `${process.env.CDN_BASE_URL}/api/bridge/view/${cdnData.fileId}`;
      const newSize = (req.file.size / 1024).toFixed(2) + ' KB';
      
      updates.push('url = ?'); values.push(newUrl);
      updates.push('size = ?'); values.push(newSize);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    values.push(fileId, workspaceId);
    
    await pool.execute(
      `UPDATE repository_files SET ${updates.join(', ')} WHERE id = ? AND workspaceId = ?`,
      values
    );
    
    res.json({ message: 'File record updated' });
  } catch (error) {
    console.error('Error updating file record:', error);
    res.status(500).json({ message: 'Failed to update file record' });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
});

// DELETE /api/repository/:workspaceId/:fileId
router.delete('/:workspaceId/:fileId', requireAuth, requireWorkspaceMember, async (req, res) => {
  try {
    const { fileId, workspaceId } = req.params;

    // 1. Fetch old URL and delete asset from Kroombox CDN
    const [files] = await pool.execute(
      'SELECT url FROM repository_files WHERE id = ? AND workspaceId = ?',
      [fileId, workspaceId]
    );

    if (files.length > 0) {
      const url = files[0].url;
      const match = url.match(/\/view\/([a-zA-Z0-9]+)/);
      if (match) {
        const cdnFileId = match[1];
        try {
          await fetch(`${process.env.CDN_BASE_URL}/api/bridge/files/${cdnFileId}`, {
            method: 'DELETE',
            headers: {
              'x-api-key': process.env.CDN_API_KEY
            }
          });
        } catch (cdnErr) {
          console.error(`Failed to delete asset ${cdnFileId} from Kroombox CDN:`, cdnErr);
        }
      }
    }
    
    // 2. Delete database record
    await pool.execute(
      'DELETE FROM repository_files WHERE id = ? AND workspaceId = ?',
      [fileId, workspaceId]
    );
    
    res.json({ message: 'File record deleted' });
  } catch (error) {
    console.error('Error deleting file record:', error);
    res.status(500).json({ message: 'Failed to delete file record' });
  }
});

export default router;
