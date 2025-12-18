/**
 * Pages Routes
 * Ghoncheye Lalehzar CMS
 */

const express = require('express');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { generateSlug } = require('../utils/helpers');

const router = express.Router();

/**
 * GET /api/pages
 * Get all pages
 */
router.get('/', optionalAuth, (req, res) => {
    try {
        const db = req.app.get('db');
        const { status, parent_id } = req.query;
        
        let query = 'SELECT p.*, u.username as author_name FROM pages p LEFT JOIN users u ON p.author_id = u.id WHERE 1=1';
        const params = [];
        
        if (!req.user) {
            query += ' AND p.status = ?';
            params.push('published');
        } else if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }
        
        if (parent_id !== undefined) {
            query += ' AND p.parent_id = ?';
            params.push(parent_id || null);
        }
        
        query += ' ORDER BY p.order_num ASC, p.created_at DESC';
        
        const pages = db.prepare(query).all(...params);
        
        res.json({ success: true, data: pages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/pages/:id
 * Get single page
 */
router.get('/:id', optionalAuth, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        let query = 'SELECT p.*, u.username as author_name FROM pages p LEFT JOIN users u ON p.author_id = u.id WHERE ';
        query += isNaN(id) ? 'p.slug = ?' : 'p.id = ?';
        
        const page = db.prepare(query).get(id);
        
        if (!page) {
            return res.status(404).json({ success: false, error: 'Page not found' });
        }
        
        if (!req.user && page.status !== 'published') {
            return res.status(404).json({ success: false, error: 'Page not found' });
        }
        
        res.json({ success: true, data: page });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/pages
 * Create new page
 */
router.post('/', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { title, content, template, parent_id, order_num, status, meta_title, meta_description } = req.body;
        
        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }
        
        let slug = generateSlug(title);
        const existing = db.prepare('SELECT id FROM pages WHERE slug = ?').get(slug);
        if (existing) slug = `${slug}-${Date.now()}`;
        
        const result = db.prepare(`
            INSERT INTO pages (title, slug, content, template, parent_id, order_num, status, meta_title, meta_description, author_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(title, slug, content || '', template || 'default', parent_id || null, order_num || 0, status || 'draft', meta_title || '', meta_description || '', req.user.id);
        
        res.status(201).json({
            success: true,
            message: 'Page created successfully',
            data: { id: result.lastInsertRowid, slug }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/pages/:id
 * Update page
 */
router.put('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        const { title, content, template, parent_id, order_num, status, meta_title, meta_description } = req.body;
        
        const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(id);
        if (!page) {
            return res.status(404).json({ success: false, error: 'Page not found' });
        }
        
        let slug = page.slug;
        if (title && title !== page.title) {
            slug = generateSlug(title);
            const existing = db.prepare('SELECT id FROM pages WHERE slug = ? AND id != ?').get(slug, id);
            if (existing) slug = `${slug}-${Date.now()}`;
        }
        
        db.prepare(`
            UPDATE pages SET 
                title = COALESCE(?, title),
                slug = ?,
                content = COALESCE(?, content),
                template = COALESCE(?, template),
                parent_id = ?,
                order_num = COALESCE(?, order_num),
                status = COALESCE(?, status),
                meta_title = COALESCE(?, meta_title),
                meta_description = COALESCE(?, meta_description),
                updated_at = datetime('now')
            WHERE id = ?
        `).run(title, slug, content, template, parent_id !== undefined ? parent_id : page.parent_id, order_num, status, meta_title, meta_description, id);
        
        res.json({ success: true, message: 'Page updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/pages/:id
 * Delete page
 */
router.delete('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(id);
        if (!page) {
            return res.status(404).json({ success: false, error: 'Page not found' });
        }
        
        // Update children to have no parent
        db.prepare('UPDATE pages SET parent_id = NULL WHERE parent_id = ?').run(id);
        
        db.prepare('DELETE FROM pages WHERE id = ?').run(id);
        
        res.json({ success: true, message: 'Page deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
