# Stock Laabh Deployment Guide

## Project Export and Import Instructions

### Requirements
- Node.js 18+ and npm
- MySQL database access (external BMPA database)
- PostgreSQL database (optional, for session storage)
- SendGrid API key (for email functionality)
- Stripe API keys (for payment functionality)

### Quick Start - Windows/Linux/Mac

1. **Download the project**
   - Export as ZIP from Replit
   - Extract to your desired location

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update the following required variables:
     ```
     # Required
     DATABASE_URL=postgresql://... (or will use memory store)
     SESSION_SECRET=your-secret-key-here
     
     # MySQL (External BMPA Database) - Already configured
     MYSQL_HOST=103.155.204.186
     MYSQL_PORT=23306
     MYSQL_USER=manish
     MYSQL_PASSWORD=manish
     MYSQL_DATABASE=trade_bmpa25
     
     # Optional services
     SENDGRID_API_KEY=your-key
     STRIPE_SECRET_KEY=your-key
     VITE_STRIPE_PUBLIC_KEY=your-key
     ```

4. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production build
   npm run build
   npm start
   ```

5. **Access the application**
   - Open browser at `http://localhost:5000`
   - Default admin login: username: `admin`, password: `admin`

### Windows-Specific Instructions

1. **Install Node.js**
   - Download from https://nodejs.org/
   - Choose LTS version (18 or higher)
   - Verify installation: `node --version` and `npm --version`

2. **Install Git (optional)**
   - Download from https://git-scm.com/
   - Useful for version control

3. **Run commands in PowerShell or Command Prompt**
   - Navigate to project folder: `cd C:\path\to\stock-laabh`
   - Run npm commands as listed above

### Importing to Another Replit

1. **Create new Repl**
   - Choose "Import from GitHub" or upload ZIP
   - Select Node.js as the template

2. **Configure Secrets**
   - Go to Secrets tab
   - Add required environment variables from `.env.example`

3. **Run the project**
   - Click "Run" button
   - Application will auto-install dependencies and start

### Production Deployment

#### Using PM2 (Recommended for Linux/Windows)
```bash
# Install PM2 globally
npm install -g pm2

# Build the project
npm run build

# Start with PM2
pm2 start dist/index.js --name stock-laabh

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Using Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

### Database Setup

The application uses two databases:
1. **PostgreSQL** (optional) - For session storage
   - Falls back to memory store if not available
   - Used for `BMPS_sessions` table

2. **MySQL** (required) - External BMPA database
   - Already configured to connect to remote server
   - Contains all business data

### Troubleshooting

#### Common Issues

1. **Port already in use**
   - Change PORT in `.env` file
   - Or kill process using port 5000

2. **Database connection failed**
   - Check MySQL credentials
   - Ensure firewall allows connection to port 23306
   - PostgreSQL is optional (falls back to memory store)

3. **Build errors on Windows**
   - Use PowerShell as Administrator
   - Clear npm cache: `npm cache clean --force`
   - Delete `node_modules` and reinstall: `npm install`

4. **Missing environment variables**
   - Check `.env` file exists
   - Verify all required variables are set
   - Restart application after changes

### Features Status

✅ **Working Features:**
- User authentication (login/register)
- Admin dashboard
- Product marketplace
- Search functionality
- Inquiry system
- OTP verification
- Session management

⚠️ **Optional Features (require API keys):**
- Email notifications (SendGrid)
- Payment processing (Stripe)
- Replit authentication

### Support

For issues or questions:
1. Check this documentation
2. Review `.env.example` for configuration
3. Check console logs for specific errors
4. Ensure all dependencies are installed

### Version Information
- Node.js: 18+
- MySQL: 5.7+
- PostgreSQL: 12+ (optional)
- Built with: Vite, React, Express, TypeScript