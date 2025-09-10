import express from 'express';
import { executeQuery, executeQuerySingle } from './database';

const router = express.Router();

// Advanced filter search endpoint
router.post('/advanced', async (req, res) => {
  try {
    const { filters, page = 1, pageSize = 12, sortBy = 'newest' } = req.body;
    
    let query = `
      SELECT DISTINCT d.*, 
             m.mname as created_by_name,
             m.company_name as created_by_company
      FROM deal_master d
      LEFT JOIN bmpa_members m ON d.created_by_member_id = m.member_id
      WHERE d.StockStatus = 1
    `;
    
    const queryParams: any[] = [];
    const conditions: string[] = [];
    
    // Search term filter
    if (filters.searchTerm && filters.searchTerm.trim()) {
      conditions.push(`(
        d.search_key LIKE ? OR 
        d.Make LIKE ? OR 
        d.Grade LIKE ? OR 
        d.Brand LIKE ? OR 
        d.stock_description LIKE ?
      )`);
      const searchPattern = `%${filters.searchTerm.trim().toLowerCase()}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    // Make filter
    if (filters.selectedMakes && filters.selectedMakes.length > 0) {
      const makePlaceholders = filters.selectedMakes.map(() => '?').join(',');
      conditions.push(`d.Make IN (${makePlaceholders})`);
      queryParams.push(...filters.selectedMakes);
    }
    
    // Grade filter
    if (filters.selectedGrades && filters.selectedGrades.length > 0) {
      const gradePlaceholders = filters.selectedGrades.map(() => '?').join(',');
      conditions.push(`d.Grade IN (${gradePlaceholders})`);
      queryParams.push(...filters.selectedGrades);
    }
    
    // Brand filter
    if (filters.selectedBrands && filters.selectedBrands.length > 0) {
      const brandPlaceholders = filters.selectedBrands.map(() => '?').join(',');
      conditions.push(`d.Brand IN (${brandPlaceholders})`);
      queryParams.push(...filters.selectedBrands);
    }
    
    // Category filter
    if (filters.selectedCategories && filters.selectedCategories.length > 0) {
      const categoryPlaceholders = filters.selectedCategories.map(() => '?').join(',');
      conditions.push(`d.Category IN (${categoryPlaceholders})`);
      queryParams.push(...filters.selectedCategories);
    }
    
    // GSM range filter
    if (filters.gsmRange && (filters.gsmRange.min || filters.gsmRange.max)) {
      if (filters.gsmRange.min) {
        conditions.push('d.GSM >= ?');
        queryParams.push(parseInt(filters.gsmRange.min));
      }
      if (filters.gsmRange.max) {
        conditions.push('d.GSM <= ?');
        queryParams.push(parseInt(filters.gsmRange.max));
      }
    }
    
    // Price range filter
    if (filters.priceRange && (filters.priceRange.min || filters.priceRange.max)) {
      if (filters.priceRange.min) {
        conditions.push('d.OfferPrice >= ?');
        queryParams.push(parseFloat(filters.priceRange.min));
      }
      if (filters.priceRange.max) {
        conditions.push('d.OfferPrice <= ?');
        queryParams.push(parseFloat(filters.priceRange.max));
      }
    }
    
    // Dimension range filters
    if (filters.dimensionRange && filters.dimensionRange.deckle) {
      if (filters.dimensionRange.deckle.min) {
        conditions.push('d.Deckle_mm >= ?');
        queryParams.push(parseFloat(filters.dimensionRange.deckle.min) * 10); // Convert cm to mm
      }
      if (filters.dimensionRange.deckle.max) {
        conditions.push('d.Deckle_mm <= ?');
        queryParams.push(parseFloat(filters.dimensionRange.deckle.max) * 10); // Convert cm to mm
      }
    }
    
    if (filters.dimensionRange && filters.dimensionRange.grain) {
      if (filters.dimensionRange.grain.min) {
        conditions.push('d.grain_mm >= ?');
        queryParams.push(parseFloat(filters.dimensionRange.grain.min) * 10); // Convert cm to mm
      }
      if (filters.dimensionRange.grain.max) {
        conditions.push('d.grain_mm <= ?');
        queryParams.push(parseFloat(filters.dimensionRange.grain.max) * 10); // Convert cm to mm
      }
    }
    
    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      let dateCondition = '';
      const now = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          dateCondition = 'DATE(d.deal_created_at) = CURDATE()';
          break;
        case 'week':
          dateCondition = 'd.deal_created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
          break;
        case 'month':
          dateCondition = 'd.deal_created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
          break;
      }
      
      if (dateCondition) {
        conditions.push(dateCondition);
      }
    }
    
    // Add conditions to query
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    // Sort
    switch (sortBy) {
      case 'price-low':
        query += ' ORDER BY d.OfferPrice ASC';
        break;
      case 'price-high':
        query += ' ORDER BY d.OfferPrice DESC';
        break;
      case 'gsm-low':
        query += ' ORDER BY d.GSM ASC';
        break;
      case 'gsm-high':
        query += ' ORDER BY d.GSM DESC';
        break;
      case 'quantity-low':
        query += ' ORDER BY d.quantity ASC';
        break;
      case 'quantity-high':
        query += ' ORDER BY d.quantity DESC';
        break;
      case 'size-small':
        query += ' ORDER BY (d.Deckle_mm * d.grain_mm) ASC';
        break;
      case 'size-large':
        query += ' ORDER BY (d.Deckle_mm * d.grain_mm) DESC';
        break;
      case 'location':
        query += ' ORDER BY d.Location ASC';
        break;
      case 'company':
        query += ' ORDER BY m.company_name ASC';
        break;
      case 'category':
        query += ' ORDER BY g.GroupName ASC';
        break;
      case 'oldest':
        query += ' ORDER BY d.deal_created_at ASC';
        break;
      case 'newest':
      default:
        query += ' ORDER BY d.deal_created_at DESC';
        break;
    }
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT d.TransID) as total
      FROM deal_master d
      LEFT JOIN bmpa_members m ON d.created_by_member_id = m.member_id
      WHERE d.StockStatus = 1
      ${conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : ''}
    `;
    
    const countResult = await executeQuerySingle(countQuery, queryParams);
    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / pageSize);
    
    // Add pagination
    const offset = (page - 1) * pageSize;
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(pageSize, offset);
    
    // Execute main query
    const deals = await executeQuery(query, queryParams);
    
    // Get aggregations for filter options
    const aggregations = await getFilterAggregations(conditions, queryParams.slice(0, -2)); // Remove limit/offset params
    
    res.json({
      success: true,
      deals,
      total,
      page,
      pageSize,
      totalPages,
      aggregations,
      hasFilters: conditions.length > 0
    });
    
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform advanced search'
    });
  }
});

