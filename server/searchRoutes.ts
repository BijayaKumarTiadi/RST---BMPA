import { Router } from 'express';
import { hybridSearchService } from './services/hybridSearchService';

const searchRouter = Router();

// Hybrid search service is ready to use (MySQL-based with Elasticsearch-inspired features)

// Main search endpoint
searchRouter.post('/search', async (req, res) => {
  try {
    const {
      query,
      filters,
      sort,
      page = 1,
      pageSize = 20
    } = req.body;

    const from = (page - 1) * pageSize;

    const results = await hybridSearchService.searchDeals({
      query,
      filters,
      sort,
      page,
      pageSize
    });

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: (error as Error).message
    });
  }
});

// Autocomplete suggestions endpoint
searchRouter.get('/suggestions', async (req, res) => {
  try {
    const { q, category } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.json({ suggestions: [] });
    }

    const suggestions = await hybridSearchService.getSuggestions(q);
    
    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.json({ suggestions: [] });
  }
});

// Sync data endpoint (can be called periodically or after updates)
searchRouter.post('/sync', async (req, res) => {
  try {
    await elasticsearchService.syncDealsToElasticsearch();
    res.json({
      success: true,
      message: 'Data sync completed successfully'
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Data sync failed',
      error: (error as Error).message
    });
  }
});

// Health check endpoint
searchRouter.get('/health', async (req, res) => {
  try {
    const { Client } = await import('@elastic/elasticsearch');
    const client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
    });
    
    const health = await client.cluster.health();
    res.json({
      success: true,
      status: health.status,
      cluster: health.cluster_name
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Elasticsearch is not available',
      error: (error as Error).message
    });
  }
});

export default searchRouter;