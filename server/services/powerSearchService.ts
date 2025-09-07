import { executeQuery } from '../database';

export class PowerSearchService {
  // Lightning-fast description-based search
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
      const searchQuery = query.trim();
      const searchLower = searchQuery.toLowerCase();
      
      // Parse search query for components
      let gsmValue: number | null = null;
      let searchTerms: string[] = [];
      
      // Extract GSM value if present
      const gsmMatch = searchQuery.match(/(\d+)\s*gsm/i);
      if (gsmMatch) {
        gsmValue = parseInt(gsmMatch[1]);
        // Remove GSM from search terms
        searchTerms = searchLower.replace(/\d+\s*gsm/gi, '').trim().split(/\s+/).filter(t => t);
      } else {
        searchTerms = searchLower.split(/\s+/).filter(t => t);
      }
      
      // Build AND conditions for precise matching
      const andConditions = [];
      
      // GSM must match exactly if specified
      if (gsmValue !== null) {
        queryParams.push(gsmValue);
        andConditions.push('dm.GSM = ?');
      }
      
      // Only require terms to match if there are any
      if (searchTerms.length > 0) {
        searchTerms.forEach(term => {
          if (term && term.length >= 1) {
            // Each term can match in Make, Brand, Grade, or description
            const termConditions = [];
            
            queryParams.push(`%${term}%`);
            termConditions.push('LOWER(dm.Make) LIKE ?');
            
            queryParams.push(`%${term}%`);
            termConditions.push('LOWER(dm.Brand) LIKE ?');
            
            queryParams.push(`%${term}%`);
            termConditions.push('LOWER(dm.Grade) LIKE ?');
            
            queryParams.push(`%${term}%`);
            termConditions.push('LOWER(dm.stock_description) LIKE ?');
            
            if (termConditions.length > 0) {
              andConditions.push(`(${termConditions.join(' OR ')})`);
            }
          }
        });
      }
      
      // Combine with AND logic for better precision
      if (andConditions.length > 0) {
        whereConditions.push('(' + andConditions.join(' AND ') + ')');
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
    
    // Get results with smart ordering
    const searchQueryText = `
      SELECT 
        dm.*,
        m.mname as created_by_name,
        m.company_name as created_by_company,
        ${query ? `
          CASE 
            WHEN dm.GSM = ? THEN 1000
            WHEN LOWER(dm.stock_description) LIKE ? THEN 100
            WHEN LOWER(dm.Make) LIKE ? THEN 50
            WHEN LOWER(dm.Brand) LIKE ? THEN 40
            ELSE 1
          END as relevance
        ` : '1 as relevance'}
      FROM deal_master dm
      LEFT JOIN bmpa_members m ON dm.created_by_member_id = m.member_id
      WHERE ${whereClause}
      ORDER BY relevance DESC, dm.TransID DESC
      LIMIT ? OFFSET ?
    `;
    
    // Add scoring parameters
    const searchParams = [...queryParams];
    if (query) {
      const searchTerm = `%${query.toLowerCase()}%`;
      const gsmMatch = query.match(/(\d+)\s*gsm/i);
      const gsmValue = gsmMatch ? parseInt(gsmMatch[1]) : 0;
      
      searchParams.push(gsmValue, searchTerm, searchTerm, searchTerm);
    }
    searchParams.push(pageSize, offset);
    
    const results = await executeQuery(searchQueryText, searchParams);
    
    return {
      success: true,
      data: results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      searchProvider: 'power-search'
    };
  }
  
  // Fast autocomplete suggestions
  async getSuggestions(query: string): Promise<any[]> {
    if (!query || query.length < 2) return [];
    
    const searchTerm = `${query.toLowerCase()}%`;
    
    const suggestQuery = `
      SELECT DISTINCT 
        CONCAT(Make, ' ', Brand, ' ', GSM, ' GSM') as text,
        'product' as type
      FROM deal_master 
      WHERE StockStatus = 1 
      AND (
        LOWER(Make) LIKE ? OR 
        LOWER(Brand) LIKE ? OR 
        LOWER(stock_description) LIKE ? OR
        CAST(GSM AS CHAR) LIKE ?
      )
      LIMIT 10
    `;
    
    const results = await executeQuery(suggestQuery, [
      searchTerm, searchTerm, searchTerm, searchTerm
    ]);
    
    return results;
  }
}

export const powerSearchService = new PowerSearchService();