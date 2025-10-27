import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database'

// Update user status or delete user
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { action, status } = await request.json()
    const userId = params.id
    
    const client = await pool.connect()
    
    if (action === 'toggleStatus') {
      const result = await client.query(
        'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, username, email, role, status, created_at, last_login',
        [status, userId]
      )
      
      if (result.rows.length === 0) {
        client.release()
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      client.release()
      return NextResponse.json(result.rows[0])
    }
    
    client.release()
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// Delete user
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id
    
    const client = await pool.connect()
    
    // Don't allow deleting the admin user
    const userCheck = await client.query('SELECT username FROM users WHERE id = $1', [userId])
    if (userCheck.rows.length === 0) {
      client.release()
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    if (userCheck.rows[0].username === 'admin') {
      client.release()
      return NextResponse.json({ error: 'Cannot delete admin user' }, { status: 403 })
    }
    
    await client.query('DELETE FROM users WHERE id = $1', [userId])
    client.release()
    
    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
