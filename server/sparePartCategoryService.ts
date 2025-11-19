import { executeQuery, executeQuerySingle } from './database';

export interface SparePartCategory {
  id: number;
  process: string;
  category_type: string;
  machine_type: string;
  manufacturer: string;
  model: string | null;
  part_name: string | null;
  part_no: string | null;
  pcs: number;
  created_at: Date;
  updated_at: Date;
}

export interface SparePartListing {
  id: number;
  seller_id: number;
  process: string;
  category_type: string;
  machine_type: string;
  manufacturer: string;
  model: string | null;
  part_name: string;
  part_no: string;
  pcs: number;
  unit: string;
  stock_age: number;
  seller_comments: string | null;
  created_at: Date;
}

/**
 * Get all unique processes
 */
export async function getProcesses(): Promise<string[]> {
  const results = await executeQuery<{ process: string }>(
    'SELECT DISTINCT process FROM spare_part_categories ORDER BY process'
  );
  return results.map(r => r.process);
}

/**
 * Get category types - independent of process
 */
export async function getCategoryTypes(process?: string): Promise<string[]> {
  const results = await executeQuery<{ category_type: string }>(
    'SELECT DISTINCT category_type FROM spare_part_categories WHERE category_type IS NOT NULL AND category_type != \'\' ORDER BY category_type'
  );
  const categoryTypes = results.map(r => r.category_type).filter(Boolean);
  
  if (categoryTypes.length === 0) {
    return ['Electronics', 'Mechanical', 'Pneumatic'];
  }
  return categoryTypes;
}

/**
 * Get machine types - independent of previous selections
 */
export async function getMachineTypes(process?: string, categoryType?: string): Promise<string[]> {
  const results = await executeQuery<{ machine_type: string }>(
    'SELECT DISTINCT machine_type FROM spare_part_categories WHERE machine_type IS NOT NULL AND machine_type != \'\' ORDER BY machine_type'
  );
  const machineTypes = results.map(r => r.machine_type).filter(Boolean);
  
  if (machineTypes.length === 0) {
    return ['Offset', 'Flexo', 'Digital', 'Screen', 'Perfect Binding', 'Saddle Stitch', 'Die Cutting', 'Flatbed', 'Folder Gluer', 'Box Making', 'Window Patcher', 'Film Applicator', 'Thermal', 'Cold', 'General'];
  }
  return machineTypes;
}

/**
 * Get manufacturers - filtered by process
 * Manufacturer is linked to process, so dropdown shows only manufacturers for selected process
 */
export async function getManufacturers(
  process?: string,
  categoryType?: string,
  machineType?: string
): Promise<string[]> {
  let query = 'SELECT DISTINCT manufacturer FROM spare_part_categories WHERE manufacturer IS NOT NULL';
  const params: any[] = [];
  
  // Filter by process if provided - this is the key relationship
  if (process) {
    query += ' AND process = ?';
    params.push(process);
  }
  
  query += ' ORDER BY manufacturer';
  
  const results = await executeQuery<{ manufacturer: string }>(query, params);
  return results.map(r => r.manufacturer);
}

/**
 * Get models - independent of previous selections
 */
export async function getModels(
  process?: string,
  categoryType?: string,
  machineType?: string,
  manufacturer?: string
): Promise<string[]> {
  const results = await executeQuery<{ model: string }>(
    'SELECT DISTINCT model FROM spare_part_categories WHERE model IS NOT NULL ORDER BY model'
  );
  return results.map(r => r.model);
}

/**
 * Save a custom model to spare_part_categories if it doesn't exist
 */
