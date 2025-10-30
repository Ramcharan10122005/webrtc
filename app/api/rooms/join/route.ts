import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database'

export async function POST(request: NextRequest) {
  let client
  try {
    const { code, userId } = await request.json()
    if (!code || !userId) return NextResponse.json({ error: 'Missing code or userId' }, { status: 400 })

    client = await pool.connect()

    // Ensure tables exist (self-healing)
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
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(room_id, user_id)
      )
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

    await client.query(
      `INSERT INTO room_members (room_id, user_id, role)
       VALUES ($1, $2, 'participant')
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [room.id, userId]
    )

    client.release()
    return NextResponse.json({ success: true, room })
  } catch (error: any) {
    if (client) client.release()
    return NextResponse.json({ error: 'Failed to join room', details: error?.message }, { status: 500 })
  }
}


