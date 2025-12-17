import { Router } from 'express';
import { powerSearchService } from './services/powerSearchService';

const searchRouter = Router();

// Fast normalization-based search
searchRouter.post('/search', async (req, res) => {
  try {
    // Pass the exclude_member_id from the request body to the search service
    const searchParams = {
      ...req.body,
      exclude_member_id: req.body.exclude_member_id
    };
    const results = await powerSearchService.searchDeals(searchParams);
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

// Precise search endpoint - FETCH ALL RECORDS
searchRouter.post('/precise', async (req, res) => {
  try {
    const { executeQuery } = await import('./database');
    const { 
      category, gsm, tolerance, deckle, deckleUnit, grain, grainUnit, dimensionTolerance, exclude_member_id,
      // Material hierarchy filters for Paper/Board/Paper Reel
      gradeOfMaterial, materialKind, materialManufacturer, materialBrand
    } = req.body;
    
    console.log('Precise search - fetching ALL records:', req.body);
    console.log('🔍 DEBUG - gradeOfMaterial:', gradeOfMaterial, 'materialKind:', materialKind, 'materialManufacturer:', materialManufacturer, 'materialBrand:', materialBrand);
    
    let whereClause = 'WHERE dm.StockStatus = 1'; // Only active stock
    const queryParams: any[] = [];
    
    // Exclude user's own products from marketplace view
    if (exclude_member_id) {
      whereClause += ` AND (dm.memberID != ? AND dm.created_by_member_id != ?)`;
      queryParams.push(exclude_member_id, exclude_member_id);
    }
    
    // Add category filter using stock_groups table
    if (category && category.trim() && category !== 'all') {
      whereClause += ` AND sg.GroupName LIKE ?`;
      queryParams.push(`%${category.trim()}%`);
    }
    
    // Add material hierarchy filters (for Paper/Board/Paper Reel products)
    // These filters work with the Make/Grade/Brand columns in deal_master
    // which store the selected material hierarchy values from the cascading dropdowns
    
    // Grade of Material filter (stored in grade_of_material column)
    // For backward compatibility: match the value OR include records where grade_of_material is NULL (old records)
    if (gradeOfMaterial && gradeOfMaterial.trim()) {
      whereClause += ` AND (dm.grade_of_material = ? OR dm.grade_of_material IS NULL)`;
      queryParams.push(gradeOfMaterial.trim());
    }
    
    // Material Kind filter (stored in Make column for Paper/Board)
    if (materialKind && materialKind.trim()) {
      whereClause += ` AND dm.Make = ?`;
      queryParams.push(materialKind.trim());
    }
    
    // Material Manufacturer filter (stored in Grade column for Paper/Board)
    if (materialManufacturer && materialManufacturer.trim()) {
      whereClause += ` AND dm.Grade = ?`;
      queryParams.push(materialManufacturer.trim());
    }
    
    // Material Brand filter (stored in Brand column)
    if (materialBrand && materialBrand.trim()) {
      whereClause += ` AND dm.Brand = ?`;
      queryParams.push(materialBrand.trim());
    }
    
    // Add GSM filter with tolerance (skip for Spare Parts)
    const isSparePart = category && category.toLowerCase().includes('spare part');
    if (gsm && !isNaN(Number(gsm)) && !isSparePart) {
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
      
      // Convert to mm if needed
      let deckleValueMm = deckleValue;
      if (deckleUnit === 'cm') {
        deckleValueMm = deckleValue * 10; // Convert cm to mm
      } else if (deckleUnit === 'inch') {
        deckleValueMm = deckleValue * 25.4; // Convert inch to mm
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
      
      // Convert to mm if needed
      let grainValueMm = grainValue;
      if (grainUnit === 'cm') {
        grainValueMm = grainValue * 10; // Convert cm to mm
      } else if (grainUnit === 'inch') {
        grainValueMm = grainValue * 25.4; // Convert inch to mm
      }
      
      const minGrain = grainValueMm - dimToleranceValue;
      const maxGrain = grainValueMm + dimToleranceValue;
      
      whereClause += ` AND dm.grain_mm BETWEEN ? AND ?`;
      queryParams.push(minGrain, maxGrain);
    }
    
    // Get results with 100 record limit
    const searchQuery = `
      SELECT 
        dm.*,
        dm.groupID as GroupID,
        sg.GroupName,
        sg.GroupName as category_name,
        m.mname as created_by_name,
        m.company_name as created_by_company,
        m.state as member_state
      FROM deal_master dm 
      LEFT JOIN stock_groups sg ON dm.groupID = sg.GroupID
      LEFT JOIN bmpa_members m ON dm.created_by_member_id = m.member_id
      ${whereClause}
      ORDER BY dm.TransID DESC
      LIMIT 100
    `;
    
    console.log('🔍 DEBUG - WHERE clause:', whereClause);
    console.log('🔍 DEBUG - Query params:', queryParams);
    
    const results = await executeQuery(searchQuery, queryParams);
    
    console.log(`Precise search found ${results.length} records (max 100 limit)`);
    
    // Parse spare part fields for spare part results
    const parsedResults = results.map((deal: any) => {
      const isSparePartDeal = deal.GroupName && deal.GroupName.toLowerCase().includes('spare part');
      
      if (isSparePartDeal && deal.Make) {
        // Parse Make field: "process - category_type - machine_type"
        const makeParts = deal.Make.split(' - ').map((p: string) => p.trim());
        
        return {
          ...deal,
          process: makeParts[0] || null,
          category_type: makeParts[1] || null,
          machine_type: makeParts[2] || null,
          manufacturer: deal.Grade || null,
          model: deal.Brand || null,
          is_spare_part: true
        };
      }
      
      return deal;
    });
    
    res.json({
      success: true,
      data: parsedResults,
      total: parsedResults.length,
      maxRecords: 100, // Flag to indicate 100 record limit
      searchType: 'precise',
      isSparePartSearch: isSparePart
    });
  } catch (error) {
    console.error('Error performing precise search:', error);
    res.status(500).json({ success: false, message: 'Failed to perform precise search' });
  }
});

export default searchRouter;