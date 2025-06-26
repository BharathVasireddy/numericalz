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
        <title>Numericalz Assignment Notification</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8f9fa;
          }
          .email-container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white; 
            border-radius: 12px; 
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); 
            color: white; 
            padding: 30px 25px; 
            text-align: center;
          }
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 600;
          }
          .header .subtitle { 
            margin: 5px 0 0 0; 
            opacity: 0.9; 
            font-size: 14px;
          }
          .content { 
            padding: 30px 25px; 
          }
          .assignment-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .company-info {
            background: #fff;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .company-info h3 {
            margin: 0 0 15px 0;
            color: #1976d2;
            font-size: 18px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 15px 0;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .info-value {
            font-size: 14px;
            color: #212529;
            font-weight: 500;
          }
          .deadline-alert {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
          }
          .deadline-alert.overdue {
            background: #f8d7da;
            border-color: #f1aeb5;
          }
          .deadline-alert.urgent {
            background: #fff3cd;
            border-color: #ffeaa7;
          }
          .deadline-alert.normal {
            background: #d1ecf1;
            border-color: #bee5eb;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-pending { background: #fff3cd; color: #856404; }
          .status-progress { background: #d1ecf1; color: #0c5460; }
          .status-review { background: #e2e3e5; color: #383d41; }
          .action-button {
            display: inline-block;
            background: #1976d2;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px 25px;
            text-align: center;
            border-top: 1px solid #dee2e6;
            font-size: 12px;
            color: #6c757d;
          }
          @media (max-width: 600px) {
            .email-container { margin: 10px; border-radius: 8px; }
            .header, .content { padding: 20px; }
            .info-grid { grid-template-columns: 1fr; gap: 10px; }
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
    const urgencyIcon = data.isOverdue ? '🚨' : data.daysUntilDue <= 7 ? '⚠️' : '📋'
    
    const subject = `${urgencyIcon} VAT Assignment: ${data.companyName} - ${data.quarterPeriod} ${data.isOverdue ? 'OVERDUE' : `Due in ${data.daysUntilDue} days`}`
    
    const content = `
      <div class="header">
        <h1>🎯 VAT Work Assignment</h1>
        <div class="subtitle">You've been assigned to handle VAT work for a client</div>
      </div>
      
      <div class="content">
        <div class="assignment-card">
          <h2 style="margin: 0 0 10px 0; color: #1976d2;">👋 Hello ${data.assigneeName}!</h2>
          <p style="margin: 0; font-size: 16px;">
            You have been assigned VAT work for <strong>${data.companyName}</strong> by ${data.assignedBy}.
            ${data.previousAssignee ? ` (Previously assigned to: ${data.previousAssignee})` : ''}
          </p>
        </div>

        <div class="company-info">
          <h3>🏢 Company Details</h3>
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
          <h3>📊 VAT Quarter Information</h3>
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
            ${data.isOverdue ? '🚨 OVERDUE ALERT' : data.daysUntilDue <= 7 ? '⚠️ URGENT DEADLINE' : '📅 Upcoming Deadline'}
          </h4>
          <p style="margin: 0; font-weight: 600;">
            ${data.isOverdue 
              ? `This VAT return is OVERDUE by ${Math.abs(data.daysUntilDue)} days!` 
              : `VAT return filing due in ${data.daysUntilDue} days`
            }
          </p>
          ${data.isOverdue ? '<p style="margin: 5px 0 0 0; color: #721c24;">Immediate action required to avoid penalties.</p>' : ''}
        </div>

        <div style="background: #e8f4fd; border: 1px solid #b8daff; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="margin: 0 0 15px 0; color: #004085;">📋 Next Steps</h4>
          <ul style="margin: 0; padding-left: 20px; color: #004085;">
            <li>Log into the Numericalz system to review the client's details</li>
            <li>Check the current workflow stage and any pending tasks</li>
            <li>Contact the client if paperwork or information is needed</li>
            <li>Update the workflow status as you progress</li>
            <li>Ensure filing is completed before the due date</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/clients/vat-dt" class="action-button">
            🚀 View VAT Deadlines Dashboard
          </a>
        </div>
      </div>

      <div class="footer">
        <p>This is an automated notification from Numericalz Internal Management System</p>
        <p>If you have any questions, please contact your manager or partner</p>
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
    const urgencyIcon = (data.isAccountsOverdue || data.isCTOverdue) ? '🚨' : 
                       (data.daysUntilAccountsDue <= 14 || data.daysUntilCTDue <= 30) ? '⚠️' : '📊'
    
    const subject = `${urgencyIcon} Accounts Assignment: ${data.companyName} - ${data.filingPeriod} ${
      data.isAccountsOverdue ? 'OVERDUE' : `Due in ${data.daysUntilAccountsDue} days`
    }`
    
    const content = `
      <div class="header">
        <h1>📊 Ltd Company Assignment</h1>
        <div class="subtitle">You've been assigned to handle accounts work for a limited company</div>
      </div>
      
      <div class="content">
        <div class="assignment-card">
          <h2 style="margin: 0 0 10px 0; color: #1976d2;">👋 Hello ${data.assigneeName}!</h2>
          <p style="margin: 0; font-size: 16px;">
            You have been assigned accounts work for <strong>${data.companyName}</strong> by ${data.assignedBy}.
            ${data.previousAssignee ? ` (Previously assigned to: ${data.previousAssignee})` : ''}
          </p>
        </div>

        <div class="company-info">
          <h3>🏢 Company Details</h3>
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
          <h3>📅 Key Dates & Deadlines</h3>
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
            📋 Accounts Filing Deadline
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
              ? `🚨 OVERDUE by ${Math.abs(data.daysUntilAccountsDue)} days!` 
              : `${data.daysUntilAccountsDue} days remaining`
            }
          </p>
        </div>

        <div class="deadline-alert ${ctUrgency}">
          <h4 style="margin: 0 0 10px 0;">
            💰 Corporation Tax Deadline
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
              ? `🚨 OVERDUE by ${Math.abs(data.daysUntilCTDue)} days!` 
              : `${data.daysUntilCTDue} days remaining`
            }
          </p>
        </div>

        <div style="background: #e8f4fd; border: 1px solid #b8daff; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="margin: 0 0 15px 0; color: #004085;">📋 Next Steps</h4>
          <ul style="margin: 0; padding-left: 20px; color: #004085;">
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
            🚀 View Ltd Companies Dashboard
          </a>
        </div>
      </div>

      <div class="footer">
        <p>This is an automated notification from Numericalz Internal Management System</p>
        <p>If you have any questions, please contact your manager or partner</p>
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
    const workflowIcon = data.workflowType === 'VAT' ? '💰' : '📊'
    const subject = `${workflowIcon} Workflow Update: ${data.companyName} - Stage Changed`
    
    const content = `
      <div class="header">
        <h1>${workflowIcon} Workflow Stage Update</h1>
        <div class="subtitle">A workflow stage has been updated for one of your assigned clients</div>
      </div>
      
      <div class="content">
        <div class="assignment-card">
          <h2 style="margin: 0 0 10px 0; color: #1976d2;">📢 Workflow Update</h2>
          <p style="margin: 0; font-size: 16px;">
            The ${data.workflowType} workflow for <strong>${data.companyName}</strong> has been updated by ${data.changedBy}.
          </p>
        </div>

        <div class="company-info">
          <h3>🔄 Stage Change Details</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 12px; color: #6c757d; margin-bottom: 5px;">FROM</div>
                <div style="padding: 8px 12px; background: #e9ecef; border-radius: 6px; font-weight: 600;">
                  ${data.fromStage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
              <div style="margin: 0 20px; font-size: 24px;">→</div>
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 12px; color: #6c757d; margin-bottom: 5px;">TO</div>
                <div style="padding: 8px 12px; background: #d1ecf1; border-radius: 6px; font-weight: 600; color: #0c5460;">
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
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0;">💬 Comments</h4>
            <p style="margin: 0;">${data.comments}</p>
          </div>
          ` : ''}
        </div>

        <div style="text-align: center;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/clients/${data.workflowType === 'VAT' ? 'vat-dt' : 'ltd-companies'}" class="action-button">
            🚀 View ${data.workflowType} Dashboard
          </a>
        </div>
      </div>

      <div class="footer">
        <p>This is an automated notification from Numericalz Internal Management System</p>
        <p>Stay updated on your assigned workflows and deadlines</p>
      </div>
    `

    return {
      subject,
      htmlContent: this.getBaseTemplate(content)
    }
  }
} 