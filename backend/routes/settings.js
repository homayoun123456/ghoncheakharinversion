/**
 * Settings Routes
 * Ghoncheye Lalehzar CMS
 */

const express = require('express');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/settings
 * Get all settings (grouped)
 */
router.get('/', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { group } = req.query;
        
        let query = 'SELECT * FROM settings';
        const params = [];
        
        if (group) {
            query += ' WHERE group_name = ?';
            params.push(group);
        }
        
        query += ' ORDER BY group_name, key';
        
        const settings = db.prepare(query).all(...params);
        
        // Group by group_name
        const grouped = {};
        for (const setting of settings) {
            if (!grouped[setting.group_name]) {
                grouped[setting.group_name] = {};
            }
            grouped[setting.group_name][setting.key] = setting.value;
        }
        
        res.json({ success: true, data: grouped, raw: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/settings/public
 * Get public settings (no auth required)
 */
router.get('/public', (req, res) => {
    try {
        const db = req.app.get('db');
        
        // Only return non-sensitive settings
        const publicKeys = [
            'site_title', 'site_tagline', 'site_description',
            'contact_email', 'contact_phone', 'contact_whatsapp', 'contact_address',
            'map_lat', 'map_lng',
            'social_instagram', 'social_telegram', 'social_linkedin', 'social_twitter',
            'primary_color', 'secondary_color'
        ];
        
        const placeholders = publicKeys.map(() => '?').join(',');
        const settings = db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).all(...publicKeys);
        
        // Convert to object
        const result = {};
        for (const setting of settings) {
            result[setting.key] = setting.value;
        }
        
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/settings/:key
 * Get single setting
 */
router.get('/:key', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { key } = req.params;
        
        const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);
        
        if (!setting) {
            return res.status(404).json({ success: false, error: 'Setting not found' });
        }
        
        res.json({ success: true, data: setting });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/settings/:key
 * Update single setting
 */
router.put('/:key', authenticate, adminOnly, (req, res) => {
    try {
        const db = req.app.get('db');
        const { key } = req.params;
        const { value } = req.body;
        
        const existing = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);
        
        if (existing) {
            db.prepare('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE key = ?').run(value, key);
        } else {
            db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now"))').run(key, value);
        }
        
        res.json({ success: true, message: 'Setting updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/settings
 * Update multiple settings
 */
router.put('/', authenticate, adminOnly, (req, res) => {
    try {
        const db = req.app.get('db');
        const settings = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ success: false, error: 'Settings object required' });
        }
        
        const updateStmt = db.prepare(`
            INSERT INTO settings (key, value, group_name, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
        `);
        
        let updated = 0;
        
        for (const [key, value] of Object.entries(settings)) {
            // Determine group from key prefix
            let group = 'general';
            if (key.startsWith('contact_') || key.startsWith('map_')) group = 'contact';
            else if (key.startsWith('social_')) group = 'social';
            else if (key.startsWith('seo_') || key.startsWith('meta_')) group = 'seo';
            else if (key.includes('color') || key.includes('logo') || key.includes('favicon')) group = 'appearance';
            
            updateStmt.run(key, value, group, value);
            updated++;
        }
        
        res.json({ success: true, message: `${updated} settings updated successfully` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/settings/:key
 * Delete setting
 */
router.delete('/:key', authenticate, adminOnly, (req, res) => {
    try {
        const db = req.app.get('db');
        const { key } = req.params;
        
        db.prepare('DELETE FROM settings WHERE key = ?').run(key);
        
        res.json({ success: true, message: 'Setting deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
