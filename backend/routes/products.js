/**
 * Products Routes
 * Ghoncheye Lalehzar CMS
 */

const express = require('express');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { generateSlug } = require('../utils/helpers');

const router = express.Router();

/**
 * GET /api/products
 * Get all products
 */
router.get('/', optionalAuth, (req, res) => {
    try {
        const db = req.app.get('db');
        const { status, category, featured } = req.query;
        
        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];
        
        if (!req.user) {
            query += ' AND status = ?';
            params.push('active');
        } else if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        
        if (featured !== undefined) {
            query += ' AND featured = ?';
            params.push(featured === 'true' ? 1 : 0);
        }
        
        query += ' ORDER BY order_num ASC, created_at DESC';
        
        const products = db.prepare(query).all(...params);
        
        // Parse JSON fields
        const parsedProducts = products.map(p => ({
            ...p,
            features: p.features ? JSON.parse(p.features) : [],
            gallery: p.gallery ? JSON.parse(p.gallery) : []
        }));
        
        res.json({ success: true, data: parsedProducts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/products/:id
 * Get single product
 */
router.get('/:id', optionalAuth, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        let query = 'SELECT * FROM products WHERE ';
        query += isNaN(id) ? 'slug = ?' : 'id = ?';
        
        const product = db.prepare(query).get(id);
        
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        
        if (!req.user && product.status !== 'active') {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        
        // Parse JSON fields
        product.features = product.features ? JSON.parse(product.features) : [];
        product.gallery = product.gallery ? JSON.parse(product.gallery) : [];
        
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/products
 * Create new product
 */
router.post('/', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { 
            name, description, short_description, category, price, min_order, unit, 
            sizes, features, image, gallery, status, featured, order_num, meta_title, meta_description 
        } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }
        
        let slug = generateSlug(name);
        const existing = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
        if (existing) slug = `${slug}-${Date.now()}`;
        
        const result = db.prepare(`
            INSERT INTO products (
                name, slug, description, short_description, category, price, min_order, unit,
                sizes, features, image, gallery, status, featured, order_num, meta_title, meta_description,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
            name, slug, description || '', short_description || '', category || '', price || '',
            min_order || '', unit || 'kg', sizes || '',
            features ? JSON.stringify(features) : '[]',
            image || '',
            gallery ? JSON.stringify(gallery) : '[]',
            status || 'active', featured ? 1 : 0, order_num || 0,
            meta_title || '', meta_description || ''
        );
        
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: { id: result.lastInsertRowid, slug }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/products/:id
 * Update product
 */
router.put('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        const updates = req.body;
        
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        
        let slug = product.slug;
        if (updates.name && updates.name !== product.name) {
            slug = generateSlug(updates.name);
            const existing = db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').get(slug, id);
            if (existing) slug = `${slug}-${Date.now()}`;
        }
        
        // Stringify JSON fields if provided
        if (updates.features) updates.features = JSON.stringify(updates.features);
        if (updates.gallery) updates.gallery = JSON.stringify(updates.gallery);
        
        db.prepare(`
            UPDATE products SET 
                name = COALESCE(?, name),
                slug = ?,
                description = COALESCE(?, description),
                short_description = COALESCE(?, short_description),
                category = COALESCE(?, category),
                price = COALESCE(?, price),
                min_order = COALESCE(?, min_order),
                unit = COALESCE(?, unit),
                sizes = COALESCE(?, sizes),
                features = COALESCE(?, features),
                image = COALESCE(?, image),
                gallery = COALESCE(?, gallery),
                status = COALESCE(?, status),
                featured = COALESCE(?, featured),
                order_num = COALESCE(?, order_num),
                meta_title = COALESCE(?, meta_title),
                meta_description = COALESCE(?, meta_description),
                updated_at = datetime('now')
            WHERE id = ?
        `).run(
            updates.name, slug, updates.description, updates.short_description, updates.category,
            updates.price, updates.min_order, updates.unit, updates.sizes, updates.features,
            updates.image, updates.gallery, updates.status, updates.featured !== undefined ? (updates.featured ? 1 : 0) : null,
            updates.order_num, updates.meta_title, updates.meta_description, id
        );
        
        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/products/:id
 * Delete product
 */
router.delete('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        
        db.prepare('DELETE FROM products WHERE id = ?').run(id);
        
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
