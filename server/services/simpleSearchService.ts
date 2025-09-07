import { executeQuery } from '../database';

// Super powerful search service optimized for "Make - Grade - Brand - Dimensions - GSM" descriptions
export class SimpleSearchService {
  
  // In-memory search cache for lightning fast results
  private searchCache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Clear expired cache entries
  private clearExpiredCache() {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now > expiry) {
        this.searchCache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  // Get from cache or execute query
  private async getCachedResult<T>(cacheKey: string, queryFn: () => Promise<T>): Promise<T> {
    this.clearExpiredCache();
    
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }
    
    const result = await queryFn();
    this.searchCache.set(cacheKey, result);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
    
    return result;
  }
  
  // Super powerful search optimized for description-based queries
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

    // Create cache key for fast repeat searches
    const cacheKey = JSON.stringify(params);
    
    return this.getCachedResult(cacheKey, async () => {
      let whereConditions = ['dm.StockStatus = 1']; // 1 = active
      const queryParams: any[] = [];

    // SUPER POWERFUL DESCRIPTION-BASED SEARCH
    // Optimized for "Make - Grade - Brand - Dimensions - GSM" format
    if (query && query.trim()) {
      const searchQuery = query.trim().toLowerCase();
      const searchTerms = searchQuery.split(/\s+/);
      
      // Advanced pattern detection for description format
      const gsmValues: number[] = [];
      const brandTerms: string[] = [];
      const makeTerms: string[] = [];
      const dimensionTerms: string[] = [];
      
      // 1. Detect GSM patterns with exact matching
      const gsmMatches = searchQuery.match(/(\d+)\s*gsm/gi);
      if (gsmMatches) {
        gsmValues.push(...gsmMatches.map(match => parseInt(match.replace(/\D/g, ''))));
      } else {
        // Standalone numbers - only if they look like GSM values
        const numberMatches = searchQuery.match(/\b(\d{2,4})\b/g);
        if (numberMatches) {
          gsmValues.push(...numberMatches
            .map(num => parseInt(num))
            .filter(num => num >= 20 && num <= 2000));
        }
      }
      
      // 2. Detect brand/make terms (non-numeric, non-gsm terms)
      const textTerms = searchTerms.filter(term => 
        !term.match(/^\d+$/) && 
        !term.match(/gsm?/i) && 
        term.length > 1
      );
      
      // Common paper industry makes and brands
      const knownMakes = ['itc', 'jk', 'bilt', 'west', 'orient', 'emami', 'seshasayee'];
      const knownBrands = ['cyber', 'sapphire', 'maxo', 'prima', 'supreme', 'classic'];
      
      textTerms.forEach(term => {
        if (knownMakes.some(make => make.includes(term) || term.includes(make))) {
          makeTerms.push(term);
        } else if (knownBrands.some(brand => brand.includes(term) || term.includes(brand))) {
          brandTerms.push(term);
        } else {
          brandTerms.push(term); // Default to brand term
        }
      });
      
      // 3. Build super smart search conditions
      const searchConditions = [];
      
      // Highest Priority: Exact phrase in description
      queryParams.push(`%${searchQuery}%`);
      searchConditions.push('dm.stock_description LIKE ?');
      
      // High Priority: Exact GSM matches
      if (gsmValues.length > 0) {
        gsmValues.forEach(gsm => {
          // Exact GSM column match
          queryParams.push(gsm);
          searchConditions.push('dm.GSM = ?');
          
          // Exact GSM in description with word boundaries
          queryParams.push(`% ${gsm} gsm%`, `% ${gsm}gsm%`, `%${gsm} gsm%`, `%${gsm}gsm%`);
          queryParams.push(`% ${gsm} %`);
          searchConditions.push('(dm.stock_description LIKE ? OR dm.stock_description LIKE ? OR dm.stock_description LIKE ? OR dm.stock_description LIKE ? OR dm.stock_description LIKE ?)');
        });
      }
      
      // Medium Priority: Make/Brand matches
      [...makeTerms, ...brandTerms].forEach(term => {
        queryParams.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
        searchConditions.push('(dm.Make LIKE ? OR dm.Brand LIKE ? OR dm.Grade LIKE ? OR dm.stock_description LIKE ?)');
      });
      
      // Smart combination searches for brand+gsm
      if (gsmValues.length > 0 && textTerms.length > 0) {
        textTerms.forEach(brand => {
          gsmValues.forEach(gsm => {
            queryParams.push(`%${brand}%${gsm}%`, `%${gsm}%${brand}%`);
            searchConditions.push('(dm.stock_description LIKE ? OR dm.stock_description LIKE ?)');
          });
        });
      }
      
      // Combine conditions for maximum flexibility
      if (searchConditions.length > 0) {
        whereConditions.push(`(${searchConditions.join(' OR ')})`);
      }
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
            CASE WHEN dm.stock_description LIKE ? THEN 100 ELSE 0 END +
            CASE WHEN dm.GSM = ? THEN 50 ELSE 0 END +
            CASE WHEN dm.Make LIKE ? THEN 30 ELSE 0 END +
            CASE WHEN dm.Brand LIKE ? THEN 25 ELSE 0 END +
            CASE WHEN dm.Grade LIKE ? THEN 20 ELSE 0 END +
            CASE WHEN dm.Seller_comments LIKE ? THEN 5 ELSE 0 END
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
      const searchTerm = `%${query.toLowerCase()}%`;
      const gsmValue = gsmValues.length > 0 ? gsmValues[0] : 0; // Use first detected GSM value for scoring
      searchParams.push(searchTerm, gsmValue, searchTerm, searchTerm, searchTerm, searchTerm);
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
      WHERE dm.StockStatus = 1
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
    });
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
        SELECT Make as suggestion, 'make' as type FROM deal_master WHERE Make LIKE ? AND StockStatus = 1
        UNION ALL
        SELECT Brand as suggestion, 'brand' as type FROM deal_master WHERE Brand LIKE ? AND StockStatus = 1
        UNION ALL
        SELECT Grade as suggestion, 'grade' as type FROM deal_master WHERE Grade LIKE ? AND StockStatus = 1
        UNION ALL
        SELECT CONCAT(Make, ' ', Brand, ' ', Grade) as suggestion, 'product' as type 
        FROM deal_master 
        WHERE CONCAT(Make, ' ', Brand, ' ', Grade) LIKE ? AND StockStatus = 1
        UNION ALL
        SELECT DISTINCT LEFT(stock_description, 50) as suggestion, 'description' as type 
        FROM deal_master 
        WHERE stock_description LIKE ? AND StockStatus = 1
        LIMIT 5
      ) as suggestions
      WHERE suggestion IS NOT NULL AND suggestion != '' AND suggestion != 'None'
      GROUP BY suggestion, type
      ORDER BY frequency DESC
      LIMIT 15
    `;

    const results = await executeQuery(suggestionsQuery, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);
    
    return results.map((row: any) => ({
      text: row.suggestion,
      type: row.type,
      score: row.frequency
    }));
  }
}

export const simpleSearchService = new SimpleSearchService();