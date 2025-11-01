import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  let client
  try {
    const code = params.code?.toUpperCase()
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

    client = await pool.connect()

    // Get room members with user info
    const res = await client.query(
      `SELECT rm.id, rm.user_id, rm.role, rm.muted, rm.joined_at,
              u.username, u.email
       FROM room_members rm
       LEFT JOIN users u ON u.id = rm.user_id
       INNER JOIN rooms r ON r.id = rm.room_id
       WHERE r.code = $1
       ORDER BY rm.joined_at ASC`,
      [code]
    )

    client.release()

    const members = res.rows.map(row => ({
      id: row.user_id,
      username: row.username || 'Unknown',
      email: row.email || null,
      role: row.role,
      muted: row.muted || false,
      joinedAt: row.joined_at,
    }))

    return NextResponse.json({ members })
  } catch (error: any) {
    if (client) client.release()
    console.error('GET /api/rooms/[code]/members error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room members', details: error?.message },
      { status: 500 }
    )
  }
}

