import { executeQuery, executeQuerySingle } from './database';

export interface Product {
  id: string;
  seller_id: number;
  category_id: string;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  unit: string;
  min_order_quantity: number;
  status: 'available' | 'low_stock' | 'out_of_stock' | 'discontinued';
  image_urls?: string[];
  specifications?: any;
  location?: string;
  is_active: boolean;
  expiry_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  created_at: Date;
}

export interface CreateProductData {
  seller_id: number;
  category_id: string;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  unit: string;
  min_order_quantity?: number;
  image_urls?: string[];
  specifications?: any;
  location?: string;
  expiry_date?: Date;
}

export class ProductService {
  
  // Get all categories
  async getCategories(): Promise<Category[]> {
    try {
      return await executeQuery(`
        SELECT * FROM sl_categories 
        ORDER BY name ASC
      `);
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  // Create a new category
  async createCategory(name: string, description?: string, parentId?: string): Promise<{ success: boolean; message: string; categoryId?: string }> {
    try {
      const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await executeQuery(`
        INSERT INTO sl_categories (id, name, description, parent_id, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `, [categoryId, name, description || null, parentId || null]);

      return {
        success: true,
        message: 'Category created successfully',
        categoryId
      };
    } catch (error) {
      console.error('Error creating category:', error);
      return {
        success: false,
        message: `Failed to create category: ${error.message}`
      };
    }
  }

  // Get all products with optional filtering
  async getProducts(filters?: {
    category_id?: string;
    seller_id?: number;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
    try {
      let whereConditions = ['p.is_active = 1'];
      let params: any[] = [];

      if (filters?.category_id) {
        whereConditions.push('p.category_id = ?');
        params.push(filters.category_id);
      }

      if (filters?.seller_id) {
        whereConditions.push('p.seller_id = ?');
        params.push(filters.seller_id);
      }

      if (filters?.status) {
        whereConditions.push('p.status = ?');
        params.push(filters.status);
      }

      if (filters?.search) {
        whereConditions.push('(p.title LIKE ? OR p.description LIKE ?)');
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM products p 
        ${whereClause}
      `;
      const countResult = await executeQuerySingle(countQuery, params);
      const total = countResult?.total || 0;

      // Get products with pagination
      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;

      const productsQuery = `
        SELECT 
          p.*,
          c.name as category_name,
          m.mname as seller_name,
          m.company_name as seller_company
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN bmpa_members m ON p.seller_id = m.member_id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const products = await executeQuery(productsQuery, [...params, limit, offset]);

      // Parse JSON fields
      const parsedProducts = products.map(product => ({
        ...product,
        image_urls: product.image_urls ? JSON.parse(product.image_urls) : [],
        specifications: product.specifications ? JSON.parse(product.specifications) : null
      }));

      return {
        products: parsedProducts,
        total
      };
    } catch (error) {
      console.error('Error getting products:', error);
      return { products: [], total: 0 };
    }
  }

  // Get a single product by ID
  async getProductById(productId: string): Promise<Product | null> {
    try {
      const product = await executeQuerySingle(`
        SELECT 
          p.*,
          c.name as category_name,
          m.mname as seller_name,
          m.company_name as seller_company,
          m.email as seller_email,
          m.phone as seller_phone
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN bmpa_members m ON p.seller_id = m.member_id
        WHERE p.id = ? AND p.is_active = 1
      `, [productId]);

      if (!product) return null;

      // Parse JSON fields
      return {
        ...product,
        image_urls: product.image_urls ? JSON.parse(product.image_urls) : [],
        specifications: product.specifications ? JSON.parse(product.specifications) : null
      };
    } catch (error) {
      console.error('Error getting product by ID:', error);
      return null;
    }
  }

  // Create a new product
  async createProduct(productData: CreateProductData): Promise<{ success: boolean; message: string; productId?: string }> {
    try {
      const {
        seller_id,
        category_id,
        title,
        description,
        price,
        quantity,
        unit,
        min_order_quantity = 1,
        image_urls = [],
        specifications,
        location,
        expiry_date
      } = productData;

      const productId = require('crypto').randomUUID();
      const result = await executeQuery(`
        INSERT INTO products (
          id, seller_id, category_id, title, description, price, quantity, unit,
          min_order_quantity, image_urls, specifications, location, expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        productId,
        seller_id,
        category_id,
        title,
        description || null,
        price,
        quantity,
        unit,
        min_order_quantity,
        JSON.stringify(image_urls),
        specifications ? JSON.stringify(specifications) : null,
        location || null,
        expiry_date || null
      ]);

      return {
        success: true,
        message: 'Product created successfully',
        productId
      };
    } catch (error) {
      console.error('Error creating product:', error);
      return {
        success: false,
        message: 'Failed to create product'
      };
    }
  }

  // Update a product
  async updateProduct(productId: string, sellerId: number, updateData: Partial<CreateProductData>): Promise<{ success: boolean; message: string }> {
    try {
      // Verify the product belongs to the seller
      const product = await executeQuerySingle(`
        SELECT seller_id FROM products WHERE id = ? AND is_active = 1
      `, [productId]);

      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      if (product.seller_id !== sellerId) {
        return {
          success: false,
          message: 'Unauthorized to update this product'
        };
      }

      const allowedFields = [
        'category_id', 'title', 'description', 'price', 'quantity', 'unit',
        'min_order_quantity', 'image_urls', 'specifications', 'location', 'expiry_date'
      ];
      
      const updateFields = [];
      const updateValues = [];
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          if (field === 'image_urls' || field === 'specifications') {
            updateFields.push(`${field} = ?`);
            updateValues.push(JSON.stringify(updateData[field]));
          } else {
            updateFields.push(`${field} = ?`);
            updateValues.push(updateData[field]);
          }
        }
      }
      
      if (updateFields.length === 0) {
        return {
          success: false,
          message: 'No valid fields to update'
        };
      }
      
      updateValues.push(productId);
      
      await executeQuery(
        `UPDATE products SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        updateValues
      );

      return {
        success: true,
        message: 'Product updated successfully'
      };
    } catch (error) {
      console.error('Error updating product:', error);
      return {
        success: false,
        message: 'Failed to update product'
      };
    }
  }

  // Delete a product (soft delete)
  async deleteProduct(productId: string, sellerId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Verify the product belongs to the seller
      const product = await executeQuerySingle(`
        SELECT seller_id FROM products WHERE id = ? AND is_active = 1
      `, [productId]);

      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      if (product.seller_id !== sellerId) {
        return {
          success: false,
          message: 'Unauthorized to delete this product'
        };
      }

      await executeQuery(`
        UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [productId]);

      return {
        success: true,
        message: 'Product deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting product:', error);
      return {
        success: false,
        message: 'Failed to delete product'
      };
    }
  }

  // Update product status
  async updateProductStatus(productId: string, sellerId: number, status: string): Promise<{ success: boolean; message: string }> {
    try {
      const validStatuses = ['available', 'low_stock', 'out_of_stock', 'discontinued'];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          message: 'Invalid status'
        };
      }

      // Verify the product belongs to the seller
      const product = await executeQuerySingle(`
        SELECT seller_id FROM products WHERE id = ? AND is_active = 1
      `, [productId]);

      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      if (product.seller_id !== sellerId) {
        return {
          success: false,
          message: 'Unauthorized to update this product'
        };
      }

      await executeQuery(`
        UPDATE products SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [status, productId]);

      return {
        success: true,
        message: 'Product status updated successfully'
      };
    } catch (error) {
      console.error('Error updating product status:', error);
      return {
        success: false,
        message: 'Failed to update product status'
      };
    }
  }
}

export const productService = new ProductService();