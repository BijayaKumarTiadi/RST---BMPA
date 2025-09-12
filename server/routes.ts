import type { Express } from "express";
import { createServer, type Server } from "http";
import { authRouter } from "./authRoutes";
import { otpService } from "./otpService";
import { adminService } from "./adminService";
import { dealService } from "./dealService";
import { storage } from "./storage";
import { executeQuery, executeQuerySingle } from "./database";
import { sendEmail, generateInquiryEmail, type InquiryEmailData } from "./emailService";
import searchRouter from "./searchRoutes";
import suggestionRouter from "./suggestionRoutes";
import advancedSearchRouter from "./advancedSearchRoutes";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Clean up expired OTPs periodically
  setInterval(() => {
    otpService.cleanupExpiredOTPs().catch(console.error);
  }, 5 * 60 * 1000); // Every 5 minutes

  // Auth routes
  app.use('/api/auth', authRouter);
  
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
        price,
        quantity,
        unit,
        min_order_quantity,
        deal_specifications,
        location,
        expires_at
      } = req.body;

      // Validate that we have either ID or text for make, grade, and brand
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
      
      if (!group_id || !hasMake || !hasGrade || (brandRequired && !hasBrand) || !deal_title || !price || !quantity || !unit) {
        const missingFields = [];
        if (!group_id) missingFields.push('group_id');
        if (!hasMake) missingFields.push('make_id');
        if (!hasGrade) missingFields.push('grade_id');
        if (brandRequired && !hasBrand) missingFields.push('brand_id');
        if (!deal_title) missingFields.push('deal_title');
        if (!price) missingFields.push('price');
        if (!quantity) missingFields.push('quantity');
        if (!unit) missingFields.push('unit');
        
        return res.status(400).json({
          success: false,
          message: `Required fields are missing: ${missingFields.join(', ')}`
        });
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
        price: parseFloat(price),
        quantity: parseInt(quantity),
        unit,
        min_order_quantity: min_order_quantity ? parseInt(min_order_quantity) : 1,
        deal_specifications,
        location,
        expires_at: expires_at ? new Date(expires_at) : undefined,
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
      
      const result = await dealService.updateDeal(dealId, userId, req.body);
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

      const stats = {
        totalDeals: totalDealsResult?.count || 0,
        activeDeals: activeDealsResult?.count || 0,
        soldDeals: soldDealsResult?.count || 0,
        totalRevenue: revenueResult?.revenue || 0,
        // For backward compatibility
        totalProducts: totalDealsResult?.count || 0,
        totalOrders: soldDealsResult?.count || 0
      };

      console.log('📊 Seller Stats Debug for member', sellerId, ':', {
        totalDeals: totalDealsResult?.count || 0,
        activeDeals: activeDealsResult?.count || 0,
        soldDeals: soldDealsResult?.count || 0,
        calculatedSold: (totalDealsResult?.count || 0) - (activeDealsResult?.count || 0),
        totalRevenue: revenueResult?.revenue || 0
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
            d.Seller_comments as product_title,
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
              d.Seller_comments as product_title,
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
        to,
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

      // Generate inquiry email HTML
      const inquiryData: InquiryEmailData = {
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
      };
      
      const emailHtml = generateInquiryEmail(inquiryData);
      
      // Send email using emailService
      const emailSent = await sendEmail({
        to,
        subject,
        html: emailHtml
      });
      
      if (emailSent) {
        // Log the inquiry to BMPA_inquiries table for tracking
        try {
          // First, get the seller_id from the product/deal
          const dealQuery = await executeQuerySingle(`
            SELECT memberID FROM deal_master WHERE TransID = ?
          `, [productId]);
          
          const sellerId = dealQuery?.memberID || null;
          
          // Insert inquiry with both buyer and seller tracking
          await executeQuery(`
            INSERT INTO BMPA_inquiries (
              product_id, 
              buyer_id,
              buyer_name, 
              buyer_email, 
              buyer_company, 
              buyer_phone, 
              seller_id,
              seller_name,
              seller_company,
              quoted_price, 
              quantity, 
              message, 
              status,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
          `, [
            productId,
            buyerId, // Use the authenticated user's ID
            buyerName,
            buyerEmail,
            buyerCompany || null,
            buyerPhone || null,
            sellerId,
            sellerName || null,
            sellerCompany || null,
            buyerQuotedPrice || null,
            quantity || null,
            message || null
          ]);
          
          console.log('✅ Inquiry logged to BMPA_inquiries table with buyer and seller tracking');
          
          // Update buyer's inquiry count in their profile
          await executeQuery(`
            UPDATE BMPA_members 
            SET total_inquiries_sent = COALESCE(total_inquiries_sent, 0) + 1,
                last_inquiry_date = NOW()
            WHERE memberID = ?
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

      // Get inquiries for deals that belong to this seller
      const inquiries = await executeQuery(`
        SELECT 
          i.*,
          d.Seller_comments as product_title,
          d.OfferPrice,
          d.TransID as deal_id,
          m.mname as seller_name,
          m.company_name as seller_company
        FROM BMPA_inquiries i
        LEFT JOIN deal_master d ON i.product_id = d.TransID
        LEFT JOIN bmpa_members m ON d.memberID = m.member_id
        WHERE d.memberID = ? OR d.created_by_member_id = ?
        ORDER BY i.created_at DESC
      `, [sellerId, sellerId]);

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

      // Get the member's email to match against buyer_email in inquiries
      const member = await executeQuerySingle(`
        SELECT email FROM bmpa_members WHERE member_id = ?
      `, [buyerId]);

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }

      // Get inquiries sent by this buyer (using their email)
      const inquiries = await executeQuery(`
        SELECT 
          i.*,
          d.Seller_comments as product_title,
          d.OfferPrice,
          d.TransID as deal_id,
          sm.mname as seller_name,
          sm.company_name as seller_company,
          sm.email as seller_email
        FROM BMPA_inquiries i
        LEFT JOIN deal_master d ON i.product_id = d.TransID
        LEFT JOIN bmpa_members sm ON d.memberID = sm.member_id
        WHERE i.buyer_email = ?
        ORDER BY i.created_at DESC
      `, [member.email]);

      res.json({ success: true, inquiries });
    } catch (error) {
      console.error('Error fetching buyer inquiries:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch inquiries' 
      });
    }
  });

  // Create HTTP server
  return createServer(app);
}
