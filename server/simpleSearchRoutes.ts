import { Router } from 'express';
import { simpleSearchService } from './services/simpleSearchService';

const searchRouter = Router();

// Main search endpoint
searchRouter.post('/search', async (req, res) => {
  try {
    const results = await simpleSearchService.searchDeals(req.body);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
});

// Autocomplete suggestions endpoint  
searchRouter.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.json({ success: true, suggestions: [] });
    }

    const suggestions = await simpleSearchService.getSuggestions(q);
    
    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.json({ success: false, suggestions: [] });
  }
});

export default searchRouter;