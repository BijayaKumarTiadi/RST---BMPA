import { Router } from 'express';
import { elasticsearchService } from './services/elasticsearchService';

const searchRouter = Router();

// Initialize Elasticsearch index on startup
elasticsearchService.initializeIndex().catch(console.error);

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

    const results = await elasticsearchService.searchDeals({
      searchText: query,
      filters,
      sort,
      from,
      size: pageSize
    });

    res.json({
      success: true,
      data: results.hits,
      total: results.total,
      aggregations: results.aggregations,
      page,
      pageSize,
      totalPages: Math.ceil(results.total / pageSize)
    });
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

    const suggestions = await elasticsearchService.getSuggestions(q, category as string);
    
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