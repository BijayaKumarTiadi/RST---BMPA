import { executeQuery } from './database';

// Interface for material hierarchy entry
export interface MaterialHierarchyEntry {
    id: number;
    grade_of_material: string;
    material_kind: string;
    manufacturer: string;
    brand_name: string;
    created_at?: string;
    updated_at?: string;
}

// Get all material hierarchy entries (for admin management)
export async function getAllMaterialHierarchyEntries(): Promise<MaterialHierarchyEntry[]> {
    const result = await executeQuery(
        `SELECT id, grade_of_material, material_kind, manufacturer, brand_name, created_at, updated_at 
         FROM material_hierarchy 
         ORDER BY grade_of_material, material_kind, manufacturer, brand_name`
    );
    return result as MaterialHierarchyEntry[];
}

// Create a new material hierarchy entry
export async function createMaterialHierarchyEntry(data: {
    grade_of_material: string;
    material_kind: string;
    manufacturer: string;
    brand_name: string;
}): Promise<{ success: boolean; message: string; id?: number }> {
    try {
        // Check if entry already exists
        const existing = await executeQuery(
            `SELECT id FROM material_hierarchy 
             WHERE grade_of_material = ? AND material_kind = ? AND manufacturer = ? AND brand_name = ?`,
            [data.grade_of_material, data.material_kind, data.manufacturer, data.brand_name]
        );

        if ((existing as any[]).length > 0) {
            return { success: false, message: 'This material hierarchy entry already exists' };
        }

        const result = await executeQuery(
            `INSERT INTO material_hierarchy (grade_of_material, material_kind, manufacturer, brand_name) 
             VALUES (?, ?, ?, ?)`,
            [data.grade_of_material, data.material_kind, data.manufacturer, data.brand_name]
        );

        return {
            success: true,
            message: 'Material hierarchy entry created successfully',
            id: (result as any).insertId
        };
    } catch (error) {
        console.error('Error creating material hierarchy entry:', error);
        return { success: false, message: 'Failed to create material hierarchy entry' };
    }
}

