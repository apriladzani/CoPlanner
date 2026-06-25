import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'uni_inside',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const initDb = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL Database');
    
    // Create users table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        displayName VARCHAR(255) NOT NULL,
        photoURL VARCHAR(255),
        role ENUM('admin', 'creator', 'editor', 'user') DEFAULT 'user',
        debtBalance DECIMAL(10, 2) DEFAULT 0,
        rotationIndex INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create workspaces table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        inviteCode VARCHAR(10) UNIQUE NOT NULL,
        ownerId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create workspace_members table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        workspaceId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        role ENUM('admin', 'member') DEFAULT 'member',
        joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (workspaceId, userId),
        FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create workspace_invitations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS workspace_invitations (
        id VARCHAR(36) PRIMARY KEY,
        workspaceId VARCHAR(36) NOT NULL,
        inviterId VARCHAR(36) NOT NULL,
        inviteeEmail VARCHAR(255) NOT NULL,
        status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (inviterId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create content_plans table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS content_plans (
        id VARCHAR(36) PRIMARY KEY,
        workspaceId VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'Video',
        status VARCHAR(50) DEFAULT 'Pending',
        assignedTo VARCHAR(36),
        backedUpBy VARCHAR(36),
        targetDate DATE,
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (backedUpBy) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create repository_files table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS repository_files (
        id VARCHAR(36) PRIMARY KEY,
        workspaceId VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        size VARCHAR(50),
        url LONGTEXT,
        uploadedBy VARCHAR(36),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Create content_debts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS content_debts (
        id VARCHAR(36) PRIMARY KEY,
        workspaceId VARCHAR(36) NOT NULL,
        planId VARCHAR(36) NOT NULL,
        owedBy VARCHAR(36) NOT NULL,
        owedTo VARCHAR(36) NOT NULL,
        status VARCHAR(20) DEFAULT 'unpaid',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (planId) REFERENCES content_plans(id) ON DELETE CASCADE,
        FOREIGN KEY (owedBy) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (owedTo) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create system_settings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        setting_value TEXT
      )
    `);

    // Insert default logo_url if not present
    const [logoRows] = await connection.execute(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['logo_url']
    );
    if (logoRows.length === 0) {
      await connection.execute(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)',
        ['logo_url', 'https://api-cdn.kroombox.com/api/bridge/view/5853f9a859dd15e8']
      );
    }
    
    console.log('Database tables initialized');
    connection.release();
  } catch (err) {
    console.error('MySQL connection error:', err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Hint: Pastikan Anda sudah memasukkan DB_PASS yang benar di file .env');
    }
  }
};

export { pool, initDb };
