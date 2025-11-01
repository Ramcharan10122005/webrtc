import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I,O,1,0
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function POST(request: NextRequest) {
  let client
  try {
    const { userId, eventId } = await request.json()
    let createdBy = Number.isFinite(Number(userId)) ? Number(userId) : null

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

    // generate unique code
    let code = generateRoomCode()
    for (let attempts = 0; attempts < 5; attempts++) {
      const exists = await client.query('SELECT id FROM rooms WHERE code = $1', [code])
      if (exists.rows.length === 0) break
      code = generateRoomCode()
    }

    // validate creator exists to satisfy FK
    if (createdBy) {
      const exists = await client.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [createdBy])
      if (exists.rows.length === 0) {
        createdBy = null
      }
    }

    const result = await client.query(
      `INSERT INTO rooms (code, created_by, event_id, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, code, event_id, created_at` ,
      [code, createdBy, eventId || null]
    )

    const room = result.rows[0]

    // Add creator as admin member if provided
    if (createdBy) {
      await client.query(
        `INSERT INTO room_members (room_id, user_id, role)
         VALUES ($1, $2, 'admin')
         ON CONFLICT (room_id, user_id) DO NOTHING`,
        [room.id, createdBy]
      )
    }

    client.release()
    return NextResponse.json(room, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/rooms error:', { message: error?.message, code: error?.code, detail: error?.detail, stack: error?.stack })
    if (client) client.release()
    const body: any = { error: 'Failed to create room', details: error?.message, code: error?.code, detail: error?.detail }
    return NextResponse.json(body, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  let client
  try {
    const { searchParams } = new URL(request.url)
    const code = (searchParams.get('code') || '').toUpperCase()
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

    client = await pool.connect()
    const res = await client.query(
      `SELECT r.id, r.code, r.event_id, r.is_active, r.created_at, r.created_by,
              u.username AS created_by_username
       FROM rooms r
       LEFT JOIN users u ON u.id = r.created_by
       WHERE r.code = $1
       LIMIT 1`,
      [code]
    )
    client.release()

    if (res.rows.length === 0) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    if (!res.rows[0].is_active) return NextResponse.json({ error: 'Room is inactive' }, { status: 410 })

    return NextResponse.json(res.rows[0])
  } catch (error: any) {
    if (client) client.release()
    return NextResponse.json({ error: 'Failed to fetch room', details: error?.message }, { status: 500 })
  }
}


