<p align="center">
  <img src="client/public/bmpa-logo.svg" alt="Stock Laabh Logo" width="120" height="120"/>
</p>

<h1 align="center">📊 Stock Laabh</h1>

<p align="center">
  <strong>India's Premier B2B Trading Marketplace for the Printing & Paper Industry</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-reference">API</a> •
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AWS_SES-Email-FF9900?style=flat-square&logo=amazon-aws" alt="AWS SES"/>
  <img src="https://img.shields.io/badge/Razorpay-Payments-0C2340?style=flat-square&logo=razorpay" alt="Razorpay"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-Styling-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Vite-Build-646CFF?style=flat-square&logo=vite" alt="Vite"/>
</p>

---

## 🌟 Overview

**Stock Laabh** is a comprehensive, enterprise-grade B2B marketplace designed specifically for the printing and paper trading industry in India. It connects verified sellers with buyers, enabling seamless stock listing, discovery, and inquiry management through an intuitive, mobile-responsive interface.

> 🎯 **Mission**: To digitize and streamline the traditional paper trading ecosystem, making it efficient, transparent, and accessible to businesses of all sizes.

### ✨ Why Stock Laabh?

| Traditional Trading | With Stock Laabh |
|---------------------|------------------|
| Phone calls & visits | 24/7 online marketplace |
| Manual record keeping | Digital inventory management |
| Limited reach | Pan-India buyer network |
| Delayed responses | Instant inquiry notifications |
| No price transparency | Real-time pricing & availability |

---

## 🚀 Features

### 🏪 Marketplace Core

<table>
<tr>
<td width="50%">

**📦 Product Listings**
- Comprehensive deal management
- GSM, dimensions, grade specifications
- Make/Brand/Grade taxonomy
- Rich seller comments & descriptions
- Bulk Excel import/export

</td>
<td width="50%">

**🔍 Advanced Search**
- Multi-parameter filtering
- Power search with AI-like matching
- Filter by GSM, size, make, grade, brand
- Location-based filtering
- Real-time search suggestions

</td>
</tr>
<tr>
<td>

**💬 Inquiry System**
- Direct buyer-seller communication
- Email notifications with product details
- Inquiry tracking dashboard
- WhatsApp integration for quick quotes

</td>
<td>

**📊 Analytics Dashboard**
- Sales performance metrics
- Inquiry conversion tracking
- Product view statistics
- Revenue analytics

</td>
</tr>
</table>

### 🔐 Security & Authentication

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                       │
├─────────────────────────────────────────────────────────────┤
│  📧 Email Input → 🔑 OTP Sent → ✅ Verify → 🎫 Session     │
│                                                              │
│  • OTP via Email + SMS (dual-channel)                       │
│  • 10-minute OTP expiry                                      │
│  • Session-based authentication                              │
│  • Secure bcrypt password hashing                            │
│  • Auto-cleanup of expired OTPs                              │
└─────────────────────────────────────────────────────────────┘
```

### 👥 Multi-Role System

| Role | Capabilities |
|------|-------------|
| **Buyer** | Browse marketplace, send inquiries, track requests |
| **Seller** | List products, manage inventory, respond to inquiries |
| **Both** | Full buyer + seller access (default for new users) |
| **Admin** | User approval, system management, analytics |

### 👨‍👩‍👧‍👦 Company Child Users

- **Parent accounts** can create child user accounts
- Child users share company's membership
- All inquiries route to parent email
- Centralized company management

### ⏰ Smart Listing Health System (NEW!)

Automated reminder system to keep listings fresh and relevant:

```
┌────────────────────────────────────────────────────────────────┐
│                    LISTING LIFECYCLE                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📝 Posted     🔔 15 Days    ⚠️ 30 Days    🚨 45 Days    ❌     │
│     │              │              │              │         │    │
│     ▼              ▼              ▼              ▼         ▼    │
│  [ACTIVE] ──► [1st Email] ──► [2nd Email] ──► [Final] ──► [OFF]│
│     🟢            🔵            🟠            🔴               │
│                                                                 │
│  ✏️ UPDATE AT ANY TIME = TIMER RESETS TO 45 DAYS              │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**Dashboard Indicators:**
- 🟢 **Green** (30+ days) - Healthy
- 🟡 **Yellow** (15-30 days) - Needs attention
- 🟠 **Orange** (7-15 days) - Warning
- 🔴 **Red** (<7 days) - Critical
- **3 Dots** show reminder emails sent (🔵 1st • 🟠 2nd • 🔴 3rd)

