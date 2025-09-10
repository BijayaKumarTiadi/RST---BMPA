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

// Simple data endpoint - returns all data without filters (client-side filtering)
searchRouter.post('/data', async (req, res) => {
  try {
    const { executeQuery } = await import('./database');
    
    // Simple query to get all active deals - no server-side filtering
    const searchQuery = `
      SELECT 
        dm.*,
        sg.GroupName as category_name,
        m.mname as created_by_name,
        m.company_name as created_by_company
      FROM deal_master dm 
      LEFT JOIN stock_groups sg ON dm.groupID = sg.GroupID
      LEFT JOIN bmpa_members m ON dm.created_by_member_id = m.member_id
      WHERE dm.StockStatus = 1
      ORDER BY dm.TransID DESC
    `;
    
    const results = await executeQuery(searchQuery, []);
    
    res.json({
      success: true,
      data: results,
      total: results.length,
      message: 'Raw data for client-side filtering'
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch data' });
  }
});

export default searchRouter;