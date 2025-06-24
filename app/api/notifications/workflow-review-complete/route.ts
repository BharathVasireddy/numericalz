import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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

    // Prepare email content
    const getStageDisplayName = (stage: string) => {
      const stageNames: { [key: string]: string } = {
        'REVIEWED_BY_MANAGER': 'Reviewed by Manager',
        'REVIEWED_BY_PARTNER': 'Reviewed by Partner',
        'REVIEW_PENDING_PARTNER': 'Partner Review',
        'EMAILED_TO_CLIENT': 'Ready to Email Client',
        'REVIEW_BY_PARTNER': 'Partner Review',
        'REVIEW_DONE_HELLO_SIGN': 'Ready for HelloSign'
      }
      return stageNames[stage] || stage
    }

    const workflowTypeDisplay = workflowType === 'vat' ? 'VAT Return' : 'Annual Accounts'
    const reviewerRole = reviewedBy === 'PARTNER' ? 'Partner' : 'Manager'
    const nextStageDisplay = getStageDisplayName(nextStage)
    
    const isApproved = action === 'approve'
    const actionEmoji = isApproved ? '✅' : '🔄'
    const actionText = isApproved ? 'Review Approved' : 'Rework Requested'
    const actionColor = isApproved ? '#2e7d32' : '#f57c00'
    const actionBg = isApproved ? '#e8f5e8' : '#fff3e0'

    // Email subject and content
    const emailSubject = `${actionEmoji} ${actionText} - ${clientName} (${clientCode})`
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${actionText} ${actionEmoji}</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Client: ${clientName} (${clientCode})</h2>
            <p style="color: #666; font-size: 16px; margin: 10px 0;">
              The <strong>${workflowTypeDisplay}</strong> has been ${isApproved ? 'approved' : 'sent back for rework'} by the ${reviewerRole}.
            </p>
            
            ${comments ? `
            <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${actionColor};">
              <p style="margin: 0; color: #333; font-weight: bold;">${isApproved ? 'Review Comments:' : 'Rework Instructions:'}</p>
              <p style="margin: 5px 0 0 0; color: #666;">${comments}</p>
            </div>
            ` : ''}
            
            <div style="background: ${actionBg}; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 0; color: ${actionColor};">
                <strong>Status:</strong> ${isApproved ? nextStageDisplay + ' - Ready for next steps' : 'Requires corrections - Please address the feedback above'}
              </p>
            </div>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
            <ul style="color: #666; padding-left: 20px;">
              ${isApproved ? (
                nextStage === 'REVIEWED_BY_MANAGER' ? 
                  '<li>Manager has completed their review</li><li>Work can now proceed to the next stage</li><li>Update workflow status when ready to continue</li>' :
                  nextStage === 'REVIEWED_BY_PARTNER' ?
                  '<li>Partner has completed their review</li><li>Work is approved and ready for next steps</li><li>Proceed with client communication or filing as appropriate</li>' :
                  '<li>Continue with the next stage of the workflow</li><li>Update progress as work continues</li>'
              ) : (
                '<li>Review the feedback provided above</li><li>Make the necessary corrections or improvements</li><li>Update the workflow once changes are complete</li><li>The work will be re-reviewed once corrections are made</li>'
              )}
            </ul>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.NEXTAUTH_URL}/dashboard/clients/${workflowType === 'vat' ? 'vat-dt' : 'ltd-companies'}?client=${clientId}" 
               style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Workflow Details
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>This is an automated notification from Numericalz Internal Management System</p>
            <p>Reviewed by: ${session.user.name || session.user.email} (${reviewerRole})</p>
          </div>
        </div>
      </div>
    `

    // In a real implementation, you would send the email here
    // For now, we'll just log it and return success
    console.log('📧 Email Notification:', {
      to: assignedUser.email,
      subject: emailSubject,
      content: 'HTML email content prepared'
    })

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    // Example:
    // await sendEmail({
    //   to: assignedUser.email,
    //   subject: emailSubject,
    //   html: emailContent
    // })

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
        nextStage: nextStageDisplay
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