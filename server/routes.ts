import type { Express } from "express";
import { createServer, type Server } from "http";
import { authRouter } from "./authRoutes";
import { otpService } from "./otpService";
import { adminService } from "./adminService";
import { productService } from "./productService";
import { storage } from "./storage";
import { executeQuery } from "./database";

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

      // Get member from members table
      const members = await executeQuery('SELECT * FROM members WHERE email = ?', [email]);
      
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

      // Store member in session
      req.session.memberId = member.id;
      req.session.memberEmail = member.email;
      req.session.isAuthenticated = true;

      console.log(`✅ Simple login successful for ${email}`);

      res.json({
        success: true,
        message: 'Login successful',
        member: {
          id: member.id,
          email: member.email,
          company_name: member.company_name,
          contact_person: member.contact_person,
          role: member.role,
          membership_status: member.membership_status
        }
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
      const categories = await productService.getCategories();
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

      const result = await productService.createCategory(name, description, parent_id);
      res.json(result);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Products (replacing stock listings)
  app.get('/api/products', async (req, res) => {
    try {
      const {
        category_id,
        search,
        location,
        seller_id,
        status,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        category_id: category_id as string,
        search: search as string,
        location: location as string,
        seller_id: seller_id ? parseInt(seller_id as string) : undefined,
        status: status as string,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
      };

      const result = await productService.getProducts(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await productService.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post('/api/products', requireAuth, async (req: any, res) => {
    try {
      const sellerId = req.session.memberId;
      
      if (!sellerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const {
        category_id,
        title,
        description,
        price,
        quantity,
        unit,
        min_order_quantity,
        image_urls,
        specifications,
        location,
        expiry_date
      } = req.body;

      if (!category_id || !title || !price || !quantity || !unit) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing'
        });
      }

      const result = await productService.createProduct({
        seller_id: sellerId,
        category_id,
        title,
        description,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        unit,
        min_order_quantity: min_order_quantity ? parseInt(min_order_quantity) : 1,
        image_urls: image_urls || [],
        specifications,
        location,
        expiry_date: expiry_date ? new Date(expiry_date) : undefined,
      });

      res.json(result);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put('/api/products/:id', requireAuth, async (req: any, res) => {
    try {
      const productId = req.params.id;
      const sellerId = req.session.memberId;
      
      const result = await productService.updateProduct(productId, sellerId, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', requireAuth, async (req: any, res) => {
    try {
      const productId = req.params.id;
      const sellerId = req.session.memberId;
      
      const result = await productService.deleteProduct(productId, sellerId);
      res.json(result);
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Keep stock listings for backward compatibility
  app.get('/api/stock/listings', async (req, res) => {
    try {
      const {
        categoryId,
        search,
        location,
        sellerId,
        status,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        category_id: categoryId as string,
        search: search as string,
        location: location as string,
        seller_id: sellerId ? parseInt(sellerId as string) : undefined,
        status: status as string,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
      };

      const result = await productService.getProducts(filters);
      
      // Format response to match old structure
      res.json({
        listings: result.products,
        total: result.total
      });
    } catch (error) {
      console.error("Error fetching stock listings:", error);
      res.status(500).json({ message: "Failed to fetch stock listings" });
    }
  });

  app.get('/api/stock/listings/:id', async (req, res) => {
    try {
      const listing = await storage.getStockListingById(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Stock listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Error fetching stock listing:", error);
      res.status(500).json({ message: "Failed to fetch stock listing" });
    }
  });

  app.post('/api/stock/listings', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const validatedData = insertStockListingSchema.parse(req.body);
      
      const listing = await storage.createStockListing({
        ...validatedData,
        sellerId: userId,
      });
      
      res.status(201).json(listing);
    } catch (error) {
      console.error("Error creating stock listing:", error);
      res.status(500).json({ message: "Failed to create stock listing" });
    }
  });

  app.put('/api/stock/listings/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const listingId = req.params.id;
      
      // Check if user owns the listing
      const existingListing = await storage.getStockListingById(listingId);
      if (!existingListing || existingListing.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized to update this listing" });
      }
      
      const validatedData = insertStockListingSchema.partial().parse(req.body);
      const updatedListing = await storage.updateStockListing(listingId, validatedData);
      
      res.json(updatedListing);
    } catch (error) {
      console.error("Error updating stock listing:", error);
      res.status(500).json({ message: "Failed to update stock listing" });
    }
  });

  app.delete('/api/stock/listings/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const listingId = req.params.id;
      
      // Check if user owns the listing
      const existingListing = await storage.getStockListingById(listingId);
      if (!existingListing || existingListing.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized to delete this listing" });
      }
      
      await storage.deleteStockListing(listingId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting stock listing:", error);
      res.status(500).json({ message: "Failed to delete stock listing" });
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

  // Object Storage Routes for images
  app.post('/api/objects/upload', requireAuth, async (req: any, res) => {
    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.put('/api/product-images', requireAuth, async (req: any, res) => {
    try {
      const { imageURL } = req.body;
      
      if (!imageURL) {
        return res.status(400).json({
          success: false,
          message: 'Image URL is required'
        });
      }

      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(imageURL);

      res.json({
        success: true,
        message: 'Image URL processed successfully',
        objectPath
      });
    } catch (error) {
      console.error("Error processing image URL:", error);
      res.status(500).json({ message: "Failed to process image URL" });
    }
  });

  // Route to serve uploaded images from object storage
  app.get('/objects/:objectPath(*)', async (req, res) => {
    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // Stream the file to the response
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      res.status(404).json({ message: "Image not found" });
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
          await executeQuery(`ALTER TABLE products DROP FOREIGN KEY ${constraintName}`);
          console.log(`✅ Dropped constraint: ${constraintName}`);
        } catch (error: any) {
          console.log(`ℹ️ Constraint ${constraintName} might not exist:`, error.message);
        }
      }
      
      // Add the correct foreign key constraint with a new name each time
      const newConstraintName = `fk_products_bmpa_cat_${Date.now()}`;
      try {
        await executeQuery(`ALTER TABLE products ADD CONSTRAINT ${newConstraintName} FOREIGN KEY (category_id) REFERENCES bmpa_categories(category_id) ON DELETE RESTRICT`);
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