### 💳 Payment Integration

- **Razorpay** integration for Indian payments
- ₹2,499/year membership fee
- Secure payment verification
- Auto-generated payment receipts
- Email confirmation on successful payment

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (React)                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │
│  │ Landing │ │  Login  │ │Marketplace│ │Dashboard│ │   Admin    │   │
│  └────┬────┘ └────┬────┘ └────┬─────┘ └────┬────┘ └──────┬──────┘   │
│       └───────────┴───────────┴────────────┴─────────────┘          │
│                              │ TanStack Query                        │
└──────────────────────────────┼───────────────────────────────────────┘
                               │ REST API
┌──────────────────────────────┼───────────────────────────────────────┐
│                           SERVER (Express)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Auth    │ │  Deals   │ │ Inquiries│ │ Payments │ │ Reminders│  │
│  │ Service  │ │ Service  │ │  Service │ │  Service │ │  Service │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       └───────────┴───────────┴────────────┴─────────────┘          │
│                              │ MySQL Driver                          │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                         DATABASE (MySQL 8)                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐   │
│  │bmpa_members│ │deal_master │ │stock_groups│ │bmpa_otp_verify │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

<table>
<tr>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="40" height="40"/>
<br><strong>React 18</strong>
<br><sub>UI Framework</sub>
</td>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="40" height="40"/>
<br><strong>TypeScript</strong>
<br><sub>Type Safety</sub>
</td>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="40" height="40"/>
<br><strong>Node.js</strong>
<br><sub>Runtime</sub>
</td>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" width="40" height="40"/>
<br><strong>Express</strong>
<br><sub>API Framework</sub>
</td>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" width="40" height="40"/>
<br><strong>MySQL 8</strong>
<br><sub>Database</sub>
</td>
</tr>
</table>

**Frontend Stack:**
- ⚡ **Vite** - Lightning-fast HMR & builds
- 🎨 **Tailwind CSS** - Utility-first styling
- 🧩 **Shadcn/ui** - Beautiful, accessible components
- 📊 **Recharts** - Data visualization
- 🔄 **TanStack Query** - Server state management
- 📝 **React Hook Form + Zod** - Form validation
- 🛣️ **Wouter** - Lightweight routing

**Backend Stack:**
- 🔐 **Express Session** - Session management
- 📧 **Nodemailer + AWS SES** - Email delivery
- 💰 **Razorpay SDK** - Payment processing
- 📦 **Multer** - File uploads
- 📊 **ExcelJS** - Excel import/export
- 🔒 **bcryptjs** - Password hashing

---

## 📁 Project Structure

```
stock-laabh/
├── 📂 client/                    # React Frontend
│   ├── 📂 public/               # Static assets
│   │   └── bmpa-logo.svg
│   └── 📂 src/
│       ├── 📂 components/       # Reusable UI components
│       │   ├── ui/              # Shadcn/ui primitives (50+ components)
│       │   ├── navigation.tsx   # Main navigation
│       │   ├── stock-card.tsx   # Product card component
│       │   ├── power-search.tsx # Advanced search
│       │   └── ...
│       ├── 📂 pages/            # Route pages (22 pages)
│       │   ├── marketplace.tsx  # Main marketplace
│       │   ├── seller-dashboard.tsx
│       │   ├── buyer-dashboard.tsx
│       │   ├── admin-dashboard.tsx
│       │   └── ...
│       ├── 📂 hooks/            # Custom React hooks
│       │   ├── useAuth.ts       # Authentication hook
│       │   └── use-toast.ts     # Toast notifications
│       ├── 📂 contexts/         # React contexts
│       │   └── theme-context.tsx
│       └── 📂 lib/              # Utilities
│           └── queryClient.ts   # API client
│
├── 📂 server/                    # Express Backend
│   ├── index.ts                 # Server entry point
│   ├── routes.ts                # API routes (3600+ lines)
│   ├── database.ts              # MySQL connection
│   ├── authService.ts           # Authentication logic
│   ├── authRoutes.ts            # Auth endpoints
│   ├── dealService.ts           # Deal CRUD operations
│   ├── dealReminderService.ts   # Auto-reminder system
│   ├── emailService.ts          # Email templates & sending
│   ├── otpService.ts            # OTP generation/verification
│   ├── razorpayService.ts       # Payment integration
│   ├── adminService.ts          # Admin operations
│   └── ...
│
├── 📂 shared/                    # Shared code
│   └── schema.ts                # Database schemas (Drizzle)
│
├── 📂 database/                  # SQL migrations
│   ├── bmpa_tables.sql          # Main schema
│   └── ...
│
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 vite.config.ts
├── 📄 tailwind.config.ts
├── 📄 drizzle.config.ts
└── 📄 .env                       # Environment variables
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 20+ (recommended: 22+)
- **MySQL** 8.0+
- **npm** or **yarn**

### 1️⃣ Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/stock-laabh.git
cd stock-laabh

# Install dependencies
npm install
```

