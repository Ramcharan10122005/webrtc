import { Pool } from 'pg'

// Connection configuration
const connectionConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_rKob0cfTudn2@ep-summer-butterfly-a4n7vdij-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
}

console.log('Database connection configured. Using:', process.env.DATABASE_URL ? 'Environment variable' : 'Fallback connection')

const pool = new Pool(connectionConfig)

export default pool

// Initialize database tables
export async function initializeDatabase() {
  let client;
  try {
    console.log('Connecting to database pool...')
    client = await pool.connect()
    console.log('Database connection established')
    
    // Create users table
    console.log('Creating users table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `)
    console.log('Users table created or already exists')
    
    // Create admin user if it doesn't exist
    console.log('Checking for admin user...')
    const adminExists = await client.query('SELECT id FROM users WHERE username = $1', ['admin'])
    if (adminExists.rows.length === 0) {
      console.log('Admin user not found, creating...')
      // Simple password hash for demo (in production, use bcrypt)
      const adminPasswordHash = '12345' // This should be properly hashed
      await client.query(
        'INSERT INTO users (username, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5)',
        ['admin', 'admin@sportsplatform.com', adminPasswordHash, 'admin', 'active']
      )
      console.log('Admin user created successfully')
    } else {
      console.log('Admin user already exists')
    }
    
    client.release()
    console.log('Database initialized successfully')
    return { success: true, message: 'Database initialized' }
  } catch (error: any) {
    console.error('Database initialization error:', error)
    if (client) client.release()
    throw error
  }
}