// Helper function to get filter aggregations
async function getFilterAggregations(conditions: string[], queryParams: any[]) {
  const baseWhere = `WHERE d.StockStatus = 1 ${conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : ''}`;
  
  try {
    // Get available makes
    const makesQuery = `
      SELECT d.Make, COUNT(*) as count
      FROM deal_master d
      ${baseWhere}
      AND d.Make IS NOT NULL AND d.Make != ''
      GROUP BY d.Make
      ORDER BY count DESC, d.Make ASC
      LIMIT 20
    `;
    const makes = await executeQuery(makesQuery, queryParams);
    
    // Get available grades
    const gradesQuery = `
      SELECT d.Grade, COUNT(*) as count
      FROM deal_master d
      ${baseWhere}
      AND d.Grade IS NOT NULL AND d.Grade != ''
      GROUP BY d.Grade
      ORDER BY count DESC, d.Grade ASC
      LIMIT 20
    `;
    const grades = await executeQuery(gradesQuery, queryParams);
    
    // Get available brands
    const brandsQuery = `
      SELECT d.Brand, COUNT(*) as count
      FROM deal_master d
      ${baseWhere}
      AND d.Brand IS NOT NULL AND d.Brand != ''
      GROUP BY d.Brand
      ORDER BY count DESC, d.Brand ASC
      LIMIT 20
    `;
    const brands = await executeQuery(brandsQuery, queryParams);
    
    // Get GSM range
    const gsmQuery = `
      SELECT d.GSM, COUNT(*) as count
      FROM deal_master d
      ${baseWhere}
      AND d.GSM IS NOT NULL AND d.GSM > 0
      GROUP BY d.GSM
      ORDER BY d.GSM ASC
      LIMIT 50
    `;
    const gsm = await executeQuery(gsmQuery, queryParams);
    
    return {
      makes,
      grades,
      brands,
      gsm
    };
  } catch (error) {
    console.error('Error getting aggregations:', error);
    return {
      makes: [],
      grades: [],
      brands: [],
      gsm: []
    };
  }
}

export default router;