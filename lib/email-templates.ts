/**
 * Enhanced Email Templates for Numericalz
 * Professional HTML email templates for assignment notifications
 */

interface VATAssignmentEmailData {
  assigneeName: string
  companyName: string
  companyNumber?: string
  vatNumber?: string
  clientCode: string
  quarterPeriod: string
  quarterStartDate: string
  quarterEndDate: string
  filingDueDate: string
  daysUntilDue: number
  currentStage: string
  assignedBy: string
  isOverdue: boolean
  previousAssignee?: string
}

interface LtdAssignmentEmailData {
  assigneeName: string
  companyName: string
  companyNumber?: string
  clientCode: string
  yearEndDate: string
  accountsDueDate: string
  corporationTaxDueDate: string
  daysUntilAccountsDue: number
  daysUntilCTDue: number
  currentStage: string
  assignedBy: string
  isAccountsOverdue: boolean
  isCTOverdue: boolean
  previousAssignee?: string
  filingPeriod: string
}

export class EmailTemplates {
  /**
   * Get the base email template with Numericalz branding
   */
  private static getBaseTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Numericalz Notification</title>
        <style>
          /* Numericalz Email Design System */
          
          /* Base Styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6; 
            color: #1a1a1a !important; 
            margin: 0; 
            padding: 0; 
            background-color: #f8f9fa;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          /* Email Container */
          .email-container { 
            max-width: 700px; 
            margin: 20px auto; 
            background: #ffffff !important; 
            border-radius: 8px; 
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            border: 1px solid #e5e7eb;
          }
          
          /* Header Styles */
          .header { 
            background: #ffffff;
            color: #1a1a1a !important; 
            padding: 32px 30px 24px; 
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 600;
            letter-spacing: -0.025em;
            color: #1a1a1a !important;
          }
          
          .header .subtitle { 
            margin: 6px 0 0 0; 
            color: #6b7280 !important; 
            font-size: 14px;
            font-weight: 400;
          }
          
          /* Content Styles */
          .content { 
            padding: 32px 30px; 
            background: #ffffff !important;
          }
          
