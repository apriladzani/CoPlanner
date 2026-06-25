import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';

// Register User
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const userId = crypto.randomUUID();
    const photoURL = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;
    
    await pool.execute(`
      INSERT INTO users (id, email, password, displayName, photoURL) 
      VALUES (?, ?, ?, ?, ?)
    `, [userId, email, hashedPassword, displayName, photoURL]);

    // Create token
    const token = jwt.sign(
      { userId: userId, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        uid: userId,
        email,
        displayName,
        photoURL,
        role: 'user',
        debtBalance: 0,
        rotationIndex: 0,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        debtBalance: Number(user.debtBalance),
        rotationIndex: user.rotationIndex,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get Current User (Protected Route)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];

    res.json({
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: user.role,
      debtBalance: Number(user.debtBalance),
      rotationIndex: user.rotationIndex,
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update User Profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { displayName, photoURL } = req.body;
    const userId = req.user.userId;

    if (!displayName || displayName.trim() === '') {
      return res.status(400).json({ message: 'Display name is required' });
    }

    // Update user displayName and photoURL
    await pool.execute(
      'UPDATE users SET displayName = ?, photoURL = ? WHERE id = ?',
      [displayName, photoURL, userId]
    );

    // Fetch updated user details
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    res.json({
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: user.role,
      debtBalance: Number(user.debtBalance),
      rotationIndex: user.rotationIndex,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

// Configure multer storage for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed (jpeg, jpg, png, webp, gif)'));
  }
});

// GET /api/auth/logo
router.get('/logo', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['logo_url']
    );
    const logoUrl = rows.length > 0 ? rows[0].setting_value : 'https://api-cdn.kroombox.com/api/bridge/view/5853f9a859dd15e8';

    const [heightRows] = await pool.execute(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['logo_height']
    );
    const logoHeight = heightRows.length > 0 ? parseInt(heightRows[0].setting_value, 10) : 48;

    const [textRows] = await pool.execute(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['logo_text']
    );
    const logoText = textRows.length > 0 ? textRows[0].setting_value : 'Uni - LLMedia';

    res.json({ logoUrl, logoHeight, logoText });
  } catch (error) {
    console.error('Error fetching logo:', error);
    res.status(500).json({ message: 'Failed to fetch logo' });
  }
});

// POST /api/auth/upload
router.post('/upload', requireAuth, (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    try {
      // Upload profile photo to Kroombox CDN
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

      // Delete local temporary file
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
      
      res.json({ url: cdnUrl });
    } catch (uploadErr) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      console.error('Kroombox profile upload error:', uploadErr);
      res.status(500).json({ message: uploadErr.message || 'Failed to upload profile picture to CDN' });
    }
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'Email address not found' });
    }

    res.json({ success: true, message: 'Email verified' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'Email address not found' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

export default router;
