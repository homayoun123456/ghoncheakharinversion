/**
 * Messages Routes
 * Ghoncheye Lalehzar CMS
 */

const express = require('express');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/messages
 * Get all messages
 */
router.get('/', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { is_read, is_starred, limit = 50, offset = 0, search } = req.query;
        
        let query = 'SELECT * FROM messages WHERE 1=1';
        const params = [];
        
        if (is_read !== undefined) {
            query += ' AND is_read = ?';
            params.push(is_read === 'true' ? 1 : 0);
        }
        
        if (is_starred !== undefined) {
            query += ' AND is_starred = ?';
            params.push(is_starred === 'true' ? 1 : 0);
        }
        
        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ? OR message LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const messages = db.prepare(query).all(...params);
        
        // Get counts
        const total = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
        const unread = db.prepare('SELECT COUNT(*) as count FROM messages WHERE is_read = 0').get().count;
        const starred = db.prepare('SELECT COUNT(*) as count FROM messages WHERE is_starred = 1').get().count;
        
        res.json({
            success: true,
            data: messages,
            stats: { total, unread, starred },
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
 * GET /api/messages/:id
 * Get single message
 */
router.get('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
        
        if (!message) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }
        
        // Mark as read
        if (!message.is_read) {
            db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(id);
        }
        
        res.json({ success: true, data: message });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/messages/:id
 * Update message (mark read, star, etc.)
 */
router.put('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        const { is_read, is_starred, reply } = req.body;
        
        const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
        if (!message) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }
        
        const updates = [];
        const params = [];
        
        if (is_read !== undefined) {
            updates.push('is_read = ?');
            params.push(is_read ? 1 : 0);
        }
        
        if (is_starred !== undefined) {
            updates.push('is_starred = ?');
            params.push(is_starred ? 1 : 0);
        }
        
        if (reply !== undefined) {
            updates.push('reply = ?', 'replied_at = datetime("now")');
            params.push(reply);
        }
        
        if (updates.length > 0) {
            params.push(id);
            db.prepare(`UPDATE messages SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }
        
        res.json({ success: true, message: 'Message updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/messages/mark-read
 * Mark multiple messages as read
 */
router.put('/bulk/mark-read', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, error: 'IDs array required' });
        }
        
        const placeholders = ids.map(() => '?').join(',');
        db.prepare(`UPDATE messages SET is_read = 1 WHERE id IN (${placeholders})`).run(...ids);
        
        res.json({ success: true, message: `${ids.length} messages marked as read` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/messages/:id
 * Delete message
 */
router.delete('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        db.prepare('DELETE FROM messages WHERE id = ?').run(id);
        
        res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/messages/bulk/delete
 * Delete multiple messages
 */
router.delete('/bulk/delete', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, error: 'IDs array required' });
        }
        
        const placeholders = ids.map(() => '?').join(',');
        db.prepare(`DELETE FROM messages WHERE id IN (${placeholders})`).run(...ids);
        
        res.json({ success: true, message: `${ids.length} messages deleted` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
