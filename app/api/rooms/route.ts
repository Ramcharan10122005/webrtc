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

    // Ensure rooms table exists (self-healing)
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
    const body: any = { error: 'Failed to create room' }
    if (process.env.NODE_ENV !== 'production') {
      body.details = error?.message
      body.code = error?.code
      body.detail = error?.detail
    }
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
      `SELECT id, code, event_id, is_active, created_at FROM rooms WHERE code = $1 LIMIT 1`,
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


