import { Router } from 'express';
import { executeQuery } from './database';

const router = Router();

// Get category suggestions from stock_groups table
router.get('/categories', async (req, res) => {
  try {
    let { q } = req.query;
    
    // Handle array case
    if (Array.isArray(q)) {
      q = q[0];
    }

    const searchTerm = q && typeof q === 'string' ? q.trim() : '';
    
    let query, params: string[];
    
    if (!searchTerm) {
      // Return all active categories when no query provided
      query = `
        SELECT DISTINCT 
          sg.GroupName as value,
          COUNT(dm.TransID) as count
        FROM stock_groups sg
        LEFT JOIN deal_master dm ON sg.GroupID = dm.groupID
        WHERE sg.IsActive = 1
          AND sg.GroupName IS NOT NULL
        GROUP BY sg.GroupID, sg.GroupName
        ORDER BY count DESC, sg.GroupName ASC
        LIMIT 20
      `;
      params = [];
    } else {
      // Filter categories based on search term
      query = `
        SELECT DISTINCT 
          sg.GroupName as value,
          COUNT(dm.TransID) as count
        FROM stock_groups sg
        LEFT JOIN deal_master dm ON sg.GroupID = dm.groupID
        WHERE sg.GroupName LIKE ? 
          AND sg.IsActive = 1
          AND sg.GroupName IS NOT NULL
        GROUP BY sg.GroupID, sg.GroupName
        ORDER BY count DESC, sg.GroupName ASC
        LIMIT 10
      `;
      params = [`%${searchTerm}%`];
    }

    const results = await executeQuery(query, params);
    res.json({ success: true, suggestions: results });
  } catch (error) {
    console.error('Error fetching category suggestions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
});

// Get GSM suggestions from deal_master
router.get('/gsm', async (req, res) => {
  try {
    let { q, category } = req.query;
    
    // Handle array case and ensure string type
    if (Array.isArray(q)) {
      q = q[0];
    }
    if (Array.isArray(category)) {
      category = category[0];
    }
    
    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.json({ success: true, suggestions: [] });
    }

    const searchTerm = q.trim();
    let query = '';
    let params: string[] = [];
    
    if (category && typeof category === 'string' && category.trim()) {
      // Filter GSM suggestions by category using groupID
      query = `
        SELECT DISTINCT d.GSM as value, COUNT(*) as count
        FROM deal_master d
        LEFT JOIN stock_groups sg ON d.groupID = sg.GroupID
        WHERE d.GSM IS NOT NULL 
          AND d.GSM != '' 
          AND d.GSM LIKE ?
          AND sg.GroupName = ?
          AND sg.IsActive = 1
        GROUP BY d.GSM
        ORDER BY count DESC, CAST(d.GSM AS UNSIGNED) ASC
        LIMIT 10
      `;
      params = [`%${searchTerm}%`, category.trim()];
    } else {
      // Original query without category filtering
      query = `
        SELECT DISTINCT GSM as value, COUNT(*) as count
        FROM deal_master 
        WHERE GSM IS NOT NULL 
          AND GSM != '' 
          AND GSM LIKE ?
        GROUP BY GSM
        ORDER BY count DESC, CAST(GSM AS UNSIGNED) ASC
        LIMIT 10
      `;
      params = [`%${searchTerm}%`];
    }

    const results = await executeQuery(query, params);
    res.json({ success: true, suggestions: results });
  } catch (error) {
    console.error('Error fetching GSM suggestions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
});

// Get deckle suggestions from deal_master Deckle_mm column
router.get('/deckle', async (req, res) => {
  try {
    let { q } = req.query;
    
    // Handle array case
    if (Array.isArray(q)) {
      q = q[0];
    }
    
    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.json({ success: true, suggestions: [] });
    }

    const searchTerm = q.trim();
    const query = `
      SELECT DISTINCT 
        Deckle_mm as value,
        COUNT(*) as count
      FROM deal_master 
      WHERE Deckle_mm IS NOT NULL 
        AND Deckle_mm > 0
        AND CAST(Deckle_mm AS CHAR) LIKE ?
      GROUP BY Deckle_mm
      ORDER BY count DESC, Deckle_mm ASC
      LIMIT 10
    `;

    const results = await executeQuery(query, [`%${searchTerm}%`]);
    res.json({ success: true, suggestions: results });
  } catch (error) {
    console.error('Error fetching deckle suggestions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
});

// Get grain suggestions from deal_master grain_mm column
router.get('/grain', async (req, res) => {
  try {
    let { q } = req.query;
    
    // Handle array case
    if (Array.isArray(q)) {
      q = q[0];
    }
    
    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.json({ success: true, suggestions: [] });
    }

    const searchTerm = q.trim();
    const query = `
      SELECT DISTINCT 
        grain_mm as value,
        COUNT(*) as count
      FROM deal_master 
      WHERE grain_mm IS NOT NULL 
        AND grain_mm > 0
        AND CAST(grain_mm AS CHAR) LIKE ?
      GROUP BY grain_mm
      ORDER BY count DESC, grain_mm ASC
      LIMIT 10
    `;

    const results = await executeQuery(query, [`%${searchTerm}%`]);
    res.json({ success: true, suggestions: results });
  } catch (error) {
    console.error('Error fetching grain suggestions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
});

// Get distinct states from member profiles
router.get('/states', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        state as value,
        COUNT(*) as count
      FROM Members 
      WHERE state IS NOT NULL 
        AND state != ''
        AND mstatus = 1
      GROUP BY state
      ORDER BY state ASC
    `;

    const results = await executeQuery(query, []);
    res.json({ success: true, suggestions: results });
  } catch (error) {
    console.error('Error fetching state suggestions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch states' });
  }
});


export default router;