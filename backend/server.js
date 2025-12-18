/**
 * Ghoncheye Lalehzar - Complete Backend Server
 * A comprehensive Express.js server with all APIs
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import database
const db = require('./database');

// Import routes
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const pagesRoutes = require('./routes/pages');
const productsRoutes = require('./routes/products');
const messagesRoutes = require('./routes/messages');
const subscribersRoutes = require('./routes/subscribers');
const mediaRoutes = require('./routes/media');
const settingsRoutes = require('./routes/settings');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const config = {
    jwtSecret: process.env.JWT_SECRET || 'ghoncheye-lalehzar-secret-key-change-in-production',
    jwtExpiry: '24h',
    uploadDir: path.join(__dirname, '../uploads'),
    allowedOrigins: [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:3000'
    ]
};

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS Configuration
app.use(cors({
    origin: function(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
}));

// Session
app.use(session({
    secret: config.jwtSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Static files
app.use('/uploads', express.static(config.uploadDir));
app.use(express.static(path.join(__dirname, '..')));

// Request logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Make config available to routes
app.set('config', config);
app.set('db', db);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/subscribers', subscribersRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Dashboard stats
app.get('/api/stats', (req, res) => {
    try {
        const stats = {
            posts: db.prepare('SELECT COUNT(*) as count FROM posts').get().count,
            pages: db.prepare('SELECT COUNT(*) as count FROM pages').get().count,
            products: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
            messages: db.prepare('SELECT COUNT(*) as count FROM messages').get().count,
            unreadMessages: db.prepare('SELECT COUNT(*) as count FROM messages WHERE is_read = 0').get().count,
            subscribers: db.prepare('SELECT COUNT(*) as count FROM subscribers WHERE status = "active"').get().count
        };
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Contact form submission (public)
app.post('/api/contact', (req, res) => {
    try {
        const { name, email, phone, company, country, product, volume, application, requirements, subject, message } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }
        
        const stmt = db.prepare(`
            INSERT INTO messages (name, email, phone, company, country, product, volume, application, requirements, subject, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        
        const result = stmt.run(
            name || '', 
            email, 
            phone || '', 
            company || '', 
            country || '', 
            product || '', 
            volume || '', 
            application || '', 
            requirements || '',
            subject || 'Contact Form',
            message || ''
        );
        
        res.json({ 
            success: true, 
            message: 'پیام شما با موفقیت ارسال شد / Your message was sent successfully',
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Newsletter subscription (public)
app.post('/api/subscribe', (req, res) => {
    try {
        const { email, name } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }
        
        // Check if already subscribed
        const existing = db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email);
        if (existing) {
            if (existing.status === 'active') {
                return res.json({ success: true, message: 'شما قبلاً عضو خبرنامه هستید / Already subscribed' });
            } else {
                // Reactivate
                db.prepare('UPDATE subscribers SET status = "active", updated_at = datetime("now") WHERE email = ?').run(email);
                return res.json({ success: true, message: 'عضویت شما مجدداً فعال شد / Subscription reactivated' });
            }
        }
        
        const stmt = db.prepare(`
            INSERT INTO subscribers (email, name, status, created_at)
            VALUES (?, ?, 'active', datetime('now'))
        `);
        
        stmt.run(email, name || '');
        
        res.json({ 
            success: true, 
            message: 'با تشکر از عضویت شما در خبرنامه / Thank you for subscribing'
        });
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Unsubscribe (public)
app.get('/api/unsubscribe/:email', (req, res) => {
    try {
        const { email } = req.params;
        db.prepare('UPDATE subscribers SET status = "unsubscribed", updated_at = datetime("now") WHERE email = ?').run(email);
        res.json({ success: true, message: 'You have been unsubscribed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  🌹 Ghoncheye Lalehzar - Complete Backend Server               ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  📍 Server running at: http://localhost:${PORT}                      ║`);
    console.log('║  📚 API Documentation: http://localhost:' + PORT + '/api/health          ║');
    console.log('║  🔐 Admin: admin / admin123                                    ║');
    console.log('║  🛑 Press Ctrl+C to stop                                       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
});

module.exports = app;
