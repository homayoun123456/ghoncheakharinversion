/**
 * Authentication Routes
 * Ghoncheye Lalehzar CMS
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * Login with username/email and password
 */
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const db = req.app.get('db');
        const config = req.app.get('config');
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }
        
        // Find user by username or email
        const user = db.prepare(`
            SELECT * FROM users WHERE username = ? OR email = ?
        `).get(username, username);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        // Check password
        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            // Log failed attempt
            db.prepare(`
                INSERT INTO activity_log (user_id, action, details, ip_address, created_at)
                VALUES (?, ?, ?, ?, datetime('now'))
            `).run(user.id, 'login_failed', 'Invalid password', req.ip);
            
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        // Check if user is active
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                error: 'Account is not active'
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            config.jwtSecret,
            { expiresIn: config.jwtExpiry }
        );
        
        // Update last login
        db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').run(user.id);
        
        // Log successful login
        db.prepare(`
            INSERT INTO activity_log (user_id, action, ip_address, created_at)
            VALUES (?, ?, ?, datetime('now'))
        `).run(user.id, 'login_success', req.ip);
        
        // Return user without password
        const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            avatar: user.avatar
        };
        
        res.json({
            success: true,
            token,
            user: userData
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/auth/register
 * Register new user (admin only in production)
 */
router.post('/register', authenticate, (req, res) => {
    try {
        const { username, email, password, first_name, last_name, role } = req.body;
        const db = req.app.get('db');
        
        // Only admins can create users
        if (req.user.role !== 'administrator') {
            return res.status(403).json({
                success: false,
                error: 'Only administrators can create users'
            });
        }
        
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
        
        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        // Insert user
        const result = db.prepare(`
            INSERT INTO users (username, email, password, first_name, last_name, role, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now'))
        `).run(username, email, hashedPassword, first_name || '', last_name || '', role || 'editor');
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/auth/check
 * Check if current token is valid
 */
router.get('/check', authenticate, (req, res) => {
    res.json({
        success: true,
        authenticated: true,
        user: req.user
    });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

/**
 * PUT /api/auth/profile
 * Update current user profile
 */
router.put('/profile', authenticate, (req, res) => {
    try {
        const { first_name, last_name, email } = req.body;
        const db = req.app.get('db');
        
        // Check if email is taken by another user
        if (email) {
            const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already in use'
                });
            }
        }
        
        db.prepare(`
            UPDATE users SET first_name = ?, last_name = ?, email = COALESCE(?, email), updated_at = datetime('now')
            WHERE id = ?
        `).run(first_name || '', last_name || '', email, req.user.id);
        
        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/password', authenticate, (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const db = req.app.get('db');
        
        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                error: 'Current and new password are required'
            });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }
        
        // Get current user with password
        const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
        
        // Verify current password
        if (!bcrypt.compareSync(current_password, user.password)) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }
        
        // Update password
        const hashedPassword = bcrypt.hashSync(new_password, 10);
        db.prepare('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?').run(hashedPassword, req.user.id);
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout (just returns success, client should delete token)
 */
router.post('/logout', authenticate, (req, res) => {
    const db = req.app.get('db');
    
    // Log logout
    db.prepare(`
        INSERT INTO activity_log (user_id, action, ip_address, created_at)
        VALUES (?, ?, ?, datetime('now'))
    `).run(req.user.id, 'logout', req.ip);
    
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
