import { Pool } from 'pg'

// Connection configuration
const connectionConfig = {
  connectionString: process.env.DATABASE_URL ,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false
  } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
}

console.log('Database connection string:', connectionConfig.connectionString ? 'Set' : 'Not set')

const pool = new Pool(connectionConfig)

export default pool

// Initialize database tables
export async function initializeDatabase() {
  try {
    const client = await pool.connect()
    
    // Create users table
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
    
    // Create admin user if it doesn't exist
    const adminExists = await client.query('SELECT id FROM users WHERE username = $1', ['admin'])
    if (adminExists.rows.length === 0) {
      // Simple password hash for demo (in production, use bcrypt)
      const adminPasswordHash = '12345' // This should be properly hashed
      await client.query(
        'INSERT INTO users (username, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5)',
        ['admin', 'admin@sportsplatform.com', adminPasswordHash, 'admin', 'active']
      )
    }
    
    client.release()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Database initialization error:', error)
  }
}
