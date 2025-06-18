# Numericalz Internal Management System

A comprehensive internal management platform for UK accounting firms, built with Next.js 14, TypeScript, Prisma, and PostgreSQL.

## 🎯 Overview

The Numericalz Internal Management System is a production-ready application designed specifically for UK accounting firms to manage clients, track statutory deadlines, and streamline internal operations. The system integrates with Companies House API for automatic company data retrieval and provides role-based access control for team management.

## ✨ Key Features

### 🏢 Client Management
- **Companies House Integration**: Automatic company data retrieval and updates
- **Comprehensive Client Profiles**: Contact details, statutory dates, and business information
- **Smart Client Codes**: Auto-generated sequential codes (NZ-1, NZ-2, NZ-3...)
- **Contact Management**: Click-to-action email and phone icons for instant communication
- **Client Assignment System**: Assign clients to team members with workload tracking
- **Bulk Operations**: Mass assign, refresh, or resign clients
- **Advanced Search & Filtering**: Find clients quickly with multiple search criteria
- **Responsive Table Design**: Optimized layouts for desktop, tablet, and mobile

### 📊 Dashboard & Analytics
- **Role-Based Dashboards**: Separate views for managers and staff
- **Team Statistics**: Workload distribution and performance metrics
- **Client Overview**: Quick access to recent clients and upcoming deadlines
- **Activity Tracking**: Comprehensive audit trail of all actions

### 👥 Team Management
- **User Roles**: Manager and Staff roles with appropriate permissions
- **Team Assignment**: Assign and reassign clients between team members
- **Workload Balancing**: Visual indicators of team member workloads
- **User Management**: Add, edit, and manage team member accounts

### 🔐 Security & Authentication
- **NextAuth.js Integration**: Secure authentication with session management
- **Role-Based Access Control**: Granular permissions based on user roles
- **Secure API Endpoints**: All endpoints protected with proper authentication
- **Data Validation**: Comprehensive input validation with Zod schemas

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **ShadCN/UI Components**: Consistent, accessible component library
- **Standardized Layout System**: Consistent spacing and layout across all pages
- **Contact Icons**: Intuitive email and phone icons with hover effects
- **Fixed Table Layout**: No horizontal scrolling, content fits viewport
- **Action Icons**: Consistent sizing and styling across all components

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **ShadCN/UI** - Modern component library
- **Lucide React** - Modern icon library
- **Framer Motion** - Smooth animations

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Type-safe database operations
- **PostgreSQL** - Primary database (Supabase)
- **NextAuth.js** - Authentication and session management

### External Integrations
- **Companies House API** - UK company data integration
- **Vercel** - Deployment and hosting platform

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (Supabase recommended)
- Companies House API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/BharathVasireddy/numericalz.git
   cd numericalz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/numericalz"
   
   # Authentication
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Companies House API
   COMPANIES_HOUSE_API_KEY="your-companies-house-api-key"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:3000
   - Login with: `admin@numericalz.com` / `admin123`

## 📁 Project Structure

