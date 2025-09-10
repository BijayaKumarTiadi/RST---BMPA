import { Router } from 'express';
import { powerSearchService } from './services/powerSearchService';

const searchRouter = Router();

// Fast normalization-based search
searchRouter.post('/search', async (req, res) => {
  try {
    const results = await powerSearchService.searchDeals(req.body);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Fast suggestions with search_key
searchRouter.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.json({ success: true, suggestions: [] });
    }

    const suggestions = await powerSearchService.getSuggestions(q);
    res.json({
      success: true,
      suggestions,
      searchProvider: 'normalization-search'
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.json({ success: false, suggestions: [] });
  }
});

// Health check endpoint
searchRouter.get('/health', async (req, res) => {
  res.json({
    success: true,
    message: 'Normalization-based search is running',
    searchProvider: 'normalization-search'
  });
});

// Precise search endpoint
searchRouter.post('/precise', async (req, res) => {
  try {
    const { executeQuery } = await import('./database');
    const { category, gsm, tolerance, deckle, deckleUnit, grain, grainUnit, dimensionTolerance, page = 1, pageSize = 12 } = req.body;
    
    let whereClause = 'WHERE dm.StockStatus = 1'; // Only active stock
    const queryParams: any[] = [];
    
    // Add category filter using stock_groups table
    if (category && category.trim() && category !== 'all') {
      whereClause += ` AND sg.GroupName LIKE ?`;
      queryParams.push(`%${category.trim()}%`);
    }
    
    // Add GSM filter with tolerance
    if (gsm && !isNaN(Number(gsm))) {
      const gsmValue = Number(gsm);
      const toleranceValue = tolerance && !isNaN(Number(tolerance)) ? Number(tolerance) : 0;
      const minGsm = gsmValue - toleranceValue;
      const maxGsm = gsmValue + toleranceValue;
      
      whereClause += ` AND dm.GSM BETWEEN ? AND ?`;
      queryParams.push(minGsm, maxGsm);
    }
    
    // Determine default tolerance for dimension searches
    const hasBothDimensions = (deckle && !isNaN(Number(deckle))) && (grain && !isNaN(Number(grain)));
    const defaultDimTolerance = hasBothDimensions ? 20 : 0; // Auto-apply 20mm tolerance when both dimensions provided
    
    // Add deckle filter using actual Deckle_mm column with tolerance
    if (deckle && !isNaN(Number(deckle))) {
      const deckleValue = Number(deckle);
      const dimToleranceValue = dimensionTolerance && !isNaN(Number(dimensionTolerance)) 
        ? Number(dimensionTolerance) 
        : defaultDimTolerance;
      
      // Convert to mm if needed
      let deckleValueMm = deckleValue;
      if (deckleUnit === 'cm') {
        deckleValueMm = deckleValue * 10; // Convert cm to mm
      } else if (deckleUnit === 'inch') {
        deckleValueMm = deckleValue * 25.4; // Convert inch to mm
      }
      
      const minDeckle = deckleValueMm - dimToleranceValue;
      const maxDeckle = deckleValueMm + dimToleranceValue;
      
      whereClause += ` AND dm.Deckle_mm BETWEEN ? AND ?`;
      queryParams.push(minDeckle, maxDeckle);
    }
    
    // Add grain filter using actual grain_mm column with tolerance
    if (grain && !isNaN(Number(grain))) {
      const grainValue = Number(grain);
      const dimToleranceValue = dimensionTolerance && !isNaN(Number(dimensionTolerance)) 
        ? Number(dimensionTolerance) 
        : defaultDimTolerance;
      
      // Convert to mm if needed
      let grainValueMm = grainValue;
      if (grainUnit === 'cm') {
        grainValueMm = grainValue * 10; // Convert cm to mm
      } else if (grainUnit === 'inch') {
        grainValueMm = grainValue * 25.4; // Convert inch to mm
      }
      
      const minGrain = grainValueMm - dimToleranceValue;
      const maxGrain = grainValueMm + dimToleranceValue;
      
      whereClause += ` AND dm.grain_mm BETWEEN ? AND ?`;
      queryParams.push(minGrain, maxGrain);
    }
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM deal_master dm 
      LEFT JOIN stock_groups sg ON dm.groupID = sg.GroupID
      ${whereClause}
    `;
    const [countResult] = await executeQuery(countQuery, queryParams);
    const total = countResult.total;
    
    // Get paginated results
    const offset = (page - 1) * pageSize;
    const searchQuery = `
      SELECT 
        dm.*,
        sg.GroupName as category_name,
        m.mname as created_by_name,
        m.company_name as created_by_company
      FROM deal_master dm 
      LEFT JOIN stock_groups sg ON dm.groupID = sg.GroupID
      LEFT JOIN bmpa_members m ON dm.created_by_member_id = m.member_id
      ${whereClause}
      ORDER BY dm.TransID DESC
      LIMIT ? OFFSET ?
    `;
    
    const searchParams = [...queryParams, pageSize, offset];
    const results = await executeQuery(searchQuery, searchParams);
    
    res.json({
      success: true,
      data: results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      searchType: 'precise'
    });
  } catch (error) {
    console.error('Error performing precise search:', error);
    res.status(500).json({ success: false, message: 'Failed to perform precise search' });
  }
});

// UNIFIED SEARCH ENDPOINT - Complete filter support
searchRouter.post('/unified', async (req, res) => {
  try {
    const {
      query = '',
      preciseSearch = {},
      filters = {},
      page = 1,
      pageSize = 12,
      sortBy = 'newest'
    } = req.body;

    const { executeQuery, executeQuerySingle } = await import('./database');

    // Build comprehensive SQL with all filter types
    let baseQuery = `
      SELECT 
        dm.*,
        bm.mname as seller_name,
        bm.company_name as seller_company,
        bm.city as seller_location,
        cat.category_name
      FROM deal_master dm
      LEFT JOIN bmpa_members bm ON dm.SellerId = bm.member_id
      LEFT JOIN bmpa_categories cat ON dm.CategoryID = cat.category_id
      WHERE dm.StockStatus = 1 AND bm.mstatus = 1
    `;

    const queryParams: any[] = [];
    const conditions: string[] = [];

    // Text search
    if (query && query.trim()) {
      conditions.push(`(dm.search_key LIKE ? OR dm.Make LIKE ? OR dm.Grade LIKE ? OR dm.Brand LIKE ?)`);
      const searchTerm = `%${query.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Advanced filters
    if (filters.makes && filters.makes.length > 0) {
      const placeholders = filters.makes.map(() => '?').join(',');
      conditions.push(`dm.Make IN (${placeholders})`);
      queryParams.push(...filters.makes);
    }
    if (filters.grades && filters.grades.length > 0) {
      const placeholders = filters.grades.map(() => '?').join(',');
      conditions.push(`dm.Grade IN (${placeholders})`);
      queryParams.push(...filters.grades);
    }
    if (filters.brands && filters.brands.length > 0) {
      const placeholders = filters.brands.map(() => '?').join(',');
      conditions.push(`dm.Brand IN (${placeholders})`);
      queryParams.push(...filters.brands);
    }
    if (filters.gsm && filters.gsm.length > 0) {
      const placeholders = filters.gsm.map(() => '?').join(',');
      conditions.push(`dm.GSM IN (${placeholders})`);
      queryParams.push(...filters.gsm);
    }
    if (filters.locations && filters.locations.length > 0) {
      const placeholders = filters.locations.map(() => '?').join(',');
      conditions.push(`bm.city IN (${placeholders})`);
      queryParams.push(...filters.locations);
    }

    // Range filters
    if (filters.gsmRange) {
      if (filters.gsmRange.min) {
        conditions.push('dm.GSM >= ?');
        queryParams.push(parseFloat(filters.gsmRange.min));
      }
      if (filters.gsmRange.max) {
        conditions.push('dm.GSM <= ?');
        queryParams.push(parseFloat(filters.gsmRange.max));
      }
    }

    // Boolean filters
    if (filters.inStock) {
      conditions.push('dm.Qty > 0');
    }
    if (filters.hasImages) {
      conditions.push('dm.ImagePath IS NOT NULL AND dm.ImagePath != ""');
    }

    // Add conditions
    if (conditions.length > 0) {
      baseQuery += ` AND ${conditions.join(' AND ')}`;
    }

    // Sorting
    let orderBy = 'ORDER BY dm.DateAdded DESC';
    switch (sortBy) {
      case 'price-low': orderBy = 'ORDER BY dm.Rate ASC'; break;
      case 'price-high': orderBy = 'ORDER BY dm.Rate DESC'; break;
      case 'gsm-low': orderBy = 'ORDER BY dm.GSM ASC'; break;
      case 'gsm-high': orderBy = 'ORDER BY dm.GSM DESC'; break;
    }

    // Get total count
    const countQuery = baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await executeQuerySingle(countQuery, queryParams);
    const total = countResult?.total || 0;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const finalQuery = `${baseQuery} ${orderBy} LIMIT ${pageSize} OFFSET ${offset}`;
    const deals = await executeQuery(finalQuery, queryParams);

    // Generate aggregations for filter options
    const aggregations = {
      makes: await executeQuery(baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT dm.Make as Make, COUNT(*) as count FROM') + ' GROUP BY dm.Make HAVING dm.Make IS NOT NULL ORDER BY count DESC LIMIT 20', queryParams),
      grades: await executeQuery(baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT dm.Grade as Grade, COUNT(*) as count FROM') + ' GROUP BY dm.Grade HAVING dm.Grade IS NOT NULL ORDER BY count DESC LIMIT 20', queryParams),
      brands: await executeQuery(baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT dm.Brand as Brand, COUNT(*) as count FROM') + ' GROUP BY dm.Brand HAVING dm.Brand IS NOT NULL ORDER BY count DESC LIMIT 20', queryParams),
      gsm: await executeQuery(baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT dm.GSM as GSM, COUNT(*) as count FROM') + ' GROUP BY dm.GSM HAVING dm.GSM IS NOT NULL ORDER BY dm.GSM ASC LIMIT 30', queryParams),
      locations: await executeQuery(baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT bm.city as location, COUNT(*) as count FROM') + ' GROUP BY bm.city HAVING bm.city IS NOT NULL ORDER BY count DESC LIMIT 15', queryParams)
    };

    res.json({
      success: true,
      data: deals,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      aggregations
    });

  } catch (error) {
    console.error('Unified search error:', error);
    res.status(500).json({ success: false, message: 'Search failed', error: error.message });
  }
});

export default searchRouter;