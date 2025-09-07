import { Router } from 'express';
import { elasticsearchService } from './services/elasticsearchService';
import { simpleSearchService } from './services/simpleSearchService';

const searchRouter = Router();

// Track if Elasticsearch is available
let elasticsearchAvailable = false;

// Initialize Elasticsearch index on startup, fallback to simple search if not available
elasticsearchService.initializeIndex()
  .then(() => {
    elasticsearchAvailable = true;
    console.log('✅ Elasticsearch initialized successfully');
  })
  .catch((error) => {
    elasticsearchAvailable = false;
    console.log('⚠️ Elasticsearch not available, falling back to MySQL-based search');
    console.log('💡 This is normal in environments without Elasticsearch configured');
  });

// Main search endpoint with fallback
searchRouter.post('/search', async (req, res) => {
  try {
    if (elasticsearchAvailable) {
      // Try Elasticsearch first
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
          totalPages: Math.ceil(results.total / pageSize),
          searchProvider: 'elasticsearch'
        });
        return;
      } catch (esError) {
        console.log('⚠️ Elasticsearch failed, falling back to simple search');
        elasticsearchAvailable = false;
      }
    }

    // Fallback to simple search
    const results = await simpleSearchService.searchDeals(req.body);
    res.json({
      ...results,
      searchProvider: 'mysql'
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Autocomplete suggestions endpoint with fallback
searchRouter.get('/suggestions', async (req, res) => {
  try {
    const { q, category } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.json({ success: true, suggestions: [] });
    }

    if (elasticsearchAvailable) {
      try {
        const suggestions = await elasticsearchService.getSuggestions(q, category as string);
        return res.json({
          success: true,
          suggestions,
          searchProvider: 'elasticsearch'
        });
      } catch (esError) {
        console.log('⚠️ Elasticsearch suggestions failed, falling back to simple search');
        elasticsearchAvailable = false;
      }
    }

    // Fallback to simple search suggestions
    const suggestions = await simpleSearchService.getSuggestions(q);
    res.json({
      success: true,
      suggestions,
      searchProvider: 'mysql'
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.json({ success: false, suggestions: [] });
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
      error: error instanceof Error ? error.message : String(error)
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
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default searchRouter;