```
numericalz/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API endpoints
│   │   ├── clients/       # Client management APIs
│   │   │   ├── [id]/      # Individual client operations
│   │   │   │   ├── assign/        # User assignment
│   │   │   │   ├── reassign/      # User reassignment
│   │   │   │   ├── resign/        # Client resignation
│   │   │   │   └── refresh-companies-house/  # CH data refresh
│   │   │   ├── bulk-assign/       # Bulk user assignment
│   │   │   ├── bulk-resign/       # Bulk resignation
│   │   │   ├── bulk-refresh/      # Bulk CH refresh
│   │   │   └── export/            # Data export
│   │   ├── companies-house/       # Companies House integration
│   │   ├── users/                 # User management APIs
│   │   ├── services/              # Multi-service management APIs (PLANNED)
│   │   ├── workflows/             # Workflow management APIs (PLANNED)
│   │   ├── automation/            # Automation trigger APIs (PLANNED)
│   │   └── auth/                  # Authentication APIs
│   ├── dashboard/         # Dashboard pages
│   └── globals.css        # Global styles with layout system
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── clients/           # Client management components
│   │   ├── clients-table.tsx      # Main clients table with contact icons
│   │   ├── assign-user-modal.tsx  # User assignment modal
│   │   └── bulk-operations.tsx    # Bulk operations component
│   ├── dashboard/         # Dashboard components
│   ├── layout/            # Layout components
│   │   └── page-layout.tsx        # Standardized page layouts
│   ├── teams/             # Team management components
│   ├── services/          # Multi-service components (PLANNED)
│   ├── workflows/         # Workflow management components (PLANNED)
│   └── ui/                # Reusable UI components (ShadCN)
├── lib/                   # Utility libraries
│   ├── auth.ts            # Authentication configuration
│   ├── companies-house.ts # Companies House API client
│   ├── db.ts              # Database connection with retry logic
│   ├── services/          # Service management utilities (PLANNED)
│   ├── workflows/         # Workflow engine utilities (PLANNED)
│   ├── automation/        # Automation engine utilities (PLANNED)
│   ├── utils.ts           # General utilities
│   └── validations.ts     # Zod validation schemas
├── prisma/                # Database schema and migrations
├── types/                 # TypeScript type definitions
└── docs/                  # Comprehensive documentation
    ├── DEVELOPMENT_ROADMAP.md     # Multi-service development plan
    ├── WORKFLOW_SYSTEM.md         # 10-stage workflow documentation
    ├── SERVICE_ARCHITECTURE.md    # Service architecture specs
    ├── TECHNICAL_SPECIFICATIONS.md # Technical implementation specs
    ├── CURRENT_FEATURES.md        # Current system features
    ├── API_DOCUMENTATION.md       # API reference
    ├── DATABASE_SCHEMA.md         # Database documentation
    ├── DESIGN_SYSTEM.md           # UI/UX guidelines
    ├── LAYOUT_SYSTEM.md           # Layout system documentation
    ├── SECURITY_GUIDELINES.md     # Security specifications
    ├── PERFORMANCE_GUIDE.md       # Performance optimization
    ├── DEPLOYMENT_GUIDE.md        # Deployment procedures
    └── TROUBLESHOOTING.md         # Common issues and solutions
```

## 🔧 Configuration

### Database Setup
The application uses PostgreSQL with Prisma ORM. For production, we recommend Supabase:

1. Create a Supabase project
2. Use the **non-pooled** connection string (port 5432)
3. Update `DATABASE_URL` in your environment variables

### Companies House API
1. Register at https://developer.company-information.service.gov.uk/
2. Create a new application (REST API type)
3. Add your API key to `COMPANIES_HOUSE_API_KEY`

### Authentication
The system uses NextAuth.js with credentials provider:
- Default admin: `admin@numericalz.com` / `admin123`
- Passwords are hashed with bcrypt
- Sessions are managed securely

## 🎯 Core Functionality

### Current Features (v1.0)
1. **Add Client**: Search Companies House or enter manually
2. **Auto-populate**: Company data filled automatically from CH API
3. **Generate Client Code**: Sequential codes (NZ-1, NZ-2, etc.)
4. **Assign Team Member**: Distribute workload across team
5. **Contact Management**: Email and phone icons for direct communication
6. **Track Deadlines**: Monitor accounts and confirmation statement dates
7. **Refresh Data**: Update with latest Companies House information

### Contact Management Features
- **Email Icons**: Click to open default email client with pre-filled recipient
- **Phone Icons**: Click to initiate phone calls on mobile devices
- **Hover Tooltips**: Display full contact information on hover

## 🚀 Development Roadmap

### Next Phase: Multi-Service Workflow System (v2.0)

We are currently developing a comprehensive multi-service workflow management system that will transform Numericalz into a world-class platform for UK accounting firms.

#### 🎯 Vision
Transform from basic client management to a comprehensive multi-service workflow platform supporting:
- **Accounts Service**: Ltd and Non-Ltd companies with automated year-end triggers
- **VAT Service**: Monthly and quarterly patterns with frequency-based automation
- **PAYE/Pension/CIS**: Future services following the same architecture

#### 🔄 10-Stage Workflow System
Each service follows a standardized 10-stage workflow:
1. **Paperwork to chase** (Partner/Manager)
2. **Paperwork chased** (Manual confirmation)
3. **Paperwork received** (Auto-assigned to Staff)
4. **In progress** (Staff working)
5. **Discuss with manager** (Manager review/approval)
6. **Review by partner** (Partner final review)
7. **Approved - Send HelloSign** (Document signing)
8. **HelloSign sent to client** (Awaiting signature)
9. **Approved by client** (Client signed)
10. **Submission approved by partner** (Completion)

#### 🏗️ Key Features in Development
- **Parallel Service Management**: Multiple services per client running simultaneously
- **Role-Based Stage Access**: Different permissions for Partners, Managers, Staff
- **Automated Triggers**: Services start automatically based on dates/frequencies
- **Real-Time Updates**: Live status updates without manual refresh
- **Comprehensive Audit Trail**: Complete activity logging and compliance tracking
- **HelloSign Integration**: Automated document signing workflow

