import { executeQuery } from '../database';

// Normalize search text - remove spaces and dots, convert to lowercase
function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/[\s.]/g, '');
}

export class PowerSearchService {
  // Get filter aggregations based on search results
  async getFilterAggregations(whereClause: string, queryParams: any[]): Promise<any> {
    const aggregations = {};
    
    // GSM aggregations
    const gsmQuery = `
      SELECT GSM, COUNT(*) as count 
      FROM deal_master dm 
      WHERE ${whereClause}
      GROUP BY GSM 
      ORDER BY GSM ASC
    `;
    const gsmResults = await executeQuery(gsmQuery, queryParams);
    aggregations['gsm'] = gsmResults;
    
    // Make aggregations  
    const makeQuery = `
      SELECT Make, COUNT(*) as count 
      FROM deal_master dm 
      WHERE ${whereClause}
      GROUP BY Make 
      ORDER BY Make ASC
    `;
    const makeResults = await executeQuery(makeQuery, queryParams);
    aggregations['makes'] = makeResults;
    
    // Grade aggregations
    const gradeQuery = `
      SELECT Grade, COUNT(*) as count 
      FROM deal_master dm 
      WHERE ${whereClause}
      GROUP BY Grade 
      ORDER BY Grade ASC
    `;
    const gradeResults = await executeQuery(gradeQuery, queryParams);
    aggregations['grades'] = gradeResults;
    
    // Brand aggregations
    const brandQuery = `
      SELECT Brand, COUNT(*) as count 
      FROM deal_master dm 
      WHERE ${whereClause}
      GROUP BY Brand 
      ORDER BY Brand ASC
    `;
    const brandResults = await executeQuery(brandQuery, queryParams);
    aggregations['brands'] = brandResults;
    
    // Unit aggregations
    const unitQuery = `
      SELECT OfferUnit, COUNT(*) as count 
      FROM deal_master dm 
      WHERE ${whereClause}
      GROUP BY OfferUnit 
      ORDER BY OfferUnit ASC
    `;
    const unitResults = await executeQuery(unitQuery, queryParams);
    aggregations['units'] = unitResults;
    
    return aggregations;
  }

  // Lightning-fast normalization-based search using search_key
  async searchDeals(params: {
    query?: string;
    page?: number;
    pageSize?: number;
    exclude_member_id?: number;
  }): Promise<any> {
    const { 
      query = '', 
      page = 1,
      pageSize = 20,
      exclude_member_id 
    } = params;

    const queryParams: any[] = [];
    let whereConditions = ['dm.StockStatus = 1'];
    
    // Exclude user's own products from marketplace view
    if (exclude_member_id) {
      whereConditions.push('(dm.memberID != ? AND dm.created_by_member_id != ?)');
      queryParams.push(exclude_member_id, exclude_member_id);
    }
    
    if (query && query.trim()) {
      // Split the query into individual terms for flexible matching
      const searchTerms = query.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0);
      
      if (searchTerms.length > 0) {
        const termConditions = [];
        
        searchTerms.forEach(term => {
          // Normalize each term (remove spaces and dots)
          const normalizedTerm = term.replace(/[\s.]/g, '');
          if (normalizedTerm.length > 0) {
            
            // Check if this is a GSM pattern (number + gsm)
            const gsmMatch = normalizedTerm.match(/^(\d+)gsm?$/i);
            if (gsmMatch) {
              // For GSM terms, use exact matching with word boundaries
              const gsmValue = gsmMatch[1];
              queryParams.push(`%${gsmValue}gsm%`);
              // Use REGEXP for exact GSM matching to avoid 40gsm matching 340gsm
              queryParams.push(`[^0-9]${gsmValue}gsm`);
              termConditions.push('(dm.search_key LIKE ? OR dm.search_key REGEXP ?)');
            } else if (/^\d+$/.test(normalizedTerm)) {
              // If it's just a number, treat it as potential GSM too
              queryParams.push(`%${normalizedTerm}gsm%`);
              queryParams.push(`[^0-9]${normalizedTerm}gsm`);
              termConditions.push('(dm.search_key LIKE ? OR dm.search_key REGEXP ?)');
            } else {
              // For other terms, use flexible substring matching
              queryParams.push(`%${normalizedTerm}%`);
              termConditions.push('dm.search_key LIKE ?');
            }
          }
        });
        
        if (termConditions.length > 0) {
          // All terms must be present (AND logic) for best matching
          whereConditions.push('(' + termConditions.join(' AND ') + ')');
        }
      }
    }
    
    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * pageSize;
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM deal_master dm 
      WHERE ${whereClause}
    `;
    
    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0]?.total || 0;
    
    // Get results with simple ordering (remove complex relevance scoring for now)
    const searchQueryText = `
      SELECT 
        dm.*,
        m.mname as created_by_name,
        m.company_name as created_by_company,
        m.email as seller_email
      FROM deal_master dm
      LEFT JOIN bmpa_members m ON dm.created_by_member_id = m.member_id
      WHERE ${whereClause}
      ORDER BY dm.TransID DESC
      LIMIT ? OFFSET ?
    `;
    
    // Simple parameter passing - just the search terms and pagination
    const searchParams = [...queryParams];
    searchParams.push(pageSize, offset);
    
    const results = await executeQuery(searchQueryText, searchParams);
    
    // Get filter aggregations for the current search
    const aggregations = await this.getFilterAggregations(whereClause, queryParams);
    
    return {
      success: true,
      data: results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      searchProvider: 'normalization-search',
      aggregations: aggregations
    };
  }
  
  // Fast autocomplete suggestions using search_key
  async getSuggestions(query: string): Promise<any[]> {
    if (!query || query.length < 2) return [];
    
    // Normalize the query for search_key matching
    const normalizedQuery = normalizeSearchText(query);
    const searchTerm = `%${normalizedQuery}%`;
    
    const suggestQuery = `
      SELECT DISTINCT 
        CONCAT(Make, ' ', Grade, ' ', GSM, ' GSM') as text,
        'product' as type
      FROM deal_master 
      WHERE StockStatus = 1 
      AND search_key LIKE ?
      LIMIT 10
    `;
    
    const results = await executeQuery(suggestQuery, [searchTerm]);
    
    return results;
  }
}

export const powerSearchService = new PowerSearchService();