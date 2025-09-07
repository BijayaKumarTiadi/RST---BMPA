import { executeQuery } from '../database';

export class HybridSearchService {
  
  // Enhanced MySQL search with stock_description priority and flexible matching
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

    let whereConditions = ['dm.StockStatus = 1']; // 1 = active
    const queryParams: any[] = [];
    let selectFields = `
      dm.*,
      m.mname as created_by_name,
      m.company_name as created_by_company,
      sg.GroupName
    `;
    
    // Enhanced scoring for stock_description priority
    let scoreExpression = '0';

    // Text search with stock_description priority and flexible matching
    if (query && query.trim()) {
      const cleanQuery = query.trim();
      const searchTerms = cleanQuery.split(/\s+/);
      
      // Build flexible search conditions with scoring
      const searchConditions: string[] = [];
      let scoreComponents: string[] = [];
      
      // Exact match in stock_description gets highest score
      queryParams.push(`%${cleanQuery}%`);
      searchConditions.push('dm.stock_description LIKE ?');
      scoreComponents.push(`CASE WHEN dm.stock_description LIKE ? THEN 50 ELSE 0 END`);
      queryParams.push(`%${cleanQuery}%`);
      
      // Individual word matches in stock_description
      searchTerms.forEach(term => {
        if (term.length > 1) {
          queryParams.push(`%${term}%`);
          searchConditions.push('dm.stock_description LIKE ?');
          scoreComponents.push(`CASE WHEN dm.stock_description LIKE ? THEN 10 ELSE 0 END`);
          queryParams.push(`%${term}%`);
        }
      });
      
      // GSM-specific search (handles "400 gsm", "400", etc.)
      const gsmMatch = cleanQuery.match(/(\d+)\s*g?s?m?/i);
      if (gsmMatch) {
        const gsmValue = parseInt(gsmMatch[1]);
        whereConditions.push('(dm.GSM BETWEEN ? AND ?)');
        queryParams.push(gsmValue - 10, gsmValue + 10);
        scoreComponents.push(`CASE WHEN dm.GSM = ? THEN 40 WHEN dm.GSM BETWEEN ? AND ? THEN 20 ELSE 0 END`);
        queryParams.push(gsmValue, gsmValue - 5, gsmValue + 5);
      }
      
      // Individual component matches (Make, Grade, Brand)
      searchTerms.forEach(term => {
        queryParams.push(`%${term}%`, `%${term}%`, `%${term}%`);
        searchConditions.push('(dm.Make LIKE ? OR dm.Grade LIKE ? OR dm.Brand LIKE ?)');
        scoreComponents.push(`CASE WHEN dm.Make LIKE ? THEN 30 WHEN dm.Grade LIKE ? THEN 25 WHEN dm.Brand LIKE ? THEN 25 ELSE 0 END`);
        queryParams.push(`%${term}%`, `%${term}%`, `%${term}%`);
      });
      
      // Combine all search conditions
      if (searchConditions.length > 0) {
        whereConditions.push(`(${searchConditions.join(' OR ')})`);
        scoreExpression = `(${scoreComponents.join(' + ')})`;
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

    // Add relevance score to select
    selectFields += `, ${scoreExpression} as relevance_score`;

    // Determine sort order
    let orderBy = '';
    if (query && query.trim()) {
      // Sort by relevance score first, then by specified sort
      orderBy = `ORDER BY relevance_score DESC, dm.${sort.field} ${sort.order}`;
    } else {
      orderBy = `ORDER BY dm.${sort.field} ${sort.order}`;
    }

    // Calculate pagination
    const offset = (page - 1) * pageSize;

    // Build main query
    const mainQuery = `
      SELECT ${selectFields}
      FROM deal_master dm
      LEFT JOIN bmpa_members m ON dm.created_by_member_id = m.member_id
      LEFT JOIN stock_groups sg ON dm.groupID = sg.GroupID
      WHERE ${whereConditions.join(' AND ')}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    // Add pagination parameters
    queryParams.push(pageSize, offset);

    // Build count query for total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM deal_master dm
      WHERE ${whereConditions.join(' AND ')}
    `;

    // Remove pagination params for count query
    const countParams = queryParams.slice(0, -2);

    try {
      // Execute both queries
      const [deals, countResult] = await Promise.all([
        executeQuery(mainQuery, queryParams),
        executeQuery(countQuery, countParams)
      ]);

      const total = countResult[0]?.total || 0;

      // Process deals to add computed fields like in Elasticsearch
      const processedDeals = deals.map((deal: any) => ({
        ...deal,
        deal_description: deal.stock_description || '',
        deal_comments: deal.Seller_comments || '',
        dimensions: deal.Deckle_mm && deal.grain_mm 
          ? `${(deal.Deckle_mm/10).toFixed(1)} x ${(deal.grain_mm/10).toFixed(1)} cm`
          : '',
        relevance_score: deal.relevance_score || 0
      }));

      // Get aggregations for filters (like Elasticsearch facets)
      const aggregations = await this.getAggregations(whereConditions.slice(0, -1), countParams.slice(0, -2));

      return {
        success: true,
        data: processedDeals,
        total,
        aggregations,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  // Get aggregations for faceted search
  private async getAggregations(baseConditions: string[], baseParams: any[]): Promise<any> {
    try {
      const whereClause = baseConditions.length > 0 ? `WHERE ${baseConditions.join(' AND ')}` : '';
      
      // Get unique values for filters
      const [makes, brands, grades, gsmStats, priceStats] = await Promise.all([
        executeQuery(`SELECT DISTINCT Make, COUNT(*) as count FROM deal_master dm ${whereClause} AND Make IS NOT NULL GROUP BY Make ORDER BY count DESC LIMIT 20`, baseParams),
        executeQuery(`SELECT DISTINCT Brand, COUNT(*) as count FROM deal_master dm ${whereClause} AND Brand IS NOT NULL GROUP BY Brand ORDER BY count DESC LIMIT 20`, baseParams),
        executeQuery(`SELECT DISTINCT Grade, COUNT(*) as count FROM deal_master dm ${whereClause} AND Grade IS NOT NULL GROUP BY Grade ORDER BY count DESC LIMIT 20`, baseParams),
        executeQuery(`SELECT MIN(GSM) as min_gsm, MAX(GSM) as max_gsm, AVG(GSM) as avg_gsm FROM deal_master dm ${whereClause} AND GSM IS NOT NULL`, baseParams),
        executeQuery(`SELECT MIN(OfferPrice) as min_price, MAX(OfferPrice) as max_price, AVG(OfferPrice) as avg_price FROM deal_master dm ${whereClause} AND OfferPrice IS NOT NULL`, baseParams)
      ]);

      return {
        makes: makes.map((item: any) => ({ key: item.Make, doc_count: item.count })),
        brands: brands.map((item: any) => ({ key: item.Brand, doc_count: item.count })),
        grades: grades.map((item: any) => ({ key: item.Grade, doc_count: item.count })),
        gsm_range: gsmStats[0] || {},
        price_range: priceStats[0] || {}
      };
    } catch (error) {
      console.error('Error getting aggregations:', error);
      return {};
    }
  }

  // Enhanced suggestions based on stock_description patterns
  async getSuggestions(prefix: string): Promise<any[]> {
    if (prefix.length < 2) return [];

    try {
      const query = `
        SELECT DISTINCT 
          CASE 
            WHEN stock_description LIKE ? THEN stock_description
            WHEN Make LIKE ? THEN Make
            WHEN Brand LIKE ? THEN Brand  
            WHEN Grade LIKE ? THEN Grade
            WHEN CONCAT(GSM, ' GSM') LIKE ? THEN CONCAT(GSM, ' GSM')
            ELSE stock_description
          END as text,
          COUNT(*) as frequency
        FROM deal_master 
        WHERE StockStatus = 1 
          AND (
            stock_description LIKE ? OR 
            Make LIKE ? OR 
            Brand LIKE ? OR 
            Grade LIKE ? OR 
            CONCAT(GSM, ' GSM') LIKE ?
          )
        GROUP BY text
        ORDER BY frequency DESC, text ASC
        LIMIT 10
      `;

      const searchPattern = `%${prefix}%`;
      const params = Array(10).fill(searchPattern);

      const results = await executeQuery(query, params);
      
      return results.map((result: any) => ({
        text: result.text,
        score: result.frequency,
        type: this.getSuggestionType(result.text, prefix)
      }));
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  private getSuggestionType(text: string, prefix: string): string {
    if (text.includes('GSM') || text.includes('gsm')) return 'gsm';
    if (text.toLowerCase().includes(prefix.toLowerCase()) && text.split(' ').length > 3) return 'product';
    return 'component';
  }
}

export const hybridSearchService = new HybridSearchService();