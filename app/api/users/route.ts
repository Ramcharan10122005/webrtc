import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database'

// Get all users
export async function GET() {
  let client;
  try {
    console.log('GET /api/users - Attempting database connection...')
    client = await pool.connect()
    console.log('Database connection successful')
    
    const result = await client.query(`
      SELECT id, username, email, role, status, created_at, last_login 
      FROM users 
      ORDER BY created_at DESC
    `)
    console.log('Query successful, returning', result.rows.length, 'users')
    client.release()
    
    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Error fetching users:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack
    })
    if (client) client.release()
    return NextResponse.json({ 
      error: 'Failed to fetch users',
      details: error?.message || 'Unknown error',
      code: error?.code || 'UNKNOWN',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}

// Create a new user
export async function POST(request: NextRequest) {
  let client;
  try {
    const { username, email, password, role } = await request.json()
    
    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    console.log('Attempting to connect to database...')
    client = await pool.connect()
    console.log('Database connection successful')
    
    // Check if username or email already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    )
    
    if (existingUser.rows.length > 0) {
      client.release()
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 })
    }
    
    // Insert new user (in production, hash the password with bcrypt)
    const result = await client.query(
      'INSERT INTO users (username, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, status, created_at',
      [username, email, password, role || 'user', 'active']
    )
    
    client.release()
    
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack
    })
    if (client) {
      client.release()
    }
    return NextResponse.json({ 
      error: 'Failed to create user',
      details: error?.message || 'Unknown error',
      code: error?.code || 'UNKNOWN',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}
