import { executeQuery } from '../database';

// Normalize search text - remove spaces and dots, convert to lowercase
function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/[\s.]/g, '');
}

export class PowerSearchService {
  // Lightning-fast normalization-based search using search_key
  async searchDeals(params: {
    query?: string;
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    const { 
      query = '', 
      page = 1,
      pageSize = 20 
    } = params;

    const queryParams: any[] = [];
    let whereConditions = ['dm.StockStatus = 1'];
    
    if (query && query.trim()) {
      // Split the query into individual terms for flexible matching
      const searchTerms = query.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0);
      
      if (searchTerms.length > 0) {
        const termConditions = [];
        
        searchTerms.forEach(term => {
          // Normalize each term (remove spaces and dots)
          const normalizedTerm = term.replace(/[\s.]/g, '');
          if (normalizedTerm.length > 0) {
            queryParams.push(`%${normalizedTerm}%`);
            termConditions.push('dm.search_key LIKE ?');
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
        m.company_name as created_by_company
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
    
    return {
      success: true,
      data: results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      searchProvider: 'normalization-search'
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