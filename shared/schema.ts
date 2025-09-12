import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "BMPS_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'buyer', 'seller', 'both']);
export const membershipStatusEnum = pgEnum('membership_status', ['pending', 'active', 'expired', 'suspended']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);
export const stockStatusEnum = pgEnum('stock_status', ['available', 'low_stock', 'out_of_stock', 'discontinued']);

// Users table for Replit Auth
export const users = pgTable("BMPS_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('buyer'),
  companyName: varchar("company_name"),
  designation: varchar("designation"),
  mobileNumber: varchar("mobile_number"),
  businessCategory: varchar("business_category"),
  gstNumber: varchar("gst_number"),
  membershipStatus: membershipStatusEnum("membership_status").default('pending'),
  membershipExpiryDate: timestamp("membership_expiry_date"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  isEmailVerified: boolean("is_email_verified").default(false),
  isMobileVerified: boolean("is_mobile_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories for stock items
export const categories = pgTable("BMPS_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  parentId: varchar("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stock listings
export const stockListings = pgTable("BMPS_stock_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").references(() => users.id).notNull(),
  categoryId: varchar("category_id").references(() => categories.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  minOrderQuantity: integer("min_order_quantity").default(1),
  status: stockStatusEnum("status").default('available'),
  imageUrls: text("image_urls").array(),
  specifications: jsonb("specifications"),
  location: varchar("location"),
  isActive: boolean("is_active").default(true),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders
export const orders = pgTable("BMPS_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").references(() => users.id).notNull(),
  sellerId: varchar("seller_id").references(() => users.id).notNull(),
  stockListingId: varchar("stock_listing_id").references(() => stockListings.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default('pending'),
  notes: text("notes"),
  shippingAddress: jsonb("shipping_address"),
  trackingNumber: varchar("tracking_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages between users
export const messages = pgTable("BMPS_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  receiverId: varchar("receiver_id").references(() => users.id).notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  stockListingId: varchar("stock_listing_id").references(() => stockListings.id),
  subject: varchar("subject", { length: 200 }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// OTP verifications
export const otpVerifications = pgTable("BMPS_otp_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  email: varchar("email"),
  mobileNumber: varchar("mobile_number"),
  otp: varchar("otp", { length: 6 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'email' or 'sms'
  isVerified: boolean("is_verified").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments
export const payments = pgTable("BMPS_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default('INR'),
  status: varchar("status", { length: 20 }).notNull(),
  paymentType: varchar("payment_type", { length: 50 }).notNull(), // 'membership', 'order', 'listing_fee'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Search queries for analytics
export const searchQueries = pgTable("BMPS_search_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  query: text("query").notNull(),
  filters: jsonb("filters"),
  resultsCount: integer("results_count"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inquiries from buyers to sellers
export const inquiries = pgTable("BMPS_inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stockListingId: varchar("stock_listing_id").references(() => stockListings.id).notNull(),
  buyerId: varchar("buyer_id").references(() => users.id).notNull(),
  sellerId: varchar("seller_id").references(() => users.id).notNull(),
  buyerName: varchar("buyer_name", { length: 255 }).notNull(),
  buyerEmail: varchar("buyer_email", { length: 255 }).notNull(),
  buyerCompany: varchar("buyer_company", { length: 255 }),
  buyerPhone: varchar("buyer_phone", { length: 20 }),
  quotedPrice: varchar("quoted_price", { length: 50 }),
  quantity: varchar("quantity", { length: 100 }),
  message: text("message"),
  isRead: boolean("is_read").default(false),
  status: varchar("status", { length: 20 }).default('pending'), // 'pending', 'responded', 'converted', 'declined'
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema definitions for validation
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  companyName: true,
  designation: true,
  mobileNumber: true,
  businessCategory: true,
  gstNumber: true,
  role: true,
});

export const insertStockListingSchema = createInsertSchema(stockListings).pick({
  categoryId: true,
  title: true,
  description: true,
  price: true,
  quantity: true,
  unit: true,
  minOrderQuantity: true,
  specifications: true,
  location: true,
  expiryDate: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  stockListingId: true,
  quantity: true,
  notes: true,
  shippingAddress: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  receiverId: true,
  orderId: true,
  stockListingId: true,
  subject: true,
  content: true,
});

export const insertOtpVerificationSchema = createInsertSchema(otpVerifications).pick({
  email: true,
  mobileNumber: true,
  type: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).pick({
  stockListingId: true,
  buyerName: true,
  buyerEmail: true,
  buyerCompany: true,
  buyerPhone: true,
  quotedPrice: true,
  quantity: true,
  message: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type StockListing = typeof stockListings.$inferSelect;
export type InsertStockListing = z.infer<typeof insertStockListingSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Category = typeof categories.$inferSelect;
export type OtpVerification = typeof otpVerifications.$inferSelect;
export type InsertOtpVerification = z.infer<typeof insertOtpVerificationSchema>;
export type Payment = typeof payments.$inferSelect;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;

// Relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories),
  stockListings: many(stockListings),
}));

export const usersRelations = relations(users, ({ many }) => ({
  stockListings: many(stockListings),
  buyerOrders: many(orders, {
    relationName: "buyerOrders",
  }),
  sellerOrders: many(orders, {
    relationName: "sellerOrders",
  }),
  sentMessages: many(messages, {
    relationName: "sentMessages",
  }),
  receivedMessages: many(messages, {
    relationName: "receivedMessages",
  }),
  buyerInquiries: many(inquiries, {
    relationName: "buyerInquiries",
  }),
  sellerInquiries: many(inquiries, {
    relationName: "sellerInquiries",
  }),
  payments: many(payments),
  searchQueries: many(searchQueries),
  otpVerifications: many(otpVerifications),
}));

export const stockListingsRelations = relations(stockListings, ({ one, many }) => ({
  seller: one(users, {
    fields: [stockListings.sellerId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [stockListings.categoryId],
    references: [categories.id],
  }),
  orders: many(orders),
  messages: many(messages),
  inquiries: many(inquiries),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
    relationName: "buyerOrders",
  }),
  seller: one(users, {
    fields: [orders.sellerId],
    references: [users.id],
    relationName: "sellerOrders",
  }),
  stockListing: one(stockListings, {
    fields: [orders.stockListingId],
    references: [stockListings.id],
  }),
  messages: many(messages),
  payments: many(payments),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
  order: one(orders, {
    fields: [messages.orderId],
    references: [orders.id],
  }),
  stockListing: one(stockListings, {
    fields: [messages.stockListingId],
    references: [stockListings.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

export const otpVerificationsRelations = relations(otpVerifications, ({ one }) => ({
  user: one(users, {
    fields: [otpVerifications.userId],
    references: [users.id],
  }),
}));

export const searchQueriesRelations = relations(searchQueries, ({ one }) => ({
  user: one(users, {
    fields: [searchQueries.userId],
    references: [users.id],
  }),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  buyer: one(users, {
    fields: [inquiries.buyerId],
    references: [users.id],
    relationName: "buyerInquiries",
  }),
  seller: one(users, {
    fields: [inquiries.sellerId],
    references: [users.id],
    relationName: "sellerInquiries",
  }),
  stockListing: one(stockListings, {
    fields: [inquiries.stockListingId],
    references: [stockListings.id],
  }),
}));
