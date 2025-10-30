import { NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/database'

export async function GET() {
  try {
    console.log('Initializing database...')
    const result = await initializeDatabase()
    console.log('Database initialized successfully:', result)
    return NextResponse.json({ message: 'Database initialized successfully', result })
  } catch (error: any) {
    console.error('Database initialization error:', error)
    return NextResponse.json({ 
      error: 'Failed to initialize database',
      details: error?.message,
      code: error?.code
    }, { status: 500 })
  }
}