export async function saveCustomModel(data: {
  process: string;
  category_type: string;
  machine_type: string;
  manufacturer: string;
  model: string;
}): Promise<boolean> {
  try {
    // Check if this exact combination already exists
    const existing = await executeQuerySingle<{ id: number }>(
      `SELECT id FROM spare_part_categories
       WHERE process = ? AND category_type = ? AND machine_type = ?
       AND manufacturer = ? AND model = ?`,
      [data.process, data.category_type, data.machine_type, data.manufacturer, data.model]
    );

    if (existing) {
      console.log('Model already exists in spare_part_categories');
      return true;
    }

    // Insert new model entry
    await executeQuery(
      `INSERT INTO spare_part_categories
       (process, category_type, machine_type, manufacturer, model, pcs)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [data.process, data.category_type, data.machine_type, data.manufacturer, data.model]
    );

    console.log('Custom model saved to spare_part_categories:', data.model);
    return true;
  } catch (error) {
    console.error('Error saving custom model:', error);
    return false;
  }
}

/**
 * Create a new spare part listing
 */
export async function createSparePartListing(data: {
  seller_id: number;
  process: string;
  category_type: string;
  machine_type: string;
  manufacturer: string;
  model: string | null;
  part_name: string;
  part_no: string;
  pcs: number;
  unit: string;
  stock_age: number;
  seller_comments: string | null;
}): Promise<number> {
  const result = await executeQuery<any>(
    `INSERT INTO spare_part_listings (
      seller_id, process, category_type, machine_type, manufacturer, 
      model, part_name, part_no, pcs, unit, stock_age, seller_comments
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.seller_id,
      data.process,
      data.category_type,
      data.machine_type,
      data.manufacturer,
      data.model,
      data.part_name,
      data.part_no,
      data.pcs,
      data.unit,
      data.stock_age,
      data.seller_comments
    ]
  );
  return result.insertId;
}

/**
 * Get spare part listings by seller
 */
export async function getSparePartListingsBySeller(sellerId: number): Promise<SparePartListing[]> {
  return await executeQuery<SparePartListing>(
    'SELECT * FROM spare_part_listings WHERE seller_id = ? ORDER BY created_at DESC',
    [sellerId]
  );
}

/**
 * Get all spare part listings
 */
export async function getAllSparePartListings(): Promise<SparePartListing[]> {
  return await executeQuery<SparePartListing>(
    'SELECT * FROM spare_part_listings ORDER BY created_at DESC'
  );
}

/**
 * Delete spare part listing
 */
export async function deleteSparePartListing(id: number, sellerId: number): Promise<boolean> {
  const result = await executeQuery<any>(
    'DELETE FROM spare_part_listings WHERE id = ? AND seller_id = ?',
    [id, sellerId]
  );
  return result.affectedRows > 0;
}

/**
 * Search spare part listings with filters
 */
export async function searchSparePartListings(filters: {
  process?: string;
  category_type?: string;
  machine_type?: string;
  manufacturer?: string;
  model?: string;
  part_name?: string;
  part_no?: string;
  exclude_seller_id?: number;
}): Promise<SparePartListing[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.process) {
    conditions.push('process = ?');
    params.push(filters.process);
  }

  if (filters.category_type) {
    conditions.push('category_type = ?');
    params.push(filters.category_type);
  }

  if (filters.machine_type) {
    conditions.push('machine_type = ?');
    params.push(filters.machine_type);
  }

  if (filters.manufacturer) {
    conditions.push('manufacturer = ?');
    params.push(filters.manufacturer);
  }

  if (filters.model) {
    conditions.push('model = ?');
    params.push(filters.model);
  }

  if (filters.part_name) {
    conditions.push('part_name LIKE ?');
    params.push(`%${filters.part_name}%`);
  }

  if (filters.part_no) {
    conditions.push('part_no LIKE ?');
    params.push(`%${filters.part_no}%`);
  }

  if (filters.exclude_seller_id) {
    conditions.push('seller_id != ?');
    params.push(filters.exclude_seller_id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      spl.*,
      mb.mname as seller_name,
      mb.company_name as seller_company,
      mb.email as seller_email,
      mb.phone as seller_phone
    FROM spare_part_listings spl
    LEFT JOIN bmpa_members mb ON spl.seller_id = mb.member_id
    ${whereClause}
    ORDER BY spl.created_at DESC
    LIMIT 100
  `;

  return await executeQuery<SparePartListing>(query, params);
}