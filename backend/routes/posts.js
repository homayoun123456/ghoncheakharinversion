/**
 * Posts Routes
 * Ghoncheye Lalehzar CMS
 */

const express = require('express');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { generateSlug } = require('../utils/helpers');

const router = express.Router();

/**
 * GET /api/posts
 * Get all posts (public: only published, authenticated: all)
 */
router.get('/', optionalAuth, (req, res) => {
    try {
        const db = req.app.get('db');
        const { status, category, limit = 50, offset = 0, search } = req.query;
        
        let query = 'SELECT p.*, u.username as author_name FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE 1=1';
        const params = [];
        
        // Non-authenticated users can only see published posts
        if (!req.user) {
            query += ' AND p.status = ?';
            params.push('published');
        } else if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }
        
        if (category) {
            query += ' AND p.category = ?';
            params.push(category);
        }
        
        if (search) {
            query += ' AND (p.title LIKE ? OR p.content LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const posts = db.prepare(query).all(...params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM posts WHERE 1=1';
        const countParams = [];
        
        if (!req.user) {
            countQuery += ' AND status = ?';
            countParams.push('published');
        } else if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        
        const total = db.prepare(countQuery).get(...countParams).total;
        
        res.json({
            success: true,
            data: posts,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/posts/:id
 * Get single post by ID or slug
 */
router.get('/:id', optionalAuth, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        let query = 'SELECT p.*, u.username as author_name FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE ';
        
        // Check if id is numeric or slug
        if (isNaN(id)) {
            query += 'p.slug = ?';
        } else {
            query += 'p.id = ?';
        }
        
        const post = db.prepare(query).get(id);
        
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        
        // Non-authenticated users can only see published posts
        if (!req.user && post.status !== 'published') {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        
        // Increment views for public access
        if (!req.user || req.user.id !== post.author_id) {
            db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(post.id);
        }
        
        res.json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/posts
 * Create new post
 */
router.post('/', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { title, content, excerpt, category, tags, status, featured_image, meta_title, meta_description } = req.body;
        
        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }
        
        const slug = generateSlug(title);
        
        // Check if slug exists
        const existing = db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug);
        const finalSlug = existing ? `${slug}-${Date.now()}` : slug;
        
        const result = db.prepare(`
            INSERT INTO posts (title, slug, content, excerpt, category, tags, status, featured_image, meta_title, meta_description, author_id, created_at, updated_at, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ${status === 'published' ? "datetime('now')" : 'NULL'})
        `).run(
            title,
            finalSlug,
            content || '',
            excerpt || '',
            category || '',
            tags || '',
            status || 'draft',
            featured_image || '',
            meta_title || '',
            meta_description || '',
            req.user.id
        );
        
        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            data: { id: result.lastInsertRowid, slug: finalSlug }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/posts/:id
 * Update post
 */
router.put('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        const { title, content, excerpt, category, tags, status, featured_image, meta_title, meta_description } = req.body;
        
        const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        
        // Generate new slug if title changed
        let slug = post.slug;
        if (title && title !== post.title) {
            slug = generateSlug(title);
            const existing = db.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?').get(slug, id);
            if (existing) slug = `${slug}-${Date.now()}`;
        }
        
        // Set published_at if publishing for first time
        const publishedAt = status === 'published' && post.status !== 'published' ? "datetime('now')" : 'published_at';
        
        db.prepare(`
            UPDATE posts SET 
                title = COALESCE(?, title),
                slug = ?,
                content = COALESCE(?, content),
                excerpt = COALESCE(?, excerpt),
                category = COALESCE(?, category),
                tags = COALESCE(?, tags),
                status = COALESCE(?, status),
                featured_image = COALESCE(?, featured_image),
                meta_title = COALESCE(?, meta_title),
                meta_description = COALESCE(?, meta_description),
                updated_at = datetime('now'),
                published_at = ${status === 'published' && post.status !== 'published' ? "datetime('now')" : 'published_at'}
            WHERE id = ?
        `).run(title, slug, content, excerpt, category, tags, status, featured_image, meta_title, meta_description, id);
        
        res.json({ success: true, message: 'Post updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/posts/:id
 * Delete post
 */
router.delete('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        
        db.prepare('DELETE FROM posts WHERE id = ?').run(id);
        
        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
