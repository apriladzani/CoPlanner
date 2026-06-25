import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'uni_inside',
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
});

async function main() {
  const connection = await pool.getConnection();
  try {
    console.log('Seeding settings table...');
    // Create system_settings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        setting_value TEXT
      )
    `);

    // Check if logo_url exists
    const [rows] = await connection.execute(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['logo_url']
    );

    if (rows.length === 0) {
      console.log('logo_url setting not found. Attempting to upload default logo...');
      const logoPath = '/Users/apriladzani/.gemini/antigravity-ide/brain/6e8cef18-85f6-44e5-be3c-4a71895d38d9/media__1780852770290.png';
      
      if (fs.existsSync(logoPath)) {
        console.log(`Found logo at: ${logoPath}. Uploading to Kroombox...`);
        const fileBuffer = fs.readFileSync(logoPath);
        const blob = new Blob([fileBuffer], { type: 'image/png' });
        
        const formData = new FormData();
        formData.append('file', blob, 'logo.png');
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
        console.log(`Uploaded logo to CDN. URL: ${cdnUrl}`);

        await connection.execute(
          'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)',
          ['logo_url', cdnUrl]
        );
        console.log('Saved logo_url to system_settings');
      } else {
        console.log(`Logo file not found at ${logoPath}. Using a fallback default placeholder.`);
        const fallbackUrl = 'https://api.dicebear.com/7.x/identicon/svg?seed=UniLLMedia';
        await connection.execute(
          'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)',
          ['logo_url', fallbackUrl]
        );
        console.log('Saved fallback logo_url to system_settings');
      }
    } else {
      console.log('logo_url already configured:', rows[0].setting_value);
    }
  } catch (error) {
    console.error('Error seeding settings:', error);
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
