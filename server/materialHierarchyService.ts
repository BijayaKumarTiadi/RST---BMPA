import { executeQuery } from './database';

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