// Update a material hierarchy entry
export async function updateMaterialHierarchyEntry(id: number, data: {
    grade_of_material: string;
    material_kind: string;
    manufacturer: string;
    brand_name: string;
}): Promise<{ success: boolean; message: string }> {
    try {
        // Check if another entry with same values exists (excluding current one)
        const existing = await executeQuery(
            `SELECT id FROM material_hierarchy 
             WHERE grade_of_material = ? AND material_kind = ? AND manufacturer = ? AND brand_name = ? AND id != ?`,
            [data.grade_of_material, data.material_kind, data.manufacturer, data.brand_name, id]
        );

        if ((existing as any[]).length > 0) {
            return { success: false, message: 'Another entry with these values already exists' };
        }

        await executeQuery(
            `UPDATE material_hierarchy 
             SET grade_of_material = ?, material_kind = ?, manufacturer = ?, brand_name = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [data.grade_of_material, data.material_kind, data.manufacturer, data.brand_name, id]
        );

        return { success: true, message: 'Material hierarchy entry updated successfully' };
    } catch (error) {
        console.error('Error updating material hierarchy entry:', error);
        return { success: false, message: 'Failed to update material hierarchy entry' };
    }
}

// Delete a material hierarchy entry and all related offers
export async function deleteMaterialHierarchyEntry(id: number): Promise<{ success: boolean; message: string; deletedOffersCount?: number }> {
    try {
        // First, get all fields from the hierarchy entry before deleting
        const hierarchyEntry = await executeQuery(
            `SELECT grade_of_material, material_kind, manufacturer, brand_name FROM material_hierarchy WHERE id = ?`,
            [id]
        );

        if (!hierarchyEntry || (hierarchyEntry as any[]).length === 0) {
            return { success: false, message: 'Material hierarchy entry not found' };
        }

        const entry = (hierarchyEntry as any[])[0];
        const { grade_of_material, material_kind, manufacturer, brand_name } = entry;

        // Delete all offers (deals) that match this hierarchy
        // Match on EITHER:
        // 1. The grade_of_material field (case-insensitive)
        // 2. OR the combination of Make (manufacturer), Grade (material_kind), and Brand (brand_name)
        const deleteOffersResult = await executeQuery(
            `DELETE FROM deal_master 
             WHERE UPPER(grade_of_material) = UPPER(?)
             OR (UPPER(Make) = UPPER(?) AND UPPER(Grade) = UPPER(?) AND UPPER(Brand) = UPPER(?))`,
            [grade_of_material, manufacturer, material_kind, brand_name]
        );

        const deletedOffersCount = (deleteOffersResult as any).affectedRows || 0;

        // Delete the material hierarchy entry
        await executeQuery(`DELETE FROM material_hierarchy WHERE id = ?`, [id]);

        console.log(`✅ Deleted material hierarchy entry (ID: ${id}, Grade: ${grade_of_material}, Kind: ${material_kind}, Manufacturer: ${manufacturer}, Brand: ${brand_name}) and ${deletedOffersCount} related offers`);

        return {
            success: true,
            message: `Material hierarchy entry deleted successfully. ${deletedOffersCount} related offer(s) were also deleted.`,
            deletedOffersCount
        };
    } catch (error) {
        console.error('Error deleting material hierarchy entry:', error);
        return { success: false, message: 'Failed to delete material hierarchy entry' };
    }
}

// Batch create multiple material hierarchy entries (multiple brand names for same parent)
export async function createMaterialHierarchyBatch(data: {
    grade_of_material: string;
    material_kind: string;
    manufacturer: string;
    brand_names: string[];
}): Promise<{ success: boolean; message: string; created: number; skipped: number; details: { brand: string; status: 'created' | 'exists' }[] }> {
    const results: { brand: string; status: 'created' | 'exists' }[] = [];
    let created = 0;
    let skipped = 0;

    for (const brand_name of data.brand_names) {
        const normalizedBrand = brand_name.trim().toUpperCase();
        if (!normalizedBrand) continue;

        // Check if entry already exists
        const existing = await executeQuery(
            `SELECT id FROM material_hierarchy 
             WHERE UPPER(grade_of_material) = ? AND UPPER(material_kind) = ? AND UPPER(manufacturer) = ? AND UPPER(brand_name) = ?`,
            [data.grade_of_material.toUpperCase(), data.material_kind.toUpperCase(), data.manufacturer.toUpperCase(), normalizedBrand]
        );

        if ((existing as any[]).length > 0) {
            results.push({ brand: normalizedBrand, status: 'exists' });
            skipped++;
        } else {
            await executeQuery(
                `INSERT INTO material_hierarchy (grade_of_material, material_kind, manufacturer, brand_name) 
                 VALUES (?, ?, ?, ?)`,
                [data.grade_of_material.toUpperCase(), data.material_kind.toUpperCase(), data.manufacturer.toUpperCase(), normalizedBrand]
            );
            results.push({ brand: normalizedBrand, status: 'created' });
            created++;
        }
    }

    return {
        success: created > 0,
        message: `Created ${created} entries, ${skipped} already existed`,
        created,
        skipped,
        details: results
    };
}

// Get all unique Grade of Materials
export async function getGradesOfMaterial() {
    const result = await executeQuery(
        `SELECT DISTINCT grade_of_material 
     FROM material_hierarchy 
     ORDER BY grade_of_material`
    );
    return result;
}

// Get Material Kinds filtered by Grade of Material
export async function getMaterialKinds(gradeOfMaterial?: string) {
    let query = `SELECT DISTINCT material_kind FROM material_hierarchy`;
    const params: any[] = [];

    if (gradeOfMaterial) {
        query += ` WHERE grade_of_material = ?`;
        params.push(gradeOfMaterial);
    }

    query += ` ORDER BY material_kind`;

    const result = await executeQuery(query, params);
    return result;
}

// Get Manufacturers filtered by Grade of Material and Material Kind
export async function getMaterialManufacturers(gradeOfMaterial?: string, materialKind?: string) {
    let query = `SELECT DISTINCT manufacturer FROM material_hierarchy WHERE 1=1`;
    const params: any[] = [];

    if (gradeOfMaterial) {
        query += ` AND grade_of_material = ?`;
        params.push(gradeOfMaterial);
    }

    if (materialKind) {
        query += ` AND material_kind = ?`;
        params.push(materialKind);
    }

    query += ` ORDER BY manufacturer`;

    const result = await executeQuery(query, params);
    return result;
}

// Get Brand Names filtered by Grade of Material, Material Kind, and Manufacturer
export async function getMaterialBrands(gradeOfMaterial?: string, materialKind?: string, manufacturer?: string) {
    let query = `SELECT DISTINCT brand_name FROM material_hierarchy WHERE 1=1`;
    const params: any[] = [];

    if (gradeOfMaterial) {
        query += ` AND grade_of_material = ?`;
        params.push(gradeOfMaterial);
    }

    if (materialKind) {
        query += ` AND material_kind = ?`;
        params.push(materialKind);
    }

    if (manufacturer) {
        query += ` AND manufacturer = ?`;
        params.push(manufacturer);
    }

    query += ` ORDER BY brand_name`;

    const result = await executeQuery(query, params);
    return result;
}