#### 📊 Development Progress
- ✅ **Planning & Documentation**: Comprehensive technical specifications
- 🔄 **Phase 1**: Database schema and core architecture (IN PROGRESS)
- 📅 **Phase 2**: Service selection and client creation enhancement
- 📅 **Phase 3**: Navigation structure and page architecture
- 📅 **Phase 4**: Workflow engine core implementation
- 📅 **Phase 5**: Automation and trigger system
- 📅 **Phase 6**: Activity logging and audit trail
- 📅 **Phase 7**: Performance optimization and real-time features
- 📅 **Phase 8**: Testing, documentation, and deployment

#### 📚 Documentation
Comprehensive documentation is available in the `/docs` directory:
- **[Development Roadmap](docs/DEVELOPMENT_ROADMAP.md)**: Complete development plan
- **[Workflow System](docs/WORKFLOW_SYSTEM.md)**: 10-stage workflow documentation
- **[Service Architecture](docs/SERVICE_ARCHITECTURE.md)**: Multi-service technical architecture
- **[Technical Specifications](docs/TECHNICAL_SPECIFICATIONS.md)**: Implementation details
- **Responsive Design**: Icons work consistently across all device sizes

### Team Management
- **Managers**: Full access to all clients and team management
- **Staff**: Access to assigned clients only
- **Workload Tracking**: Visual indicators of client distribution
- **Bulk Operations**: Efficient mass operations for large client bases

### Dashboard Features
- **Manager Dashboard**: Team overview, statistics, and management tools
- **Staff Dashboard**: Personal client list and upcoming deadlines
- **Quick Actions**: Fast access to common operations
- **Recent Activity**: Track all system changes

## 🔒 Security Features

- **Role-Based Access Control**: Granular permissions
- **API Route Protection**: All endpoints require authentication
- **Input Validation**: Zod schemas for all forms
- **SQL Injection Prevention**: Prisma ORM protection
- **XSS Protection**: React's built-in protections
- **CSRF Protection**: NextAuth.js built-in protection

## 📱 Responsive Design

The application is fully responsive with:
- **Mobile-first approach**: Optimized for mobile devices
- **Fixed Table Layout**: No horizontal scrolling, content fits viewport
- **Contact Icons**: Touch-friendly icons for mobile communication
- **Tablet support**: Enhanced layouts for medium screens
- **Desktop optimization**: Full feature access on large screens
- **Consistent Spacing**: Standardized layout system across all pages

## 🎨 Design System

### Layout System
- **Page Container**: `.page-container` - Main page wrapper with consistent padding
- **Content Wrapper**: `.content-wrapper` - Content container with max-width and centering
- **Content Sections**: `.content-sections` - Sections wrapper with consistent spacing
- **Page Header**: `.page-header` - Standardized page header with bottom border

### Component Standards
- **Action Icons**: Consistent sizing (h-4 w-4) with hover effects
- **Contact Icons**: Email and phone icons with click functionality
- **Button Heights**: Standardized at 32px (h-8) for consistency
- **Color Scheme**: Semantic colors (primary, secondary, muted-foreground)
- **Typography**: Consistent font sizes and weights

## 🚀 Deployment

### Vercel Deployment (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
NEXTAUTH_SECRET="production-secret-key"
NEXTAUTH_URL="https://your-domain.com"
COMPANIES_HOUSE_API_KEY="your-api-key"
```

## 📚 Documentation

- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete API reference
- **[Database Schema](docs/DATABASE_SCHEMA.md)** - Database structure and relationships
- **[Design System](docs/DESIGN_SYSTEM.md)** - UI components and styling guide
- **[Layout System](docs/LAYOUT_SYSTEM.md)** - Standardized layout components
- **[Security Guidelines](docs/SECURITY_GUIDELINES.md)** - Security best practices
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Production deployment guide
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Follow the coding standards in `.cursorrules`
4. Commit changes: `git commit -m 'Add new feature'`
5. Push to branch: `git push origin feature/new-feature`
6. Submit a pull request

## 📄 License

This project is proprietary software developed for Numericalz. All rights reserved.

## 🆘 Support

For support and questions:
- Check the [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- Review the [API Documentation](docs/API_DOCUMENTATION.md)
- Contact the development team

---

**Built with ❤️ for UK Accounting Firms** 