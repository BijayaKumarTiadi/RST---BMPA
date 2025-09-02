import { executeQuery, executeQuerySingle } from './database.js';
import crypto from 'crypto';

export interface Deal {
  DealID: number;
  GroupID: number;
  MakeID: number;
  GradeID: number;
  BrandID: number;
  SellerID: number;
  DealTitle: string;
  DealDescription: string;
  Price: number;
  Quantity: number;
  Unit: string;
  MinOrderQuantity: number;
  Location: string;
  DealSpecifications: any;
  Status: 'active' | 'inactive' | 'sold' | 'expired';
  ExpiresAt?: Date;
  CreatedAt: Date;
  UpdatedAt: Date;
  // Joined fields
  GroupName?: string;
  MakeName?: string;
  GradeName?: string;
  BrandName?: string;
  seller_name?: string;
  seller_company?: string;
  seller_email?: string;
  seller_phone?: string;
}

export interface CreateDealData {
  group_id: number;
  make_id: number;
  grade_id: number;
  brand_id: number;
  seller_id: number;
  deal_title: string;
  deal_description?: string;
  price: number;
  quantity: number;
  unit: string;
  min_order_quantity?: number;
  location?: string;
  deal_specifications?: any;
  expires_at?: Date;
}

export interface StockHierarchy {
  groups: Array<{ GroupID: number; GroupName: string }>;
  makes: Array<{ make_ID: number; GroupID: number; make_Name: string }>;
  grades: Array<{ gradeID: number; Make_ID: number; GradeName: string }>;
  brands: Array<{ brandID: number; make_ID: number; brandname: string }>;
}

class DealService {
  // Get stock hierarchy data for form dropdowns
  async getStockHierarchy(): Promise<StockHierarchy> {
    try {
      const [groups, makes, grades, brands] = await Promise.all([
        executeQuery('SELECT GroupID, GroupName FROM stock_groups WHERE IsActive = 1 ORDER BY GroupName'),
        executeQuery('SELECT make_ID, GroupID, make_Name FROM stock_make_master WHERE IsActive = 1 ORDER BY make_Name'),
        executeQuery('SELECT gradeID, Make_ID, GradeName FROM stock_grade WHERE IsActive = 1 ORDER BY GradeName'),
        executeQuery('SELECT brandID, make_ID, brandname FROM stock_brand WHERE IsActive = 1 ORDER BY brandname')
      ]);

      return { groups, makes, grades, brands };
    } catch (error) {
      console.error('Error fetching stock hierarchy:', error);
      return { groups: [], makes: [], grades: [], brands: [] };
    }
  }

