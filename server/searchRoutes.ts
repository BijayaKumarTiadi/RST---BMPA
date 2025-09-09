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
    const { category, gsm, tolerance, deckle, deckleUnit, grain, grainUnit, page = 1, pageSize = 12 } = req.body;
    
    let whereClause = 'WHERE StockStatus = 1'; // Only active stock
    const queryParams: any[] = [];
    
    // Add category filter
    if (category && category.trim()) {
      whereClause += ` AND (Make LIKE ? OR Grade LIKE ? OR Brand LIKE ?)`;
      const categoryPattern = `%${category.trim()}%`;
      queryParams.push(categoryPattern, categoryPattern, categoryPattern);
    }
    
    // Add GSM filter with tolerance
    if (gsm && !isNaN(Number(gsm))) {
      const gsmValue = Number(gsm);
      const toleranceValue = tolerance && !isNaN(Number(tolerance)) ? Number(tolerance) : 0;
      const minGsm = gsmValue - toleranceValue;
      const maxGsm = gsmValue + toleranceValue;
      
      whereClause += ` AND CAST(GSM AS UNSIGNED) BETWEEN ? AND ?`;
      queryParams.push(minGsm, maxGsm);
    }
    
    // Add deckle filter (search in stock_description)
    if (deckle && !isNaN(Number(deckle))) {
      const deckleValue = Number(deckle);
      whereClause += ` AND stock_description LIKE ?`;
      queryParams.push(`%${deckleValue}%`);
    }
    
    // Add grain filter (search in stock_description)
    if (grain && !isNaN(Number(grain))) {
      const grainValue = Number(grain);
      whereClause += ` AND stock_description LIKE ?`;
      queryParams.push(`%${grainValue}%`);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM deal_master ${whereClause}`;
    const [countResult] = await executeQuery(countQuery, queryParams);
    const total = countResult.total;
    
    // Get paginated results
    const offset = (page - 1) * pageSize;
    const searchQuery = `
      SELECT 
        TransID,
        Make,
        Grade,
        Brand,
        GSM,
        OfferUnit,
        OfferQty,
        OfferPrice,
        Location,
        deal_created_at,
        stock_description
      FROM deal_master 
      ${whereClause}
      ORDER BY deal_created_at DESC
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