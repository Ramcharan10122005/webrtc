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

    const result = await client.query(
      `INSERT INTO rooms (code, created_by, event_id, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, code, event_id, created_at` ,
      [code, userId || null, eventId || null]
    )

    client.release()
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (client) client.release()
    return NextResponse.json({ error: 'Failed to create room', details: error?.message }, { status: 500 })
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


