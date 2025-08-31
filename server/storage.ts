import {
  users,
  stockListings,
  orders,
  messages,
  categories,
  otpVerifications,
  payments,
  searchQueries,
  type User,
  type UpsertUser,
  type StockListing,
  type InsertStockListing,
  type Order,
  type InsertOrder,
  type Message,
  type InsertMessage,
  type Category,
  type OtpVerification,
  type InsertOtpVerification,
  type Payment,
  type SearchQuery,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, ilike, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserMembership(id: string, status: string, expiryDate?: Date): Promise<User | undefined>;
  updateUserStripeInfo(id: string, customerId: string, subscriptionId?: string): Promise<User | undefined>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  
  // Stock operations
  getStockListings(filters?: {
    categoryId?: string;
    search?: string;
    location?: string;
    sellerId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ listings: StockListing[]; total: number }>;
  getStockListingById(id: string): Promise<StockListing | undefined>;
  createStockListing(data: InsertStockListing & { sellerId: string }): Promise<StockListing>;
  updateStockListing(id: string, data: Partial<InsertStockListing>): Promise<StockListing | undefined>;
  deleteStockListing(id: string): Promise<boolean>;
  
  // Order operations
  getOrdersByUser(userId: string, role: 'buyer' | 'seller'): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  createOrder(data: InsertOrder & { buyerId: string; sellerId: string; unitPrice: number; totalAmount: number }): Promise<Order>;
  updateOrderStatus(id: string, status: string, trackingNumber?: string): Promise<Order | undefined>;
  
  // Message operations
  getMessagesByUser(userId: string): Promise<Message[]>;
  createMessage(data: InsertMessage & { senderId: string }): Promise<Message>;
  markMessageAsRead(id: string): Promise<Message | undefined>;
  
  // OTP operations
  createOtpVerification(data: InsertOtpVerification & { userId?: string; otp: string; expiresAt: Date }): Promise<OtpVerification>;
  verifyOtp(identifier: string, otp: string, type: string): Promise<boolean>;
  
  // Payment operations
  createPayment(data: {
    userId: string;
    orderId?: string;
    stripePaymentIntentId?: string;
    amount: number;
    currency?: string;
    status: string;
    paymentType: string;
    metadata?: any;
  }): Promise<Payment>;
  
  // Analytics
  getAnalytics(userId?: string): Promise<{
    totalUsers: number;
    activeListings: number;
    totalOrders: number;
    monthlyRevenue: number;
  }>;
  createSearchQuery(data: { userId?: string; query: string; filters?: any; resultsCount: number }): Promise<SearchQuery>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserMembership(id: string, status: string, expiryDate?: Date): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        membershipStatus: status as any,
        membershipExpiryDate: expiryDate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeInfo(id: string, customerId: string, subscriptionId?: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getCategories(): Promise<Category[]> {
    const result = await db.select().from(categories).orderBy(asc(categories.name));
    return result as Category[];
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getStockListings(filters?: {
    categoryId?: string;
    search?: string;
    location?: string;
    sellerId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ listings: StockListing[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let query = db.select().from(stockListings);
    let countQuery = db.select({ count: count() }).from(stockListings);
    
    const conditions = [];
    
    if (filters?.categoryId) {
      conditions.push(eq(stockListings.categoryId, filters.categoryId));
    }
    
    if (filters?.search) {
      conditions.push(
        or(
          ilike(stockListings.title, `%${filters.search}%`),
          ilike(stockListings.description, `%${filters.search}%`)
        )
      );
    }
    
    if (filters?.location) {
      conditions.push(ilike(stockListings.location, `%${filters.location}%`));
    }
    
    if (filters?.sellerId) {
      conditions.push(eq(stockListings.sellerId, filters.sellerId));
    }
    
    if (filters?.status) {
      conditions.push(eq(stockListings.status, filters.status as any));
    }

    conditions.push(eq(stockListings.isActive, true));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }
    
    const listings = await query
      .orderBy(desc(stockListings.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [totalResult] = await countQuery;
    
    return {
      listings,
      total: totalResult.count,
    };
  }

  async getStockListingById(id: string): Promise<StockListing | undefined> {
    const [listing] = await db.select().from(stockListings).where(eq(stockListings.id, id));
    return listing;
  }

  async createStockListing(data: InsertStockListing & { sellerId: string }): Promise<StockListing> {
    const [listing] = await db
      .insert(stockListings)
      .values(data)
      .returning();
    return listing;
  }

  async updateStockListing(id: string, data: Partial<InsertStockListing>): Promise<StockListing | undefined> {
    const [listing] = await db
      .update(stockListings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stockListings.id, id))
      .returning();
    return listing;
  }

  async deleteStockListing(id: string): Promise<boolean> {
    const result = await db
      .update(stockListings)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(stockListings.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getOrdersByUser(userId: string, role: 'buyer' | 'seller'): Promise<Order[]> {
    const condition = role === 'buyer' 
      ? eq(orders.buyerId, userId)
      : eq(orders.sellerId, userId);
    
    return await db
      .select()
      .from(orders)
      .where(condition)
      .orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(data: InsertOrder & { 
    buyerId: string; 
    sellerId: string; 
    unitPrice: number; 
    totalAmount: number 
  }): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values([data])
      .returning();
    return order;
  }

  async updateOrderStatus(id: string, status: string, trackingNumber?: string): Promise<Order | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
    
    const [order] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getMessagesByUser(userId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(data: InsertMessage & { senderId: string }): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(data)
      .returning();
    return message;
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    const [message] = await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  async createOtpVerification(data: InsertOtpVerification & { 
    userId?: string; 
    otp: string; 
    expiresAt: Date 
  }): Promise<OtpVerification> {
    const [otp] = await db
      .insert(otpVerifications)
      .values(data)
      .returning();
    return otp;
  }

  async verifyOtp(identifier: string, otp: string, type: string): Promise<boolean> {
    const condition = type === 'email' 
      ? eq(otpVerifications.email, identifier)
      : eq(otpVerifications.mobileNumber, identifier);
    
    const [verification] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          condition,
          eq(otpVerifications.otp, otp),
          eq(otpVerifications.type, type),
          eq(otpVerifications.isVerified, false),
          sql`${otpVerifications.expiresAt} > NOW()`
        )
      )
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);
    
    if (verification) {
      await db
        .update(otpVerifications)
        .set({ isVerified: true })
        .where(eq(otpVerifications.id, verification.id));
      return true;
    }
    
    return false;
  }

  async createPayment(data: {
    userId: string;
    orderId?: string;
    stripePaymentIntentId?: string;
    amount: number;
    currency?: string;
    status: string;
    paymentType: string;
    metadata?: any;
  }): Promise<Payment> {
    const [payment] = await db
      .insert(payments)
      .values([data])
      .returning();
    return payment;
  }

  async getAnalytics(userId?: string): Promise<{
    totalUsers: number;
    activeListings: number;
    totalOrders: number;
    monthlyRevenue: number;
  }> {
    const totalUsersResult = await db.select({ count: count() }).from(users);
    const activeListingsResult = await db
      .select({ count: count() })
      .from(stockListings)
      .where(and(eq(stockListings.isActive, true), eq(stockListings.status, 'available')));
    
    const totalOrdersResult = await db.select({ count: count() }).from(orders);
    
    const monthlyRevenueResult = await db
      .select({ sum: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'succeeded'),
          sql`${payments.createdAt} >= date_trunc('month', CURRENT_DATE)`
        )
      );
    
    return {
      totalUsers: totalUsersResult[0].count,
      activeListings: activeListingsResult[0].count,
      totalOrders: totalOrdersResult[0].count,
      monthlyRevenue: monthlyRevenueResult[0].sum || 0,
    };
  }

  async createSearchQuery(data: { 
    userId?: string; 
    query: string; 
    filters?: any; 
    resultsCount: number 
  }): Promise<SearchQuery> {
    const [searchQuery] = await db
      .insert(searchQueries)
      .values(data)
      .returning();
    return searchQuery;
  }
}

export const storage = new DatabaseStorage();
