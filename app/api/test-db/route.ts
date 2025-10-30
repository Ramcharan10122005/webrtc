import { NextResponse } from 'next/server'
import pool from '@/lib/database'

export async function GET() {
  let client;
  try {
    console.log('Testing database connection...')
    
    // Try to get a connection
    console.log('Connecting to pool...')
    client = await pool.connect()
    console.log('Connection established successfully')
    
    // Try a simple query
    console.log('Running test query...')
    const result = await client.query('SELECT NOW() as current_time, version() as version')
    console.log('Query successful:', result.rows[0])
    
    client.release()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      database: {
        time: result.rows[0].current_time,
        version: result.rows[0].version
      }
    })
  } catch (error: any) {
    console.error('Database test failed:', error)
    if (client) client.release()
    
    return NextResponse.json({ 
      success: false,
      error: 'Database connection failed',
      details: error?.message || 'Unknown error',
      code: error?.code || 'UNKNOWN',
      name: error?.name || 'Unknown',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}

