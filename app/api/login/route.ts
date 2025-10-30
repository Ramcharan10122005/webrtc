import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database'

export async function POST(request: NextRequest) {
  let client
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    client = await pool.connect()

    const userResult = await client.query(
      `SELECT id, username, email, role, status, password_hash
       FROM users
       WHERE username = $1
       LIMIT 1`,
      [username]
    )

    if (userResult.rows.length === 0) {
      client.release()
      return NextResponse.json({ error: 'User does not exist' }, { status: 404 })
    }

    const user = userResult.rows[0]

    if (user.password_hash !== password) {
      client.release()
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    if (user.role === 'admin') {
      client.release()
      return NextResponse.json({ error: 'Admins cannot login here' }, { status: 403 })
    }

    if (user.status !== 'active') {
      client.release()
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 })
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id])

    client.release()

    return NextResponse.json({
      id: String(user.id),
      name: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    })
  } catch (error: any) {
    if (client) client.release()
    return NextResponse.json({ error: 'Login failed', details: error?.message || 'Unknown error' }, { status: 500 })
  }
}