  // Get all deals with optional filtering
  async getDeals(filters?: {
    group_id?: number;
    make_id?: number;
    grade_id?: number;
    brand_id?: number;
    seller_id?: number;
    status?: string;
    search?: string;
    location?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ deals: Deal[]; total: number }> {
    try {
      let whereConditions = ['1=1']; // Remove Status filter for now
      let params: any[] = [];

      if (filters?.group_id) {
        whereConditions.push('d.groupID = ?');
        params.push(filters.group_id);
      }

      if (filters?.make_id) {
        whereConditions.push('d.MakeID = ?');
        params.push(filters.make_id);
      }

      if (filters?.grade_id) {
        whereConditions.push('d.GradeID = ?');
        params.push(filters.grade_id);
      }

      if (filters?.brand_id) {
        whereConditions.push('d.BrandID = ?');
        params.push(filters.brand_id);
      }

      if (filters?.seller_id) {
        whereConditions.push('d.memberID = ?');
        params.push(filters.seller_id);
      }

      // Status filtering disabled for now
      // if (filters?.status) {
      //   whereConditions.push('d.Status = ?');
      //   params.push(filters.status);
      // }

      if (filters?.search) {
        whereConditions.push('(d.Seller_comments LIKE ? OR g.GroupName LIKE ? OR m.make_Name LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters?.location) {
        whereConditions.push('d.Location LIKE ?');
        params.push(`%${filters.location}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM deal_master d 
        LEFT JOIN stock_groups g ON d.groupID = g.GroupID
        LEFT JOIN stock_make_master m ON d.MakeID = m.make_ID
        ${whereClause}
      `;
      const countResult = await executeQuerySingle(countQuery, params);
      const total = countResult?.total || 0;

      // Get deals with pagination
      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;

      const dealsQuery = `
        SELECT 
          d.*,
          g.GroupName,
          m.make_Name as MakeName,
          gr.GradeName,
          b.brandname as BrandName,
          mb.mname as seller_name,
          mb.company_name as seller_company,
          mb.email as seller_email,
          mb.phone as seller_phone
        FROM deal_master d
        LEFT JOIN stock_groups g ON d.groupID = g.GroupID
        LEFT JOIN stock_make_master m ON d.MakeID = m.make_ID
        LEFT JOIN stock_grade gr ON d.GradeID = gr.gradeID
        LEFT JOIN stock_brand b ON d.BrandID = b.brandID
        LEFT JOIN bmpa_members mb ON d.memberID = mb.member_id
        ${whereClause}
        ORDER BY d.uplaodDate DESC
        LIMIT ? OFFSET ?
      `;

      const deals = await executeQuery(dealsQuery, [...params, limit, offset]);

      // Parse JSON fields safely
      const parsedDeals = deals.map((deal: any) => {
        let specifications = null;
        
        if (deal.DealSpecifications) {
          try {
            if (typeof deal.DealSpecifications === 'string') {
              specifications = JSON.parse(deal.DealSpecifications);
            } else if (typeof deal.DealSpecifications === 'object') {
              specifications = deal.DealSpecifications;
            }
          } catch (error) {
            console.error('Error parsing specifications for deal:', deal.DealID, error);
            specifications = null;
          }
        }
        
        return {
          ...deal,
          DealSpecifications: specifications
        };
      });

      return { deals: parsedDeals, total };
    } catch (error) {
      console.error('Error fetching deals:', error);
      return { deals: [], total: 0 };
    }
  }

  // Get deal by ID
  async getDealById(dealId: number): Promise<Deal | null> {
    try {
      const deal = await executeQuerySingle(`
        SELECT 
          d.*,
          g.GroupName,
          m.make_Name as MakeName,
          gr.GradeName,
          b.brandname as BrandName,
          mb.mname as seller_name,
          mb.company_name as seller_company,
          mb.email as seller_email,
          mb.phone as seller_phone
        FROM deal_master d
        LEFT JOIN stock_groups g ON d.groupID = g.GroupID
        LEFT JOIN stock_make_master m ON d.MakeID = m.make_ID
        LEFT JOIN stock_grade gr ON d.GradeID = gr.gradeID
        LEFT JOIN stock_brand b ON d.BrandID = b.brandID
        LEFT JOIN bmpa_members mb ON d.memberID = mb.member_id
        WHERE d.TransID = ?
      `, [dealId]);

      if (!deal) return null;

      // Parse JSON fields safely
      let specifications = null;
      
      if (deal.DealSpecifications) {
        try {
          if (typeof deal.DealSpecifications === 'string') {
            specifications = JSON.parse(deal.DealSpecifications);
          } else if (typeof deal.DealSpecifications === 'object') {
            specifications = deal.DealSpecifications;
          }
        } catch (error) {
          console.error('Error parsing specifications for deal:', deal.DealID, error);
          specifications = null;
        }
      }
      
      return {
        ...deal,
        DealSpecifications: specifications
      };
    } catch (error) {
      console.error('Error getting deal by ID:', error);
      return null;
    }
  }

  // Create a new deal
  async createDeal(dealData: CreateDealData): Promise<{ success: boolean; message: string; dealId?: number }> {
    try {
      const {
        group_id,
        make_id,
        grade_id,
        brand_id,
        seller_id,
        deal_title,
        deal_description,
        price,
        quantity,
        unit,
        min_order_quantity = 1,
        location,
        deal_specifications,
        expires_at
      } = dealData;

      // Verify stock hierarchy relationships
      const hierarchyCheck = await executeQuerySingle(`
        SELECT 
          g.GroupID,
          m.make_ID as MakeID,
          gr.gradeID as GradeID,
          b.brandID as BrandID
        FROM stock_groups g
        LEFT JOIN stock_make_master m ON g.GroupID = m.GroupID AND m.make_ID = ?
        LEFT JOIN stock_grade gr ON m.make_ID = gr.Make_ID AND gr.gradeID = ?
        LEFT JOIN stock_brand b ON m.make_ID = b.make_ID AND b.brandID = ?
        WHERE g.GroupID = ?
      `, [make_id, grade_id, brand_id, group_id]);

      if (!hierarchyCheck || !hierarchyCheck.MakeID || !hierarchyCheck.GradeID || !hierarchyCheck.BrandID) {
        return {
          success: false,
          message: 'Invalid stock hierarchy combination. Please check your Group, Make, Grade, and Brand selections.'
        };
      }

      const result = await executeQuery(`
        INSERT INTO deal_master (
          groupID, MakeID, GradeID, BrandID, memberID, 
          Seller_comments, OfferPrice, OfferUnit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        group_id,
        make_id,
        grade_id,
        brand_id,
        seller_id,
        `${deal_title}\n${deal_description || ''}`,
        price,
        unit
      ]);

      const insertId = (result as any).insertId;

      return {
        success: true,
        message: 'Deal created successfully',
        dealId: insertId
      };
    } catch (error) {
      console.error('Error creating deal:', error);
      return {
        success: false,
        message: 'Failed to create deal'
      };
    }
  }

  // Update a deal
  async updateDeal(dealId: number, sellerId: number, updateData: Partial<CreateDealData>): Promise<{ success: boolean; message: string }> {
    try {
      // Verify the deal belongs to the seller
      const deal = await executeQuerySingle(`
        SELECT SellerID FROM deal_master WHERE DealID = ?
      `, [dealId]);

      if (!deal) {
        return {
          success: false,
          message: 'Deal not found'
        };
      }

      if (deal.SellerID !== sellerId) {
        return {
          success: false,
          message: 'Unauthorized to update this deal'
        };
      }

      const allowedFields = [
        'deal_title', 'deal_description', 'price', 'quantity', 'unit',
        'min_order_quantity', 'location', 'deal_specifications', 'expires_at'
      ];
      
      const updateFields = [];
      const updateValues = [];
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          if (field === 'deal_specifications') {
            updateFields.push(`DealSpecifications = ?`);
            updateValues.push(JSON.stringify(updateData[field]));
          } else if (field === 'deal_title') {
            updateFields.push(`DealTitle = ?`);
            updateValues.push(updateData[field]);
          } else if (field === 'deal_description') {
            updateFields.push(`DealDescription = ?`);
            updateValues.push(updateData[field]);
          } else if (field === 'min_order_quantity') {
            updateFields.push(`MinOrderQuantity = ?`);
            updateValues.push(updateData[field]);
          } else if (field === 'expires_at') {
            updateFields.push(`ExpiresAt = ?`);
            updateValues.push(updateData[field]);
          } else {
            updateFields.push(`${field.charAt(0).toUpperCase() + field.slice(1)} = ?`);
            updateValues.push(updateData[field]);
          }
        }
      }
      
      if (updateFields.length === 0) {
        return {
          success: false,
          message: 'No valid fields to update'
        };
      }
      
      updateValues.push(dealId);
      
      await executeQuery(
        `UPDATE deal_master SET ${updateFields.join(', ')}, UpdatedAt = CURRENT_TIMESTAMP WHERE DealID = ?`,
        updateValues
      );

      return {
        success: true,
        message: 'Deal updated successfully'
      };
    } catch (error) {
      console.error('Error updating deal:', error);
      return {
        success: false,
        message: 'Failed to update deal'
      };
    }
  }

  // Delete a deal (change status to inactive)
  async deleteDeal(dealId: number, sellerId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Verify the deal belongs to the seller
      const deal = await executeQuerySingle(`
        SELECT SellerID FROM deal_master WHERE DealID = ?
      `, [dealId]);

      if (!deal) {
        return {
          success: false,
          message: 'Deal not found'
        };
      }

      if (deal.SellerID !== sellerId) {
        return {
          success: false,
          message: 'Unauthorized to delete this deal'
        };
      }

      await executeQuery(`
        UPDATE deal_master SET Status = 'inactive', UpdatedAt = CURRENT_TIMESTAMP WHERE DealID = ?
      `, [dealId]);

      return {
        success: true,
        message: 'Deal deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting deal:', error);
      return {
        success: false,
        message: 'Failed to delete deal'
      };
    }
  }

  // Get deals by seller
  async getDealsBySeller(sellerId: number): Promise<Deal[]> {
    try {
      const deals = await executeQuery(`
        SELECT 
          d.*,
          g.GroupName,
          m.MakeName,
          gr.GradeName,
          b.BrandName
        FROM deal_master d
        LEFT JOIN stock_groups g ON d.GroupID = g.GroupID
        LEFT JOIN stock_make_master m ON d.MakeID = m.MakeID
        LEFT JOIN stock_grade gr ON d.GradeID = gr.GradeID
        LEFT JOIN stock_brand b ON d.BrandID = b.BrandID
        WHERE d.SellerID = ?
        ORDER BY d.CreatedAt DESC
      `, [sellerId]);

      return deals.map((deal: any) => {
        let specifications = null;
        
        if (deal.DealSpecifications) {
          try {
            if (typeof deal.DealSpecifications === 'string') {
              specifications = JSON.parse(deal.DealSpecifications);
            } else if (typeof deal.DealSpecifications === 'object') {
              specifications = deal.DealSpecifications;
            }
          } catch (error) {
            console.error('Error parsing specifications for deal:', deal.DealID, error);
            specifications = null;
          }
        }
        
        return {
          ...deal,
          DealSpecifications: specifications
        };
      });
    } catch (error) {
      console.error('Error fetching deals by seller:', error);
      return [];
    }
  }
}

export const dealService = new DealService();