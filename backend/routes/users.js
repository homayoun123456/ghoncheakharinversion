/**
 * Users Routes
 * Ghoncheye Lalehzar CMS
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', authenticate, adminOnly, (req, res) => {
    try {
        const db = req.app.get('db');
        const { status, role, search } = req.query;
        
        let query = 'SELECT id, username, email, first_name, last_name, role, avatar, status, last_login, created_at FROM users WHERE 1=1';
        const params = [];
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }
        
        if (search) {
            query += ' AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const users = db.prepare(query).all(...params);
        
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/users/:id
 * Get single user
 */
router.get('/:id', authenticate, adminOnly, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        const user = db.prepare('SELECT id, username, email, first_name, last_name, role, avatar, status, last_login, created_at FROM users WHERE id = ?').get(id);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/', authenticate, adminOnly, (req, res) => {
    try {
        const db = req.app.get('db');
        const { username, email, password, first_name, last_name, role, status } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username, email, and password are required'
            });
        }
        
        // Check if username or email exists
        const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Username or email already exists'
            });
        }
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        const result = db.prepare(`
            INSERT INTO users (username, email, password, first_name, last_name, role, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
            username,
            email,
            hashedPassword,
            first_name || '',
            last_name || '',
            role || 'editor',
            status || 'active'
        );
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { id: result.lastInsertRowid }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id', authenticate, adminOnly, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        const { username, email, password, first_name, last_name, role, status } = req.body;
        
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Check if username or email is taken by another user
        if (username && username !== user.username) {
            const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
            if (existing) {
                return res.status(400).json({ success: false, error: 'Username already taken' });
            }
        }
        
        if (email && email !== user.email) {
            const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
            if (existing) {
                return res.status(400).json({ success: false, error: 'Email already taken' });
            }
        }
        
        let query = `
            UPDATE users SET 
                username = COALESCE(?, username),
                email = COALESCE(?, email),
                first_name = COALESCE(?, first_name),
                last_name = COALESCE(?, last_name),
                role = COALESCE(?, role),
                status = COALESCE(?, status),
                updated_at = datetime('now')
        `;
        
        const params = [username, email, first_name, last_name, role, status];
        
        if (password) {
            query = query.replace('updated_at', 'password = ?, updated_at');
            params.splice(params.length, 0, bcrypt.hashSync(password, 10));
        }
        
        query += ' WHERE id = ?';
        params.push(id);
        
        db.prepare(query).run(...params);
        
        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id', authenticate, adminOnly, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        // Don't allow deleting self
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }
        
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/users/:id/activity
 * Get user activity log
 */
router.get('/:id/activity', authenticate, adminOnly, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        const { limit = 50 } = req.query;
        
        const activities = db.prepare(`
            SELECT * FROM activity_log 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `).all(id, parseInt(limit));
        
        res.json({ success: true, data: activities });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
