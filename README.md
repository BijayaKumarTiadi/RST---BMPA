# 📊 Stock Laabh - Professional Trading Marketplace

<div align="center">

![Stock Laabh Logo](https://img.shields.io/badge/Stock%20Laabh-Professional%20Trading%20Platform-blue?style=for-the-badge&logo=trending-up)

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8+-orange?style=flat-square&logo=mysql)](https://www.mysql.com/)

*A comprehensive B2B ecommerce marketplace for the trading industry with role-based access control and enterprise-grade features.*

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [API Docs](#api-documentation) • [Contributing](#contributing)

</div>

---

## 🌟 Overview

Stock Laabh is a modern, full-stack B2B marketplace specifically designed for the trading industry. It provides a secure, scalable platform where verified sellers can list their stock deals and buyers can discover, filter, and purchase products through an intuitive interface.

### 🎯 Key Highlights

- **Professional Trading Environment** - Purpose-built for B2B stock trading
- **Role-Based Access Control** - Separate dashboards for buyers, sellers, and administrators  
- **Advanced Filtering System** - Multi-parameter search and filtering capabilities
- **Real-Time Messaging** - Built-in communication system between buyers and sellers
- **Enterprise Security** - Session-based authentication with OTP verification
- **Mobile-Responsive Design** - Optimized for desktop and mobile devices
- **Admin Management Panel** - Comprehensive administrative controls

---

## ✨ Features

### 🛍️ Core Marketplace Features
- **Product Listings** - Comprehensive stock deal management with detailed specifications
- **Advanced Search & Filtering** - Filter by category, make, grade, brand, GSM, and stock status
- **Product Details** - Rich product information with pricing and availability
- **Inquiry System** - Direct communication between buyers and sellers
- **WhatsApp Integration** - Quick quotation requests via WhatsApp

### 👥 User Management
- **Multi-Role System** - Support for buyers, sellers, and administrators
- **OTP Authentication** - Secure email-based verification system
- **Member Profiles** - Detailed company and contact information
- **Session Management** - Secure, persistent user sessions

### 📊 Business Intelligence
- **Seller Dashboard** - Sales analytics, inventory management, and performance metrics
- **Buyer Dashboard** - Purchase history, saved searches, and inquiry tracking
- **Admin Panel** - User management, deal oversight, and system analytics
- **Reporting Tools** - Comprehensive business reporting and insights

### 🔧 Technical Features
- **RESTful API** - Clean, documented API for all operations
- **Real-Time Updates** - Live data synchronization across the platform
- **Responsive Design** - Mobile-first approach with desktop optimization
- **Type Safety** - Full TypeScript implementation for reliability
- **Error Handling** - Comprehensive error management and logging

---

## 🏗️ Tech Stack

### Frontend
- **React 18** - Modern functional components with hooks
- **TypeScript 5.6** - Type-safe development experience  
- **Vite** - Fast development server and optimized builds
- **Tailwind CSS** - Utility-first styling framework
- **Shadcn/ui** - Beautiful, accessible component library
- **TanStack Query** - Powerful data fetching and caching
- **React Hook Form** - Efficient form handling with validation
- **Wouter** - Lightweight routing solution

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **MySQL 8** - Robust relational database
- **Drizzle ORM** - Type-safe database operations
- **Express Session** - Session management
- **Passport.js** - Authentication middleware

### DevOps & Tools
- **Vite** - Build tooling and development server
- **ESBuild** - Fast JavaScript bundler
- **Drizzle Kit** - Database migration tools
- **PostCSS** - CSS processing pipeline
- **Git** - Version control system

### External Services
- **SendGrid** - Email delivery service
- **Stripe** - Payment processing platform
- **Replit** - Development and hosting platform

---

## 🚀 Installation

### Prerequisites
- Node.js 20 or higher
- MySQL 8.0 or higher
- npm or yarn package manager

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/stock-laabh.git
cd stock-laabh
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL="mysql://username:password@localhost:3306/stock_laabh"

# Session Management
SESSION_SECRET="your-super-secret-session-key"

# Email Service (SendGrid)
SENDGRID_API_KEY="your-sendgrid-api-key"

# Payment Processing (Stripe)
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
VITE_STRIPE_PUBLIC_KEY="pk_test_your-stripe-public-key"

# Environment
NODE_ENV="development"
```

### 4. Database Setup
```bash
# Initialize database tables
npm run db:push

# Or import the SQL schema manually
mysql -u username -p stock_laabh < database/bmpa_tables.sql
```

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

---

## 📖 Usage

### For Sellers
1. **Register/Login** - Create a seller account with company details
2. **Add Products** - List stock deals with comprehensive specifications
3. **Manage Inventory** - Update stock status, prices, and availability
4. **Handle Inquiries** - Respond to buyer inquiries and quotation requests
5. **Track Performance** - Monitor sales metrics and dashboard analytics

### For Buyers
1. **Browse Marketplace** - Explore available stock deals
2. **Advanced Filtering** - Use multiple filters to find specific products
3. **View Details** - Access comprehensive product information
4. **Send Inquiries** - Contact sellers directly or via WhatsApp
5. **Track Orders** - Monitor purchase history and order status

### For Administrators
1. **User Management** - Approve, suspend, or modify user accounts
2. **Deal Oversight** - Monitor and moderate product listings
3. **System Analytics** - Access comprehensive business intelligence
4. **Content Management** - Manage categories, brands, and system content

---

## 🗄️ Database Schema

### Core Tables

#### Members
```sql
CREATE TABLE member (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  company_name VARCHAR(255),
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  role ENUM('buyer', 'seller', 'both', 'admin'),
  status ENUM('pending', 'active', 'suspended'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Deal Master
```sql
CREATE TABLE deal_master (
  TransID INT AUTO_INCREMENT PRIMARY KEY,
  MakeID INT,
  GradeID INT, 
  BrandID INT,
  GSM INT,
  Deckle_mm DOUBLE,
  grain_mm DOUBLE,
  groupID INT,
  memberID INT,
  StockStatus ENUM('1','2','3','4'),
  Seller_comments TEXT,
  OfferPrice DECIMAL(10,2),
  OfferUnit VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memberID) REFERENCES member(id)
);
```

#### Categories & Taxonomy
- **bmpa_groups** - Product categories
- **make_master** - Product makes/manufacturers  
- **grade_master** - Product grades and specifications
- **brand_master** - Brand information and details

---

## 📡 API Documentation

### Authentication Endpoints
```http
POST /api/auth/login          # User authentication
POST /api/auth/logout         # User logout
POST /api/auth/send-otp      # Send OTP verification
POST /api/auth/verify-otp    # Verify OTP code
GET  /api/auth/current-user  # Get current user info
```

### Marketplace Endpoints
```http
GET    /api/deals            # Get all deals with filters
GET    /api/deals/:id        # Get specific deal details
POST   /api/deals            # Create new deal (sellers)
PUT    /api/deals/:id        # Update deal (sellers)
DELETE /api/deals/:id        # Delete deal (sellers)
```

### User Management
```http
GET    /api/users            # Get user list (admin)
GET    /api/users/:id        # Get user profile
PUT    /api/users/:id        # Update user profile
POST   /api/users/approve    # Approve user (admin)
```

### Utility Endpoints
```http
GET /api/categories          # Get product categories
GET /api/makes              # Get make/manufacturer list
GET /api/grades             # Get grade specifications
GET /api/brands             # Get brand information
```

---

## 🛠️ Development

### Project Structure
```
stock-laabh/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── contexts/      # React contexts
├── server/                # Express backend application
│   ├── routes.ts         # API route definitions
│   ├── database.ts       # Database connection
│   ├── authService.ts    # Authentication logic
│   └── dealService.ts    # Business logic
├── shared/               # Shared types and schemas
│   └── schema.ts        # Database schema definitions
├── database/            # Database migration files
└── docs/               # Additional documentation
```

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run check        # Type checking
npm run db:push      # Push database changes
```

### Code Quality
- **TypeScript** - Strict type checking enabled
- **ESLint** - Code linting and formatting
- **Prettier** - Code style consistency
- **Husky** - Git hooks for quality gates

---

## 🤝 Contributing

We welcome contributions to Stock Laabh! Here's how you can help:

### Getting Started
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Contribution Guidelines
- Follow existing code style and conventions
- Write clear, concise commit messages
- Include tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting

### Areas for Contribution
- 🐛 Bug fixes and issue resolution
- ✨ New feature development
- 📚 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🧪 Test coverage expansion

---

## 📋 Roadmap

### Phase 1: Foundation ✅
- [x] Core marketplace functionality
- [x] User authentication and authorization
- [x] Product listing and management
- [x] Basic search and filtering

### Phase 2: Enhancement 🚧
- [x] Advanced filtering system
- [x] Seller and buyer dashboards
- [x] Admin management panel
- [ ] Mobile application
- [ ] Advanced analytics

### Phase 3: Scale 📋
- [ ] Multi-language support
- [ ] Advanced payment integration
- [ ] Third-party API integrations
- [ ] Machine learning recommendations
- [ ] Advanced reporting tools

---

## 🐛 Known Issues

- HMR (Hot Module Reload) warnings in development mode - does not affect functionality
- Browser compatibility testing needed for older versions
- Performance optimization needed for large datasets

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Stock Laabh Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📞 Support

### Getting Help
- 📖 Check the [documentation](docs/) for detailed guides
- 🐛 Report bugs via [GitHub Issues](https://github.com/yourusername/stock-laabh/issues)
- 💬 Join our community discussions
- 📧 Contact support: support@stocklaabh.com

### Community
- Star ⭐ this repository if you find it helpful
- Follow us for updates and announcements
- Share your feedback and suggestions

---

<div align="center">

**Built with ❤️ by the Stock Laabh Team**

[Website](https://stocklaabh.com) • [Documentation](docs/) • [Issues](https://github.com/yourusername/stock-laabh/issues) • [Discussions](https://github.com/yourusername/stock-laabh/discussions)

</div>