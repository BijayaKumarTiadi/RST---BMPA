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
      const searchQuery = query.trim().toLowerCase();
      
      // Extract GSM if present
      let exactGsm: number | null = null;
      const gsmMatch = searchQuery.match(/(\d+)\s*gsm/i);
      if (gsmMatch) {
        exactGsm = parseInt(gsmMatch[1]);
      }
      
      // Build search conditions
      const conditions = [];
      
      // 1. Exact GSM match (highest priority)
      if (exactGsm) {
        queryParams.push(exactGsm);
        conditions.push('dm.GSM = ?');
      }
      
      // 2. Full phrase search in description
      queryParams.push(`%${searchQuery}%`);
      conditions.push('LOWER(dm.stock_description) LIKE ?');
      
      // 3. Individual word search
      const words = searchQuery.split(/\s+/).filter(w => w.length > 1);
      words.forEach(word => {
        if (!word.match(/^\d+$/) && word !== 'gsm') {
          queryParams.push(`%${word}%`);
          conditions.push('LOWER(dm.stock_description) LIKE ?');
          
          queryParams.push(`%${word}%`);
          conditions.push('LOWER(dm.Make) LIKE ?');
          
          queryParams.push(`%${word}%`);
          conditions.push('LOWER(dm.Brand) LIKE ?');
        }
      });
      
      if (conditions.length > 0) {
        whereConditions.push(`(${conditions.join(' OR ')})`);
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