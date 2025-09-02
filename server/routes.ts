import type { Express } from "express";
import { createServer, type Server } from "http";
import { authRouter } from "./authRoutes";
import { otpService } from "./otpService";
import { adminService } from "./adminService";
import { dealService } from "./dealService";
import { storage } from "./storage";
import { executeQuery, executeQuerySingle } from "./database";

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
          MakeID: 1,
          GradeID: 1,
          BrandID: 1,
          memberID: 1,
          Seller_comments: 'Premium ITC FBB CYBER XL - 80GSM\nHigh-quality offset printing paper, perfect for books, magazines, and brochures. Excellent ink absorption and bright white finish.',
          OfferPrice: 45.50,
          OfferUnit: 'sheets'
        },
        {
          groupID: 1,
          MakeID: 1,
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
          deal.MakeID,
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
        search,
        location,
        seller_id,
        seller_only,
        status,
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
        search: search as string,
        location: location as string,
        seller_id: actualSellerId,
        status: status as string,
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
        grade_id,
        brand_id,
        deal_title,
        deal_description,
        price,
        quantity,
        unit,
        min_order_quantity,
        deal_specifications,
        location,
        expires_at
      } = req.body;

      if (!group_id || !make_id || !grade_id || !brand_id || !deal_title || !price || !quantity || !unit) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing: group_id, make_id, grade_id, brand_id, deal_title, price, quantity, unit'
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
        make_id: parseInt(make_id),
        grade_id: parseInt(grade_id),
        brand_id: parseInt(brand_id),
        seller_id: sellerId,
        deal_title,
        deal_description,
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
      await executeQuery('UPDATE deal_master SET Status = "sold", UpdatedAt = NOW() WHERE DealID = ? AND SellerID = ?', [dealId, sellerId]);
      const result = { success: true, message: 'Deal marked as sold' };
      res.json(result);
    } catch (error) {
      console.error("Error marking deal as sold:", error);
      res.status(500).json({ message: "Failed to mark deal as sold" });
    }
  });

  // Chat endpoints
  app.post('/api/chat/start', requireAuth, async (req: any, res) => {
    try {
      const buyerId = req.session.memberId;
      const { dealId, sellerId } = req.body;
      
      if (!buyerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!dealId || !sellerId) {
        return res.status(400).json({
          success: false,
          message: 'Deal ID and Seller ID are required'
        });
      }

      // Check if chat already exists
      const existingChat = await executeQuerySingle(`
        SELECT * FROM bmpa_chats 
        WHERE deal_id = ? AND buyer_id = ? AND seller_id = ?
      `, [dealId, buyerId, sellerId]);

      if (existingChat) {
        return res.json({
          success: true,
          chatId: existingChat.id,
          message: 'Chat already exists'
        });
      }

      // Create new chat
      const chatId = 'chat-' + Math.random().toString(36).substr(2, 9);
      
      await executeQuery(`
        INSERT INTO bmpa_chats (id, deal_id, buyer_id, seller_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', NOW(), NOW())
      `, [chatId, dealId, buyerId, sellerId]);

      res.json({
        success: true,
        chatId: chatId,
        message: 'Chat started successfully'
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      res.status(500).json({ message: "Failed to start chat" });
    }
  });

  app.get('/api/chat/:chatId/messages', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.memberId;
      const { chatId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Verify user is part of the chat
      const chat = await executeQuerySingle(`
        SELECT * FROM bmpa_chats WHERE id = ? AND (buyer_id = ? OR seller_id = ?)
      `, [chatId, userId, userId]);

      if (!chat) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this chat'
        });
      }

      // Mark messages as read for the current user (messages sent by others)
      const updateResult = await executeQuery(`
        UPDATE bmpa_chat_messages 
        SET is_read = 1 
        WHERE chat_id = ? AND sender_id != ? AND is_read = 0
      `, [chatId, userId]);
      
      console.log(`🔧 Update result for chat ${chatId}:`, updateResult);
      
      // Verify the update worked
      const unreadCheck = await executeQuery(`
        SELECT COUNT(*) as count FROM bmpa_chat_messages 
        WHERE chat_id = ? AND sender_id != ? AND is_read = 0
      `, [chatId, userId]);
      
      console.log(`🔧 Remaining unread in chat ${chatId}:`, unreadCheck[0]?.count || 0);

      // Get messages
      const messages = await executeQuery(`
        SELECT m.*, mem.mname as sender_name, mem.company_name as sender_company
        FROM bmpa_chat_messages m
        LEFT JOIN bmpa_members mem ON m.sender_id = mem.member_id
        WHERE m.chat_id = ?
        ORDER BY m.created_at ASC
      `, [chatId]);

      // Disable caching by setting appropriate headers
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json({
        success: true,
        messages: messages,
        chat: chat
      });
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
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

  // Orders
  app.get('/api/orders', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const role = req.query.role as 'buyer' | 'seller' || 'buyer';
      
      const orders = await storage.getOrdersByUser(userId, role);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post('/api/orders', requireAuth, async (req: any, res) => {
    try {
      const buyerId = (req.user as any)?.claims?.sub;
      const validatedData = insertOrderSchema.parse(req.body);
      
      // Get stock listing to determine seller and price
      const listing = await storage.getStockListingById(validatedData.stockListingId);
      if (!listing) {
        return res.status(404).json({ message: "Stock listing not found" });
      }
      
      if (listing.quantity < validatedData.quantity) {
        return res.status(400).json({ message: "Insufficient stock available" });
      }
      
      const unitPrice = parseFloat(listing.price);
      const totalAmount = unitPrice * validatedData.quantity;
      
      const order = await storage.createOrder({
        ...validatedData,
        buyerId,
        sellerId: listing.sellerId,
        unitPrice,
        totalAmount,
      });
      
      // Update stock quantity
      await storage.updateStockListing(listing.id, {
        quantity: listing.quantity - validatedData.quantity,
      });
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.put('/api/orders/:id/status', requireAuth, async (req: any, res) => {
    try {
      const orderId = req.params.id;
      const { status, trackingNumber } = req.body;
      
      const order = await storage.updateOrderStatus(orderId, status, trackingNumber);
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Messages
  app.get('/api/messages', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const messages = await storage.getMessagesByUser(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', requireAuth, async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
      const validatedData = insertMessageSchema.parse(req.body);
      
      const message = await storage.createMessage({
        ...validatedData,
        senderId,
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // OTP verification
  app.post('/api/otp/send', async (req, res) => {
    try {
      const { email, mobileNumber, type } = req.body;
      
      if (!email && !mobileNumber) {
        return res.status(400).json({ message: "Email or mobile number required" });
      }
      
      const otp = randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await storage.createOtpVerification({
        email,
        mobileNumber,
        type,
        otp,
        expiresAt,
      });
      
      // TODO: Implement actual email/SMS sending
      console.log(`OTP for ${type}: ${otp}`);
      
      res.json({ message: "OTP sent successfully" });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post('/api/otp/verify', async (req, res) => {
    try {
      const { identifier, otp, type } = req.body;
      
      const isValid = await storage.verifyOtp(identifier, otp, type);
      
      if (isValid) {
        res.json({ message: "OTP verified successfully" });
      } else {
        res.status(400).json({ message: "Invalid or expired OTP" });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  // Analytics (Admin only)
  app.get('/api/analytics', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Stripe subscription for membership
  app.post('/api/create-subscription', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        return res.json({
          subscriptionId: subscription.id,
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        });
      }

      if (!user.email) {
        return res.status(400).json({ message: "User email required" });
      }

      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user.id,
            companyName: user.companyName || '',
          },
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(user.id, customerId);
      }

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price_data: {
            currency: 'inr',
            product: {
              name: 'Stock Laabh Annual Membership',
            },
            unit_amount: 249900, // ₹2,499 in paise
            recurring: {
              interval: 'year',
            },
          },
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(user.id, customerId, subscription.id);

      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Webhook for Stripe events
  app.post('/api/stripe/webhook', async (req, res) => {
    try {
      const event = req.body;

      switch (event.type) {
        case 'invoice.payment_succeeded':
          const invoice = event.data.object;
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const customerId = subscription.customer as string;
          
          // Find user by customer ID and update membership
          const userRecord = await storage.getUser(customerId);
          if (userRecord) {
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            
            await storage.updateUserMembership(userRecord.id, 'active', expiryDate);
            await storage.createPayment({
              userId: userRecord.id,
              stripePaymentIntentId: invoice.payment_intent,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency,
              status: 'succeeded',
              paymentType: 'membership',
              metadata: { subscriptionId: subscription.id },
            });
          }
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      res.status(500).json({ message: "Webhook error" });
    }
  });


  // Temporary endpoint to fix database schema
  app.post('/api/fix-database', async (req, res) => {
    try {
      console.log('🔧 Fixing database schema...');
      
      // Try to drop the problematic constraint directly
      const constraintsToTry = ['products_ibfk_2', 'products_ibfk_1', 'fk_products_category', 'fk_products_bmpa_category'];
      
      for (const constraintName of constraintsToTry) {
        try {
          await executeQuery(`ALTER TABLE bmpa_products DROP FOREIGN KEY ${constraintName}`);
          console.log(`✅ Dropped constraint: ${constraintName}`);
        } catch (error: any) {
          console.log(`ℹ️ Constraint ${constraintName} might not exist:`, error.message);
        }
      }
      
      // Add the correct foreign key constraint with a new name each time
      const newConstraintName = `fk_products_bmpa_cat_${Date.now()}`;
      try {
        await executeQuery(`ALTER TABLE bmpa_products ADD CONSTRAINT ${newConstraintName} FOREIGN KEY (category_id) REFERENCES bmpa_categories(category_id) ON DELETE RESTRICT`);
        console.log(`✅ Added new foreign key constraint: ${newConstraintName}`);
      } catch (error: any) {
        console.log('Foreign key error:', error.message);
      }
      
      // Insert demo categories if they don't exist
      const demoCategories = [
        ['Commercial Printing', 'High-volume commercial printing equipment and supplies'],
        ['Digital Printing', 'Digital printing machines and consumables'],
        ['Offset Printing', 'Offset printing presses and materials'],
        ['Screen Printing', 'Screen printing equipment and inks'],
        ['Paper & Substrates', 'Various papers and printing substrates'],
        ['Inks & Chemicals', 'Printing inks, chemicals and consumables']
      ];

      for (const [name, description] of demoCategories) {
        try {
          await executeQuery('INSERT IGNORE INTO bmpa_categories (category_name, description, is_active) VALUES (?, ?, 1)', [name, description]);
        } catch (error) {
          console.log('Category might already exist:', name);
        }
      }
      console.log('✅ Demo categories added');
      
      res.json({ success: true, message: 'Database schema fixed successfully' });
    } catch (error) {
      console.error('Error fixing database:', error);
      res.status(500).json({ success: false, message: 'Failed to fix database schema', error: error.message });
    }
  });

  // Temporary endpoint to add demo products
  // Chat/Messaging Routes
  app.post('/api/chat/start', requireAuth, async (req: any, res) => {
    try {
      const { productId, sellerId } = req.body;
      const buyerId = req.session.memberId;

      if (!productId || !sellerId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID and seller ID are required'
        });
      }

      // Check if chat already exists
      const existingChat = await executeQuery(`
        SELECT * FROM bmpa_chats 
        WHERE product_id = ? AND buyer_id = ? AND seller_id = ?
      `, [productId, buyerId, sellerId]);

      let chatId;
      if (existingChat.length > 0) {
        chatId = existingChat[0].id;
      } else {
        // Create new chat
        chatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await executeQuery(`
          INSERT INTO bmpa_chats (id, product_id, buyer_id, seller_id)
          VALUES (?, ?, ?, ?)
        `, [chatId, productId, buyerId, sellerId]);
      }

      res.json({
        success: true,
        chatId: chatId,
        message: 'Chat started successfully'
      });

    } catch (error) {
      console.error('Error starting chat:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start chat'
      });
    }
  });

  app.get('/api/chat/:chatId/messages', requireAuth, async (req: any, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.session.memberId;

      // Verify user is part of this chat
      const chat = await executeQuery(`
        SELECT * FROM bmpa_chats 
        WHERE id = ? AND (buyer_id = ? OR seller_id = ?)
      `, [chatId, userId, userId]);

      if (chat.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this chat'
        });
      }

      // Get messages
      const messages = await executeQuery(`
        SELECT 
          m.*,
          mb.mname as sender_name,
          mb.company_name as sender_company
        FROM bmpa_chat_messages m
        JOIN bmpa_members mb ON m.sender_id = mb.member_id
        WHERE m.chat_id = ?
        ORDER BY m.created_at ASC
      `, [chatId]);

      res.json({
        success: true,
        messages: messages,
        chat: chat[0]
      });

    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch messages'
      });
    }
  });

  app.post('/api/chat/:chatId/messages', requireAuth, async (req: any, res) => {
    try {
      const { chatId } = req.params;
      const { message } = req.body;
      const senderId = req.session.memberId;

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required'
        });
      }

      // Verify user is part of this chat
      const chat = await executeQuery(`
        SELECT * FROM bmpa_chats 
        WHERE id = ? AND (buyer_id = ? OR seller_id = ?)
      `, [chatId, senderId, senderId]);

      if (chat.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this chat'
        });
      }

      // Insert message
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await executeQuery(`
        INSERT INTO bmpa_chat_messages (id, chat_id, sender_id, message)
        VALUES (?, ?, ?, ?)
      `, [messageId, chatId, senderId, message.trim()]);

      // Update chat timestamp
      await executeQuery(`
        UPDATE bmpa_chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [chatId]);

      res.json({
        success: true,
        messageId: messageId,
        message: 'Message sent successfully'
      });

    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message'
      });
    }
  });

  app.get('/api/chats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.memberId;

      const chats = await executeQuery(`
        SELECT 
          c.*,
          p.title as product_title,
          buyer.mname as buyer_name,
          buyer.company_name as buyer_company,
          seller.mname as seller_name,
          seller.company_name as seller_company,
          (SELECT COUNT(*) FROM bmpa_chat_messages WHERE chat_id = c.id AND sender_id != ? AND is_read = 0) as unread_count,
          (SELECT message FROM bmpa_chat_messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
        FROM bmpa_chats c
        LEFT JOIN bmpa_products p ON c.product_id = p.id
        JOIN bmpa_members buyer ON c.buyer_id = buyer.member_id
        JOIN bmpa_members seller ON c.seller_id = seller.member_id
        WHERE c.buyer_id = ? OR c.seller_id = ?
        ORDER BY c.updated_at DESC
      `, [userId, userId, userId]);

      res.json({
        success: true,
        chats: chats
      });

    } catch (error) {
      console.error('Error fetching chats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chats'
      });
    }
  });

  // Get total unread message count for navigation badge
  app.get('/api/messages/unread-count', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.memberId;
      
      console.log(`🔧 Checking unread count for user ${userId}`);
      
      const result = await executeQuerySingle(`
        SELECT COUNT(*) as unread_count
        FROM bmpa_chat_messages cm
        JOIN bmpa_chats c ON cm.chat_id = c.id
        WHERE (c.buyer_id = ? OR c.seller_id = ?) 
        AND cm.sender_id != ? 
        AND cm.is_read = 0
      `, [userId, userId, userId]);

      console.log(`🔧 Unread count result:`, result);

      res.json({
        success: true,
        unreadCount: result?.unread_count || 0
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count'
      });
    }
  });

  app.post('/api/add-demo-products', async (req, res) => {
    try {
      console.log('📦 Adding demo products...');
      
      // Get categories first
      const categories = await executeQuery('SELECT * FROM bmpa_categories LIMIT 6');
      console.log('Available categories:', categories.map((c: any) => c.category_name));
      
      if (categories.length === 0) {
        return res.status(400).json({ success: false, message: 'No categories found' });
      }
      
      // Add demo products
      const demoProducts = [
        {
          id: 'prod-hp-001',
          title: 'HP Indigo 12000 Digital Press',
          description: 'State-of-the-art digital printing press for high-quality commercial printing',
          price: 2500000,
          quantity: 1,
          unit: 'piece',
          location: 'Mumbai, Maharashtra',
          seller_id: 2,
          category_id: categories[1].category_id, // Digital Printing
          specifications: JSON.stringify({brand: 'HP', model: 'Indigo 12000', printWidth: '750mm'})
        },
        {
          id: 'prod-paper-001',
          title: 'Premium Coated Paper 300gsm',
          description: 'High-quality coated paper ideal for brochures and catalogs',
          price: 85,
          quantity: 500,
          unit: 'kg',
          location: 'Delhi',
          seller_id: 2,
          category_id: categories[4].category_id, // Paper & Substrates
          specifications: JSON.stringify({weight: '300gsm', finish: 'Gloss Coated'})
        },
        {
          id: 'prod-ink-001',
          title: 'Offset Printing Ink - CMYK Set',
          description: 'Professional grade offset printing inks for commercial printing',
          price: 12500,
          quantity: 20,
          unit: 'set',
          location: 'Bangalore, Karnataka',
          seller_id: 2,
          category_id: categories[5].category_id, // Inks & Chemicals
          specifications: JSON.stringify({type: 'Sheet-fed Offset', colors: 'CMYK'})
        }
      ];

      for (const product of demoProducts) {
        try {
          await executeQuery(`
            INSERT IGNORE INTO products 
            (id, title, description, price, quantity, unit, location, seller_id, category_id, specifications, status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', NOW())
          `, [
            product.id, product.title, product.description, product.price, 
            product.quantity, product.unit, product.location, product.seller_id, 
            product.category_id, product.specifications
          ]);
          console.log('✅ Added product:', product.title);
        } catch (error) {
          console.log('Product might already exist:', product.title);
        }
      }
      
      res.json({ success: true, message: 'Demo products added successfully' });
    } catch (error) {
      console.error('Error adding demo products:', error);
      res.status(500).json({ success: false, message: 'Failed to add demo products' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
