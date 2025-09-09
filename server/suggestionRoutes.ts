import { Router } from 'express';
import { executeQuery } from './database';

const router = Router();

// Get category suggestions from deal_master
router.get('/categories', async (req, res) => {
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
        CASE 
          WHEN Grade LIKE '%${searchTerm}%' THEN Grade
          WHEN Make LIKE '%${searchTerm}%' THEN Make 
          WHEN Brand LIKE '%${searchTerm}%' THEN Brand
          ELSE NULL
        END as value,
        COUNT(*) as count
      FROM deal_master 
      WHERE (Grade LIKE '%${searchTerm}%' OR Make LIKE '%${searchTerm}%' OR Brand LIKE '%${searchTerm}%')
        AND (Grade IS NOT NULL OR Make IS NOT NULL OR Brand IS NOT NULL)
      GROUP BY value
      HAVING value IS NOT NULL
      ORDER BY count DESC, value ASC
      LIMIT 10
    `;

    const results = await executeQuery(query);
    res.json({ success: true, suggestions: results });
  } catch (error) {
    console.error('Error fetching category suggestions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
});

// Get GSM suggestions from deal_master
router.get('/gsm', async (req, res) => {
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
      SELECT DISTINCT GSM as value, COUNT(*) as count
      FROM deal_master 
      WHERE GSM IS NOT NULL 
        AND GSM != '' 
        AND GSM LIKE '%${searchTerm}%'
      GROUP BY GSM
      ORDER BY count DESC, CAST(GSM AS UNSIGNED) ASC
      LIMIT 10
    `;

    const results = await executeQuery(query);
    res.json({ success: true, suggestions: results });
  } catch (error) {
    console.error('Error fetching GSM suggestions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
});

// Get deckle suggestions from deal_master
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
    // Get deckle values from stock_description - extract first number before X
    const query = `
      SELECT DISTINCT 
        SUBSTRING_INDEX(SUBSTRING_INDEX(stock_description, 'X', 1), ' ', -1) as value,
        COUNT(*) as count
      FROM deal_master 
      WHERE stock_description IS NOT NULL 
        AND stock_description LIKE '%X%'
        AND stock_description LIKE '%${searchTerm}%'
        AND SUBSTRING_INDEX(SUBSTRING_INDEX(stock_description, 'X', 1), ' ', -1) REGEXP '^[0-9.]+$'
      GROUP BY value
      HAVING value IS NOT NULL AND value != ''
      ORDER BY count DESC, CAST(value AS DECIMAL(10,2)) ASC
      LIMIT 10
    `;

    const results = await executeQuery(query);
    res.json({ success: true, suggestions: results });
  } catch (error) {
    console.error('Error fetching deckle suggestions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
});

// Get grain suggestions from deal_master  
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
    // Get grain values from stock_description - extract number after X
    const query = `
      SELECT DISTINCT 
        SUBSTRING_INDEX(SUBSTRING_INDEX(stock_description, 'X', -1), ' ', 1) as value,
        COUNT(*) as count
      FROM deal_master 
      WHERE stock_description IS NOT NULL 
        AND stock_description LIKE '%X%'
        AND stock_description LIKE '%${searchTerm}%'
        AND SUBSTRING_INDEX(SUBSTRING_INDEX(stock_description, 'X', -1), ' ', 1) REGEXP '^[0-9.]+$'
      GROUP BY value
      HAVING value IS NOT NULL AND value != ''
      ORDER BY count DESC, CAST(value AS DECIMAL(10,2)) ASC
      LIMIT 10
    `;

    const results = await executeQuery(query);
    res.json({ success: true, suggestions: results });
  } catch (error) {
    console.error('Error fetching grain suggestions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
});


export default router;