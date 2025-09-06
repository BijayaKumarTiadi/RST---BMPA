import { executeQuery, executeQuerySingle } from './database.js';
import crypto from 'crypto';

export interface Deal {
  DealID: number;
  GroupID: number;
  Make: number;
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
  stock_description?: string;
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
    makes?: string;
    grades?: string;
    brands?: string;
    gsm?: string;
    units?: string;
    stock_status?: string;
    seller_id?: number;
    status?: string;
    search?: string;
    location?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ deals: Deal[]; total: number }> {
    try {
      let whereConditions = ['d.StockStatus = 1']; // Only show available deals (1 = Available for sale)
      let params: any[] = [];

      if (filters?.group_id) {
        whereConditions.push('d.groupID = ?');
        params.push(filters.group_id);
      }

      if (filters?.make_id) {
        whereConditions.push('d.Make = ?');
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

      // Handle array-based filters from frontend
      if (filters?.makes) {
        const makesArray = filters.makes.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        if (makesArray.length > 0) {
          whereConditions.push(`d.Make IN (${makesArray.map(() => '?').join(',')})`);
          params.push(...makesArray);
        }
      }

      if (filters?.grades) {
        const gradesArray = filters.grades.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        if (gradesArray.length > 0) {
          whereConditions.push(`d.GradeID IN (${gradesArray.map(() => '?').join(',')})`);
          params.push(...gradesArray);
        }
      }

      if (filters?.brands) {
        const brandsArray = filters.brands.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        if (brandsArray.length > 0) {
          whereConditions.push(`d.BrandID IN (${brandsArray.map(() => '?').join(',')})`);
          params.push(...brandsArray);
        }
      }

      if (filters?.gsm) {
        const gsmArray = filters.gsm.split(',').map(gsm => gsm.trim()).filter(gsm => gsm);
        if (gsmArray.length > 0) {
          whereConditions.push(`d.GSM IN (${gsmArray.map(() => '?').join(',')})`);
          params.push(...gsmArray);
        }
      }

      if (filters?.units) {
        const unitsArray = filters.units.split(',').map(unit => unit.trim()).filter(unit => unit);
        if (unitsArray.length > 0) {
          whereConditions.push(`d.OfferUnit IN (${unitsArray.map(() => '?').join(',')})`);
          params.push(...unitsArray);
        }
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
        const searchConditions = [
          'd.Seller_comments LIKE ?',
          'g.GroupName LIKE ?', 
          'm.make_Name LIKE ?',
          'gr.GradeName LIKE ?',
          'b.brandname LIKE ?',
          'd.GSM LIKE ?',
          'd.OfferUnit LIKE ?',
          'mb.mname LIKE ?',
          'mb.company_name LIKE ?'
        ];
        whereConditions.push(`(${searchConditions.join(' OR ')})`);
        const searchTerm = `%${filters.search}%`;
        // Add search term for each condition
        for (let i = 0; i < searchConditions.length; i++) {
          params.push(searchTerm);
        }
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
        LEFT JOIN stock_make_master m ON d.Make = m.make_ID
        LEFT JOIN stock_grade gr ON d.Grade = gr.gradeID
        LEFT JOIN stock_brand b ON d.Brand = b.brandID
        LEFT JOIN bmpa_members mb ON d.memberID = mb.member_id
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
        LEFT JOIN stock_make_master m ON d.Make = m.make_ID
        LEFT JOIN stock_grade gr ON d.Grade = gr.gradeID
        LEFT JOIN stock_brand b ON d.Brand = b.brandID
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
        LEFT JOIN stock_make_master m ON d.Make = m.make_ID
        LEFT JOIN stock_grade gr ON d.Grade = gr.gradeID
        LEFT JOIN stock_brand b ON d.Brand = b.brandID
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
  async createDeal(dealData: CreateDealData, userInfo?: { member_id: number; name: string; company: string }): Promise<{ success: boolean; message: string; dealId?: number }> {
    try {
      const {
        group_id,
        make_id,
        grade_id,
        brand_id,
        seller_id,
        deal_title,
        deal_description,
        stock_description,
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
          m.make_ID as Make,
          gr.gradeID as GradeID,
          b.brandID as BrandID
        FROM stock_groups g
        LEFT JOIN stock_make_master m ON g.GroupID = m.GroupID AND m.make_ID = ?
        LEFT JOIN stock_grade gr ON m.make_ID = gr.Make_ID AND gr.gradeID = ?
        LEFT JOIN stock_brand b ON m.make_ID = b.make_ID AND b.brandID = ?
        WHERE g.GroupID = ?
      `, [make_id, grade_id, brand_id, group_id]);

      if (!hierarchyCheck || !hierarchyCheck.Make || !hierarchyCheck.GradeID || !hierarchyCheck.BrandID) {
        return {
          success: false,
          message: 'Invalid stock hierarchy combination. Please check your Group, Make, Grade, and Brand selections.'
        };
      }

      // Extract GSM, Deckle_mm, grain_mm from deal_specifications
      const gsm = deal_specifications?.GSM || 0;
      const deckle_mm = deal_specifications?.Deckle_mm || 0;
      const grain_mm = deal_specifications?.grain_mm || 0;

      const result = await executeQuery(`
        INSERT INTO deal_master (
          groupID, Make, Grade, Brand, memberID, 
          Seller_comments, OfferPrice, OfferUnit, quantity, stock_description,
          GSM, Deckle_mm, grain_mm,
          created_by_member_id, created_by_name, created_by_company
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        group_id,
        make_id,
        grade_id,
        brand_id,
        seller_id,
        `${deal_title}\n${deal_description || ''}`,
        price,
        unit,
        quantity,
        stock_description || '',
        gsm,
        deckle_mm,
        grain_mm,
        userInfo?.member_id || seller_id,
        userInfo?.name || '',
        userInfo?.company || ''
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
  async updateDeal(dealId: number, userId: number, updateData: Partial<CreateDealData>): Promise<{ success: boolean; message: string }> {
    try {
      // Verify the deal belongs to the user who created it
      const deal = await executeQuerySingle(`
        SELECT created_by_member_id, memberID FROM deal_master WHERE TransID = ?
      `, [dealId]);

      if (!deal) {
        return {
          success: false,
          message: 'Deal not found'
        };
      }

      if (deal.created_by_member_id !== userId) {
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
        `UPDATE deal_master SET ${updateFields.join(', ')}, deal_updated_at = CURRENT_TIMESTAMP WHERE TransID = ?`,
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
  async deleteDeal(dealId: number, userId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Verify the deal belongs to the user who created it
      const deal = await executeQuerySingle(`
        SELECT memberID FROM deal_master WHERE TransID = ?
      `, [dealId]);

      if (!deal) {
        return {
          success: false,
          message: 'Deal not found'
        };
      }

      if (deal.memberID !== userId) {
        return {
          success: false,
          message: 'Unauthorized to delete this deal'
        };
      }

      await executeQuery(`
        UPDATE deal_master SET StockStatus = 0, deal_updated_at = CURRENT_TIMESTAMP WHERE TransID = ?
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
        LEFT JOIN stock_make_master m ON d.Make = m.make_ID
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