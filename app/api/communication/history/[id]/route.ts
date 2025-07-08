import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// DELETE /api/communication/history/[id] - Delete email log
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Partners and Managers can delete email logs
    if (!['PARTNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        message: 'Only Partners and Managers can delete email logs'
      }, { status: 403 })
    }

    const emailId = params.id

    // Check if email log exists
    const emailLog = await db.emailLog.findUnique({
      where: { id: emailId }
    })

    if (!emailLog) {
      return NextResponse.json({ 
        error: 'Email log not found',
        message: 'The email log you are trying to delete does not exist'
      }, { status: 404 })
    }

    // Delete the email log
    await db.emailLog.delete({
      where: { id: emailId }
    })

    console.log(`📧 Email log deleted: ${emailId} by ${session.user.name}`)

    return NextResponse.json({ 
      success: true,
      message: 'Email log deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting email log:', error)
    return NextResponse.json({
      error: 'Failed to delete email log',
      message: 'An unexpected error occurred while deleting the email log'
    }, { status: 500 })
  }
} 