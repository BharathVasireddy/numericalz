# Numericalz Internal Management System

A comprehensive internal management platform for UK accounting firms, built with Next.js 14, TypeScript, Prisma, and PostgreSQL.

## 🎯 Overview

The Numericalz Internal Management System is a production-ready application designed specifically for UK accounting firms to manage clients, track statutory deadlines, and streamline internal operations. The system integrates with Companies House API for automatic company data retrieval and provides role-based access control for team management.

## ✨ Key Features

### 🏢 Client Management
- **Companies House Integration**: Automatic company data retrieval and updates
- **Comprehensive Client Profiles**: Contact details, statutory dates, and business information
- **Client Assignment System**: Assign clients to team members with workload tracking
- **Bulk Operations**: Mass assign, refresh, or resign clients
- **Advanced Search & Filtering**: Find clients quickly with multiple search criteria

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
- **Dark/Light Mode Support**: User preference-based theming

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **ShadCN/UI** - Modern component library
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
│   ├── dashboard/         # Dashboard pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── clients/           # Client management components
│   ├── dashboard/         # Dashboard components
│   ├── layout/            # Layout components
│   ├── teams/             # Team management components
│   └── ui/                # Reusable UI components
├── lib/                   # Utility libraries
│   ├── auth.ts            # Authentication configuration
│   ├── companies-house.ts # Companies House API client
│   ├── db.ts              # Database connection
│   └── utils.ts           # General utilities
├── prisma/                # Database schema and migrations
├── types/                 # TypeScript type definitions
└── docs/                  # Documentation
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

### Client Management Workflow
1. **Add Client**: Search Companies House or enter manually
2. **Auto-populate**: Company data filled automatically from CH API
3. **Assign Team Member**: Distribute workload across team
4. **Track Deadlines**: Monitor accounts and confirmation statement dates
5. **Refresh Data**: Update with latest Companies House information

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
- **Tablet support**: Enhanced layouts for medium screens
- **Desktop optimization**: Full feature access on large screens
- **Touch-friendly**: Proper touch targets and interactions

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