import { Router } from 'express';
import { executeQuery } from './database';

const router = Router();

// Get category suggestions from deal_master
router.get('/categories', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.json({ success: true, suggestions: [] });
    }

    const query = `
      SELECT DISTINCT 
        CASE 
          WHEN Grade LIKE '%${q}%' THEN Grade
          WHEN Make LIKE '%${q}%' THEN Make 
          WHEN Brand LIKE '%${q}%' THEN Brand
          ELSE NULL
        END as value,
        COUNT(*) as count
      FROM deal_master 
      WHERE (Grade LIKE '%${q}%' OR Make LIKE '%${q}%' OR Brand LIKE '%${q}%')
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
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.json({ success: true, suggestions: [] });
    }

    const query = `
      SELECT DISTINCT GSM as value, COUNT(*) as count
      FROM deal_master 
      WHERE GSM IS NOT NULL 
        AND GSM != '' 
        AND GSM LIKE '%${q}%'
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
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.json({ success: true, suggestions: [] });
    }

    // Extract numeric values from dimensions fields that might contain deckle info
    const query = `
      SELECT DISTINCT 
        SUBSTRING_INDEX(SUBSTRING_INDEX(Dimensions, 'x', 1), ' ', -1) as value,
        COUNT(*) as count
      FROM deal_master 
      WHERE Dimensions IS NOT NULL 
        AND Dimensions != ''
        AND (
          Dimensions LIKE '%${q}%' 
          OR SUBSTRING_INDEX(SUBSTRING_INDEX(Dimensions, 'x', 1), ' ', -1) LIKE '%${q}%'
        )
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
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.json({ success: true, suggestions: [] });
    }

    // Extract numeric values from dimensions fields that might contain grain info
    const query = `
      SELECT DISTINCT 
        TRIM(SUBSTRING_INDEX(Dimensions, 'x', -1)) as value,
        COUNT(*) as count
      FROM deal_master 
      WHERE Dimensions IS NOT NULL 
        AND Dimensions != ''
        AND Dimensions LIKE '%x%'
        AND (
          Dimensions LIKE '%${q}%'
          OR TRIM(SUBSTRING_INDEX(Dimensions, 'x', -1)) LIKE '%${q}%'
        )
      GROUP BY value
      HAVING value IS NOT NULL AND value != ''
      ORDER BY count DESC, CAST(SUBSTRING_INDEX(value, ' ', 1) AS DECIMAL(10,2)) ASC
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