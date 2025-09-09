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
      
      // Convert to mm if needed (assuming input might be in cm)
      let deckleValueMm = deckleValue;
      if (deckleUnit === 'cm') {
        deckleValueMm = deckleValue * 10; // Convert cm to mm
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
      
      // Convert to mm if needed (assuming input might be in cm)
      let grainValueMm = grainValue;
      if (grainUnit === 'cm') {
        grainValueMm = grainValue * 10; // Convert cm to mm
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

export default searchRouter;