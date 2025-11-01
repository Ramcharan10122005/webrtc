import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string; userId: string } }
) {
  let client
  try {
    const code = params.code?.toUpperCase()
    const targetUserId = Number(params.userId)
    const { adminUserId, muted } = await request.json()

    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    if (!Number.isFinite(targetUserId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    if (typeof muted !== 'boolean') return NextResponse.json({ error: 'Missing muted status' }, { status: 400 })
    if (!adminUserId || !Number.isFinite(Number(adminUserId))) {
      return NextResponse.json({ error: 'Missing or invalid admin user ID' }, { status: 400 })
    }

    const adminUid = Number(adminUserId)

    client = await pool.connect()

    // Verify room exists
    const roomRes = await client.query(
      `SELECT id, created_by FROM rooms WHERE code = $1 LIMIT 1`,
      [code]
    )
    if (roomRes.rows.length === 0) {
      client.release()
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    const room = roomRes.rows[0]

    // Verify admin is the creator or has admin role in room_members
    const adminCheck = await client.query(
      `SELECT role FROM room_members 
       WHERE room_id = $1 AND user_id = $2 AND role = 'admin'`,
      [room.id, adminUid]
    )

    // Also check if admin is the room creator
    const isCreator = room.created_by === adminUid

    if (adminCheck.rows.length === 0 && !isCreator) {
      client.release()
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    // Verify target user is a member of the room
    const memberCheck = await client.query(
      `SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2`,
      [room.id, targetUserId]
    )
    if (memberCheck.rows.length === 0) {
      client.release()
      return NextResponse.json({ error: 'User is not a member of this room' }, { status: 404 })
    }

    // Update mute status
    await client.query(
      `UPDATE room_members SET muted = $1 
       WHERE room_id = $2 AND user_id = $3`,
      [muted, room.id, targetUserId]
    )

    // Get updated member info
    const memberRes = await client.query(
      `SELECT rm.user_id, rm.muted, u.username
       FROM room_members rm
       LEFT JOIN users u ON u.id = rm.user_id
       WHERE rm.room_id = $1 AND rm.user_id = $2`,
      [room.id, targetUserId]
    )

    client.release()

    return NextResponse.json({
      success: true,
      member: {
        userId: memberRes.rows[0].user_id,
        username: memberRes.rows[0].username,
        muted: memberRes.rows[0].muted,
      },
    })
  } catch (error: any) {
    if (client) client.release()
    console.error('POST /api/rooms/[code]/members/[userId]/mute error:', error)
    return NextResponse.json(
      { error: 'Failed to update mute status', details: error?.message },
      { status: 500 }
    )
  }
}

