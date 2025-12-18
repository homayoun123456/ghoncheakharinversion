/**
 * Subscribers Routes
 * Ghoncheye Lalehzar CMS
 */

const express = require('express');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/subscribers
 * Get all subscribers
 */
router.get('/', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { status, limit = 50, offset = 0, search } = req.query;
        
        let query = 'SELECT * FROM subscribers WHERE 1=1';
        const params = [];
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        if (search) {
            query += ' AND (email LIKE ? OR name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const subscribers = db.prepare(query).all(...params);
        
        // Get counts
        const total = db.prepare('SELECT COUNT(*) as count FROM subscribers').get().count;
        const active = db.prepare('SELECT COUNT(*) as count FROM subscribers WHERE status = "active"').get().count;
        const unsubscribed = db.prepare('SELECT COUNT(*) as count FROM subscribers WHERE status = "unsubscribed"').get().count;
        
        res.json({
            success: true,
            data: subscribers,
            stats: { total, active, unsubscribed },
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
 * GET /api/subscribers/:id
 * Get single subscriber
 */
router.get('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        const subscriber = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(id);
        
        if (!subscriber) {
            return res.status(404).json({ success: false, error: 'Subscriber not found' });
        }
        
        res.json({ success: true, data: subscriber });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/subscribers
 * Add new subscriber (admin)
 */
router.post('/', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { email, name, status, source } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }
        
        // Check if exists
        const existing = db.prepare('SELECT id FROM subscribers WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ success: false, error: 'Email already exists' });
        }
        
        const result = db.prepare(`
            INSERT INTO subscribers (email, name, status, source, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `).run(email, name || '', status || 'active', source || 'admin');
        
        res.status(201).json({
            success: true,
            message: 'Subscriber added successfully',
            data: { id: result.lastInsertRowid }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/subscribers/:id
 * Update subscriber
 */
router.put('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        const { name, status } = req.body;
        
        const subscriber = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(id);
        if (!subscriber) {
            return res.status(404).json({ success: false, error: 'Subscriber not found' });
        }
        
        db.prepare(`
            UPDATE subscribers SET 
                name = COALESCE(?, name),
                status = COALESCE(?, status),
                updated_at = datetime('now')
            WHERE id = ?
        `).run(name, status, id);
        
        res.json({ success: true, message: 'Subscriber updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/subscribers/:id
 * Delete subscriber
 */
router.delete('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        db.prepare('DELETE FROM subscribers WHERE id = ?').run(id);
        
        res.json({ success: true, message: 'Subscriber deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/subscribers/export/csv
 * Export subscribers as CSV
 */
router.get('/export/csv', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { status } = req.query;
        
        let query = 'SELECT email, name, status, source, created_at FROM subscribers';
        const params = [];
        
        if (status) {
            query += ' WHERE status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const subscribers = db.prepare(query).all(...params);
        
        // Generate CSV
        const headers = ['Email', 'Name', 'Status', 'Source', 'Created At'];
        let csv = headers.join(',') + '\n';
        
        for (const sub of subscribers) {
            csv += `"${sub.email}","${sub.name || ''}","${sub.status}","${sub.source}","${sub.created_at}"\n`;
        }
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/subscribers/import
 * Import subscribers from CSV
 */
router.post('/import', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { emails } = req.body; // Array of {email, name}
        
        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({ success: false, error: 'Emails array required' });
        }
        
        let imported = 0;
        let skipped = 0;
        
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO subscribers (email, name, status, source, created_at)
            VALUES (?, ?, 'active', 'import', datetime('now'))
        `);
        
        for (const item of emails) {
            const result = insertStmt.run(item.email, item.name || '');
            if (result.changes > 0) {
                imported++;
            } else {
                skipped++;
            }
        }
        
        res.json({
            success: true,
            message: `Imported ${imported} subscribers, skipped ${skipped} duplicates`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