### 2️⃣ Environment Setup

Create a `.env` file in the root directory:

```env
# ═══════════════════════════════════════════════════════════
# DATABASE CONFIGURATION
# ═══════════════════════════════════════════════════════════
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=trade_bmpa25

# ═══════════════════════════════════════════════════════════
# SESSION & SECURITY
# ═══════════════════════════════════════════════════════════
SESSION_SECRET=your-super-secret-session-key-here

# ═══════════════════════════════════════════════════════════
# EMAIL (AWS SES)
# ═══════════════════════════════════════════════════════════
AWS_SES_HOST=email-smtp.ap-south-1.amazonaws.com
AWS_SES_USER=your-aws-ses-user
AWS_SES_PASS=your-aws-ses-password

# ═══════════════════════════════════════════════════════════
# PAYMENTS (Razorpay)
# ═══════════════════════════════════════════════════════════
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret

# ═══════════════════════════════════════════════════════════
# ENVIRONMENT
# ═══════════════════════════════════════════════════════════
NODE_ENV=development
PORT=5000
```

### 3️⃣ Database Setup

```bash
# Option 1: Auto-migration (recommended)
# Tables are created automatically on first run

# Option 2: Manual SQL import
mysql -u username -p your_database < database/bmpa_tables.sql
```

### 4️⃣ Start Development Server

```bash
npm run dev
```

🎉 **App is now running at `http://localhost:5000`**

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/send-login-otp` | Send OTP to email |
| `POST` | `/api/auth/verify-login-otp` | Verify OTP & login |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/logout` | Logout user |
| `GET` | `/api/auth/current-member` | Get logged-in user |

### Deals (Products)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/deals` | List all deals (with filters) |
| `GET` | `/api/deals/:id` | Get deal by ID |
| `POST` | `/api/deals` | Create new deal |
| `PUT` | `/api/deals/:id` | Update deal |
| `DELETE` | `/api/deals/:id` | Soft-delete deal |
| `PUT` | `/api/deals/:id/mark-sold` | Mark as sold |
| `GET` | `/api/deals/:id/reminder-status` | Get reminder status |
| `GET` | `/api/deals/export` | Export deals to Excel |
| `POST` | `/api/deals/import` | Import deals from Excel |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/search/precise` | Power search |
| `GET` | `/api/suggestions` | Auto-complete suggestions |
| `GET` | `/api/hierarchy` | Get taxonomy data |

### Inquiries

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/inquiries` | Send inquiry |
| `GET` | `/api/inquiries/sent` | Buyer's sent inquiries |
| `GET` | `/api/inquiries/received` | Seller's received inquiries |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/login` | Admin login |
| `GET` | `/api/admin/pending-members` | Get pending approvals |
| `POST` | `/api/admin/approve-member` | Approve member |
| `POST` | `/api/admin/reject-member` | Reject member |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/payments/create-order` | Create Razorpay order |
| `POST` | `/api/payments/verify` | Verify payment |

---

## 🗄️ Database Schema

### Core Tables

```sql
-- Members (Users)
bmpa_members (
  member_id INT PRIMARY KEY,
  mname VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(15),
  company_name VARCHAR(100),
  city, state, address1, address2,
  role ENUM('buyer', 'seller', 'both'),
  mstatus INT,                    -- 0=pending, 1=approved
  membership_paid INT,            -- 0=unpaid, 1=paid
  membership_valid_till DATE,
  user_type ENUM('parent', 'child'),
  parent_member_id INT,
  company_id INT
)

