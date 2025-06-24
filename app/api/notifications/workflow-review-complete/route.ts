import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { emailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      clientId,
      clientName,
      clientCode,
      workflowType,
      reviewedBy,
      nextStage,
      assignedUserId,
      action,
      comments
    } = body

    // Get assigned user details for email notification
    const assignedUser = await db.user.findUnique({
      where: { id: assignedUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    if (!assignedUser) {
      return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 })
    }

    // Create notification record in database
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'WORKFLOW_REVIEW_COMPLETED',
        details: JSON.stringify({
          clientId,
          clientName,
          clientCode,
          workflowType,
          reviewedBy,
          nextStage,
          assignedUserId,
          reviewedAt: new Date().toISOString()
        })
      }
    })



    // Send email using the new email service
    const emailResult = await emailService.sendWorkflowNotification({
      to: {
        email: assignedUser.email,
        name: assignedUser.name
      },
      clientName,
      clientCode,
      workflowType: workflowType.toUpperCase() as 'VAT' | 'ACCOUNTS',
      action,
      reviewedBy: reviewedBy as 'PARTNER' | 'MANAGER',
      nextStage,
      comments,
      reviewerName: session.user.name || session.user.email || 'Unknown',
      clientId
    })

    // Create email log entry with actual sending result
    const emailLog = await db.emailLog.create({
      data: {
        fromEmail: 'notifications@cloud9digital.in',
        fromName: 'Numericalz',
        recipientEmail: assignedUser.email,
        recipientName: assignedUser.name,
        subject: `${action === 'approve' ? '✅ Review Approved' : '🔄 Rework Requested'} - ${clientName} (${clientCode})`,
        content: '', // Content is generated in email service
        emailType: 'WORKFLOW_REVIEW_COMPLETE',
        status: emailResult.success ? 'SENT' : 'FAILED',
        sentAt: emailResult.success ? new Date() : null,
        failedAt: emailResult.success ? null : new Date(),
        failureReason: emailResult.success ? null : emailResult.error,
        clientId: clientId,
        workflowType: workflowType,
        triggeredBy: session.user.id
      }
    })

    if (emailResult.success) {
      console.log('📧 Email sent successfully:', {
        id: emailLog.id,
        to: assignedUser.email,
        messageId: emailResult.messageId
      })
    } else {
      console.error('📧 Email sending failed:', {
        id: emailLog.id,
        error: emailResult.error
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Review completion notification sent',
      data: {
        notifiedUser: {
          id: assignedUser.id,
          name: assignedUser.name,
          email: assignedUser.email
        },
        workflowType,
        nextStage: nextStage
      }
    })

  } catch (error) {
    console.error('Error sending workflow review notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
} 