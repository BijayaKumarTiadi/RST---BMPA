import { executeQuery, executeQuerySingle } from './database.js';
import crypto from 'crypto';

// Helper function to get ORDER BY clause based on sort parameter
function getSortClause(sortBy?: string): string {
  switch (sortBy) {
    case 'price-low':
      return 'ORDER BY d.OfferPrice ASC';
    case 'price-high':
      return 'ORDER BY d.OfferPrice DESC';
    case 'gsm-low':
      return 'ORDER BY d.GSM ASC';
    case 'gsm-high':
      return 'ORDER BY d.GSM DESC';
    case 'quantity-low':
      return 'ORDER BY d.quantity ASC';
    case 'quantity-high':
      return 'ORDER BY d.quantity DESC';
    case 'size-small':
      return 'ORDER BY (d.Deckle_mm * d.grain_mm) ASC';
    case 'size-large':
      return 'ORDER BY (d.Deckle_mm * d.grain_mm) DESC';
    case 'location':
      return 'ORDER BY d.Location ASC';
    case 'company':
      return 'ORDER BY mb.company_name ASC';
    case 'category':
      return 'ORDER BY g.GroupName ASC';
    case 'oldest':
      return 'ORDER BY d.deal_created_at ASC';
    case 'newest':
    default:
      return 'ORDER BY d.deal_created_at DESC';
  }
}

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
  StockAge?: string;
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
      const [groups, makes, grades, brands, dealMakes, dealGrades, dealBrands] = await Promise.all([
        executeQuery('SELECT GroupID, GroupName FROM stock_groups WHERE IsActive = 1 ORDER BY GroupName'),
        executeQuery('SELECT make_ID, GroupID, make_Name FROM stock_make_master WHERE IsActive = 1 ORDER BY make_Name'),
        executeQuery('SELECT gradeID, Make_ID, GradeName FROM stock_grade WHERE IsActive = 1 ORDER BY GradeName'),
        executeQuery('SELECT brandID, make_ID, brandname FROM stock_brand WHERE IsActive = 1 ORDER BY brandname'),
        // Fetch all unique text values from deal_master
        executeQuery(`SELECT DISTINCT Make as make_Name, groupID as GroupID FROM deal_master 
                      WHERE Make IS NOT NULL AND Make != '' AND Make != '0'
                      ORDER BY Make`),
        executeQuery(`SELECT DISTINCT Grade as GradeName FROM deal_master 
                      WHERE Grade IS NOT NULL AND Grade != '' AND Grade != '0'
                      ORDER BY Grade`),
        executeQuery(`SELECT DISTINCT Brand as brandname FROM deal_master 
                      WHERE Brand IS NOT NULL AND Brand != '' AND Brand != '0'
                      ORDER BY Brand`)
      ]);

      // Merge custom values from deal_master with master data
      const allMakes = [...makes as any[]];
      const allGrades = [...grades as any[]];
      const allBrands = [...brands as any[]];
      
      // Add custom makes from deal_master
      (dealMakes as any[]).forEach(dm => {
        if (dm.make_Name && !allMakes.find(m => m.make_Name === dm.make_Name)) {
          allMakes.push({
            make_ID: dm.make_Name, // Use the text as ID for custom entries
            GroupID: dm.GroupID,
            make_Name: dm.make_Name
          });
        }
      });
      
      // Add custom grades from deal_master
      (dealGrades as any[]).forEach(dg => {
        if (dg.GradeName && !allGrades.find(g => g.GradeName === dg.GradeName)) {
          allGrades.push({
            gradeID: dg.GradeName, // Use the text as ID for custom entries
            Make_ID: null,
            GradeName: dg.GradeName
          });
        }
      });
      
      // Add custom brands from deal_master
      (dealBrands as any[]).forEach(db => {
        if (db.brandname && !allBrands.find(b => b.brandname === db.brandname)) {
          allBrands.push({
            brandID: db.brandname, // Use the text as ID for custom entries
            make_ID: null,
            brandname: db.brandname
          });
        }
      });

      return { 
        groups, 
        makes: allMakes.sort((a, b) => a.make_Name.localeCompare(b.make_Name)),
        grades: allGrades.sort((a, b) => a.GradeName.localeCompare(b.GradeName)),
        brands: allBrands.sort((a, b) => a.brandname.localeCompare(b.brandname))
      };
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
    exclude_member_id?: number;
    status?: string;
    search?: string;
    location?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ deals: Deal[]; total: number }> {
    try {
      // If seller_id is provided (seller viewing their own products), don't filter by StockStatus
      // Otherwise, only show available deals to regular users
      let whereConditions: string[] = [];
      if (!filters?.seller_id) {
        whereConditions.push('d.StockStatus = 1'); // Only show available deals for marketplace
      }
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

      // Exclude products from a specific member (for marketplace view)
      if (filters?.exclude_member_id) {
        whereConditions.push('(d.memberID != ? AND d.created_by_member_id != ?)');
        params.push(filters.exclude_member_id, filters.exclude_member_id);
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
          d.stock_description,
          d.Seller_comments,
          d.groupID as GroupID,
          g.GroupName,
          COALESCE(m.make_Name, d.Make) as MakeName,
          COALESCE(gr.GradeName, d.Grade) as GradeName,
          COALESCE(b.brandname, d.Brand) as BrandName,
          d.Make as MakeID,
          d.Grade as GradeID,
          d.Brand as BrandID,
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
        ${getSortClause(filters?.sort)}
        LIMIT ? OFFSET ?
      `;

      const deals = await executeQuery(dealsQuery, [...params, limit, offset]);

      // Parse JSON fields safely and extract deal_description from Seller_comments
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
        
        // Use ONLY the exact database value for stock_description - NO auto-generation
        const deal_comments = deal.Seller_comments || '';
        
        return {
          ...deal,
          DealSpecifications: specifications,
          deal_comments
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
          d.stock_description,
          d.Seller_comments,
          d.groupID as GroupID,
          g.GroupName,
          COALESCE(m.make_Name, d.Make) as MakeName,
          COALESCE(gr.GradeName, d.Grade) as GradeName,
          COALESCE(b.brandname, d.Brand) as BrandName,
          d.Make as MakeID,
          d.Grade as GradeID,
          d.Brand as BrandID,
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
      
      // Use ONLY the exact database value for stock_description - NO auto-generation
      const deal_comments = deal.Seller_comments || '';
      
      return {
        ...deal,
        DealSpecifications: specifications,
        deal_comments
      };
    } catch (error) {
      console.error('Error getting deal by ID:', error);
      return null;
    }
  }

  // Create a new deal
  async createDeal(dealData: CreateDealData & {
    make_text?: string;
    grade_text?: string;
    brand_text?: string;
    search_key?: string;
    stock_type?: string;
    is_spare_part?: boolean;
    spare_make?: string;
    machine_name?: string;
    spare_description?: string;
    spare_age?: string;
    spare_brand?: string;
  }, userInfo?: { member_id: number; name: string; company: string }): Promise<{ success: boolean; message: string; dealId?: number }> {
    try {
      const {
        group_id,
        make_id,
        grade_id,
        brand_id,
        make_text,
        grade_text,
        brand_text,
        seller_id,
        deal_title,
        deal_description,
        stock_description,
        StockAge: StockAge,
        search_key,
        price,
        quantity,
        unit,
        min_order_quantity = 1,
        location,
        deal_specifications,
        expires_at,
        is_spare_part,
        spare_make,
        machine_name,
        spare_description,
        spare_age,
        spare_brand
      } = dealData as any;

      let finalMake, finalGrade, finalBrand, gsm, deckle_mm, grain_mm;

      if (is_spare_part) {
        // Spare part handling
        finalMake = spare_make || '';
        finalGrade = machine_name || '';
        finalBrand = spare_brand || '';
        gsm = 0;
        deckle_mm = 0;
        grain_mm = 0;
        
        console.log('Creating spare part with values:', {
          spare_make,
          machine_name,
          spare_description,
          spare_age,
          spare_brand
        });
      } else {
        // Regular product handling
        finalMake = make_text || make_id || '';
        finalGrade = grade_text || grade_id || '';
        finalBrand = brand_text || brand_id || '';
        
        // Extract GSM, Deckle_mm, grain_mm from deal_specifications
        gsm = deal_specifications?.GSM || 0;
        deckle_mm = deal_specifications?.Deckle_mm || 0;
        grain_mm = deal_specifications?.grain_mm || 0;
        
        console.log('Creating regular product with values:', {
          finalMake,
          finalGrade,
          finalBrand,
          StockAge: StockAge
        });
      }

      // Use provided search_key or generate it
      const final_search_key = search_key || (stock_description || '').toLowerCase().replace(/[\s.]/g, '');

      // Build seller comments
      let sellerComments = deal_title;
      if (is_spare_part && spare_description) {
        sellerComments = `${deal_title}\n${spare_description}`;
        if (spare_age) sellerComments += `\nAge: ${spare_age}`;
      } else if (deal_description) {
        sellerComments = `${deal_title}\n${deal_description}`;
      }

      const result = await executeQuery(`
        INSERT INTO deal_master (
          groupID, Make, Grade, Brand, memberID,
          Seller_comments, OfferPrice, OfferUnit, quantity, stock_description,
          GSM, Deckle_mm, grain_mm, search_key, StockAge,
          created_by_member_id, created_by_name, created_by_company
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        group_id,
        finalMake,
        finalGrade,
        finalBrand,
        seller_id,
        sellerComments,
        price,
        unit,
        quantity,
        stock_description || '',
        gsm,
        deckle_mm,
        grain_mm,
        final_search_key,
        StockAge !== undefined && StockAge !== null ? String(StockAge) : '',
        userInfo?.member_id || seller_id,
        userInfo?.name || '',
        userInfo?.company || ''
      ]);

      const insertId = (result as any).insertId;

      return {
        success: true,
        message: is_spare_part ? 'Spare part created successfully' : 'Deal created successfully',
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

      // Check if the user owns this deal (check both created_by_member_id and memberID)
      const isOwner = deal.created_by_member_id === userId || deal.memberID === userId;
      
      if (!isOwner) {
        console.error(`Authorization failed: userId=${userId}, created_by=${deal.created_by_member_id}, memberID=${deal.memberID}`);
        return {
          success: false,
          message: 'Unauthorized to update this deal'
        };
      }
      
      console.log(`✅ Authorization passed for deal ${dealId}, user ${userId}`);

      // Extract main product fields from updateData
      const {
        group_id, groupID,
        make_id, MakeID, make_text,
        grade_id, GradeID, grade_text,
        brand_id, BrandID, brand_text,
        GSM,
        Deckle_mm,
        grain_mm,
        OfferPrice,
        OfferUnit,
        Seller_comments,
        quantity,
        stock_description,
        StockAge,
        deal_title,
        deal_description,
        price,
        unit,
        min_order_quantity,
        location,
        deal_specifications,
        expires_at
      } = updateData as any;

      const updateFields = [];
      const updateValues = [];
      let updateStockDescription = false;
      
      // Handle main product fields
      if (group_id !== undefined || groupID !== undefined) {
        updateFields.push(`groupID = ?`);
        updateValues.push(group_id || groupID);
      }
      
      // Handle Make field - always use text value
      if (make_text !== undefined || make_id !== undefined || MakeID !== undefined) {
        updateFields.push(`Make = ?`);
        const makeValue = make_text || make_id || MakeID || '';
        updateValues.push(makeValue);
        console.log('Updating Make field to:', makeValue);
      }
      
      // Handle Grade field - always use text value
      if (grade_text !== undefined || grade_id !== undefined || GradeID !== undefined) {
        updateFields.push(`Grade = ?`);
        const gradeValue = grade_text || grade_id || GradeID || '';
        updateValues.push(gradeValue);
        console.log('Updating Grade field to:', gradeValue);
      }
      
      // Handle Brand field - always use text value
      if (brand_text !== undefined || brand_id !== undefined || BrandID !== undefined) {
        updateFields.push(`Brand = ?`);
        const brandValue = brand_text || brand_id || BrandID || '';
        updateValues.push(brandValue);
        console.log('Updating Brand field to:', brandValue);
      }
      
      // Handle technical specifications
      if (GSM !== undefined) {
        updateFields.push(`GSM = ?`);
        updateValues.push(GSM);
      }
      
      if (Deckle_mm !== undefined) {
        updateFields.push(`Deckle_mm = ?`);
        updateValues.push(Deckle_mm);
      }
      
      if (grain_mm !== undefined) {
        updateFields.push(`grain_mm = ?`);
        updateValues.push(grain_mm);
      }
      
      // Handle pricing and quantity
      if (OfferPrice !== undefined || price !== undefined) {
        updateFields.push(`OfferPrice = ?`);
        updateValues.push(OfferPrice || price);
      }
      
      if (OfferUnit !== undefined || unit !== undefined) {
        updateFields.push(`OfferUnit = ?`);
        updateValues.push(OfferUnit || unit);
      }
      
      if (quantity !== undefined) {
        updateFields.push(`quantity = ?`);
        updateValues.push(quantity);
      }
      
      if (Seller_comments !== undefined || deal_description !== undefined) {
        updateFields.push(`Seller_comments = ?`);
        updateValues.push(Seller_comments || deal_description);
      }
      
      // Handle stock description
      if (stock_description !== undefined) {
        updateFields.push(`stock_description = ?`);
        updateValues.push(stock_description);
        updateStockDescription = true;
      }
      
      // Handle stock age
      if (StockAge !== undefined) {
        updateFields.push(`StockAge = ?`);
        updateValues.push(StockAge !== undefined && StockAge !== null ? String(StockAge) : '');
      }
      
      // Skip fields that don't exist in the deal_master table
      // DealTitle, DealSpecifications, MinOrderQuantity, Location, ExpiresAt are not in the schema
      // These fields are handled differently or don't exist in the current database schema
      
      console.log(`📝 Preparing to update ${updateFields.length} fields:`, updateFields);

      // If stock_description is updated, also update search_key
      if (updateStockDescription && updateData.stock_description) {
        const search_key = updateData.stock_description.toLowerCase().replace(/[\s.]/g, '');
        updateFields.push(`search_key = ?`);
        updateValues.push(search_key);
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