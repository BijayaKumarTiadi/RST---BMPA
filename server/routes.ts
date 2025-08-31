import type { Express } from "express";
import { createServer, type Server } from "http";
import { authRouter } from "./authRoutes";
import { otpService } from "./otpService";
import { adminService } from "./adminService";
import { storage } from "./storage";

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
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Stock listings
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
        categoryId: categoryId as string,
        search: search as string,
        location: location as string,
        sellerId: sellerId as string,
        status: status as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const result = await storage.getStockListings(filters);
      
      // Track search query for analytics
      if (search) {
        await storage.createSearchQuery({
          userId: (req.user as any)?.claims?.sub,
          query: search as string,
          filters: { categoryId, location, status },
          resultsCount: result.total,
        });
      }

      res.json(result);
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

  const httpServer = createServer(app);
  return httpServer;
}
