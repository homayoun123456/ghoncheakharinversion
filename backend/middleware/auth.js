/**
 * Authentication Middleware
 * Ghoncheye Lalehzar CMS
 */

const jwt = require('jsonwebtoken');

/**
 * Verify JWT Token Middleware
 */
function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        const token = authHeader.split(' ')[1];
        const config = req.app.get('config');
        
        const decoded = jwt.verify(token, config.jwtSecret);
        
        // Get user from database
        const db = req.app.get('db');
        const user = db.prepare('SELECT id, username, email, first_name, last_name, role, status FROM users WHERE id = ?').get(decoded.id);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }
        
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                error: 'Account is not active'
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }
        
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
}

/**
 * Optional Authentication - doesn't fail if no token
 */
function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        
        const token = authHeader.split(' ')[1];
        const config = req.app.get('config');
        
        const decoded = jwt.verify(token, config.jwtSecret);
        const db = req.app.get('db');
        const user = db.prepare('SELECT id, username, email, first_name, last_name, role, status FROM users WHERE id = ?').get(decoded.id);
        
        if (user && user.status === 'active') {
            req.user = user;
        }
        
        next();
    } catch (error) {
        next();
    }
}

/**
 * Check if user has required role
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }
        
        next();
    };
}

/**
 * Admin only middleware
 */
function adminOnly(req, res, next) {
    if (!req.user || req.user.role !== 'administrator') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
}

module.exports = {
    authenticate,
    optionalAuth,
    requireRole,
    adminOnly
};
