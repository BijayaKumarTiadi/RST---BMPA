import type { Express } from "express";
import { createServer, type Server } from "http";
import { authRouter } from "./authRoutes";
import { otpService } from "./otpService";
import { adminService } from "./adminService";
import { dealService } from "./dealService";
import { storage } from "./storage";
import { executeQuery, executeQuerySingle, pool } from "./database";
import { sendEmail, generateInquiryEmail, generatePaymentSuccessEmail, type InquiryEmailData, type PaymentSuccessEmailData } from "./emailService";
import * as sparePartCategoryService from "./sparePartCategoryService";
import { createSparePartTables } from "./createSparePartTables";
import { runSparePartCategoriesMigration } from "./updateSparePartCategories";
import searchRouter from "./searchRoutes";
import suggestionRouter from "./suggestionRoutes";
import advancedSearchRouter from "./advancedSearchRoutes";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import multer from "multer";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  isRazorpayConfigured,
  type RazorpayPaymentVerification
} from './razorpayService';

// Middleware to check if user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.memberId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};

// Middleware to check if admin is authenticated
const requireAdminAuth = (req: any, res: any, next: any) => {
  if (!req.session.adminId) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }
  next();
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Clean up expired OTPs periodically
  setInterval(() => {
    otpService.cleanupExpiredOTPs().catch(console.error);
  }, 5 * 60 * 1000); // Every 5 minutes

  // Auth routes
  app.use('/api/auth', authRouter);

  // IMPORTANT: Register spare-parts routes BEFORE search routes to prevent conflicts
  // Export Deals - Moved to top to avoid route conflict
  app.get('/api/deals/export', requireAuth, async (req: any, res) => {
    try {
      const sellerId = req.session.memberId;

      const deals = await executeQuery(`
        SELECT dm.*, sg.GroupName,
        COALESCE(m.make_Name, dm.Make) as ResolvedMake,
        COALESCE(gr.GradeName, dm.Grade) as ResolvedGrade,
        COALESCE(b.brandname, dm.Brand) as ResolvedBrand
        FROM deal_master dm
        LEFT JOIN stock_groups sg ON dm.groupID = sg.GroupID
        LEFT JOIN stock_make_master m ON dm.Make = m.make_ID
        LEFT JOIN stock_grade gr ON dm.Grade = gr.gradeID
        LEFT JOIN stock_brand b ON dm.Brand = b.brandID
        WHERE dm.created_by_member_id = ? AND dm.StockStatus = 1 AND dm.GSM > 0 AND dm.Deckle_mm > 0
        ORDER BY dm.TransID DESC
      `, [sellerId]);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('My Offers');

      sheet.addRow([
        'TransID (Do not edit)', 'Group ID', 'Group Name', 'Make', 'Grade', 'Brand',
        'GSM', 'Deckle (cm)', 'Grain (cm)', 'Unit', 'Quantity', 'Rate', 'Show Rate (Yes/No)', 'Comments'
      ]);

      deals.forEach((deal: any) => {
        sheet.addRow([
          deal.TransID,
          deal.groupID,
          deal.GroupName,
          deal.ResolvedMake,
          deal.ResolvedGrade,
          deal.ResolvedBrand,
          deal.GSM,
          (deal.Deckle_mm || 0) / 10,
          (deal.grain_mm || 0) / 10,
          deal.OfferUnit,
          deal.quantity,
          deal.OfferPrice,
          deal.show_rate_in_marketplace ? 'Yes' : 'No',
          deal.Seller_comments
        ]);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=my_offers.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).send('Failed to export deals');
    }
  });

  // Search spare parts from deal_master - MUST come before /api/search routes
  app.post('/api/spare-parts/search', async (req, res) => {
    try {
      const {
        process,
        categoryType,
        machineType,
        manufacturer,
        model,
        partName,
        partNo,
        exclude_member_id
      } = req.body;

      console.log('🔍 Spare part search params:', req.body);
      console.log('🔍 exclude_member_id:', exclude_member_id);

      // Get spare part group ID
      const sparePartGroup = await executeQuerySingle(`
        SELECT GroupID FROM stock_groups WHERE GroupName LIKE '%Spare Part%'
      `);

      if (!sparePartGroup) {
        return res.json({
          success: true,
          data: [],
          total: 0
        });
      }

      // Build WHERE clause
      let whereClause = `WHERE dm.groupID = ? AND dm.StockStatus = 1`;
      const queryParams: any[] = [sparePartGroup.GroupID];

      // Exclude user's own products
      if (exclude_member_id) {
        whereClause += ` AND (dm.memberID != ? AND dm.created_by_member_id != ?)`;
        queryParams.push(exclude_member_id, exclude_member_id);
      }

      // Filter by process, categoryType, machineType (from Make field)
      if (process || categoryType || machineType) {
        const makePattern = [];
        if (process) makePattern.push(process);
        if (categoryType) makePattern.push(categoryType);
        if (machineType) makePattern.push(machineType);

        if (makePattern.length > 0) {
          whereClause += ` AND dm.Make LIKE ?`;
          queryParams.push(`%${makePattern.join('%')}%`);
        }
      }

      // Filter by manufacturer (from Grade field)
      if (manufacturer) {
        whereClause += ` AND dm.Grade LIKE ?`;
        queryParams.push(`%${manufacturer}%`);
      }

      // Filter by model (from Brand field)
      if (model) {
        whereClause += ` AND dm.Brand LIKE ?`;
        queryParams.push(`%${model}%`);
      }

      // Filter by part name (from Seller_comments)
      if (partName) {
        whereClause += ` AND dm.Seller_comments LIKE ?`;
        queryParams.push(`%${partName}%`);
      }

      // Filter by part number (from Seller_comments)
      if (partNo) {
        whereClause += ` AND dm.Seller_comments LIKE ?`;
        queryParams.push(`%${partNo}%`);
      }

      const query = `
        SELECT
          dm.*,
          sg.GroupName,
          sg.GroupName as category_name,
          m.mname as created_by_name,
          m.company_name as created_by_company
        FROM deal_master dm
        LEFT JOIN stock_groups sg ON dm.groupID = sg.GroupID
        LEFT JOIN bmpa_members m ON dm.created_by_member_id = m.member_id
        ${whereClause}
        ORDER BY dm.TransID DESC
        LIMIT 100
      `;

      const results = await executeQuery(query, queryParams);

      // Parse spare part fields from Make, Grade, Brand
      const parsedResults = results.map((deal: any) => {
        const makeParts = deal.Make ? deal.Make.split(' - ').map((p: string) => p.trim()) : [];

        return {
          ...deal,
          process: makeParts[0] || null,
          category_type: makeParts[1] || null,
          machine_type: makeParts[2] || null,
          manufacturer: deal.Grade || null,
          model: deal.Brand || null,
          is_spare_part: true
        };
      });

      res.json({
        success: true,
        data: parsedResults,
        total: parsedResults.length,
        maxRecords: 100
      });
    } catch (error) {
      console.error("Error searching spare parts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search spare parts"
      });
    }
  });

  // Search routes (Elasticsearch)
  app.use('/api/search', searchRouter);

  // Advanced search routes for robust filtering
  app.use('/api/search', advancedSearchRouter);

  // Suggestion routes for precise search
  app.use('/api/suggestions', suggestionRouter);


  // Debug endpoint to check sample deal data with search_key
  app.get('/api/debug/sample-deals', async (req, res) => {
    try {
      const deals = await executeQuery(`
        SELECT TransID, Make, Grade, Brand, GSM, stock_description, search_key,
               CONCAT(Deckle_mm/10, ' x ', grain_mm/10, ' cm') as dimensions,
               Seller_comments
        FROM deal_master 
        WHERE StockStatus = 1 
        AND (Make LIKE '%ITC%' OR stock_description LIKE '%ITC%' OR GSM = 40 OR GSM = 400)
        LIMIT 15
      `);

      res.json({ success: true, deals });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create test data endpoint
  app.post('/api/create-test-data', async (req, res) => {
    try {
      // Insert test deals with proper description format: Make Grade Brand Dimensions GSM
      await executeQuery(`
        INSERT INTO deal_master (Make, Grade, Brand, GSM, stock_description, StockStatus, OfferPrice, OfferUnit, created_by_member_id, quantity, Deckle_mm, grain_mm, groupID)
        VALUES 
        ('ITC', 'CYBERXLPAC', 'None', 40, 'ITC CYBERXLPAC None 70.00 X 100.00 40 gsm', 1, 125.50, 'KG', 8, 500, 700, 1000, 1),
        ('ITC', 'CYBERXLPAC', 'None', 220, 'ITC CYBERXLPAC None 93.98 X 55.88 220 gsm', 1, 185.00, 'KG', 8, 1000, 939.8, 558.8, 1),
        ('ITC', 'ART PAPER', 'ITC Limited', 130, 'ITC ART PAPER ITC Limited 63.50 X 96.50 130 gsm', 1, 85.00, 'KG', 8, 1000, 635, 965, 1),
        ('BILT', 'BIBLE PAPER', 'BILT Papers', 40, 'BILT BIBLE PAPER BILT Papers 70.00 X 100.00 40 gsm', 1, 135.00, 'KG', 8, 300, 700, 1000, 1)
      `);

      res.json({ success: true, message: 'Test data created successfully' });
    } catch (error) {
      console.error('Error creating test data:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Database management endpoints for search_key
  app.post('/api/database/add-search-key', async (req, res) => {
    try {
      // Check if search_key column exists
      const columnExists = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = 'trade_bmpa25' 
        AND table_name = 'deal_master' 
        AND column_name = 'search_key'
      `);

      if (columnExists[0]?.count === 0) {
        await executeQuery('ALTER TABLE deal_master ADD COLUMN search_key TEXT');
        console.log('✅ search_key column added to deal_master table');
      }

      res.json({ success: true, message: 'Search key column ready' });
    } catch (error) {
      console.error('Error adding search_key column:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create normalization function and backfill data
  app.post('/api/database/backfill-search-keys', async (req, res) => {
    try {
      // Update all existing records with search_key
      await executeQuery(`
        UPDATE deal_master 
        SET search_key = LOWER(REPLACE(REPLACE(IFNULL(stock_description, ''), ' ', ''), '.', ''))
      `);

      const updatedCount = await executeQuery(`
        SELECT COUNT(*) as count FROM deal_master WHERE search_key IS NOT NULL AND search_key != ''
      `);

      res.json({
        success: true,
        message: 'Search keys backfilled successfully',
        updatedRecords: updatedCount[0]?.count || 0
      });
    } catch (error) {
      console.error('Error backfilling search keys:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add index for performance
  app.post('/api/database/add-search-index', async (req, res) => {
    try {
      await executeQuery('CREATE INDEX idx_search_key ON deal_master(search_key)');
      res.json({ success: true, message: 'Search key index created' });
    } catch (error) {
      // Index might already exist, that's OK
      console.log('Index may already exist:', error.message);
      res.json({ success: true, message: 'Search key index ready' });
    }
  });

  // Add profile columns migration endpoint
  app.post('/api/database/add-profile-columns', async (req, res) => {
    try {
      // Check which columns exist
      const existingColumns = await executeQuery(`
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'trade_bmpa25'
        AND TABLE_NAME = 'bmpa_members'
        AND COLUMN_NAME IN ('pincode', 'gst_number', 'pan_number')
      `);

      const columnNames = existingColumns.map((col: any) => col.COLUMN_NAME);
      const results = [];

      // Add pincode if it doesn't exist
      if (!columnNames.includes('pincode')) {
        await executeQuery('ALTER TABLE bmpa_members ADD COLUMN pincode VARCHAR(10)');
        results.push('Added pincode column');
      }

      // Add gst_number if it doesn't exist
      if (!columnNames.includes('gst_number')) {
        await executeQuery('ALTER TABLE bmpa_members ADD COLUMN gst_number VARCHAR(20)');
        results.push('Added gst_number column');
      }

      // Add pan_number if it doesn't exist
      if (!columnNames.includes('pan_number')) {
        await executeQuery('ALTER TABLE bmpa_members ADD COLUMN pan_number VARCHAR(15)');
        results.push('Added pan_number column');
      }

      res.json({
        success: true,
        message: results.length > 0 ? results.join(', ') : 'All columns already exist',
        columnNames,
        results
      });
    } catch (error: any) {
      console.error('Error adding profile columns:', error);
      res.status(500).json({ success: false, message: 'Failed to add columns', error: error.message });
    }
  });

  // Create payment history table endpoint
  app.post('/api/database/create-payment-history-table', async (req, res) => {
    try {
      // Create bmpa_payment_history table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS bmpa_payment_history (
          id INT PRIMARY KEY AUTO_INCREMENT,
          member_id INT NOT NULL,
          order_id VARCHAR(255) NOT NULL,
          payment_id VARCHAR(255),
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'INR',
          status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
          payment_method VARCHAR(50) DEFAULT 'razorpay',
          signature TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (member_id) REFERENCES bmpa_members(member_id) ON DELETE RESTRICT,
          INDEX idx_member_id (member_id),
          INDEX idx_order_id (order_id),
          INDEX idx_payment_id (payment_id),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      res.json({
        success: true,
        message: 'Payment history table created successfully'
      });
    } catch (error: any) {
      console.error('Error creating payment history table:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment history table',
        error: error.message
      });
    }
  });

  // Create spare part tables endpoint
  app.post('/api/database/create-spare-part-tables', async (req, res) => {
    try {
      console.log('🔧 Received request to create spare part tables');
      const result = await createSparePartTables();
      console.log('✅ Spare part tables created successfully:', result);
      res.json(result);
    } catch (error: any) {
      console.error('❌ Error creating spare part tables:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create spare part tables',
        error: error.message
      });
    }
  });

  // Add company child user columns migration endpoint
  app.post('/api/database/add-company-child-user-columns', async (req, res) => {
    try {
      const { addCompanyChildUserColumns } = await import('./addCompanyChildUserColumns');
      const result = await addCompanyChildUserColumns();
      res.json(result);
    } catch (error: any) {
      console.error('Error adding company child user columns:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add company child user columns',
        error: error.message
      });
    }
  });

  // Fix user types for existing accounts (one-time migration helper)
  app.post('/api/database/fix-user-types', async (req, res) => {
    try {
      // Update all existing members without user_type to be parent users
      await executeQuery(`
        UPDATE bmpa_members
        SET user_type = 'parent',
            company_id = member_id
        WHERE user_type IS NULL OR user_type = ''
      `);

      // Count updated users
      const result = await executeQuerySingle(`
        SELECT COUNT(*) as count FROM bmpa_members WHERE user_type = 'parent'
      `);

      res.json({
        success: true,
        message: 'User types fixed successfully',
        parentUsers: result?.count || 0
      });
    } catch (error: any) {
      console.error('Error fixing user types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fix user types',
        error: error.message
      });
    }
  });

  // Create test accounts endpoint
  app.post('/api/create-test-accounts', async (req, res) => {
    try {
      const testAccounts = [
        {
          mname: 'John Seller',
          email: 'seller1@test.com',
          phone: '9876543210',
          company_name: 'ABC Trading Co.',
          address1: '123 Business Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          role: 'seller',
          mstatus: 1
        },
        {
          mname: 'Sarah Seller',
          email: 'seller2@test.com',
          phone: '9876543211',
          company_name: 'XYZ Industries',
          address1: '456 Commerce Road',
          city: 'Delhi',
          state: 'Delhi',
          role: 'seller',
          mstatus: 1
        },
        {
          mname: 'Mike Buyer',
          email: 'buyer1@test.com',
          phone: '9876543212',
          company_name: 'DEF Enterprises',
          address1: '789 Market Square',
          city: 'Bangalore',
          state: 'Karnataka',
          role: 'buyer',
          mstatus: 1
        },
        {
          mname: 'Lisa Buyer',
          email: 'buyer2@test.com',
          phone: '9876543213',
          company_name: 'GHI Solutions',
          address1: '321 Tech Park',
          city: 'Pune',
          state: 'Maharashtra',
          role: 'buyer',
          mstatus: 1
        }
      ];

      const created = [];
      for (const account of testAccounts) {
        // Check if account already exists
        const existing = await executeQuery('SELECT * FROM bmpa_members WHERE email = ?', [account.email]);

        if (existing.length === 0) {
          await executeQuery(`
            INSERT INTO bmpa_members (mname, email, phone, company_name, address1, city, state, role, mstatus, membership_paid, membership_valid_till)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, '2025-12-31')
          `, [
            account.mname,
            account.email,
            account.phone,
            account.company_name,
            account.address1,
            account.city,
            account.state,
            account.role,
            account.mstatus
          ]);
          created.push(account.email);
        }
      }

      res.json({
        success: true,
        message: `Test accounts created: ${created.join(', ')}`,
        accounts: testAccounts.map(acc => ({ email: acc.email, role: acc.role, company: acc.company_name }))
      });

    } catch (error) {
      console.error('Error creating test accounts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test accounts'
      });
    }
  });

  // Debug endpoint to check inquiry table structures
  app.get('/api/debug/inquiry-tables', async (req, res) => {
    try {
      // Check BMPA_inquiries structure
      const bmpaInquiriesColumns = await executeQuery(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'BMPA_inquiries'
        ORDER BY ORDINAL_POSITION
      `);

      // Check bmpa_received_inquiries structure  
      const receivedInquiriesColumns = await executeQuery(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'bmpa_received_inquiries'
        ORDER BY ORDINAL_POSITION
      `);

      // Get sample data from each table
      const bmpaInquiriesSample = await executeQuery(`
        SELECT * FROM BMPA_inquiries LIMIT 5
      `);

      const receivedInquiriesSample = await executeQuery(`
        SELECT * FROM bmpa_received_inquiries LIMIT 5
      `);

      res.json({
        success: true,
        tables: {
          BMPA_inquiries: {
            columns: bmpaInquiriesColumns,
            sampleData: bmpaInquiriesSample,
            rowCount: (await executeQuerySingle(`SELECT COUNT(*) as count FROM BMPA_inquiries`))?.count || 0
          },
          bmpa_received_inquiries: {
            columns: receivedInquiriesColumns,
            sampleData: receivedInquiriesSample,
            rowCount: (await executeQuerySingle(`SELECT COUNT(*) as count FROM bmpa_received_inquiries`))?.count || 0
          }
        }
      });
    } catch (error) {
      console.error('Error checking inquiry tables:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Debug endpoint to check table structures
  app.get('/api/debug/table-structure', async (req, res) => {
    try {
      const tables = ['stock_groups', 'stock_make_master', 'stock_grade', 'stock_brand', 'deal_master'];
      const results = {};

      for (const table of tables) {
        try {
          const columns = await executeQuery(`DESCRIBE ${table}`);
          results[table] = columns;
        } catch (error) {
          results[table] = { error: error.message };
        }
      }

      res.json({ success: true, tables: results });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create demo deals for testing
  app.post('/api/demo/create-deals', async (req, res) => {
    try {
      // Sample demo deals
      const demoDeals = [
        {
          groupID: 1,
          Make: 1,
          GradeID: 1,
          BrandID: 1,
          memberID: 1,
          Seller_comments: 'Premium ITC FBB CYBER XL - 80GSM\nHigh-quality offset printing paper, perfect for books, magazines, and brochures. Excellent ink absorption and bright white finish.',
          OfferPrice: 45.50,
          OfferUnit: 'sheets'
        },
        {
          groupID: 1,
          Make: 1,
          GradeID: 2,
          BrandID: 2,
          memberID: 1,
          Seller_comments: 'ITC SBS SAPPHIRE GRAPHIC - 120GSM\nPremium coated art paper suitable for high-end magazines, catalogs, and promotional materials. Excellent print quality with vibrant colors.',
          OfferPrice: 62.75,
          OfferUnit: 'sheets'
        },
        {
          groupID: 1,
          MakeID: 2,
          GradeID: 3,
          BrandID: 6,
          memberID: 1,
          Seller_comments: 'EMAMI FBB MAXO FOLD - 100GSM\nEconomic newsprint paper for newspapers, tabloids, and low-cost printing. Good opacity and printability at budget-friendly prices.',
          OfferPrice: 28.90,
          OfferUnit: 'sheets'
        }
      ];

      const createdDeals = [];
      for (const deal of demoDeals) {
        const result = await executeQuery(`
          INSERT INTO deal_master (
            groupID, MakeID, GradeID, BrandID, memberID, 
            Seller_comments, OfferPrice, OfferUnit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          deal.groupID,
          deal.Make,
          deal.GradeID,
          deal.BrandID,
          deal.memberID,
          deal.Seller_comments,
          deal.OfferPrice,
          deal.OfferUnit
        ]);

        createdDeals.push({
          id: result.insertId,
          title: deal.Seller_comments.split('\n')[0]
        });
      }

      res.json({
        success: true,
        message: `Created ${createdDeals.length} demo deals`,
        deals: createdDeals
      });

    } catch (error) {
      console.error('Error creating demo deals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create demo deals',
        error: error.message
      });
    }
  });

  // Temporary simple login bypass for testing
  app.post('/api/auth/simple-login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Get member from bmpa_members table
      const members = await executeQuery('SELECT * FROM bmpa_members WHERE email = ?', [email]);

      if (members.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const member = members[0];

      // For testing, accept 'admin123' as password for all users
      if (password !== 'admin123') {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password (use admin123 for testing)'
        });
      }

      // Store member in session and save it
      req.session.memberId = member.member_id;
      req.session.memberEmail = member.email;
      req.session.isAuthenticated = true;

      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({
            success: false,
            message: 'Login failed - session error'
          });
        }

        console.log(`✅ Simple login successful for ${email}, session saved`);

        res.json({
          success: true,
          message: 'Login successful',
          member: {
            id: member.member_id,
            email: member.email,
            company_name: member.company_name,
            mname: member.mname,
            role: member.role,
            membership_status: member.mstatus
          }
        });
      });

    } catch (error) {
      console.error('Simple login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Admin routes
  app.get('/api/admin/dashboard-stats', requireAdminAuth, async (req, res) => {
    try {
      const stats = await adminService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/admin/members', requireAdminAuth, async (req, res) => {
    try {
      const members = await adminService.getAllMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.post('/api/admin/members/:memberId/approve', requireAdminAuth, async (req, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const adminId = req.session.adminId;
      const result = await adminService.approveMember(memberId, adminId);
      res.json(result);
    } catch (error) {
      console.error("Error approving member:", error);
      res.status(500).json({ message: "Failed to approve member" });
    }
  });

  app.post('/api/admin/members/:memberId/reject', requireAdminAuth, async (req, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const adminId = req.session.adminId;
      const result = await adminService.rejectMember(memberId, adminId);
      res.json(result);
    } catch (error) {
      console.error("Error rejecting member:", error);
      res.status(500).json({ message: "Failed to reject member" });
    }
  });

  app.put('/api/admin/members/:memberId', requireAdminAuth, async (req, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const result = await adminService.updateMemberProfile(memberId, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error updating member:", error);
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  app.get('/api/admin/payment-history', requireAdminAuth, async (req, res) => {
    try {
      const history = await adminService.getPaymentHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  app.get('/api/admin/payment-stats', requireAdminAuth, async (req, res) => {
    try {
      const stats = await adminService.getPaymentStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching payment stats:", error);
      res.status(500).json({ message: "Failed to fetch payment stats" });
    }
  });

  // Summary Report API
  app.get('/api/admin/summary-report', requireAdminAuth, async (req, res) => {
    try {
      const { fromDate, toDate, category } = req.query;

      // Build date filter
      let dateFilter = '';
      const params: any[] = [];

      if (fromDate) {
        dateFilter += ' AND d.deal_created_at >= ?';
        params.push(fromDate);
      }
      if (toDate) {
        dateFilter += ' AND d.deal_created_at <= ?';
        params.push(toDate + ' 23:59:59');
      }

      // Build category filter
      let categoryFilter = '';
      if (category && category !== 'all') {
        if (category === 'spare_part') {
          categoryFilter = ' AND d.is_spare_part = 1';
        } else if (category === 'paper') {
          categoryFilter = ' AND (d.GroupID = 1 OR d.GroupName LIKE "%Paper%") AND (d.is_spare_part IS NULL OR d.is_spare_part = 0)';
        } else if (category === 'board') {
          categoryFilter = ' AND (d.GroupID = 2 OR d.GroupName LIKE "%Board%") AND (d.is_spare_part IS NULL OR d.is_spare_part = 0)';
        } else if (category === 'kraft') {
          categoryFilter = ' AND (d.GroupID = 3 OR d.GroupName LIKE "%Kraft%") AND (d.is_spare_part IS NULL OR d.is_spare_part = 0)';
        }
      }

      const pool = await dealService.getPool();

      // Total postings and aggregates
      const [postingStats]: any = await pool.query(`
        SELECT 
          COUNT(*) as totalPostings,
          COALESCE(SUM(CASE WHEN d.OfferUnit IN ('MT', 'Kg', 'KG') THEN d.quantity ELSE 0 END), 0) as totalKgs,
          COALESCE(SUM(d.OfferPrice * d.quantity), 0) as totalValue
        FROM bmpa_deals d
        WHERE 1=1 ${dateFilter} ${categoryFilter}
      `, params);

      // Total closed as sold
      const [soldStats]: any = await pool.query(`
        SELECT COUNT(*) as totalSold
        FROM bmpa_deals d
        WHERE d.deal_status = 'sold' ${dateFilter} ${categoryFilter}
      `, params);

      // Total closed on expiry
      const [expiredStats]: any = await pool.query(`
        SELECT COUNT(*) as totalExpired
        FROM bmpa_deals d
        WHERE d.deal_status = 'expired' ${dateFilter} ${categoryFilter}
      `, params);

      // Total active postings
      const [activeStats]: any = await pool.query(`
        SELECT COUNT(*) as totalActive
        FROM bmpa_deals d
        WHERE (d.deal_status = 'active' OR d.deal_status IS NULL) ${dateFilter} ${categoryFilter}
      `, params);

      // Active members (members who have active membership)
      const [memberStats]: any = await pool.query(`
        SELECT COUNT(*) as activeMembers
        FROM Members m
        WHERE m.mstatus = 1 
        AND m.membership_valid_till >= CURDATE()
      `);

      // Total responses (inquiries) against posts
      const [responseStats]: any = await pool.query(`
        SELECT COUNT(*) as totalResponses
        FROM inquiries i
        JOIN bmpa_deals d ON i.deal_id = d.TransID
        WHERE 1=1 ${dateFilter.replace(/d\./g, 'd.')} ${categoryFilter.replace(/d\./g, 'd.')}
      `, params);

      res.json({
        totalPostings: postingStats[0]?.totalPostings || 0,
        totalKgs: Math.round(postingStats[0]?.totalKgs || 0),
        totalValue: Math.round(postingStats[0]?.totalValue || 0),
        totalSold: soldStats[0]?.totalSold || 0,
        totalExpired: expiredStats[0]?.totalExpired || 0,
        totalActive: activeStats[0]?.totalActive || 0,
        activeMembers: memberStats[0]?.activeMembers || 0,
        totalResponses: responseStats[0]?.totalResponses || 0
      });

    } catch (error) {
      console.error("Error fetching summary report:", error);
      res.status(500).json({ message: "Failed to fetch summary report" });
    }
  });

  // Get single member details
  app.get('/api/admin/members/:id', requireAdminAuth, async (req, res) => {
    try {
      const memberId = parseInt(req.params.id);
      const member = await adminService.getMemberById(memberId);

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }

      res.json(member);
    } catch (error) {
      console.error('Error getting member details:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Update member profile
  app.put('/api/admin/members/:id', requireAdminAuth, async (req, res) => {
    try {
      const memberId = parseInt(req.params.id);
      const updateData = req.body;

      const result = await adminService.updateMemberProfile(memberId, updateData);
      res.json(result);
    } catch (error) {
      console.error('Error updating member profile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Update member role
  app.put('/api/admin/members/:id/role', requireAdminAuth, async (req, res) => {
    try {
      const memberId = parseInt(req.params.id);
      const { role } = req.body;
      const adminId = req.session.adminId;

      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Role is required'
        });
      }

      const result = await adminService.updateMemberRole(memberId, role, adminId);
      res.json(result);
    } catch (error) {
      console.error('Error updating member role:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Settings API - Get user settings
  app.get('/api/settings', requireAuth, async (req: any, res) => {
    try {
      const memberId = req.session.memberId;
      if (!memberId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Get user settings including paperunit from bmpa_members table
      const memberData = await executeQuerySingle(`
        SELECT paperunit, email, mname as name
        FROM bmpa_members 
        WHERE member_id = ?
      `, [memberId]);

      const settings = {
        email_notifications: true,
        sms_notifications: false,
        marketing_emails: true,
        inquiry_alerts: true,
        price_alerts: false,
        security_alerts: true,
        language: 'en',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        privacy_level: 'members_only',
        show_contact_info: true,
        show_company_details: true,
        auto_respond_inquiries: false,
        dimension_unit: memberData?.paperunit || 'cm' // Default to cm if not set
      };

      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });

  // Settings API - Update user settings
  app.put('/api/settings', requireAuth, async (req: any, res) => {
    try {
      const memberId = req.session.memberId;
      if (!memberId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const settingsUpdate = req.body;

      // If dimension_unit is being updated, save it to paperunit column
      if ('dimension_unit' in settingsUpdate) {
        await executeQuery(`
          UPDATE bmpa_members 
          SET paperunit = ? 
          WHERE member_id = ?
        `, [settingsUpdate.dimension_unit, memberId]);
      }

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  // Profile endpoints
  app.get('/api/profile', requireAuth, async (req: any, res) => {
    try {
      const memberId = req.session.memberId;
      if (!memberId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Get user profile from bmpa_members table
      const profile = await executeQuerySingle(`
        SELECT
          member_id as id,
          mname as name,
          email,
          phone,
          company_name as company,
          address1 as address,
          city,
          state,
          pincode,
          gst_number,
          pan_number,
          role,
          created_at
        FROM bmpa_members
        WHERE member_id = ?
      `, [memberId]);

      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });

  // Update profile
  app.put('/api/profile', requireAuth, async (req: any, res) => {
    try {
      const memberId = req.session.memberId;
      if (!memberId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const {
        name,
        email,
        phone,
        company,
        address,
        city,
        state,
        pincode,
        gst_number,
        pan_number
      } = req.body;

      console.log('📝 Profile update request:', {
        memberId,
        name,
        email,
        phone,
        company,
        city,
        state,
        pincode,
        gst_number,
        pan_number
      });

      // Update profile in database
      const updateResult = await executeQuery(`
        UPDATE bmpa_members
        SET
          mname = ?,
          email = ?,
          phone = ?,
          company_name = ?,
          address1 = ?,
          city = ?,
          state = ?,
          pincode = ?,
          gst_number = ?,
          pan_number = ?
        WHERE member_id = ?
      `, [
        name,
        email,
        phone || null,
        company,
        address || null,
        city || null,
        state || null,
        pincode || null,
        gst_number || null,
        pan_number || null,
        memberId
      ]);

      console.log('✅ Profile updated successfully for member:', memberId);
      console.log('📊 Database update result:', updateResult);

      // Fetch the updated profile to confirm changes (include all fields)
      const updatedProfile = await executeQuerySingle(`
        SELECT
          member_id as id,
          mname as name,
          email,
          phone,
          company_name as company,
          address1 as address,
          city,
          state,
          pincode,
          gst_number,
          pan_number,
          role,
          created_at
        FROM bmpa_members
        WHERE member_id = ?
      `, [memberId]);

      console.log('🔍 Updated profile from database:', updatedProfile);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // ============================================
  // CHILD USER MANAGEMENT ROUTES
  // ============================================

  // Get all child users for a company
  app.get('/api/child-users', requireAuth, async (req: any, res) => {
    try {
      const memberId = req.session.memberId;
      if (!memberId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Get current user to check if they're a parent
      const currentUser = await executeQuerySingle(`
        SELECT user_type, company_id FROM bmpa_members WHERE member_id = ?
      `, [memberId]);

      if (!currentUser || currentUser.user_type !== 'parent') {
        return res.status(403).json({
          success: false,
          message: 'Only parent accounts can manage child users'
        });
      }

      // Get all child users for this company with product counts
      const childUsers = await executeQuery(`
        SELECT
          m.member_id,
          m.child_user_name as name,
          m.email,
          m.phone,
          m.created_at,
          m.last_login,
          COUNT(d.TransID) as product_count
        FROM bmpa_members m
        LEFT JOIN deal_master d ON m.member_id = d.created_by_member_id AND d.StockStatus = 1
        WHERE m.parent_member_id = ? AND m.user_type = 'child'
        GROUP BY m.member_id, m.child_user_name, m.email, m.phone, m.created_at, m.last_login
        ORDER BY m.created_at DESC
      `, [memberId]);

      res.json({
        success: true,
        childUsers,
        maxChildUsers: 5,
        currentCount: childUsers.length
      });
    } catch (error) {
      console.error('Error fetching child users:', error);
      res.status(500).json({ message: 'Failed to fetch child users' });
    }
  });

  // Create a child user
  app.post('/api/child-users', requireAuth, async (req: any, res) => {
    try {
      const parentId = req.session.memberId;
      if (!parentId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      console.log('📝 Create child user request body:', req.body);

      const { name, email, phone } = req.body;

      if (!name || !email || !phone) {
        console.log('❌ Missing required fields - name:', name, 'email:', email, 'phone:', phone);
        return res.status(400).json({
          success: false,
          message: 'Name, email, and phone number are required'
        });
      }

      // Get parent user info
      const parent = await executeQuerySingle(`
        SELECT user_type, company_id, company_name FROM bmpa_members WHERE member_id = ?
      `, [parentId]);

      if (!parent || parent.user_type !== 'parent') {
        return res.status(403).json({
          success: false,
          message: 'Only parent accounts can create child users'
        });
      }

      // Check if email already exists
      const existingUser = await executeQuerySingle(`
        SELECT member_id FROM bmpa_members WHERE email = ?
      `, [email]);

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already registered'
        });
      }

      // Check child user limit (max 5)
      const childCount = await executeQuerySingle(`
        SELECT COUNT(*) as count FROM bmpa_members
        WHERE parent_member_id = ? AND user_type = 'child'
      `, [parentId]);

      if (childCount && childCount.count >= 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum of 5 child users allowed per company'
        });
      }

      // Create child user
      console.log('📝 Creating child user with:', {
        name,
        email,
        phone,
        company_name: parent.company_name,
        parent_id: parentId,
        company_id: parent.company_id
      });

      // Get parent's membership validity (can't use subquery in INSERT into same table)
      const parentMembership = await executeQuerySingle(`
        SELECT membership_valid_till FROM bmpa_members WHERE member_id = ?
      `, [parentId]);

      const result = await executeQuery(`
        INSERT INTO bmpa_members (
          child_user_name,
          email,
          phone,
          company_name,
          parent_member_id,
          user_type,
          company_id,
          role,
          mstatus,
          membership_paid,
          membership_valid_till
        ) VALUES (?, ?, ?, ?, ?, 'child', ?, 'both', 1, 1, ?)
      `, [
        name,
        email,
        phone,
        parent.company_name,
        parentId,
        parent.company_id,
        parentMembership?.membership_valid_till || '2025-12-31'
      ]);

      const insertResult = result as any;
      const childUserId = insertResult.insertId;

      console.log(`✅ Child user created: ${name} (${email}) for parent ${parentId}`);

      // Send welcome email to the child user
      try {
        const { generateChildUserWelcomeEmail } = await import('./emailService');
        const welcomeEmailHtml = generateChildUserWelcomeEmail({
          childUserName: name,
          childUserEmail: email,
          parentName: parent.mname || 'Parent User',
          companyName: parent.company_name,
          membershipValidTill: parentMembership?.membership_valid_till || '2025-12-31'
        });

        await sendEmail({
          to: email,
          subject: 'Welcome to Stock Laabh - Child User Account Created',
          html: welcomeEmailHtml
        });

        console.log(`✅ Welcome email sent to child user: ${email}`);
      } catch (emailError) {
        console.error('❌ Error sending welcome email to child user:', emailError);
        // Don't fail the request if email fails
      }

      res.json({
        success: true,
        message: 'Child user created successfully',
        childUserId
      });
    } catch (error: any) {
      console.error('❌ Error creating child user:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create child user',
        error: error.sqlMessage || error.message
      });
    }
  });

  // Delete a child user
  app.delete('/api/child-users/:id', requireAuth, async (req: any, res) => {
    try {
      const parentId = req.session.memberId;
      const childUserId = parseInt(req.params.id);

      if (!parentId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Verify the child user belongs to this parent
      const childUser = await executeQuerySingle(`
        SELECT member_id FROM bmpa_members
        WHERE member_id = ? AND parent_member_id = ? AND user_type = 'child'
      `, [childUserId, parentId]);

      if (!childUser) {
        return res.status(404).json({
          success: false,
          message: 'Child user not found or you do not have permission to delete this user'
        });
      }

      // Delete the child user
      await executeQuery(`
        DELETE FROM bmpa_members WHERE member_id = ?
      `, [childUserId]);

      console.log(`✅ Child user ${childUserId} deleted by parent ${parentId}`);

      res.json({
        success: true,
        message: 'Child user deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting child user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete child user'
      });
    }
  });

  // Get company dashboard stats (for parent accounts)
  app.get('/api/company/stats', requireAuth, async (req: any, res) => {
    try {
      const memberId = req.session.memberId;
      if (!memberId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Get current user
      const currentUser = await executeQuerySingle(`
        SELECT user_type, company_id, member_id FROM bmpa_members WHERE member_id = ?
      `, [memberId]);

      if (!currentUser || currentUser.user_type !== 'parent') {
        return res.status(403).json({
          success: false,
          message: 'Only parent accounts can view company stats'
        });
      }

      console.log('📊 Company Stats Debug:', {
        memberId,
        userType: currentUser.user_type,
        companyId: currentUser.company_id
      });

      // Use member_id directly instead of company_id which might not be set
      const companyIdToUse = currentUser.company_id || memberId;

      // Get total inquiries received (for all users in company)
      const inquiryCount = await executeQuerySingle(`
        SELECT COUNT(*) as count
        FROM bmpa_received_inquiries
        WHERE seller_id IN (
          SELECT member_id FROM bmpa_members
          WHERE company_id = ? OR member_id = ? OR parent_member_id = ?
        )
      `, [companyIdToUse, memberId, memberId]);

      // Get child user count
      const childUserCount = await executeQuerySingle(`
        SELECT COUNT(*) as count
        FROM bmpa_members
        WHERE parent_member_id = ? AND user_type = 'child'
      `, [memberId]);

      // Get total products listed by company (all products)
      const totalProductCount = await executeQuerySingle(`
        SELECT COUNT(*) as count
        FROM deal_master
        WHERE memberID IN (
          SELECT member_id FROM bmpa_members
          WHERE company_id = ? OR member_id = ? OR parent_member_id = ?
        )
      `, [companyIdToUse, memberId, memberId]);

      // Get active products only (StockStatus = 1)
      const activeProductCount = await executeQuerySingle(`
        SELECT COUNT(*) as count
        FROM deal_master
        WHERE memberID IN (
          SELECT member_id FROM bmpa_members
          WHERE company_id = ? OR member_id = ? OR parent_member_id = ?
        ) AND StockStatus = 1
      `, [companyIdToUse, memberId, memberId]);

      console.log('📊 Stats Results:', {
        totalInquiries: inquiryCount?.count || 0,
        childUserCount: childUserCount?.count || 0,
        totalProducts: totalProductCount?.count || 0,
        activeProducts: activeProductCount?.count || 0
      });

      res.json({
        success: true,
        stats: {
          total_inquiries: inquiryCount?.count || 0,
          child_user_count: childUserCount?.count || 0,
          max_child_users: 2,
          total_products: totalProductCount?.count || 0,
          active_products: activeProductCount?.count || 0
        }
      });
    } catch (error) {
      console.error('Error fetching company stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch company stats'
      });
    }
  });

  // Spare Part Category Routes
  app.get('/api/spare-parts/processes', async (req, res) => {
    try {
      const processes = await sparePartCategoryService.getProcesses();
      res.json(processes);
    } catch (error) {
      console.error("Error fetching processes:", error);
      res.status(500).json({ message: "Failed to fetch processes" });
    }
  });

  app.get('/api/spare-parts/category-types', async (req, res) => {
    try {
      const types = await sparePartCategoryService.getCategoryTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching category types:", error);
      res.status(500).json({ message: "Failed to fetch category types" });
    }
  });

  app.get('/api/spare-parts/machine-types', async (req, res) => {
    try {
      const types = await sparePartCategoryService.getMachineTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching machine types:", error);
      res.status(500).json({ message: "Failed to fetch machine types" });
    }
  });

  app.get('/api/spare-parts/manufacturers', async (req, res) => {
    try {
      const { process } = req.query;
      const manufacturers = await sparePartCategoryService.getManufacturers(process as string);
      res.json(manufacturers);
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
      res.status(500).json({ message: "Failed to fetch manufacturers" });
    }
  });

  // Migration endpoint to update spare part categories
  app.post('/api/admin/migrate-spare-part-categories', requireAdminAuth, async (req, res) => {
    try {
      const result = await runSparePartCategoriesMigration();
      res.json(result);
    } catch (error: any) {
      console.error("Error running spare part categories migration:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get('/api/spare-parts/models', async (req, res) => {
    try {
      const models = await sparePartCategoryService.getModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  app.post('/api/spare-parts/save-model', requireAuth, async (req: any, res) => {
    try {
      const { process, category_type, machine_type, manufacturer, model } = req.body;

      if (!process || !category_type || !machine_type || !manufacturer || !model) {
        return res.status(400).json({
          success: false,
          message: "All fields are required to save a model"
        });
      }

      const saved = await sparePartCategoryService.saveCustomModel({
        process,
        category_type,
        machine_type,
        manufacturer,
        model
      });

      if (saved) {
        res.json({
          success: true,
          message: "Model saved successfully"
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to save model"
        });
      }
    } catch (error) {
      console.error("Error saving custom model:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save model"
      });
    }
  });

  // NOTE: Spare parts search route moved to line 62 (before /api/search routes) to prevent routing conflicts

  // Get all spare part filter options from deal_master
  app.get('/api/spare-parts/filters', async (req, res) => {
    try {
      // Get spare part group ID
      const sparePartGroup = await executeQuerySingle(`
        SELECT GroupID FROM stock_groups WHERE GroupName LIKE '%Spare Part%'
      `);

      if (!sparePartGroup) {
        return res.json({
          processes: [],
          categoryTypes: [],
          machineTypes: [],
          manufacturers: [],
          models: []
        });
      }

      // Extract unique values from deal_master where groupID = Spare Part
      // Make field contains: "process - category_type - machine_type"
      // Grade field contains: manufacturer
      // Brand field contains: model or part_name

      const deals = await executeQuery(`
        SELECT DISTINCT Make, Grade, Brand
        FROM deal_master
        WHERE groupID = ? AND StockStatus = 1
      `, [sparePartGroup.GroupID]);

      const processes = new Set<string>();
      const categoryTypes = new Set<string>();
      const machineTypes = new Set<string>();
      const manufacturers = new Set<string>();
      const models = new Set<string>();

      deals.forEach((deal: any) => {
        // Parse Make field: "process - category_type - machine_type"
        if (deal.Make) {
          const parts = deal.Make.split(' - ').map((p: string) => p.trim());
          if (parts[0]) processes.add(parts[0]);
          if (parts[1]) categoryTypes.add(parts[1]);
          if (parts[2]) machineTypes.add(parts[2]);
        }

        // Grade field contains manufacturer
        if (deal.Grade) {
          manufacturers.add(deal.Grade);
        }

        // Brand field contains model
        if (deal.Brand) {
          models.add(deal.Brand);
        }
      });

      res.json({
        processes: Array.from(processes).sort(),
        categoryTypes: Array.from(categoryTypes).sort(),
        machineTypes: Array.from(machineTypes).sort(),
        manufacturers: Array.from(manufacturers).sort(),
        models: Array.from(models).sort()
      });
    } catch (error) {
      console.error("Error fetching spare part filters:", error);
      res.status(500).json({ message: "Failed to fetch spare part filters" });
    }
  });

  // Create spare part listing
  app.post('/api/spare-parts/listings', requireAuth, async (req: any, res) => {
    try {
      const sellerId = req.session.memberId;
      if (!sellerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const {
        process,
        category_type,
        machine_type,
        manufacturer,
        model,
        part_name,
        part_no,
        pcs,
        unit,
        stock_age,
        seller_comments
      } = req.body;

      if (!process || !category_type || !machine_type || !manufacturer || !part_name || !part_no || !pcs) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const listingId = await sparePartCategoryService.createSparePartListing({
        seller_id: sellerId,
        process,
        category_type,
        machine_type,
        manufacturer,
        model: model || null,
        part_name,
        part_no,
        pcs: parseInt(pcs),
        unit: unit || 'Piece',
        stock_age: stock_age ? parseInt(stock_age) : 0,
        seller_comments: seller_comments || null
      });

      res.json({
        success: true,
        message: 'Spare part listing created successfully',
        listing_id: listingId
      });
    } catch (error) {
      console.error("Error creating spare part listing:", error);
      res.status(500).json({ message: "Failed to create spare part listing" });
    }
  });

  // Categories
  app.get('/api/categories', async (req, res) => {
    try {
      // Categories are now handled differently - return empty array
      const categories = [];
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', requireAuth, async (req: any, res) => {
    try {
      const { name, description, parent_id } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required'
        });
      }

      // Categories are now handled differently
      const result = { success: false, message: 'Category creation not supported in stock-based system' };
      res.json(result);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Stock hierarchy endpoints
  app.get('/api/stock/hierarchy', async (req, res) => {
    try {
      const hierarchy = await dealService.getStockHierarchy();
      res.json(hierarchy);
    } catch (error) {
      console.error("Error fetching stock hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch stock hierarchy" });
    }
  });

  // Bulk Upload Template Download - Using ExcelJS for data validation support
  app.get('/api/deals/bulk-upload-template', async (req, res) => {
    try {
      // Get Makes, Brands from hierarchy
      const hierarchy = await dealService.getStockHierarchy();

      // Extract unique makes and brands
      const makes: string[] = [];
      const brands: string[] = [];
      const grades: string[] = [];
      const boardTypes: string[] = ['Paper', 'Board', 'Kraft Reel'];
      const units: string[] = ['MT', 'Kg', 'Sheet', 'Pkt', 'Nos', 'Reel'];

      if (hierarchy.groups) {
        hierarchy.groups.forEach((group: any) => {
          if (group.makes) {
            group.makes.forEach((make: any) => {
              if (make.Make && !makes.includes(make.Make)) {
                makes.push(make.Make);
              }
              if (make.grades) {
                make.grades.forEach((grade: any) => {
                  if (grade.Grade && !grades.includes(grade.Grade)) {
                    grades.push(grade.Grade);
                  }
                  if (grade.brands) {
                    grade.brands.forEach((brand: any) => {
                      if (brand.Brand && !brands.includes(brand.Brand)) {
                        brands.push(brand.Brand);
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }

      // Sort alphabetically
      makes.sort();
      brands.sort();
      grades.sort();

      // Create workbook using ExcelJS (supports data validation)
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'BMPA';
      workbook.created = new Date();

      // Create main Offers sheet FIRST (so it's the active sheet when opened)
      const offersSheet = workbook.addWorksheet('Offers');

      // Create Reference Values sheet (for dropdown references)
      const refSheet = workbook.addWorksheet('Lists');

      // Populate Lists sheet with dropdown values
      // Column A: Board Types
      refSheet.getColumn(1).width = 15;
      refSheet.getCell('A1').value = 'Board Types';
      boardTypes.forEach((type, i) => {
        refSheet.getCell(`A${i + 2}`).value = type;
      });

      // Column B: Makes
      refSheet.getColumn(2).width = 25;
      refSheet.getCell('B1').value = 'Makes';
      makes.forEach((make, i) => {
        refSheet.getCell(`B${i + 2}`).value = make;
      });

      // Column C: Grades
      refSheet.getColumn(3).width = 20;
      refSheet.getCell('C1').value = 'Grades';
      grades.forEach((grade, i) => {
        refSheet.getCell(`C${i + 2}`).value = grade;
      });

      // Column D: Brands
      refSheet.getColumn(4).width = 20;
      refSheet.getCell('D1').value = 'Brands';
      brands.forEach((brand, i) => {
        refSheet.getCell(`D${i + 2}`).value = brand;
      });

      // Column E: Units
      refSheet.getColumn(5).width = 10;
      refSheet.getCell('E1').value = 'Units';
      units.forEach((unit, i) => {
        refSheet.getCell(`E${i + 2}`).value = unit;
      });

      // Column F: Show Rate
      refSheet.getColumn(6).width = 15;
      refSheet.getCell('F1').value = 'Show Rate';
      refSheet.getCell('F2').value = 'Yes';
      refSheet.getCell('F3').value = 'No';

      // Style Lists header row
      const listsHeaderRow = refSheet.getRow(1);
      listsHeaderRow.font = { bold: true };

      // Configure Offers sheet
      offersSheet.columns = [
        { header: 'Board Type*', key: 'boardType', width: 15 },
        { header: 'Make/Manufacturer*', key: 'make', width: 25 },
        { header: 'Grade', key: 'grade', width: 20 },
        { header: 'Brand', key: 'brand', width: 20 },
        { header: 'GSM*', key: 'gsm', width: 10 },
        { header: 'Deckle (cm)*', key: 'deckle', width: 12 },
        { header: 'Grain (cm)*', key: 'grain', width: 12 },
        { header: 'Unit*', key: 'unit', width: 10 },
        { header: 'Quantity*', key: 'quantity', width: 12 },
        { header: 'Rate (Rs)', key: 'rate', width: 12 },
        { header: 'Show Rate', key: 'showRate', width: 12 },
        { header: 'Comments', key: 'comments', width: 30 }
      ];

      // Style header row
      const headerRow = offersSheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data validation dropdowns to rows 2-51
      for (let rowNum = 2; rowNum <= 51; rowNum++) {
        // Board Type dropdown (Column A) - reference Lists sheet
        offersSheet.getCell(`A${rowNum}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`Lists!$A$2:$A$${boardTypes.length + 1}`],
          showErrorMessage: true,
          errorTitle: 'Invalid Board Type',
          error: 'Please select Paper, Board, or Kraft Reel'
        };

        // Make/Manufacturer dropdown from Lists sheet (Column B)
        if (makes.length > 0) {
          offersSheet.getCell(`B${rowNum}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Lists!$B$2:$B$${makes.length + 1}`],
            showErrorMessage: false // Allow new values
          };
        }

        // Grade dropdown from Lists sheet (Column C)
        if (grades.length > 0) {
          offersSheet.getCell(`C${rowNum}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Lists!$C$2:$C$${grades.length + 1}`],
            showErrorMessage: false // Allow new values
          };
        }

        // Brand dropdown from Lists sheet (Column D)
        if (brands.length > 0) {
          offersSheet.getCell(`D${rowNum}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Lists!$D$2:$D$${brands.length + 1}`],
            showErrorMessage: false // Allow new values
          };
        }

        // Unit dropdown (Column H) - reference Lists sheet
        offersSheet.getCell(`H${rowNum}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`Lists!$E$2:$E$${units.length + 1}`],
          showErrorMessage: true,
          errorTitle: 'Invalid Unit',
          error: 'Please select MT, Kg, Sheet, Pkt, Nos, or Reel'
        };

        // Show Rate dropdown (Column K) - reference Lists sheet
        offersSheet.getCell(`K${rowNum}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['Lists!$F$2:$F$3'],
          showErrorMessage: true,
          errorTitle: 'Invalid Value',
          error: 'Please enter Yes or No'
        };
      }

      // Create Instructions sheet
      const instructionsSheet = workbook.addWorksheet('Instructions');
      instructionsSheet.columns = [{ width: 80 }];

      const instructions = [
        ['BULK UPLOAD INSTRUCTIONS'],
        [''],
        ['Fields marked with * are required'],
        [''],
        ['1. Board Type: Select from dropdown - Paper, Board, or Kraft Reel'],
        ['2. Make/Manufacturer: Select from dropdown or type a new value'],
        ['3. Grade: Select from dropdown or type new (optional for Kraft Reel)'],
        ['4. Brand: Select from dropdown or type new (optional for Kraft Reel)'],
        ['5. GSM: Enter numeric value (e.g., 120, 250)'],
        ['6. Deckle: Enter size in centimeters'],
        ['7. Grain: Enter size in centimeters (enter 0 for B.S. in Kraft Reel)'],
        ['8. Unit: Select from dropdown - MT, Kg, Sheet, Pkt, Nos, Reel'],
        ['9. Quantity: Enter numeric value'],
        ['10. Rate (Rs): Optional - Enter your offer price per unit'],
        ['11. Show Rate: Select Yes or No from dropdown'],
        ['12. Comments: Optional remarks (max 400 characters)'],
        [''],
        ['DUPLICATE HANDLING:'],
        ['If a record with same Board Type, Make, Grade, Brand, GSM, and Size already exists,'],
        ['only the Quantity will be updated. Other fields will not change.'],
        [''],
        ['DROPDOWN LISTS:'],
        ['- All dropdown values are sourced from the "Lists" sheet'],
        ['- Board Type: Paper, Board, Kraft Reel'],
        ['- Unit: MT, Kg, Sheet, Pkt, Nos, Reel'],
        ['- Show Rate: Yes, No'],
        ['- Make, Grade, and Brand: Populated from database, you can type new values'],
        [''],
        ['NOTES:'],
        ['- Check the "Lists" sheet for all available dropdown options'],
        ['- Maximum 100 rows per upload'],
      ];

      instructions.forEach((row, index) => {
        instructionsSheet.getRow(index + 1).getCell(1).value = row[0];
        if (index === 0) {
          instructionsSheet.getRow(index + 1).font = { bold: true, size: 14 };
        }
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader('Content-Disposition', 'attachment; filename=bulk_upload_template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(Buffer.from(buffer));

    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({ message: 'Failed to generate template' });
    }
  });

  // Export route moved to top of file to avoid conflicts

  // Bulk Upload Process
  app.post('/api/deals/bulk-upload', requireAuth, upload.single('file'), async (req: any, res) => {
    try {
      const sellerId = req.session.memberId;

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      // Skip header
      const rows = data.slice(1).filter(row => row.length > 0 && row.some(cell => cell !== undefined && cell !== ''));

      if (rows.length === 0) {
        return res.status(400).json({ success: false, message: 'No data found' });
      }

      if (rows.length > 200) {
        return res.status(400).json({ success: false, message: 'Maximum 200 rows allowed per upload' });
      }

      const hierarchy = await dealService.getStockHierarchy();
      const groupMap: Record<string, number> = {};
      if (hierarchy.groups) {
        hierarchy.groups.forEach((group: any) => {
          if (group.GroupName) {
            groupMap[group.GroupName.toLowerCase().trim()] = group.GroupID;
          }
          // Also map string ID to ID
          groupMap[String(group.GroupID)] = group.GroupID;
        });
      }

      const errors: string[] = [];
      const validRecords: any[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        // Header: TransID, GroupID, GroupName, Make, Grade, Brand, GSM, Deckle, Grain, Unit, Qty, Rate, Show, Comments
        const transId = row[0] ? parseInt(String(row[0])) : null;
        const groupIdInput = String(row[1] || '').trim();
        const groupNameInput = String(row[2] || '').trim();

        const make = String(row[3] || '').trim();
        const grade = String(row[4] || '').trim();
        const brand = String(row[5] || '').trim();
        const gsm = parseFloat(String(row[6] || ''));
        const deckle = parseFloat(String(row[7] || ''));
        const grain = parseFloat(String(row[8] || ''));
        const unit = String(row[9] || '').trim();
        const quantity = parseFloat(String(row[10] || ''));
        const rate = row[11] !== undefined && row[11] !== '' ? parseFloat(String(row[11])) : null;
        const showRate = String(row[12] || 'Yes').toLowerCase();
        const comments = String(row[13] || '').trim();

        const rowErrors: string[] = [];

        // Validate Group
        let finalGroupId: number | undefined;
        if (groupIdInput && groupMap[groupIdInput]) {
          finalGroupId = groupMap[groupIdInput];
        } else if (groupNameInput && groupMap[groupNameInput.toLowerCase()]) {
          finalGroupId = groupMap[groupNameInput.toLowerCase()];
        }

        if (!finalGroupId) {
          rowErrors.push('Valid Group ID or Group Name is required');
        }

        if (!make) rowErrors.push('Make is required');
        if (isNaN(gsm) || gsm <= 0) rowErrors.push('GSM must be positive');
        if (isNaN(deckle) || deckle <= 0) rowErrors.push('Deckle must be positive');
        // Grain can be 0 for Kraft Reel (BF)
        // logic: if group is Kraft Reel, grain can be > 0. If regular, grain > 0.
        // Simplified check:
        if (isNaN(grain) || grain < 0) rowErrors.push('Grain must be 0 or greater');

        if (isNaN(quantity) || quantity <= 0) rowErrors.push('Quantity must be positive');

        if (rowErrors.length > 0) {
          errors.push(`Row ${rowNum}: ${rowErrors.join(', ')}`);
        } else {
          validRecords.push({
            transId,
            groupId: finalGroupId,
            make, grade, brand, gsm,
            deckle_mm: deckle * 10,
            grain_mm: grain * 10,
            unit, quantity, rate,
            showRate: showRate === 'yes' || showRate === 'true',
            comments
          });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation errors found', errors });
      }

      // Transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        let created = 0;
        let updated = 0;

        for (const record of validRecords) {
          // Resolve IDs for Update logic consistency using hierarchy
          let finalMake = record.make;
          let finalGrade = record.grade;
          let finalBrand = record.brand;

          if (hierarchy.makes) {
            const m = hierarchy.makes.find((x: any) => x.make_Name?.toLowerCase() === record.make.toLowerCase() && String(x.GroupID) === String(record.groupId));
            if (m) finalMake = m.make_ID;
          }
          if (hierarchy.grades) {
            const g = hierarchy.grades.find((x: any) => x.GradeName?.toLowerCase() === record.grade.toLowerCase());
            if (g) finalGrade = g.gradeID;
          }
          if (hierarchy.brands) {
            const b = hierarchy.brands.find((x: any) => x.brandname?.toLowerCase() === record.brand.toLowerCase());
            if (b) finalBrand = b.brandID;
          }

          const deal_title = `${record.make} ${record.grade} ${record.brand} ${record.gsm} GSM`;

          let performCreate = !record.transId;

          if (record.transId) {
            // Verify ownership
            const exists = await executeQuerySingle('SELECT TransID FROM deal_master WHERE TransID = ? AND created_by_member_id = ?', [record.transId, sellerId], 3, connection);
            if (exists) {
              const sellerComments = record.comments ? `${deal_title}\n${record.comments}` : deal_title;

              await executeQuery(`
                 UPDATE deal_master SET 
                   groupID=?, Make=?, Grade=?, Brand=?, GSM=?, Deckle_mm=?, grain_mm=?, 
                   OfferUnit=?, quantity=?, OfferPrice=?, show_rate_in_marketplace=?, Seller_comments=?, deal_updated_at=NOW()
                 WHERE TransID=?
               `, [
                record.groupId, finalMake, finalGrade, finalBrand, record.gsm, record.deckle_mm, record.grain_mm,
                record.unit, record.quantity, record.rate || 0, record.showRate, sellerComments, record.transId
              ], 3, connection);
              updated++;
            } else {
              performCreate = true;
            }
          }

          if (performCreate) {
            // Create
            await dealService.createDeal({
              seller_id: sellerId,
              group_id: record.groupId,
              make_id: 0,
              grade_id: 0,
              brand_id: 0,
              deal_title,
              make_text: record.make,
              grade_text: record.grade,
              brand_text: record.brand,
              gsm: record.gsm,
              deckle_mm: record.deckle_mm,
              grain_mm: record.grain_mm,
              unit: record.unit,
              quantity: record.quantity,
              price: record.rate || 0,
              show_rate_in_marketplace: record.showRate,
              deal_description: record.comments
            }, undefined, connection);
            created++;
          }
        }

        await connection.commit();
        res.json({ success: true, message: `Process complete: ${created} created, ${updated} updated` });

      } catch (err: any) {
        if (connection) await connection.rollback();
        console.error('Transaction error:', err);
        res.status(400).json({ success: false, message: err.message || 'Database error during upload' });
      } finally {
        if (connection) connection.release();
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, message: 'Server error detected' });
    }
  });

  // Deals (replacing products)
  app.get('/api/deals', async (req: any, res) => {
    try {
      const {
        group_id,
        make_id,
        grade_id,
        brand_id,
        makes,
        grades,
        brands,
        gsm,
        units,
        stock_status,
        search,
        location,
        seller_id,
        seller_only,
        exclude_member_id,
        status,
        sort,
        page = 1,
        limit = 20
      } = req.query;

      // If seller_only is true, use the authenticated user's ID
      let actualSellerId = seller_id ? parseInt(seller_id as string) : undefined;
      if (seller_only === 'true' && req.session?.memberId) {
        actualSellerId = req.session.memberId;
      }

      // Handle exclude_member_id from query parameter or session
      let excludeMemberId = undefined;

      // First check if exclude_member_id is explicitly provided in query
      if (exclude_member_id) {
        excludeMemberId = parseInt(exclude_member_id as string);
      }
      // Otherwise, if not viewing seller-specific products and user is logged in, exclude their own products
      else if (!actualSellerId && req.session?.memberId) {
        excludeMemberId = req.session.memberId;
      }

      const filters = {
        group_id: group_id ? parseInt(group_id as string) : undefined,
        make_id: make_id ? parseInt(make_id as string) : undefined,
        grade_id: grade_id ? parseInt(grade_id as string) : undefined,
        brand_id: brand_id ? parseInt(brand_id as string) : undefined,
        makes: makes as string,
        grades: grades as string,
        brands: brands as string,
        gsm: gsm as string,
        units: units as string,
        stock_status: stock_status as string,
        search: search as string,
        location: location as string,
        seller_id: actualSellerId,
        exclude_member_id: excludeMemberId,
        status: status as string,
        sort: sort as string,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
      };

      const result = await dealService.getDeals(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching deals:", error);
      res.status(500).json({ message: "Failed to fetch deals" });
    }
  });

  app.get('/api/deals/:id', async (req, res) => {
    try {
      const dealId = parseInt(req.params.id);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }

      const deal = await dealService.getDealById(dealId);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      res.json(deal);
    } catch (error) {
      console.error("Error fetching deal:", error);
      res.status(500).json({ message: "Failed to fetch deal" });
    }
  });

  app.post('/api/deals', requireAuth, async (req: any, res) => {
    try {
      const sellerId = req.session.memberId;

      if (!sellerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      console.log('🔍 BACKEND RECEIVED PAYLOAD:', JSON.stringify(req.body, null, 2));
      console.log('🔍 is_spare_part value:', req.body.is_spare_part, 'Type:', typeof req.body.is_spare_part);

      const {
        group_id,
        make_id,
        make_text,
        grade_id,
        grade_text,
        brand_id,
        brand_text,
        deal_title,
        deal_description,
        stock_description,
        StockAge,
        price,
        quantity,
        unit,
        min_order_quantity,
        deal_specifications,
        location,
        expires_at,
        is_spare_part,
        spare_process,
        spare_category_type,
        spare_machine_type,
        spare_manufacturer,
        spare_model,
        spare_part_name,
        spare_part_no,
      } = req.body;

      // Check if this is a spare part submission
      console.log('🔍 Checking is_spare_part:', is_spare_part, 'Condition result:', !!is_spare_part);
      if (is_spare_part) {
        console.log('✅ SPARE PART BRANCH - Validating spare part fields');
        // Validate spare part required fields (new cascading structure)
        if (!group_id || !spare_process || !spare_category_type || !spare_machine_type || !spare_manufacturer || !spare_part_name || !spare_part_no || !quantity || !unit) {
          const missingFields = [];
          if (!group_id) missingFields.push('group_id');
          if (!spare_process) missingFields.push('spare_process');
          if (!spare_category_type) missingFields.push('spare_category_type');
          if (!spare_machine_type) missingFields.push('spare_machine_type');
          if (!spare_manufacturer) missingFields.push('spare_manufacturer');
          if (!spare_part_name) missingFields.push('spare_part_name');
          if (!spare_part_no) missingFields.push('spare_part_no');
          if (!quantity) missingFields.push('quantity');
          if (!unit) missingFields.push('unit');

          return res.status(400).json({
            success: false,
            message: `Required fields are missing: ${missingFields.join(', ')}`
          });
        }
      } else {
        // Regular product validation
        const hasMake = make_id || make_text;
        const hasGrade = grade_id || grade_text;
        const hasBrand = brand_id || brand_text;

        // Check if this is a Kraft Reel group (Brand is optional for Kraft Reel)
        let isKraftReel = false;
        if (group_id) {
          try {
            const groupResult = await executeQuerySingle('SELECT GroupName FROM stock_groups WHERE GroupID = ?', [group_id]);
            isKraftReel = groupResult?.GroupName?.toLowerCase().trim() === 'kraft reel';
          } catch (error) {
            console.error('Error checking group name:', error);
          }
        }

        // Brand is optional for Kraft Reel, required for all other groups
        const brandRequired = !isKraftReel;

        if (!group_id || !hasMake || !hasGrade || (brandRequired && !hasBrand) || !deal_title || !quantity || !unit) {
          const missingFields = [];
          if (!group_id) missingFields.push('group_id');
          if (!hasMake) missingFields.push('make_id');
          if (!hasGrade) missingFields.push('grade_id');
          if (brandRequired && !hasBrand) missingFields.push('brand_id');
          if (!deal_title) missingFields.push('deal_title');
          if (!quantity) missingFields.push('quantity');
          if (!unit) missingFields.push('unit');

          return res.status(400).json({
            success: false,
            message: `Required fields are missing: ${missingFields.join(', ')}`
          });
        }
      }

      // Get user information for the deal
      const member = await executeQuerySingle('SELECT member_id, mname, company_name FROM bmpa_members WHERE member_id = ?', [sellerId]);

      const userInfo = {
        member_id: sellerId,
        name: member?.mname || '',
        company: member?.company_name || ''
      };

      const result = await dealService.createDeal({
        group_id: parseInt(group_id),
        make_id: make_id,
        make_text: make_text,
        grade_id: grade_id,
        grade_text: grade_text,
        brand_id: brand_id,
        brand_text: brand_text,
        seller_id: sellerId,
        deal_title,
        deal_description,
        stock_description,
        StockAge,
        price: price ? parseFloat(price) : 0,
        quantity: parseInt(quantity),
        unit,
        min_order_quantity: min_order_quantity ? parseInt(min_order_quantity) : 1,
        deal_specifications,
        location,
        expires_at: expires_at ? new Date(expires_at) : undefined,
        is_spare_part,
        spare_process,
        spare_category_type,
        spare_machine_type,
        spare_manufacturer,
        spare_model,
        spare_part_name,
        spare_part_no,
      }, userInfo);

      res.json(result);
    } catch (error) {
      console.error("Error creating deal:", error);
      res.status(500).json({ message: "Failed to create deal" });
    }
  });

  app.put('/api/deals/:id', requireAuth, async (req: any, res) => {
    try {
      const dealId = parseInt(req.params.id);
      const userId = req.session.memberId;

      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }

      console.log('🔄 Update Deal Request:', {
        dealId,
        userId,
        make_text: req.body.make_text,
        grade_text: req.body.grade_text,
        brand_text: req.body.brand_text,
        GSM: req.body.GSM || req.body.deal_specifications?.GSM,
        Deckle_mm: req.body.Deckle_mm || req.body.deal_specifications?.Deckle_mm,
        grain_mm: req.body.grain_mm || req.body.deal_specifications?.grain_mm,
        OfferPrice: req.body.price || req.body.OfferPrice,
        quantity: req.body.quantity,
        StockAge: req.body.StockAge
      });

      // Ensure all fields are passed through properly
      const updateData = {
        ...req.body,
        // Make sure technical specs from deal_specifications are available at top level
        GSM: req.body.GSM || req.body.deal_specifications?.GSM,
        Deckle_mm: req.body.Deckle_mm || req.body.deal_specifications?.Deckle_mm,
        grain_mm: req.body.grain_mm || req.body.deal_specifications?.grain_mm,
        // Ensure price fields are properly mapped
        OfferPrice: req.body.price || req.body.OfferPrice,
        OfferUnit: req.body.unit || req.body.OfferUnit,
        // Ensure description fields are mapped
        Seller_comments: req.body.deal_description || req.body.Seller_comments,
        stock_description: req.body.stock_description,
        StockAge: req.body.StockAge
      };

      const result = await dealService.updateDeal(dealId, userId, updateData);
      
      // Reset reminder flags when deal is updated (so 45-day countdown starts fresh)
      if (result.success) {
        const { dealReminderService } = await import('./dealReminderService');
        await dealReminderService.resetRemindersOnUpdate(dealId);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error updating deal:", error);
      res.status(500).json({ message: "Failed to update deal" });
    }
  });

  app.delete('/api/deals/:id', requireAuth, async (req: any, res) => {
    try {
      const dealId = parseInt(req.params.id);
      const userId = req.session.memberId;

      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }

      const result = await dealService.deleteDeal(dealId, userId);
      res.json(result);
    } catch (error) {
      console.error("Error deleting deal:", error);
      res.status(500).json({ message: "Failed to delete deal" });
    }
  });

  // Get reminder status for a deal
  app.get('/api/deals/:id/reminder-status', requireAuth, async (req: any, res) => {
    try {
      const dealId = parseInt(req.params.id);
      
      if (isNaN(dealId)) {
        return res.status(400).json({ success: false, message: "Invalid deal ID" });
      }
      
      const { dealReminderService } = await import('./dealReminderService');
      const status = await dealReminderService.getReminderStatus(dealId);
      
      if (!status) {
        return res.status(404).json({ success: false, message: "Deal not found" });
      }
      
      res.json({ success: true, data: status });
    } catch (error) {
      console.error("Error getting reminder status:", error);
      res.status(500).json({ success: false, message: "Failed to get reminder status" });
    }
  });

  // Mark deal as sold
  app.put('/api/deals/:id/mark-sold', requireAuth, async (req: any, res) => {
    try {
      const sellerId = req.session.memberId;
      const dealId = parseInt(req.params.id);

      if (!sellerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }

      // Update deal status through direct database query
      await executeQuery('UPDATE deal_master SET StockStatus = 2, deal_updated_at = NOW() WHERE TransID = ? AND memberID = ?', [dealId, sellerId]);
      const result = { success: true, message: 'Deal marked as sold' };
      res.json(result);
    } catch (error) {
      console.error("Error marking deal as sold:", error);
      res.status(500).json({ message: "Failed to mark deal as sold" });
    }
  });

  // Get seller statistics
  app.get('/api/seller/stats', requireAuth, async (req: any, res) => {
    try {
      const sellerId = req.session.memberId;

      if (!sellerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // First check what columns exist
      const columnsResult = await executeQuery(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'trade_bmpa25' AND table_name = 'deal_master'
      `);
      console.log('🔧 Available columns in deal_master:', columnsResult.map((r: any) => r.column_name || r.COLUMN_NAME));

      // Get total deals for this seller
      const totalDealsResult = await executeQuerySingle(`
        SELECT COUNT(*) as count FROM deal_master WHERE memberID = ?
      `, [sellerId]);

      // Get active deals (StockStatus = 1)
      const activeDealsResult = await executeQuerySingle(`
        SELECT COUNT(*) as count FROM deal_master WHERE memberID = ? AND StockStatus = 1
      `, [sellerId]);

      // Get sold deals (StockStatus = 2)
      const soldDealsResult = await executeQuerySingle(`
        SELECT COUNT(*) as count FROM deal_master WHERE memberID = ? AND StockStatus = 2
      `, [sellerId]);

      // Calculate total revenue from sold deals
      const revenueResult = await executeQuerySingle(`
        SELECT COALESCE(SUM(COALESCE(OfferPrice,0) * COALESCE(quantity,0)), 0) as revenue
        FROM deal_master
        WHERE memberID = ? AND StockStatus = 2
      `, [sellerId]);

      // Get enquiries sent BY this member (as buyer)
      const inquiriesSentResult = await executeQuerySingle(`
        SELECT COUNT(*) as count FROM BMPA_inquiries WHERE buyer_id = ?
      `, [sellerId]);

      // Get enquiries received BY this member (as seller)
      const inquiriesReceivedResult = await executeQuerySingle(`
        SELECT COUNT(*) as count FROM bmpa_received_inquiries WHERE seller_id = ?
      `, [sellerId]);

      const stats = {
        totalDeals: totalDealsResult?.count || 0,
        activeDeals: activeDealsResult?.count || 0,
        soldDeals: soldDealsResult?.count || 0,
        totalRevenue: revenueResult?.revenue || 0,
        inquiriesSent: inquiriesSentResult?.count || 0,
        inquiriesReceived: inquiriesReceivedResult?.count || 0,
        // For backward compatibility
        totalProducts: totalDealsResult?.count || 0,
        totalOrders: soldDealsResult?.count || 0
      };

      console.log('📊 Seller Stats Debug for member', sellerId, ':', {
        totalDeals: totalDealsResult?.count || 0,
        activeDeals: activeDealsResult?.count || 0,
        soldDeals: soldDealsResult?.count || 0,
        calculatedSold: (totalDealsResult?.count || 0) - (activeDealsResult?.count || 0),
        totalRevenue: revenueResult?.revenue || 0,
        inquiriesSent: inquiriesSentResult?.count || 0,
        inquiriesReceived: inquiriesReceivedResult?.count || 0
      });

      console.log('📧 Enquiry Counts:', {
        sent: inquiriesSentResult?.count || 0,
        received: inquiriesReceivedResult?.count || 0
      });

      // Prevent caching of stats data and disable ETag
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.removeHeader('ETag');
      res.removeHeader('Last-Modified');

      res.json(stats);
    } catch (error) {
      console.error('Error fetching seller stats:', error);
      res.status(500).json({ message: 'Failed to fetch seller stats' });
    }
  });




  // Keep stock listings for backward compatibility - now using deals
  app.get('/api/stock/listings', async (req, res) => {
    try {
      const {
        group_id,
        make_id,
        grade_id,
        brand_id,
        search,
        location,
        sellerId,
        status,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        group_id: group_id ? parseInt(group_id as string) : undefined,
        make_id: make_id ? parseInt(make_id as string) : undefined,
        grade_id: grade_id ? parseInt(grade_id as string) : undefined,
        brand_id: brand_id ? parseInt(brand_id as string) : undefined,
        search: search as string,
        location: location as string,
        seller_id: sellerId ? parseInt(sellerId as string) : undefined,
        status: status as string,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
      };

      const result = await dealService.getDeals(filters);

      // Format response to match old structure
      res.json({
        listings: result.deals,
        total: result.total
      });
    } catch (error) {
      console.error("Error fetching stock listings:", error);
      res.status(500).json({ message: "Failed to fetch stock listings" });
    }
  });

  app.get('/api/stock/listings/:id', async (req, res) => {
    try {
      const dealId = parseInt(req.params.id);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid listing ID" });
      }

      const listing = await dealService.getDealById(dealId);
      if (!listing) {
        return res.status(404).json({ message: "Stock listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Error fetching stock listing:", error);
      res.status(500).json({ message: "Failed to fetch stock listing" });
    }
  });

  // Redirect to deals endpoint for creating listings
  app.post('/api/stock/listings', requireAuth, async (req: any, res) => {
    try {
      const sellerId = req.session.memberId;

      if (!sellerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // This endpoint now redirects to deals - inform client to use /api/deals
      res.status(400).json({
        success: false,
        message: 'Please use /api/deals endpoint for creating new listings',
        redirect: '/api/deals'
      });
    } catch (error) {
      console.error("Error with stock listing creation:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Redirect to deals endpoint for updating listings
  app.put('/api/stock/listings/:id', requireAuth, async (req: any, res) => {
    try {
      // This endpoint now redirects to deals - inform client to use /api/deals
      res.status(400).json({
        success: false,
        message: `Please use /api/deals/${req.params.id} endpoint for updating listings`,
        redirect: `/api/deals/${req.params.id}`
      });
    } catch (error) {
      console.error("Error with stock listing update:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Redirect to deals endpoint for deleting listings
  app.delete('/api/stock/listings/:id', requireAuth, async (req: any, res) => {
    try {
      // This endpoint now redirects to deals - inform client to use /api/deals
      res.status(400).json({
        success: false,
        message: `Please use /api/deals/${req.params.id} endpoint for deleting listings`,
        redirect: `/api/deals/${req.params.id}`
      });
    } catch (error) {
      console.error("Error with stock listing deletion:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Orders/Inquiries - fetch from MySQL inquiries table (used for tabs display)
  app.get('/api/orders', async (req: any, res) => {
    try {
      // Check if user is authenticated via session (not Replit auth)
      if (!req.session.memberId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const memberId = req.session.memberId;
      const role = req.query.role as 'buyer' | 'seller' || 'seller';

      console.log(`🔍 Fetching inquiries for member ${memberId} with role ${role}`);

      let orders = [];

      if (role === 'seller') {
        // Get inquiries where this member is the seller (inquiries received FROM buyers)
        orders = await executeQuery(`
          SELECT 
            i.*,
            i.product_id as deal_id,
            COALESCE(d.stock_description, CONCAT(d.Make, ' ', d.Brand, ' ', d.Grade)) as product_title,
            d.OfferPrice,
            d.TransID,
            i.buyer_name,
            i.buyer_company,
            i.buyer_email,
            i.quoted_price,
            i.quantity,
            i.message,
            i.status
          FROM BMPA_inquiries i
          LEFT JOIN deal_master d ON i.product_id = d.TransID
          WHERE d.memberID = ? OR d.created_by_member_id = ? OR i.seller_id = ?
          ORDER BY i.created_at DESC
        `, [memberId, memberId, memberId]);

      } else if (role === 'buyer') {
        // Get inquiries sent BY this member TO sellers (Counter Offers)
        // First get the member's email to match inquiries
        const memberInfo = await executeQuerySingle(`
          SELECT email FROM bmpa_members WHERE member_id = ?
        `, [memberId]);

        if (memberInfo && memberInfo.email) {
          orders = await executeQuery(`
            SELECT 
              i.*,
              i.product_id as deal_id,
              COALESCE(d.stock_description, CONCAT(d.Make, ' ', d.Brand, ' ', d.Grade)) as product_title,
              d.OfferPrice,
              d.TransID,
              m.mname as seller_name,
              m.company_name as seller_company,
              i.quoted_price,
              i.quantity,
              i.message,
              i.status
            FROM BMPA_inquiries i
            LEFT JOIN deal_master d ON i.product_id = d.TransID
            LEFT JOIN bmpa_members m ON d.memberID = m.member_id
            WHERE i.buyer_email = ? OR i.buyer_id = ?
            ORDER BY i.created_at DESC
          `, [memberInfo.email, memberId]);
        }
      }

      // Format orders for frontend
      const formattedOrders = orders.map((order: any) => ({
        id: `ORD-${order.id}`,
        product_title: order.product_title || 'Unknown Product',
        quantity: order.quantity || 'N/A',
        total_amount: order.total_amount || order.OfferPrice || 0,
        status: order.status || 'pending',
        created_at: order.created_at,
        buyer_name: order.buyer_name || 'Unknown Buyer',
        seller_name: order.seller_name || 'Unknown Seller'
      }));

      console.log(`📦 Found ${formattedOrders.length} orders for member ${memberId}`);
      res.json(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({
        message: 'Failed to fetch orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Send inquiry endpoint
  app.post('/api/inquiries/send', requireAuth, async (req: any, res) => {
    try {
      const {
        subject,
        buyerName,
        buyerCompany,
        buyerEmail,
        buyerPhone,
        productId,
        productTitle,
        productDetails,
        buyerQuotedPrice,
        quantity,
        message,
        sellerName,
        sellerCompany
      } = req.body;

      // Get authenticated user
      const buyerId = req.session.memberId;
      if (!buyerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // First, get the seller information including email from the database
      // If seller is a child user, get parent's email instead
      const sellerQuery = await executeQuerySingle(`
        SELECT
          d.created_by_member_id as seller_id,
          CASE
            WHEN mb.user_type = 'child' THEN parent.email
            ELSE mb.email
          END as seller_email,
          CASE
            WHEN mb.user_type = 'child' THEN parent.mname
            ELSE mb.mname
          END as seller_name,
          CASE
            WHEN mb.user_type = 'child' THEN parent.company_name
            ELSE mb.company_name
          END as seller_company,
          mb.user_type,
          mb.child_user_name
        FROM deal_master d
        LEFT JOIN bmpa_members mb ON d.created_by_member_id = mb.member_id
        LEFT JOIN bmpa_members parent ON mb.parent_member_id = parent.member_id
        WHERE d.TransID = ?
      `, [productId]);

      if (!sellerQuery) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const sellerId = sellerQuery.seller_id;
      const sellerEmail = sellerQuery.seller_email;

      if (!sellerEmail) {
        return res.status(400).json({
          success: false,
          message: 'Seller email not found. Cannot send inquiry.'
        });
      }

      console.log(`📧 Sending inquiry to ${sellerQuery.user_type === 'child' ? 'parent' : 'seller'} email: ${sellerEmail}`);

      // Generate inquiry email HTML
      const inquiryData: InquiryEmailData = {
        buyerName,
        buyerCompany,
        buyerEmail,
        buyerPhone,
        productId,
        productTitle,
        productDetails,
        quantity,
        message,
        sellerName: sellerQuery.seller_name || sellerName,
        sellerCompany: sellerQuery.seller_company || sellerCompany
      };

      console.log('📧 Inquiry Email Data:', JSON.stringify({
        productDetails: inquiryData.productDetails,
        quantity: inquiryData.quantity,
        hasUnit: !!inquiryData.productDetails?.unit,
        unit: inquiryData.productDetails?.unit
      }, null, 2));

      const emailHtml = generateInquiryEmail(inquiryData);

      // Send email using emailService to the actual seller's email
      const emailSent = await sendEmail({
        to: sellerEmail, // Use the actual seller email from database
        subject,
        html: emailHtml
      });

      if (emailSent) {
        // Log the inquiry to both tables for tracking
        try {

          // Generate unique inquiry reference
          const inquiryRef = `INQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Insert into BMPA_inquiries (for the buyer - Counter Offers tab)
          await executeQuery(`
            INSERT INTO BMPA_inquiries (
              inquiry_ref,
              product_id, 
              buyer_id,
              buyer_name, 
              buyer_email, 
              buyer_company, 
              buyer_phone, 
              seller_id,
              seller_name,
              seller_company,
              quantity,
              message,
              status,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NOW())
          `, [
            inquiryRef,
            productId,
            buyerId, // Use the authenticated user's ID
            buyerName,
            buyerEmail,
            buyerCompany || null,
            buyerPhone || null,
            sellerId,
            sellerName || null,
            sellerCompany || null,
            quantity || null,
            message || null
          ]);

          // Insert into bmpa_received_inquiries (for the seller - Inquiries tab)
          await executeQuery(`
            INSERT INTO bmpa_received_inquiries (
              inquiry_ref,
              seller_id,
              buyer_id,
              buyer_name,
              buyer_email,
              buyer_company,
              buyer_phone,
              product_id,
              product_title,
              quantity,
              message,
              status,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NOW())
          `, [
            inquiryRef,
            sellerId,
            buyerId,
            buyerName,
            buyerEmail,
            buyerCompany || null,
            buyerPhone || null,
            productId,
            productTitle || '',
            quantity || null,
            message || null
          ]);

          console.log('✅ Inquiry logged to both BMPA_inquiries and bmpa_received_inquiries tables');

          // Update buyer's inquiry count in their profile
          await executeQuery(`
            UPDATE bmpa_members 
            SET total_inquiries_sent = COALESCE(total_inquiries_sent, 0) + 1,
                last_inquiry_date = NOW()
            WHERE member_id = ?
          `, [buyerId]);

          console.log('✅ Updated buyer profile with inquiry count');

          // Create notification for seller (if seller exists)
          if (sellerId) {
            await executeQuery(`
              INSERT INTO BMPA_seller_notifications (
                seller_id,
                notification_type,
                inquiry_id,
                buyer_name,
                product_id,
                message,
                is_read,
                created_at
              )
              VALUES (?, 'new_inquiry', LAST_INSERT_ID(), ?, ?, ?, 0, NOW())
            `, [sellerId, buyerName, productId, `New inquiry for your product from ${buyerName}`]);

            console.log('✅ Created notification for seller');
          }
        } catch (dbError) {
          console.error('❌ Error logging inquiry to database:', dbError);
          // Don't fail the request if DB logging fails
        }

        res.json({
          success: true,
          message: 'Inquiry sent successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send inquiry email'
        });
      }
    } catch (error) {
      console.error('Error sending inquiry:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send inquiry',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get inquiries received by seller (MySQL)
  app.get('/api/inquiries/seller', requireAuth, async (req: any, res) => {
    try {
      const sellerId = req.session.memberId;

      if (!sellerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get inquiries received by this seller from bmpa_received_inquiries table
      const inquiries = await executeQuery(`
        SELECT
          i.*,
          d.Seller_comments as product_details,
          d.OfferPrice as seller_offer_price,
          d.quantity as seller_offer_quantity,
          d.OfferUnit as product_unit,
          d.Deckle_mm,
          d.grain_mm,
          d.TransID as deal_id,
          m.mname as seller_name,
          m.company_name as seller_company
        FROM bmpa_received_inquiries i
        LEFT JOIN deal_master d ON i.product_id = d.TransID
        LEFT JOIN bmpa_members m ON i.seller_id = m.member_id
        WHERE i.seller_id = ?
        ORDER BY i.created_at DESC
      `, [sellerId]);

      res.json({ success: true, inquiries });
    } catch (error) {
      console.error('Error fetching seller inquiries:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inquiries'
      });
    }
  });

  // Get inquiries sent by buyer (MySQL) - Counter Offers
  app.get('/api/inquiries/buyer', requireAuth, async (req: any, res) => {
    try {
      const buyerId = req.session.memberId;

      if (!buyerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get inquiries sent by this buyer from BMPA_inquiries table
      const inquiries = await executeQuery(`
        SELECT
          i.*,
          COALESCE(d.stock_description, CONCAT(d.Make, ' ', d.Brand, ' ', d.Grade)) as product_details,
          d.OfferPrice as seller_offer_price,
          d.quantity as seller_offer_quantity,
          d.OfferUnit as product_unit,
          d.Deckle_mm,
          d.grain_mm,
          d.TransID as deal_id,
          sm.mname as seller_name,
          sm.company_name as seller_company,
          sm.email as seller_email
        FROM BMPA_inquiries i
        LEFT JOIN deal_master d ON i.product_id = d.TransID
        LEFT JOIN bmpa_members sm ON i.seller_id = sm.member_id
        WHERE i.buyer_id = ?
        ORDER BY i.created_at DESC
      `, [buyerId]);

      res.json({ success: true, inquiries });
    } catch (error) {
      console.error('Error fetching buyer inquiries:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inquiries'
      });
    }
  });

  // ============================================
  // RAZORPAY PAYMENT ROUTES
  // ============================================

  // Create Razorpay order for membership payment
  app.post('/api/razorpay/create-order', requireAuth, async (req: any, res) => {
    try {
      // Check if Razorpay is configured
      if (!isRazorpayConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Payment gateway is not configured. Please contact support.'
        });
      }

      const memberId = req.session.memberId;
      if (!memberId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get member details
      const member = await executeQuerySingle(`
        SELECT member_id, email, mname, company_name 
        FROM bmpa_members 
        WHERE member_id = ?
      `, [memberId]);

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }

      // BMPA Membership fee: ₹2,118 + 18% GST = ₹2,499
      const amount = 249900; // Amount in paise (₹2,499)
      const currency = 'INR';

      // Create Razorpay order
      const order = await createRazorpayOrder({
        amount,
        currency,
        receipt: `receipt_${memberId}_${Date.now()}`,
        notes: {
          member_id: memberId.toString(),
          member_email: member.email,
          member_name: member.mname,
          company_name: member.company_name || '',
          payment_for: 'BMPA Membership',
          amount_inr: '2499'
        }
      });

      console.log('✅ Razorpay order created successfully:', order.id);

      // Log payment attempt in database
      await executeQuery(`
        INSERT INTO bmpa_payment_history (
          member_id,
          order_id,
          amount,
          currency,
          status,
          payment_method,
          created_at
        ) VALUES (?, ?, ?, ?, 'pending', 'razorpay', NOW())
      `, [memberId, order.id, 2499, currency]);

      res.json({
        success: true,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID
      });

    } catch (error: any) {
      console.error('Error creating Razorpay order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment order',
        error: error.message
      });
    }
  });

  // Verify Razorpay payment
  app.post('/api/razorpay/verify-payment', requireAuth, async (req: any, res) => {
    try {
      const memberId = req.session.memberId;
      if (!memberId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing payment verification data'
        });
      }

      // Verify payment signature
      const verificationData: RazorpayPaymentVerification = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      };

      const isValid = verifyRazorpayPayment(verificationData);

      if (!isValid) {
        // Update payment status to failed
        await executeQuery(`
          UPDATE bmpa_payment_history 
          SET status = 'failed', 
              payment_id = ?,
              updated_at = NOW()
          WHERE order_id = ? AND member_id = ?
        `, [razorpay_payment_id, razorpay_order_id, memberId]);

        return res.status(400).json({
          success: false,
          message: 'Payment verification failed. Invalid signature.'
        });
      }

      // Payment verified successfully - update member status
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      await executeQuery(`
        UPDATE bmpa_members
        SET
          membership_paid = 1,
          mstatus = 1,
          membership_valid_till = ?
        WHERE member_id = ?
      `, [oneYearFromNow, memberId]);

      // Update payment history
      await executeQuery(`
        UPDATE bmpa_payment_history
        SET
          status = 'success',
          payment_id = ?,
          signature = ?,
          updated_at = NOW()
        WHERE order_id = ? AND member_id = ?
      `, [razorpay_payment_id, razorpay_signature, razorpay_order_id, memberId]);

      console.log('✅ Payment verified and member status updated for member:', memberId);

      // Update session with new membership status so user can access marketplace immediately
      req.session.membershipPaid = true;
      req.session.membershipValidTill = oneYearFromNow;
      req.session.mstatus = 1;

      // Save session to ensure changes persist
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error('Session save error after payment:', err);
            reject(err);
          } else {
            console.log('✅ Session updated with new membership status');
            resolve();
          }
        });
      });

      // Send payment success email
      try {
        // Fetch updated member details
        const updatedMember = await executeQuerySingle(`
          SELECT mname, email, company_name
          FROM bmpa_members
          WHERE member_id = ?
        `, [memberId]);

        if (updatedMember) {
          const paymentDate = new Date().toLocaleString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
          });

          const paymentEmailData: PaymentSuccessEmailData = {
            memberName: updatedMember.mname,
            memberEmail: updatedMember.email,
            companyName: updatedMember.company_name || 'Your Company',
            amount: '2,499',
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            paymentDate: paymentDate
          };

          const emailHtml = generatePaymentSuccessEmail(paymentEmailData);

          await sendEmail({
            to: updatedMember.email,
            subject: '✓ Payment Successful - Stock Laabh Membership',
            html: emailHtml
          });

          console.log('✅ Payment success email sent to:', updatedMember.email);
        }
      } catch (emailError) {
        console.error('❌ Error sending payment success email:', emailError);
        // Don't fail the payment verification if email fails
      }

      // Fetch complete updated member data to return to frontend
      const completeUpdatedMember = await executeQuerySingle(`
        SELECT member_id, mname, email, phone, company_name, address1, address2, city, state,
               membership_paid, membership_valid_till, mstatus, last_login, role, user_type,
               parent_member_id, child_user_name, company_id
        FROM bmpa_members
        WHERE member_id = ?
      `, [memberId]);

      res.json({
        success: true,
        message: 'Payment verified successfully. Membership activated!',
        membership_valid_till: oneYearFromNow,
        member: completeUpdatedMember ? {
          id: completeUpdatedMember.member_id,
          name: completeUpdatedMember.mname,
          firstName: completeUpdatedMember.mname,
          email: completeUpdatedMember.email,
          phone: completeUpdatedMember.phone,
          company: completeUpdatedMember.company_name,
          address1: completeUpdatedMember.address1,
          address2: completeUpdatedMember.address2,
          city: completeUpdatedMember.city,
          state: completeUpdatedMember.state,
          membershipPaid: completeUpdatedMember.membership_paid,
          membershipValidTill: completeUpdatedMember.membership_valid_till,
          status: completeUpdatedMember.mstatus,
          last_login: completeUpdatedMember.last_login,
          role: completeUpdatedMember.role || 'buyer',
          user_type: completeUpdatedMember.user_type || null,
          parent_member_id: completeUpdatedMember.parent_member_id || null,
          child_user_name: completeUpdatedMember.child_user_name || null,
          company_id: completeUpdatedMember.company_id || null
        } : null
      });

    } catch (error: any) {
      console.error('Error verifying Razorpay payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify payment',
        error: error.message
      });
    }
  });

  // Get payment status
  app.get('/api/razorpay/payment-status/:orderId', requireAuth, async (req: any, res) => {
    try {
      const memberId = req.session.memberId;
      const orderId = req.params.orderId;

      if (!memberId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const payment = await executeQuerySingle(`
        SELECT * FROM bmpa_payment_history 
        WHERE order_id = ? AND member_id = ?
      `, [orderId, memberId]);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      res.json({
        success: true,
        payment
      });

    } catch (error: any) {
      console.error('Error fetching payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment status',
        error: error.message
      });
    }
  });

  // Check Razorpay configuration status
  app.get('/api/razorpay/status', async (req, res) => {
    try {
      const configured = isRazorpayConfigured();
      res.json({
        success: true,
        configured,
        message: configured
          ? 'Razorpay is configured and ready'
          : 'Razorpay is not configured'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to check Razorpay status',
        error: error.message
      });
    }
  });

  // Get payment history for logged-in member
  app.get('/api/payment-history', requireAuth, async (req: any, res) => {
    try {
      const memberId = req.session.memberId;
      if (!memberId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const payments = await executeQuery(`
        SELECT
          id,
          order_id,
          payment_id,
          amount,
          currency,
          status,
          payment_method,
          created_at as date
        FROM bmpa_payment_history
        WHERE member_id = ?
        ORDER BY created_at DESC
      `, [memberId]);

      res.json({
        success: true,
        payments
      });

    } catch (error: any) {
      console.error('Error fetching payment history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment history',
        error: error.message
      });
    }
  });

  // Create HTTP server
  return createServer(app);
}
