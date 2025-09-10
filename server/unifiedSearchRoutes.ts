import express from 'express';
import { executeQuery, executeQuerySingle } from './database';

const unifiedSearchRouter = express.Router();

// Unified search endpoint supporting all filter types and search modes
unifiedSearchRouter.post('/unified', async (req, res) => {
  try {
    const {
      query = '',
      preciseSearch = {},
      filters = {},
      page = 1,
      pageSize = 12,
      sortBy = 'newest'
    } = req.body;

    // Build the comprehensive SQL query with all filters
    let baseQuery = `
      SELECT 
        dm.*,
        bm.mname as seller_name,
        bm.company_name as seller_company,
        bm.city as seller_location,
        bm.profile_image,
        cat.category_name,
        CONCAT(dm.Deckle_mm/10, ' x ', dm.grain_mm/10, ' cm') as dimensions_cm,
        CONCAT(ROUND(dm.Deckle_mm/25.4, 2), '" x ', ROUND(dm.grain_mm/25.4, 2), '"') as dimensions_inch
      FROM deal_master dm
      LEFT JOIN bmpa_members bm ON dm.SellerID = bm.member_id
      LEFT JOIN bmpa_categories cat ON dm.CategoryID = cat.category_id
      WHERE dm.StockStatus = 1 AND bm.mstatus = 1
    `;

    const queryParams: any[] = [];
    const conditions: string[] = [];

    // SEARCH FILTERS
    if (query && query.trim()) {
      conditions.push(`(
        dm.search_key LIKE ? OR
        dm.Make LIKE ? OR 
        dm.Grade LIKE ? OR 
        dm.Brand LIKE ? OR
        dm.stock_description LIKE ? OR
        dm.Seller_comments LIKE ? OR
        bm.company_name LIKE ?
      )`);
      const searchTerm = `%${query.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // PRECISE SEARCH FILTERS
    if (preciseSearch.category && preciseSearch.category !== 'all') {
      conditions.push('cat.category_name = ?');
      queryParams.push(preciseSearch.category);
    }

    if (preciseSearch.gsm) {
      const gsmValue = parseFloat(preciseSearch.gsm);
      const tolerance = parseFloat(preciseSearch.tolerance) || 0;
      if (tolerance > 0) {
        conditions.push('dm.GSM BETWEEN ? AND ?');
        queryParams.push(gsmValue - tolerance, gsmValue + tolerance);
      } else {
        conditions.push('dm.GSM = ?');
        queryParams.push(gsmValue);
      }
    }

    // Dimension filters for precise search
    if (preciseSearch.deckle || preciseSearch.grain) {
      const deckleValue = parseFloat(preciseSearch.deckle);
      const grainValue = parseFloat(preciseSearch.grain);
      const dimTolerance = parseFloat(preciseSearch.dimensionTolerance) || 0;
      const unit = preciseSearch.deckleUnit || 'cm';
      
      // Convert to mm for database comparison
      const deckleInMm = unit === 'inch' ? deckleValue * 25.4 : deckleValue * 10;
      const grainInMm = unit === 'inch' ? grainValue * 25.4 : grainValue * 10;
      const toleranceInMm = unit === 'inch' ? dimTolerance * 25.4 : dimTolerance * 10;

      if (deckleValue && grainValue) {
        if (toleranceInMm > 0) {
          conditions.push(`(
            dm.Deckle_mm BETWEEN ? AND ? AND 
            dm.grain_mm BETWEEN ? AND ?
          )`);
          queryParams.push(
            deckleInMm - toleranceInMm, deckleInMm + toleranceInMm,
            grainInMm - toleranceInMm, grainInMm + toleranceInMm
          );
        } else {
          conditions.push('dm.Deckle_mm = ? AND dm.grain_mm = ?');
          queryParams.push(deckleInMm, grainInMm);
        }
      } else if (deckleValue) {
        if (toleranceInMm > 0) {
          conditions.push('dm.Deckle_mm BETWEEN ? AND ?');
          queryParams.push(deckleInMm - toleranceInMm, deckleInMm + toleranceInMm);
        } else {
          conditions.push('dm.Deckle_mm = ?');
          queryParams.push(deckleInMm);
        }
      }
    }

    // ADVANCED FILTERS
    // Make filters
    if (filters.makes && filters.makes.length > 0) {
      const makePlaceholders = filters.makes.map(() => '?').join(',');
      conditions.push(`dm.Make IN (${makePlaceholders})`);
      queryParams.push(...filters.makes);
    }

    // Grade filters
    if (filters.grades && filters.grades.length > 0) {
      const gradePlaceholders = filters.grades.map(() => '?').join(',');
      conditions.push(`dm.Grade IN (${gradePlaceholders})`);
      queryParams.push(...filters.grades);
    }

    // Brand filters
    if (filters.brands && filters.brands.length > 0) {
      const brandPlaceholders = filters.brands.map(() => '?').join(',');
      conditions.push(`dm.Brand IN (${brandPlaceholders})`);
      queryParams.push(...filters.brands);
    }

    // GSM filters
    if (filters.gsm && filters.gsm.length > 0) {
      const gsmPlaceholders = filters.gsm.map(() => '?').join(',');
      conditions.push(`dm.GSM IN (${gsmPlaceholders})`);
      queryParams.push(...filters.gsm);
    }

    // Location filters
    if (filters.locations && filters.locations.length > 0) {
      const locationPlaceholders = filters.locations.map(() => '?').join(',');
      conditions.push(`bm.city IN (${locationPlaceholders})`);
      queryParams.push(...filters.locations);
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      conditions.push('cat.category_name = ?');
      queryParams.push(filters.category);
    }

    // RANGE FILTERS
    // GSM Range
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

    // Price Range
    if (filters.priceRange) {
      if (filters.priceRange.min) {
        conditions.push('dm.Rate >= ?');
        queryParams.push(parseFloat(filters.priceRange.min));
      }
      if (filters.priceRange.max) {
        conditions.push('dm.Rate <= ?');
        queryParams.push(parseFloat(filters.priceRange.max));
      }
    }

    // Dimension Range Filters
    if (filters.dimensionFilters) {
      const unit = filters.dimensionFilters.unit || 'cm';
      
      if (filters.dimensionFilters.deckleMin) {
        const minInMm = unit === 'inch' ? parseFloat(filters.dimensionFilters.deckleMin) * 25.4 : parseFloat(filters.dimensionFilters.deckleMin) * 10;
        conditions.push('dm.Deckle_mm >= ?');
        queryParams.push(minInMm);
      }
      if (filters.dimensionFilters.deckleMax) {
        const maxInMm = unit === 'inch' ? parseFloat(filters.dimensionFilters.deckleMax) * 25.4 : parseFloat(filters.dimensionFilters.deckleMax) * 10;
        conditions.push('dm.Deckle_mm <= ?');
        queryParams.push(maxInMm);
      }
      if (filters.dimensionFilters.grainMin) {
        const minInMm = unit === 'inch' ? parseFloat(filters.dimensionFilters.grainMin) * 25.4 : parseFloat(filters.dimensionFilters.grainMin) * 10;
        conditions.push('dm.grain_mm >= ?');
        queryParams.push(minInMm);
      }
      if (filters.dimensionFilters.grainMax) {
        const maxInMm = unit === 'inch' ? parseFloat(filters.dimensionFilters.grainMax) * 25.4 : parseFloat(filters.dimensionFilters.grainMax) * 10;
        conditions.push('dm.grain_mm <= ?');
        queryParams.push(maxInMm);
      }
    }

    // BOOLEAN FILTERS
    if (filters.inStock) {
      conditions.push('dm.Qty > 0');
    }

    if (filters.hasImages) {
      conditions.push('dm.ImagePath IS NOT NULL AND dm.ImagePath != ""');
    }

    if (filters.verifiedSellers) {
      conditions.push('bm.verified = 1');
    }

    // DATE FILTERS
    if (filters.dateRange) {
      if (filters.dateRange.from) {
        conditions.push('dm.DateAdded >= ?');
        queryParams.push(filters.dateRange.from);
      }
      if (filters.dateRange.to) {
        conditions.push('dm.DateAdded <= ?');
        queryParams.push(filters.dateRange.to);
      }
    }

    // Add conditions to base query
    if (conditions.length > 0) {
      baseQuery += ` AND ${conditions.join(' AND ')}`;
    }

    // SORTING
    let orderBy = '';
    switch (sortBy) {
      case 'newest':
        orderBy = 'ORDER BY dm.DateAdded DESC';
        break;
      case 'oldest':
        orderBy = 'ORDER BY dm.DateAdded ASC';
        break;
      case 'price-low':
        orderBy = 'ORDER BY dm.Rate ASC';
        break;
      case 'price-high':
        orderBy = 'ORDER BY dm.Rate DESC';
        break;
      case 'gsm-low':
        orderBy = 'ORDER BY dm.GSM ASC';
        break;
      case 'gsm-high':
        orderBy = 'ORDER BY dm.GSM DESC';
        break;
      default:
        orderBy = 'ORDER BY dm.DateAdded DESC';
    }

    // Get total count
    const countQuery = baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await executeQuerySingle(countQuery, queryParams);
    const total = countResult?.total || 0;

    // Add pagination and sorting
    const offset = (page - 1) * pageSize;
    const finalQuery = `${baseQuery} ${orderBy} LIMIT ${pageSize} OFFSET ${offset}`;

    // Execute main query
    const deals = await executeQuery(finalQuery, queryParams);

    // GENERATE AGGREGATIONS for dynamic filters
    const aggregations = await generateAggregations(baseQuery, queryParams);

    res.json({
      success: true,
      data: deals,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      aggregations,
      appliedFilters: {
        query,
        preciseSearch,
        filters,
        sortBy
      }
    });

  } catch (error) {
    console.error('Unified search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate aggregations for dynamic filter options
async function generateAggregations(baseQuery: string, queryParams: any[]) {
  try {
    const aggregations: any = {};

    // Get available makes
    const makesQuery = baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT dm.Make as Make, COUNT(*) as count FROM') + ' GROUP BY dm.Make HAVING dm.Make IS NOT NULL ORDER BY count DESC LIMIT 20';
    aggregations.makes = await executeQuery(makesQuery, queryParams);

    // Get available grades
    const gradesQuery = baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT dm.Grade as Grade, COUNT(*) as count FROM') + ' GROUP BY dm.Grade HAVING dm.Grade IS NOT NULL ORDER BY count DESC LIMIT 20';
    aggregations.grades = await executeQuery(gradesQuery, queryParams);

    // Get available brands
    const brandsQuery = baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT dm.Brand as Brand, COUNT(*) as count FROM') + ' GROUP BY dm.Brand HAVING dm.Brand IS NOT NULL ORDER BY count DESC LIMIT 20';
    aggregations.brands = await executeQuery(brandsQuery, queryParams);

    // Get available GSM values
    const gsmQuery = baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT dm.GSM as GSM, COUNT(*) as count FROM') + ' GROUP BY dm.GSM HAVING dm.GSM IS NOT NULL ORDER BY dm.GSM ASC LIMIT 30';
    aggregations.gsm = await executeQuery(gsmQuery, queryParams);

    // Get available locations
    const locationsQuery = baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT bm.city as location, COUNT(*) as count FROM') + ' GROUP BY bm.city HAVING bm.city IS NOT NULL ORDER BY count DESC LIMIT 15';
    aggregations.locations = await executeQuery(locationsQuery, queryParams);

    // Get available units
    const unitsQuery = baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT dm.OfferUnit as OfferUnit, COUNT(*) as count FROM') + ' GROUP BY dm.OfferUnit HAVING dm.OfferUnit IS NOT NULL ORDER BY count DESC LIMIT 10';
    aggregations.units = await executeQuery(unitsQuery, queryParams);

    return aggregations;
  } catch (error) {
    console.error('Error generating aggregations:', error);
    return {};
  }
}

export default unifiedSearchRouter;