          /* Card Components */
          .assignment-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 3px solid #3b82f6;
          }
          
          .company-info {
            background: #ffffff !important;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          
          .company-info h3 {
            margin: 0 0 16px 0;
            color: #1a1a1a !important;
            font-size: 18px;
            font-weight: 600;
          }
          
          /* Grid System */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
          }
          
          .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          
          .info-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.05em;
          }
          
          .info-value {
            font-size: 15px;
            color: #111827;
            font-weight: 500;
          }
          
          /* Alert Components */
          .deadline-alert {
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
            border-left: 4px solid;
          }
          
          .deadline-alert h4 {
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 600;
          }
          
          .deadline-alert p {
            margin: 4px 0;
            font-size: 14px;
          }
          
          .deadline-alert.overdue {
            background: #fef2f2;
            border-color: #dc2626;
            color: #991b1b;
          }
          
          .deadline-alert.urgent {
            background: #fffbeb;
            border-color: #f59e0b;
            color: #92400e;
          }
          
          .deadline-alert.normal {
            background: #f0f9ff;
            border-color: #0ea5e9;
            color: #0c4a6e;
          }
          
          /* Status Badges */
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }
          
          .status-pending { 
            background: #fef3c7; 
            color: #92400e; 
            border: 1px solid #f59e0b;
          }
          
          .status-progress { 
            background: #dbeafe; 
            color: #1e40af; 
            border: 1px solid #3b82f6;
          }
          
          .status-review { 
            background: #f3f4f6; 
            color: #374151; 
            border: 1px solid #6b7280;
          }
          
          /* Button Styles */
          .action-button {
            display: inline-block;
            background: #3b82f6;
            color: #ffffff !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            font-size: 14px;
            margin: 20px 0;
            text-align: center;
            border: 1px solid #3b82f6;
          }
          
          .action-button:hover {
            background: #2563eb;
            border-color: #2563eb;
          }
          
          .action-button-secondary {
            display: inline-block;
            background: #ffffff !important;
            color: #374151 !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            font-size: 14px;
            margin: 20px 0;
            text-align: center;
            border: 1px solid #d1d5db;
          }
          
          /* Stage Transition */
          .stage-transition {
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
            border: 1px solid #e2e8f0;
          }
          
          .stage-flow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }
          
          .stage-item {
            text-align: center;
            flex: 1;
          }
          
          .stage-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.05em;
          }
          
          .stage-value {
            padding: 12px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
          }
          
          .stage-from {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
          }
          
          .stage-to {
            background: #dbeafe;
            color: #1e40af;
            border: 1px solid #3b82f6;
          }
          
          .stage-arrow {
            color: #6b7280;
            font-size: 24px;
            font-weight: bold;
          }
          
          /* Comments Section */
          .comments-section {
            background: #fffbeb;
            border: 1px solid #f59e0b;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #f59e0b;
          }
          
          .comments-section h4 {
            margin: 0 0 12px 0;
            color: #92400e;
            font-size: 16px;
            font-weight: 600;
          }
          
          .comments-section p {
            margin: 0;
            color: #92400e;
            font-size: 14px;
            line-height: 1.6;
          }
          
          /* Next Steps */
          .next-steps {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #0ea5e9;
          }
          
          .next-steps h4 {
            margin: 0 0 16px 0;
            color: #0c4a6e;
            font-size: 18px;
            font-weight: 600;
          }
          
          .next-steps ul {
            margin: 0;
            padding-left: 20px;
            color: #0c4a6e;
          }
          
          .next-steps li {
            margin: 8px 0;
            font-size: 14px;
            line-height: 1.6;
          }
          
          /* Footer */
          .footer {
            background: #f8f9fa;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          
          .footer p {
            margin: 4px 0;
            font-size: 12px;
            color: #6b7280 !important;
            line-height: 1.4;
          }
          
          .footer .brand {
            font-weight: 500;
            color: #374151 !important;
            font-size: 13px;
          }
          
          /* Responsive Design */
          @media (max-width: 600px) {
            .email-container { 
              margin: 10px; 
              border-radius: 12px; 
            }
            
            .header, .content { 
              padding: 24px 20px; 
            }
            
            .info-grid { 
              grid-template-columns: 1fr; 
              gap: 16px; 
            }
            
            .stage-flow {
              flex-direction: column;
              gap: 12px;
            }
            
            .stage-arrow {
              transform: rotate(90deg);
            }
            
            .action-button, .action-button-secondary {
              padding: 14px 24px;
              font-size: 14px;
            }
          }
          
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            .email-container {
              background: #ffffff !important;
            }
            
            .content {
              background: #ffffff !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          ${content}
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate VAT assignment notification email
   */
  static generateVATAssignmentEmail(data: VATAssignmentEmailData): { subject: string; htmlContent: string } {
    const urgencyClass = data.isOverdue ? 'overdue' : data.daysUntilDue <= 7 ? 'urgent' : 'normal'
    
    const subject = `VAT Assignment: ${data.companyName} - ${data.quarterPeriod} ${data.isOverdue ? 'OVERDUE' : `Due in ${data.daysUntilDue} days`}`
    
    const content = `
      <div class="header">
        <h1>VAT Work Assignment</h1>
        <div class="subtitle">You've been assigned to handle VAT work for a client</div>
      </div>
      
      <div class="content">
        <div class="assignment-card">
          <h2 style="margin: 0 0 10px 0; color: #1a1a1a !important;">Hello ${data.assigneeName}</h2>
          <p style="margin: 0; font-size: 16px; color: #374151 !important;">
            You have been assigned VAT work for <strong>${data.companyName}</strong> by ${data.assignedBy}.
            ${data.previousAssignee ? ` (Previously assigned to: ${data.previousAssignee})` : ''}
          </p>
        </div>

        <div class="company-info">
          <h3>Company Details</h3>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Company Name</div>
              <div class="info-value">${data.companyName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Client Code</div>
              <div class="info-value">${data.clientCode}</div>
            </div>
            ${data.companyNumber ? `
            <div class="info-item">
              <div class="info-label">Company Number</div>
              <div class="info-value">${data.companyNumber}</div>
            </div>
            ` : ''}
            ${data.vatNumber ? `
            <div class="info-item">
              <div class="info-label">VAT Number</div>
              <div class="info-value">${data.vatNumber}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="company-info">
          <h3>VAT Quarter Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Quarter Period</div>
              <div class="info-value">${data.quarterPeriod}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Quarter End Date</div>
              <div class="info-value">${new Date(data.quarterEndDate).toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Filing Due Date</div>
              <div class="info-value">${new Date(data.filingDueDate).toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Current Status</div>
              <div class="info-value">
                <span class="status-badge ${data.currentStage.includes('PENDING') ? 'status-pending' : 
                  data.currentStage.includes('PROGRESS') ? 'status-progress' : 'status-review'}">
                  ${data.currentStage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="deadline-alert ${urgencyClass}">
          <h4 style="margin: 0 0 10px 0;">
            ${data.isOverdue ? 'OVERDUE ALERT' : data.daysUntilDue <= 7 ? 'URGENT DEADLINE' : 'Upcoming Deadline'}
          </h4>
          <p style="margin: 0; font-weight: 600;">
            ${data.isOverdue 
              ? `This VAT return is OVERDUE by ${Math.abs(data.daysUntilDue)} days!` 
              : `VAT return filing due in ${data.daysUntilDue} days`
            }
          </p>
          ${data.isOverdue ? '<p style="margin: 5px 0 0 0; color: #721c24;">Immediate action required to avoid penalties.</p>' : ''}
        </div>

        <div class="next-steps">
          <h4>Next Steps</h4>
          <ul>
            <li>Log into the Numericalz system to review the client's details</li>
            <li>Check the current workflow stage and any pending tasks</li>
            <li>Contact the client if paperwork or information is needed</li>
            <li>Update the workflow status as you progress</li>
            <li>Ensure filing is completed before the due date</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/clients/vat-dt" class="action-button">
            View VAT Deadlines Dashboard
          </a>
        </div>
      </div>

      <div class="footer">
        <p class="brand">Numericalz</p>
        <p>This is an automated notification.</p>
        <p>© ${new Date().getFullYear()} Numericalz</p>
      </div>
    `

    return {
      subject,
      htmlContent: this.getBaseTemplate(content)
    }
  }

  /**
   * Generate Ltd Company assignment notification email
   */
  static generateLtdAssignmentEmail(data: LtdAssignmentEmailData): { subject: string; htmlContent: string } {
    const accountsUrgency = data.isAccountsOverdue ? 'overdue' : data.daysUntilAccountsDue <= 14 ? 'urgent' : 'normal'
    const ctUrgency = data.isCTOverdue ? 'overdue' : data.daysUntilCTDue <= 30 ? 'urgent' : 'normal'
    
    const subject = `Accounts Assignment: ${data.companyName} - ${data.filingPeriod} ${
      data.isAccountsOverdue ? 'OVERDUE' : `Due in ${data.daysUntilAccountsDue} days`
    }`
    
    const content = `
      <div class="header">
        <h1>Ltd Company Assignment</h1>
        <div class="subtitle">You've been assigned to handle accounts work for a limited company</div>
      </div>
      
      <div class="content">
        <div class="assignment-card">
          <h2 style="margin: 0 0 10px 0; color: #1a1a1a !important;">Hello ${data.assigneeName}</h2>
          <p style="margin: 0; font-size: 16px; color: #374151 !important;">
            You have been assigned accounts work for <strong>${data.companyName}</strong> by ${data.assignedBy}.
            ${data.previousAssignee ? ` (Previously assigned to: ${data.previousAssignee})` : ''}
          </p>
        </div>

        <div class="company-info">
          <h3>Company Details</h3>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Company Name</div>
              <div class="info-value">${data.companyName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Client Code</div>
              <div class="info-value">${data.clientCode}</div>
            </div>
            ${data.companyNumber ? `
            <div class="info-item">
              <div class="info-label">Company Number</div>
              <div class="info-value">${data.companyNumber}</div>
            </div>
            ` : ''}
            <div class="info-item">
              <div class="info-label">Filing Period</div>
              <div class="info-value">${data.filingPeriod}</div>
            </div>
          </div>
        </div>

        <div class="company-info">
          <h3>Key Dates & Deadlines</h3>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Year End Date</div>
              <div class="info-value">${new Date(data.yearEndDate).toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Current Status</div>
              <div class="info-value">
                <span class="status-badge ${data.currentStage.includes('PENDING') ? 'status-pending' : 
                  data.currentStage.includes('PROGRESS') ? 'status-progress' : 'status-review'}">
                  ${data.currentStage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="deadline-alert ${accountsUrgency}">
          <h4 style="margin: 0 0 10px 0;">
            Accounts Filing Deadline
          </h4>
          <p style="margin: 0; font-weight: 600;">
            Due: ${new Date(data.accountsDueDate).toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
          <p style="margin: 5px 0 0 0;">
            ${data.isAccountsOverdue 
              ? `OVERDUE by ${Math.abs(data.daysUntilAccountsDue)} days!` 
              : `${data.daysUntilAccountsDue} days remaining`
            }
          </p>
        </div>

        <div class="deadline-alert ${ctUrgency}">
          <h4 style="margin: 0 0 10px 0;">
            Corporation Tax Deadline
          </h4>
          <p style="margin: 0; font-weight: 600;">
            Due: ${new Date(data.corporationTaxDueDate).toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
          <p style="margin: 5px 0 0 0;">
            ${data.isCTOverdue 
              ? `OVERDUE by ${Math.abs(data.daysUntilCTDue)} days!` 
              : `${data.daysUntilCTDue} days remaining`
            }
          </p>
        </div>

        <div class="next-steps">
          <h4>Next Steps</h4>
          <ul>
            <li>Log into the Numericalz system to review the client's details</li>
            <li>Check the current workflow stage and any pending tasks</li>
            <li>Request year-end paperwork from the client if needed</li>
            <li>Prepare annual accounts and corporation tax computations</li>
            <li>Update the workflow status as you progress through each stage</li>
            <li>Ensure both filings are completed before their respective deadlines</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/clients/ltd-companies" class="action-button">
            View Ltd Companies Dashboard
          </a>
        </div>
      </div>

      <div class="footer">
        <p class="brand">Numericalz</p>
        <p>This is an automated notification.</p>
        <p>© ${new Date().getFullYear()} Numericalz</p>
      </div>
    `

    return {
      subject,
      htmlContent: this.getBaseTemplate(content)
    }
  }

  /**
   * Generate enhanced workflow stage change notification
   */
  static generateWorkflowStageChangeEmail(data: {
    assigneeName: string
    companyName: string
    clientCode: string
    workflowType: 'VAT' | 'ACCOUNTS'
    fromStage: string
    toStage: string
    changedBy: string
    comments?: string
    quarterPeriod?: string
    filingPeriod?: string
  }): { subject: string; htmlContent: string } {
    const workflowType = data.workflowType === 'VAT' ? 'VAT Return' : 'Accounts'
    const subject = `Workflow Update: ${data.companyName} - ${workflowType} Stage Changed`
    
    const content = `
      <div class="header">
        <h1>${workflowType} Workflow Update</h1>
        <div class="subtitle">Stage change notification for ${data.companyName}</div>
      </div>
      
      <div class="content">
        <div class="assignment-card">
          <h2 style="margin: 0 0 10px 0; color: #1a1a1a !important;">Workflow Update</h2>
          <p style="margin: 0; font-size: 16px; color: #374151 !important;">
            The ${data.workflowType} workflow for <strong>${data.companyName}</strong> has been updated by ${data.changedBy}.
          </p>
        </div>

        <div class="company-info">
          <h3>Stage Change Details</h3>
          <div class="stage-transition">
            <div class="stage-flow">
              <div class="stage-item">
                <div class="stage-label">FROM</div>
                <div class="stage-value stage-from">
                  ${data.fromStage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
              <div class="stage-arrow">→</div>
              <div class="stage-item">
                <div class="stage-label">TO</div>
                <div class="stage-value stage-to">
                  ${data.toStage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Client</div>
              <div class="info-value">${data.companyName} (${data.clientCode})</div>
            </div>
            <div class="info-item">
              <div class="info-label">Period</div>
              <div class="info-value">${data.quarterPeriod || data.filingPeriod || 'Current Period'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Updated By</div>
              <div class="info-value">${data.changedBy}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Update Time</div>
              <div class="info-value">${new Date().toLocaleString('en-GB')}</div>
            </div>
          </div>
          
          ${data.comments ? `
          <div class="comments-section">
            <h4>Comments</h4>
            <p>${data.comments}</p>
          </div>
          ` : ''}
        </div>

        <div style="text-align: center;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/clients/${data.workflowType === 'VAT' ? 'vat-dt' : 'ltd-companies'}" class="action-button">
            View ${data.workflowType} Dashboard
          </a>
        </div>
      </div>

      <div class="footer">
        <p class="brand">Numericalz</p>
        <p>This is an automated workflow notification.</p>
        <p>© ${new Date().getFullYear()} Numericalz</p>
      </div>
    `

    return {
      subject,
      htmlContent: this.getBaseTemplate(content)
    }
  }
} 