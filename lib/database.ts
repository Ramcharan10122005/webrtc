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
    
    // Create rooms table
    console.log('Creating rooms table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        code VARCHAR(8) UNIQUE NOT NULL,
        event_id VARCHAR(100),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Rooms table created or already exists')

    // Create room_members table
    console.log('Creating room_members table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_members (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('admin', 'participant')),
        muted BOOLEAN DEFAULT FALSE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(room_id, user_id)
      )
    `)
    // Add muted column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'room_members' AND column_name = 'muted') THEN
          ALTER TABLE room_members ADD COLUMN muted BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `)
    console.log('room_members table created or already exists')

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
