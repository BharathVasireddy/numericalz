# Numericalz Internal Management System

## 🏢 Overview

**Numericalz** is a comprehensive internal management system designed specifically for UK-based accounting firms. This application streamlines client management, integrates with Companies House API, and enhances productivity through automated workflows and intelligent task management.

## 🚀 Current Development Status

✅ **Phase 1 - Foundation Setup Complete**
- Next.js 14 with App Router configured
- TypeScript and Tailwind CSS setup
- Prisma ORM with PostgreSQL schema
- NextAuth.js authentication system
- Basic UI components (ShadCN/UI)
- Landing page and login functionality
- Basic dashboard structure

🔄 **Next: Phase 2 - Client Management (Weeks 3-4)**
- Client management system
- Companies House API integration
- Multi-step client onboarding wizard

### Key Features (Planned)
- 🔐 **Secure Multi-User Authentication** with role-based access control
- 🏢 **Companies House Integration** for automatic company data population
- 📊 **Advanced Dashboard Analytics** with real-time insights
- 👥 **Client Management** with intelligent assignment and tracking
- 📧 **Automated Communication** with template-based email system
- 📱 **Mobile-First Design** with PWA capabilities
- 🔔 **Smart Notifications** for deadlines and task management

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router) - Full-stack React framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **ShadCN/UI** - Modern component library
- **Framer Motion** - Smooth animations
- **React Query** - Server state management

### Backend
- **Node.js** - Runtime environment
- **Prisma ORM** - Database toolkit
- **PostgreSQL** - Primary database
- **NextAuth.js** - Authentication system
- **Zod** - Schema validation

### External Services
- **Companies House API** - UK company data
- **Nodemailer** - Email automation
- **Upstash Redis** - Rate limiting

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0 or higher
- PostgreSQL 14 or higher
- Companies House API key (for future client management)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd numericalz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   Create a `.env.local` file:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/numericalz_dev"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   ```

4. **Database setup**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` to access the application.

## 📁 Project Structure

```
numericalz/
├── app/                      # Next.js 14 App Router
│   ├── (auth)/              # Authentication routes
│   │   └── login/           # Login page
│   ├── (dashboard)/         # Protected dashboard routes
│   │   └── dashboard/       # Main dashboard
│   ├── api/                 # API routes
│   │   └── auth/            # NextAuth API routes
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/
│   ├── ui/                  # Reusable UI components
│   │   ├── button.tsx       # Button component
│   │   ├── card.tsx         # Card component
│   │   ├── input.tsx        # Input component
│   │   ├── toast.tsx        # Toast component
│   │   └── toaster.tsx      # Toaster provider
│   ├── auth/                # Authentication components
│   │   └── login-form.tsx   # Login form
│   ├── landing-page.tsx     # Landing page component
│   └── providers.tsx        # App providers
├── lib/
│   ├── auth.ts              # NextAuth configuration
│   ├── db.ts                # Prisma client
│   └── utils.ts             # Helper functions
├── hooks/                   # Custom React hooks
│   └── use-toast.ts         # Toast hook
├── types/                   # TypeScript type definitions
│   └── next-auth.d.ts       # NextAuth type extensions
├── prisma/
│   └── schema.prisma        # Database schema
├── docs/                    # Comprehensive documentation (12+ files)
└── package.json
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks
- `npm run test` - Run tests
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio

## 🗄️ Database Schema

The application uses a comprehensive PostgreSQL schema with the following main entities:

- **Users**: Staff members with role-based permissions (Manager/Staff)
- **Clients**: Company information with Companies House integration
- **Tasks**: Task management with deadlines and priorities
- **Communications**: Email and communication tracking
- **EmailTemplates**: Reusable email templates
- **Notifications**: System notifications and alerts
- **ActivityLogs**: Comprehensive audit trail
- **Settings**: System configuration

## 🔐 Authentication & Security

- **NextAuth.js**: Secure authentication with JWT tokens
- **Role-based Access**: Manager and Staff role permissions
- **Password Security**: bcrypt hashing with salt
- **Session Management**: 8-hour session timeout
- **CSRF Protection**: Built-in CSRF token validation
- **Security Headers**: Comprehensive security headers in Next.js config

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

- [API Documentation](./docs/API_DOCUMENTATION.md) - Complete API reference
- [Design System](./docs/DESIGN_SYSTEM.md) - UI/UX guidelines and components
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Database design and relationships
- [Project Roadmap](./docs/PROJECT_ROADMAP.md) - Development phases and milestones
- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md) - Production deployment instructions
- [Development Workflow](./docs/DEVELOPMENT_WORKFLOW.md) - Git workflow and standards
- [Security Guidelines](./docs/SECURITY_GUIDELINES.md) - Security best practices
- [Testing Strategy](./docs/TESTING_STRATEGY.md) - Testing approach and tools
- [Contributing Guide](./docs/CONTRIBUTING_GUIDE.md) - Development guidelines
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues and solutions

## 🎯 Development Roadmap

### Phase 1: Foundation ✅ (Weeks 1-2)
- [x] Project setup and configuration
- [x] Authentication system
- [x] Basic UI components
- [x] Database schema design

### Phase 2: Client Management (Weeks 3-4)
- [ ] Client CRUD operations
- [ ] Companies House API integration
- [ ] Multi-step client wizard
- [ ] Client assignment system

### Phase 3: Task Management (Weeks 5-6)
- [ ] Task creation and assignment
- [ ] Deadline tracking
- [ ] Workload distribution
- [ ] Analytics dashboard

### Phase 4: Communications (Weeks 7-8)
- [ ] Email template system
- [ ] Automated notifications
- [ ] Communication tracking
- [ ] GDPR compliance

## 🤝 Contributing

Please read our [Contributing Guide](./docs/CONTRIBUTING_GUIDE.md) for details on our development process and coding standards.

**Key Rules:**
- **NEVER remove existing code or functionality** without explicit approval
- Follow the established file organization and naming conventions
- Use TypeScript strictly with proper type definitions
- Maintain backward compatibility when refactoring
- Add comprehensive comments for complex business logic

## 👥 User Roles

### Manager
- Complete system access
- Client assignment and management
- Staff workload overview
- System analytics and reporting

### Staff/Accountant
- Assigned client access
- Task management
- Communication tracking
- Personal dashboard

## 📝 License

This project is proprietary software for internal use by Numericalz only.

## 🆘 Support

For technical support or questions:
- Check the [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
- Review the [Documentation Index](./docs/DOCUMENTATION_INDEX.md)
- Contact the development team

---

**Numericalz Internal Management System** - Streamlining accounting firm operations with modern technology.

*Built with Next.js 14, TypeScript, Prisma, and modern web technologies.* 