import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database'

export async function POST(request: NextRequest) {
  let client
  try {
    const { code, userId } = await request.json()
    const numericUserId = Number.isFinite(Number(userId)) ? Number(userId) : null
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

    client = await pool.connect()

    // Ensure prerequisite tables exist (self-healing)
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

    const roomRes = await client.query(
      `SELECT id, code, is_active FROM rooms WHERE code = $1 LIMIT 1`,
      [String(code).toUpperCase()]
    )
    if (roomRes.rows.length === 0) {
      client.release()
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    const room = roomRes.rows[0]
    if (!room.is_active) {
      client.release()
      return NextResponse.json({ error: 'Room is inactive' }, { status: 410 })
    }

    if (numericUserId) {
      // ensure user exists to satisfy FK
      const exists = await client.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [numericUserId])
      if (exists.rows.length > 0) {
        await client.query(
      `INSERT INTO room_members (room_id, user_id, role)
       VALUES ($1, $2, 'participant')
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [room.id, numericUserId]
    )
      }
    }

    client.release()
    return NextResponse.json({ success: true, room })
  } catch (error: any) {
    console.error('POST /api/rooms/join error:', { message: error?.message, code: error?.code, detail: error?.detail, stack: error?.stack })
    if (client) client.release()
    return NextResponse.json({ error: 'Failed to join room', details: error?.message, code: error?.code, detail: error?.detail }, { status: 500 })
  }
}


