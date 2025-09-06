import { executeQuery } from '../database';

// Simple but powerful search service without external dependencies
export class SimpleSearchService {
  
  // Powerful search with fuzzy matching and advanced filters
  async searchDeals(params: {
    query?: string;
    filters?: {
      make?: string[];
      brand?: string[];
      grade?: string[];
      gsmMin?: number;
      gsmMax?: number;
      priceMin?: number;
      priceMax?: number;
    };
    sort?: { field: string; order: 'ASC' | 'DESC' };
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    const { 
      query = '', 
      filters = {}, 
      sort = { field: 'deal_created_at', order: 'DESC' },
      page = 1,
      pageSize = 20 
    } = params;

    let whereConditions = [];
    const queryParams: any[] = [];

    // Full-text search across multiple fields with fuzzy matching
    if (query && query.trim()) {
      const searchTerms = query.trim().split(/\s+/);
      const searchConditions = searchTerms.map(term => {
        // Add wildcards for partial matching
        const fuzzyTerm = `%${term}%`;
        queryParams.push(fuzzyTerm, fuzzyTerm, fuzzyTerm, fuzzyTerm, fuzzyTerm, fuzzyTerm);
        
        return `(
          dm.Make LIKE ? OR 
          dm.Brand LIKE ? OR 
          dm.Grade LIKE ? OR 
          dm.stock_description LIKE ? OR 
          dm.Seller_comments LIKE ? OR
          CONCAT(dm.GSM, ' GSM') LIKE ?
        )`;
      });
      
      whereConditions.push(`(${searchConditions.join(' AND ')})`);
    }

    // Apply filters
    if (filters.make?.length) {
      whereConditions.push(`dm.Make IN (${filters.make.map(() => '?').join(',')})`);
      queryParams.push(...filters.make);
    }

    if (filters.brand?.length) {
      whereConditions.push(`dm.Brand IN (${filters.brand.map(() => '?').join(',')})`);
      queryParams.push(...filters.brand);
    }

    if (filters.grade?.length) {
      whereConditions.push(`dm.Grade IN (${filters.grade.map(() => '?').join(',')})`);
      queryParams.push(...filters.grade);
    }

    if (filters.gsmMin !== undefined || filters.gsmMax !== undefined) {
      if (filters.gsmMin !== undefined && filters.gsmMax !== undefined) {
        whereConditions.push('dm.GSM BETWEEN ? AND ?');
        queryParams.push(filters.gsmMin, filters.gsmMax);
      } else if (filters.gsmMin !== undefined) {
        whereConditions.push('dm.GSM >= ?');
        queryParams.push(filters.gsmMin);
      } else if (filters.gsmMax !== undefined) {
        whereConditions.push('dm.GSM <= ?');
        queryParams.push(filters.gsmMax);
      }
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
        whereConditions.push('dm.OfferPrice BETWEEN ? AND ?');
        queryParams.push(filters.priceMin, filters.priceMax);
      } else if (filters.priceMin !== undefined) {
        whereConditions.push('dm.OfferPrice >= ?');
        queryParams.push(filters.priceMin);
      } else if (filters.priceMax !== undefined) {
        whereConditions.push('dm.OfferPrice <= ?');
        queryParams.push(filters.priceMax);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Calculate offset
    const offset = (page - 1) * pageSize;
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM deal_master dm 
      ${whereClause}
    `;
    
    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0]?.total || 0;

    // Get paginated results with relevance scoring
    const searchQuery = `
      SELECT 
        dm.*,
        m.mname as created_by_name,
        m.company_name as created_by_company,
        m.phone as seller_phone,
        m.email as seller_email,
        ${query ? `
          (
            CASE WHEN dm.Make LIKE ? THEN 10 ELSE 0 END +
            CASE WHEN dm.Brand LIKE ? THEN 8 ELSE 0 END +
            CASE WHEN dm.Grade LIKE ? THEN 8 ELSE 0 END +
            CASE WHEN dm.stock_description LIKE ? THEN 5 ELSE 0 END +
            CASE WHEN dm.Seller_comments LIKE ? THEN 3 ELSE 0 END
          ) as relevance_score
        ` : '0 as relevance_score'}
      FROM deal_master dm
      LEFT JOIN bmpa_members m ON dm.created_by_member_id = m.member_id
      ${whereClause}
      ORDER BY 
        ${query ? 'relevance_score DESC,' : ''} 
        ${sort.field} ${sort.order}
      LIMIT ? OFFSET ?
    `;

    // Add relevance scoring parameters if query exists
    const searchParams = [...queryParams];
    if (query) {
      const searchTerm = `%${query}%`;
      searchParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    searchParams.push(pageSize, offset);

    const results = await executeQuery(searchQuery, searchParams);

    // Get aggregations for filters
    const aggregationsQuery = `
      SELECT 
        dm.Make,
        dm.Brand,
        dm.Grade,
        MIN(dm.GSM) as min_gsm,
        MAX(dm.GSM) as max_gsm,
        MIN(dm.OfferPrice) as min_price,
        MAX(dm.OfferPrice) as max_price,
        COUNT(*) as count
      FROM deal_master dm
      WHERE dm.StockStatus = 'active'
      GROUP BY dm.Make, dm.Brand, dm.Grade
    `;
    
    const aggregations = await executeQuery(aggregationsQuery);

    // Process aggregations
    const makes = new Map();
    const brands = new Map();
    const grades = new Map();
    let gsmRange = { min: Infinity, max: -Infinity };
    let priceRange = { min: Infinity, max: -Infinity };

    aggregations.forEach((row: any) => {
      if (row.Make) {
        makes.set(row.Make, (makes.get(row.Make) || 0) + row.count);
      }
      if (row.Brand) {
        brands.set(row.Brand, (brands.get(row.Brand) || 0) + row.count);
      }
      if (row.Grade) {
        grades.set(row.Grade, (grades.get(row.Grade) || 0) + row.count);
      }
      if (row.min_gsm < gsmRange.min) gsmRange.min = row.min_gsm;
      if (row.max_gsm > gsmRange.max) gsmRange.max = row.max_gsm;
      if (row.min_price < priceRange.min) priceRange.min = row.min_price;
      if (row.max_price > priceRange.max) priceRange.max = row.max_price;
    });

    return {
      success: true,
      data: results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      aggregations: {
        makes: Array.from(makes.entries()).map(([key, value]) => ({ key, doc_count: value })),
        brands: Array.from(brands.entries()).map(([key, value]) => ({ key, doc_count: value })),
        grades: Array.from(grades.entries()).map(([key, value]) => ({ key, doc_count: value })),
        gsm_range: gsmRange,
        price_range: priceRange
      }
    };
  }

  // Get search suggestions
  async getSuggestions(query: string): Promise<any[]> {
    if (!query || query.length < 2) return [];

    const searchTerm = `${query}%`;
    
    const suggestionsQuery = `
      SELECT DISTINCT 
        suggestion,
        type,
        COUNT(*) as frequency
      FROM (
        SELECT Make as suggestion, 'make' as type FROM deal_master WHERE Make LIKE ? AND StockStatus = 'active'
        UNION ALL
        SELECT Brand as suggestion, 'brand' as type FROM deal_master WHERE Brand LIKE ? AND StockStatus = 'active'
        UNION ALL
        SELECT Grade as suggestion, 'grade' as type FROM deal_master WHERE Grade LIKE ? AND StockStatus = 'active'
        UNION ALL
        SELECT CONCAT(Make, ' ', Brand, ' ', Grade) as suggestion, 'product' as type 
        FROM deal_master 
        WHERE CONCAT(Make, ' ', Brand, ' ', Grade) LIKE ? AND StockStatus = 'active'
      ) as suggestions
      WHERE suggestion IS NOT NULL AND suggestion != ''
      GROUP BY suggestion, type
      ORDER BY frequency DESC
      LIMIT 10
    `;

    const results = await executeQuery(suggestionsQuery, [searchTerm, searchTerm, searchTerm, searchTerm]);
    
    return results.map((row: any) => ({
      text: row.suggestion,
      type: row.type,
      score: row.frequency
    }));
  }
}

export const simpleSearchService = new SimpleSearchService();