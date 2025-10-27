import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database'

// Get all users
export async function GET() {
  try {
    const client = await pool.connect()
    const result = await client.query(`
      SELECT id, username, email, role, status, created_at, last_login 
      FROM users 
      ORDER BY created_at DESC
    `)
    client.release()
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// Create a new user
export async function POST(request: NextRequest) {
  try {
    const { username, email, password, role } = await request.json()
    
    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const client = await pool.connect()
    
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
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
