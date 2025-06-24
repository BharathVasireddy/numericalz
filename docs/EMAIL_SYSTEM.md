# Email System Documentation

## Overview

The Numericalz Internal Management System uses Brevo (formerly SendinBlue) for sending email notifications. The system supports workflow notifications, deadline reminders, and OTP authentication emails.

## Configuration

### Environment Variables

Add these variables to your `.env.local` file:

```bash
# Brevo API Configuration
BREVO_API_KEY="your-brevo-api-key-here"
BREVO_SENDER_EMAIL="notifications@cloud9digital.in"
```

### Getting Your Brevo API Key

1. Sign up or log in to [Brevo](https://www.brevo.com/)
2. Go to **Account Settings** → **API Keys**
3. Create a new API key with email sending permissions
4. Copy the key to your environment variables

## Email Types

### 1. Workflow Notifications

Sent when VAT or Accounts workflows are reviewed by managers/partners.

**Features:**
- Approval/rework notifications
- Rich HTML formatting
- Direct links to workflow details
- Review comments and instructions
- Reviewer attribution

**Triggered by:**
- Partner/Manager workflow reviews
- Workflow status changes
- Approval/rejection actions

### 2. Deadline Reminders

Automated reminders for upcoming deadlines.

**Features:**
- VAT return deadlines
- Annual accounts deadlines
- Corporation tax deadlines
- Confirmation statement deadlines
- Urgency-based styling (overdue, due soon, upcoming)

### 3. OTP Authentication

Two-factor authentication emails for secure login.

**Features:**
- 6-digit verification codes
- 10-minute expiration
- Professional branding
- Security instructions

## Usage

### Testing Email Functionality

Run the email test script to verify your configuration:

```bash
npm run test-email
```

This will:
1. Test API connectivity
2. Send sample workflow notification
3. Send sample deadline reminder
4. Send generic test email

### Sending Workflow Notifications

Workflow notifications are automatically sent when using the workflow review API:

```typescript
// Example API call to trigger notification
POST /api/notifications/workflow-review-complete
{
  "clientId": "client-id",
  "clientName": "Company Ltd",
  "clientCode": "NZ-123",
  "workflowType": "vat",
  "action": "approve",
  "reviewedBy": "PARTNER",
  "nextStage": "READY_FOR_CLIENT",
  "assignedUserId": "user-id",
  "comments": "Review comments here"
}
```

### Sending Custom Emails

Use the email service directly in your code:

```typescript
import { emailService } from '@/lib/email-service'

// Send workflow notification
const result = await emailService.sendWorkflowNotification({
  to: { email: 'user@example.com', name: 'User Name' },
  clientName: 'Company Ltd',
  clientCode: 'NZ-123',
  workflowType: 'VAT',
  action: 'approve',
  reviewedBy: 'PARTNER',
  nextStage: 'READY_FOR_CLIENT',
  comments: 'All looks good!',
  reviewerName: 'Partner Name',
  clientId: 'client-id'
})

// Send deadline reminder
const reminderResult = await emailService.sendDeadlineReminder({
  to: { email: 'user@example.com', name: 'User Name' },
  clientName: 'Company Ltd',
  clientCode: 'NZ-123',
  deadlineType: 'VAT_RETURN',
  dueDate: new Date('2024-07-31'),
  daysUntilDue: 7,
  isOverdue: false
})

// Send generic email
const genericResult = await emailService.sendEmail({
  to: [{ email: 'user@example.com', name: 'User Name' }],
  subject: 'Custom Subject',
  htmlContent: '<h1>Your HTML content here</h1>'
})
```

## Email Logging

All emails are automatically logged to the database with:

- Sender and recipient details
- Email content and subject
- Send status (PENDING, SENT, FAILED)
- Timestamps and error details
- Associated client and workflow information

View email logs in the admin dashboard at `/dashboard/email-logs`.

## Email Templates

### Workflow Notification Template

- Professional gradient header
- Client information section
- Action status (approved/rework)
- Comments section (if provided)
- Next steps guidance
- Direct action button
- Footer with reviewer attribution

### Deadline Reminder Template

- Color-coded urgency levels
- Deadline type icons
- Due date formatting
- Action required checklist
- Client information
- Direct link to client details

### Styling Guidelines

- Maximum width: 600px
- Font family: Arial, sans-serif
- Responsive design
- Professional color scheme
- Clear call-to-action buttons
- Consistent spacing and typography

## Error Handling

The email service includes comprehensive error handling:

```typescript
const result = await emailService.sendEmail(params)

if (result.success) {
  console.log('Email sent:', result.messageId)
} else {
  console.error('Email failed:', result.error)
}
```

Common error scenarios:
- Invalid API key
- Rate limiting
- Invalid email addresses
- Network connectivity issues
- Brevo service outages

## Monitoring

### Email Status Tracking

Monitor email delivery through:
1. Database logs (`EmailLog` table)
2. Admin dashboard (`/dashboard/email-logs`)
3. Brevo dashboard analytics
4. Application console logs

### Performance Metrics

Track:
- Delivery rates
- Open rates (if tracking enabled)
- Failure rates
- Response times
- Volume statistics

## Security

### Best Practices

1. **API Key Security**
   - Store in environment variables only
   - Never commit to version control
   - Rotate keys regularly
   - Use different keys for different environments

2. **Email Content**
   - Sanitize user input
   - Validate email addresses
   - Use HTTPS links only
   - Include unsubscribe mechanisms where required

3. **Rate Limiting**
   - Respect Brevo rate limits
   - Implement queue for bulk emails
   - Monitor usage patterns

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check API key validity
   - Verify sender email domain
   - Check Brevo account status
   - Review rate limits

2. **Emails going to spam**
   - Verify sender domain authentication
   - Check email content for spam triggers
   - Review Brevo reputation settings

3. **Template rendering issues**
   - Validate HTML structure
   - Test across email clients
   - Check image hosting

### Debug Steps

1. Run the test script: `npm run test-email`
2. Check console logs for detailed errors
3. Verify environment variables
4. Test API connectivity manually
5. Review Brevo dashboard for delivery status

## Production Deployment

### Pre-deployment Checklist

- [ ] Brevo API key configured
- [ ] Sender email verified in Brevo
- [ ] Domain authentication set up
- [ ] Email templates tested
- [ ] Rate limits configured
- [ ] Monitoring set up
- [ ] Error handling tested

### Scaling Considerations

- Implement email queues for high volume
- Set up multiple sender domains if needed
- Monitor delivery rates and reputation
- Plan for peak usage periods
- Consider backup email providers

## Support

For email system support:
1. Check this documentation
2. Review application logs
3. Check Brevo documentation
4. Contact system administrator
5. Review email delivery reports

## API Reference

### Email Service Methods

#### `sendEmail(params)`
Send a generic email with custom content.

#### `sendWorkflowNotification(params)`
Send workflow review notification with standardized template.

#### `sendDeadlineReminder(params)`
Send deadline reminder with urgency-based styling.

### Email Log Database Schema

```sql
table EmailLog {
  id                String   @id @default(cuid())
  fromEmail         String   @default("notifications@cloud9digital.in")
  fromName          String   @default("Numericalz")
  recipientEmail    String
  recipientName     String?
  subject           String
  content           String   @db.Text
  emailType         String
  status            EmailStatus @default(PENDING)
  sentAt            DateTime?
  failedAt          DateTime?
  deliveredAt       DateTime?
  failureReason     String?
  clientId          String?
  workflowType      String?
  triggeredBy       String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum EmailStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  BOUNCED
}
```

## Future Enhancements

Planned improvements:
- Email template builder
- A/B testing capabilities
- Advanced analytics
- Webhook delivery confirmations
- Multi-language support
- Email scheduling
- Bulk email operations
- Template versioning 