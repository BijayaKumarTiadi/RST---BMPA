import { Client } from '@elastic/elasticsearch';
import { executeQuery } from '../database';

// Initialize Elasticsearch client
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_AUTH ? {
    username: process.env.ELASTICSEARCH_USER || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || ''
  } : undefined
});

// Index name for deals
const DEALS_INDEX = 'stock_laabh_deals';

// Mapping for paper industry specific fields
const dealsMapping = {
  properties: {
    TransID: { type: 'keyword' },
    Make: { 
      type: 'text',
      fields: {
        keyword: { type: 'keyword' },
        autocomplete: { 
          type: 'search_as_you_type',
          max_shingle_size: 3
        }
      }
    },
    Grade: { 
      type: 'text',
      fields: {
        keyword: { type: 'keyword' },
        autocomplete: { 
          type: 'search_as_you_type',
          max_shingle_size: 3
        }
      }
    },
    Brand: { 
      type: 'text',
      fields: {
        keyword: { type: 'keyword' },
        autocomplete: { 
          type: 'search_as_you_type',
          max_shingle_size: 3
        }
      }
    },
    GSM: { 
      type: 'integer',
      fields: {
        range: { type: 'integer_range' }
      }
    },
    Deckle_mm: { type: 'float' },
    grain_mm: { type: 'float' },
    groupID: { type: 'keyword' },
    memberID: { type: 'keyword' },
    StockStatus: { type: 'keyword' },
    Seller_comments: { 
      type: 'text',
      analyzer: 'standard'
    },
    stock_description: { 
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' },
        autocomplete: { 
          type: 'search_as_you_type',
          max_shingle_size: 4
        },
        // Specialized analyzer for stock descriptions
        components: {
          type: 'text',
          analyzer: 'stock_analyzer'
        }
      }
    },
    OfferPrice: { type: 'float' },
    OfferUnit: { type: 'keyword' },
    quantity: { type: 'float' },
    created_by_name: { 
      type: 'text',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    created_by_company: { 
      type: 'text',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    deal_created_at: { type: 'date' },
    deal_updated_at: { type: 'date' },
    
    // Computed fields for better search
    dimensions: { type: 'text' },
    full_description: { type: 'text' },
    suggest: {
      type: 'completion',
      contexts: [
        {
          name: 'category',
          type: 'category'
        }
      ]
    }
  }
};

export class ElasticsearchService {
  // Initialize index with proper mappings
  async initializeIndex(): Promise<void> {
    try {
      const indexExists = await esClient.indices.exists({ index: DEALS_INDEX });
      
      if (!indexExists) {
        await esClient.indices.create({
          index: DEALS_INDEX,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
              analysis: {
                analyzer: {
                  autocomplete: {
                    tokenizer: 'autocomplete',
                    filter: ['lowercase']
                  },
                  autocomplete_search: {
                    tokenizer: 'lowercase'
                  },
                  // Specialized analyzer for stock descriptions
                  stock_analyzer: {
                    tokenizer: 'standard',
                    filter: ['lowercase', 'stop', 'stock_synonyms']
                  }
                },
                filter: {
                  stock_synonyms: {
                    type: 'synonym',
                    synonyms: [
                      'gsm,gram,grams',
                      'mm,millimeter,millimeters',
                      'cm,centimeter,centimeters'
                    ]
                  }
                },
                tokenizer: {
                  autocomplete: {
                    type: 'edge_ngram',
                    min_gram: 2,
                    max_gram: 10,
                    token_chars: ['letter', 'digit']
                  }
                }
              }
            },
            mappings: dealsMapping
          }
        });
        
        console.log('✅ Elasticsearch index created successfully');
      } else {
        console.log('ℹ️ Elasticsearch index already exists');
      }
    } catch (error) {
      console.error('❌ Error initializing Elasticsearch index:', error);
    }
  }

  // Sync data from MySQL to Elasticsearch
  async syncDealsToElasticsearch(): Promise<void> {
    try {
      // Fetch all deals from MySQL
      const deals = await executeQuery(`
        SELECT 
          dm.*,
          m.mname as created_by_name,
          m.company_name as created_by_company
        FROM deal_master dm
        LEFT JOIN bmpa_members m ON dm.created_by_member_id = m.member_id
        WHERE dm.StockStatus = 'active'
      `);

      if (!deals || deals.length === 0) {
        console.log('No deals to sync');
        return;
      }

      // Prepare bulk operations
      const operations = deals.flatMap(deal => {
        // Create dimensions string
        const dimensions = deal.Deckle_mm && deal.grain_mm 
          ? `${(deal.Deckle_mm/10).toFixed(1)} x ${(deal.grain_mm/10).toFixed(1)} cm`
          : '';
        
        // Create full description for better search
        const fullDescription = [
          deal.Make,
          deal.Brand,
          deal.Grade,
          deal.GSM ? `${deal.GSM} GSM` : '',
          dimensions,
          deal.stock_description,
          deal.Seller_comments
        ].filter(Boolean).join(' ');

        // Prepare suggest field for autocomplete
        const suggestInput = [
          deal.Make,
          deal.Brand,
          deal.Grade,
          deal.stock_description?.split(' ').slice(0, 5).join(' ')
        ].filter(Boolean);

        return [
          { index: { _index: DEALS_INDEX, _id: deal.TransID.toString() } },
          {
            ...deal,
            dimensions,
            full_description: fullDescription,
            suggest: {
              input: suggestInput,
              contexts: {
                category: deal.groupID ? [deal.groupID.toString()] : ['general']
              }
            }
          }
        ];
      });

      // Bulk index to Elasticsearch
      const bulkResponse = await esClient.bulk({ 
        refresh: true, 
        operations 
      });

      if (bulkResponse.errors) {
        const erroredDocuments: any[] = [];
        bulkResponse.items.forEach((action: any, i: number) => {
          const operation = Object.keys(action)[0];
          if (action[operation].error) {
            erroredDocuments.push({
              status: action[operation].status,
              error: action[operation].error
            });
          }
        });
        console.error('❌ Bulk indexing errors:', erroredDocuments);
      } else {
        console.log(`✅ Successfully indexed ${deals.length} deals to Elasticsearch`);
      }
    } catch (error) {
      console.error('❌ Error syncing deals to Elasticsearch:', error);
    }
  }

  // Advanced search with multiple features
  async searchDeals(query: {
    searchText?: string;
    filters?: {
      make?: string[];
      brand?: string[];
      grade?: string[];
      gsmMin?: number;
      gsmMax?: number;
      dimensionsMin?: { deckle: number; grain: number };
      dimensionsMax?: { deckle: number; grain: number };
      priceMin?: number;
      priceMax?: number;
      company?: string[];
    };
    sort?: { field: string; order: 'asc' | 'desc' };
    from?: number;
    size?: number;
  }): Promise<any> {
    const { searchText, filters = {}, sort, from = 0, size = 20 } = query;

    // Build the query
    const must: any[] = [];
    const filter = [];
    const should = [];

    // Text search with stock_description priority and flexible matching
    if (searchText) {
      const cleanSearchText = searchText.trim();
      
      should.push(
        // Highest priority: exact match in stock_description
        { match_phrase: { stock_description: { query: cleanSearchText, boost: 5 } } },
        // High priority: stock_description with components analyzer
        { match: { 'stock_description.components': { query: cleanSearchText, boost: 4, fuzziness: 'AUTO' } } },
        // Partial matches in stock_description
        { match: { stock_description: { query: cleanSearchText, boost: 3.5, fuzziness: 'AUTO' } } },
        
        // Individual component matches (Make, Grade, Brand)
        { match: { Make: { query: cleanSearchText, boost: 3, fuzziness: 'AUTO' } } },
        { match: { Grade: { query: cleanSearchText, boost: 3, fuzziness: 'AUTO' } } },
        { match: { Brand: { query: cleanSearchText, boost: 3, fuzziness: 'AUTO' } } },
        
        // GSM-specific search (handles "400 gsm", "400", etc.)
        ...(cleanSearchText.match(/\d+/g) ? [
          { 
            bool: {
              should: [
                { term: { GSM: { value: parseInt(cleanSearchText.match(/\d+/)[0]), boost: 4 } } },
                { range: { GSM: { 
                  gte: parseInt(cleanSearchText.match(/\d+/)[0]) - 5,
                  lte: parseInt(cleanSearchText.match(/\d+/)[0]) + 5,
                  boost: 2
                }}}
              ]
            }
          }
        ] : []),
        
        // Multi-field search for flexible word order
        { multi_match: {
          query: cleanSearchText,
          type: 'cross_fields',
          fields: ['Make^2', 'Grade^2', 'Brand^2', 'stock_description^3'],
          operator: 'or',
          minimum_should_match: '50%'
        }},
        
        // Autocomplete for partial matches
        { multi_match: {
          query: cleanSearchText,
          type: 'bool_prefix',
          fields: [
            'stock_description.autocomplete^3',
            'Make.autocomplete^2',
            'Brand.autocomplete^2',
            'Grade.autocomplete^2'
          ]
        }},
        
        // Fallback: full description search
        { match: { full_description: { query: cleanSearchText, fuzziness: 'AUTO', boost: 1 } } }
      );
    }

    // Apply filters
    if (filters.make?.length) {
      filter.push({ terms: { 'Make.keyword': filters.make } });
    }
    if (filters.brand?.length) {
      filter.push({ terms: { 'Brand.keyword': filters.brand } });
    }
    if (filters.grade?.length) {
      filter.push({ terms: { 'Grade.keyword': filters.grade } });
    }

    // GSM range filter
    if (filters.gsmMin || filters.gsmMax) {
      filter.push({
        range: {
          GSM: {
            ...(filters.gsmMin !== undefined && { gte: filters.gsmMin }),
            ...(filters.gsmMax !== undefined && { lte: filters.gsmMax })
          }
        }
      });
    }

    // Dimensions range filter
    if (filters.dimensionsMin || filters.dimensionsMax) {
      if (filters.dimensionsMin) {
        filter.push({
          bool: {
            must: [
              { range: { Deckle_mm: { gte: filters.dimensionsMin.deckle } } },
              { range: { grain_mm: { gte: filters.dimensionsMin.grain } } }
            ]
          }
        });
      }
      if (filters.dimensionsMax) {
        filter.push({
          bool: {
            must: [
              { range: { Deckle_mm: { lte: filters.dimensionsMax.deckle } } },
              { range: { grain_mm: { lte: filters.dimensionsMax.grain } } }
            ]
          }
        });
      }
    }

    // Price range filter
    if (filters.priceMin || filters.priceMax) {
      filter.push({
        range: {
          OfferPrice: {
            ...(filters.priceMin !== undefined && { gte: filters.priceMin }),
            ...(filters.priceMax !== undefined && { lte: filters.priceMax })
          }
        }
      });
    }

    // Company filter
    if (filters.company?.length) {
      filter.push({ terms: { 'created_by_company.keyword': filters.company } });
    }

    // Build the final query
    const body = {
      query: {
        bool: {
          ...(must.length && { must }),
          ...(should.length && { should, minimum_should_match: 1 }),
          ...(filter.length && { filter })
        }
      },
      // Aggregations for faceted search
      aggs: {
        makes: { terms: { field: 'Make.keyword', size: 50 } },
        brands: { terms: { field: 'Brand.keyword', size: 50 } },
        grades: { terms: { field: 'Grade.keyword', size: 50 } },
        gsm_range: {
          stats: { field: 'GSM' }
        },
        price_range: {
          stats: { field: 'OfferPrice' }
        },
        companies: { terms: { field: 'created_by_company.keyword', size: 30 } }
      },
      // Highlighting for search results
      highlight: {
        fields: {
          full_description: {},
          stock_description: {},
          Make: {},
          Brand: {},
          Grade: {}
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>']
      },
      // Sorting
      ...(sort && {
        sort: [
          { [sort.field]: { order: sort.order } }
        ]
      }),
      from,
      size
    };

    try {
      const response = await esClient.search({
        index: DEALS_INDEX,
        body
      });

      return {
        hits: response.hits.hits.map((hit: any) => ({
          ...hit._source,
          _score: hit._score,
          _highlights: hit.highlight
        })),
        total: response.hits.total.value,
        aggregations: response.aggregations
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  // Autocomplete suggestions
  async getSuggestions(prefix: string, category?: string): Promise<any> {
    try {
      const body = {
        suggest: {
          deal_suggest: {
            prefix,
            completion: {
              field: 'suggest',
              size: 10,
              skip_duplicates: true,
              fuzzy: {
                fuzziness: 'AUTO'
              },
              contexts: category ? {
                category: [category]
              } : undefined
            }
          }
        }
      };

      const response = await esClient.search({
        index: DEALS_INDEX,
        body
      });

      return response.suggest.deal_suggest[0].options.map((option: any) => ({
        text: option.text,
        score: option._score,
        source: option._source
      }));
    } catch (error) {
      console.error('Suggestion error:', error);
      return [];
    }
  }

  // Index a single deal (for real-time updates)
  async indexDeal(deal: any): Promise<void> {
    try {
      const dimensions = deal.Deckle_mm && deal.grain_mm 
        ? `${(deal.Deckle_mm/10).toFixed(1)} x ${(deal.grain_mm/10).toFixed(1)} cm`
        : '';
      
      const fullDescription = [
        deal.Make,
        deal.Brand,
        deal.Grade,
        deal.GSM ? `${deal.GSM} GSM` : '',
        dimensions,
        deal.stock_description,
        deal.Seller_comments
      ].filter(Boolean).join(' ');

      await esClient.index({
        index: DEALS_INDEX,
        id: deal.TransID.toString(),
        body: {
          ...deal,
          dimensions,
          full_description: fullDescription,
          suggest: {
            input: [deal.Make, deal.Brand, deal.Grade].filter(Boolean),
            contexts: {
              category: deal.groupID ? [deal.groupID.toString()] : ['general']
            }
          }
        },
        refresh: true
      });
    } catch (error) {
      console.error('Error indexing deal:', error);
    }
  }

  // Delete a deal from index
  async deleteDeal(transId: string): Promise<void> {
    try {
      await esClient.delete({
        index: DEALS_INDEX,
        id: transId,
        refresh: true
      });
    } catch (error) {
      console.error('Error deleting deal:', error);
    }
  }
}

export const elasticsearchService = new ElasticsearchService();