-- Deals (Product Listings)
deal_master (
  TransID INT PRIMARY KEY,
  groupID INT,                    -- Category
  Make, Grade, Brand VARCHAR,     -- Taxonomy (text-based)
  GSM INT,
  Deckle_mm, grain_mm DOUBLE,    -- Dimensions
  OfferPrice DECIMAL,
  OfferUnit VARCHAR,
  quantity INT,
  StockStatus INT,               -- 1=active, 2=sold, 0=deleted
  stock_description TEXT,
  Seller_comments TEXT,
  
  -- Reminder System
  reminder_1_sent TINYINT,       -- 15-day reminder
  reminder_2_sent TINYINT,       -- 30-day reminder
  reminder_3_sent TINYINT,       -- 45-day reminder
  last_reminder_sent_at DATETIME,
  deactivated_at DATETIME,
  
  deal_created_at DATETIME,
  deal_updated_at DATETIME,
  created_by_member_id INT
)

-- Categories
stock_groups (GroupID, GroupName, IsActive)
stock_make_master (make_ID, GroupID, make_Name)
stock_grade (gradeID, Make_ID, GradeName)
stock_brand (brandID, make_ID, brandname)
```

---

## 🚢 Deployment

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Docker Deployment

```bash
docker-compose up -d
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000

# Use production database credentials
MYSQL_HOST=your-production-host
MYSQL_PASSWORD=strong-production-password

# Enable secure cookies
SESSION_SECURE=true
```

---

## 📊 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push Drizzle schema changes |

---

## 🔒 Security Features

- ✅ **OTP-based authentication** (no passwords stored for login)
- ✅ **Session-based auth** with HTTP-only cookies
- ✅ **bcrypt hashing** for any stored passwords
- ✅ **SQL injection prevention** via parameterized queries
- ✅ **XSS protection** via React's built-in escaping
- ✅ **CSRF protection** via SameSite cookies
- ✅ **Rate limiting** on OTP endpoints
- ✅ **Auto-expiry** of OTPs (10 minutes)

---

## 🛣️ Roadmap

### ✅ Completed (v1.0)
- [x] Core marketplace functionality
- [x] OTP-based authentication
- [x] Multi-role user system
- [x] Advanced search & filtering
- [x] Seller/Buyer dashboards
- [x] Admin management panel
- [x] Razorpay payment integration
- [x] Email notifications (AWS SES)
- [x] Excel import/export
- [x] WhatsApp integration
- [x] Child user accounts
- [x] Listing reminder system

### 🚧 In Progress (v1.1)
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Advanced analytics dashboard
- [ ] Bulk operations

### 📋 Planned (v2.0)
- [ ] Multi-language support (Hindi, Gujarati)
- [ ] AI-powered price recommendations
- [ ] Logistics integration
- [ ] Credit system
- [ ] API for third-party integrations

---

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Stock Laabh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

---

## 💬 Support

| Channel | Link |
|---------|------|
| 📧 Email | support@stocklaabh.com |
| 🌐 Website | [stocklaabh.com](https://stocklaabh.com) |
| 📱 WhatsApp | +91 XXXXX XXXXX |

---

<p align="center">
  <strong>Built with ❤️ for the Indian Printing Industry</strong>
  <br><br>
  <sub>Powered by <a href="#">Renuka Print ERP Solutions</a></sub>
</p>

<p align="center">
  <a href="https://stocklaabh.com">Website</a> •
  <a href="#api-reference">API Docs</a> •
  <a href="https://github.com/yourusername/stock-laabh/issues">Report Bug</a> •
  <a href="https://github.com/yourusername/stock-laabh/discussions">Discussions</a>
</p>
