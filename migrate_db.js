const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables (.env.local first, then .env)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runMigration() {
  console.log('🚀 Running database migrations for MenuSnap Accounts...');

  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || process.env.DB_PORT) || 3306,
    user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'menubldr',
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  try {
    const migrationFile = path.resolve(__dirname, 'src/lib/accounts/migration.sql');
    if (fs.existsSync(migrationFile)) {
      console.log(`📄 Executing migration script from: ${migrationFile}`);
      const sql = fs.readFileSync(migrationFile, 'utf8');
      await pool.query(sql);
      console.log('✅ Accounts tables & initial seeds created successfully!');
    } else {
      console.warn('⚠️ Migration SQL file not found at:', migrationFile);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
