/**
 * Media Routes
 * Ghoncheye Lalehzar CMS
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        
        // Create year/month subdirectory
        const now = new Date();
        const subDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
        const fullPath = path.join(uploadDir, subDir);
        
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        
        req.uploadSubDir = subDir;
        cb(null, fullPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/mp4', 'video/webm'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    }
});

/**
 * GET /api/media
 * Get all media files
 */
router.get('/', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { type, limit = 50, offset = 0, search } = req.query;
        
        let query = 'SELECT m.*, u.username as uploaded_by_name FROM media m LEFT JOIN users u ON m.uploaded_by = u.id WHERE 1=1';
        const params = [];
        
        if (type) {
            query += ' AND m.mimetype LIKE ?';
            params.push(`${type}%`);
        }
        
        if (search) {
            query += ' AND (m.filename LIKE ? OR m.original_name LIKE ? OR m.alt_text LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const media = db.prepare(query).all(...params);
        
        // Get total count
        const total = db.prepare('SELECT COUNT(*) as count FROM media').get().count;
        
        res.json({
            success: true,
            data: media,
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
 * GET /api/media/:id
 * Get single media file info
 */
router.get('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        const media = db.prepare('SELECT m.*, u.username as uploaded_by_name FROM media m LEFT JOIN users u ON m.uploaded_by = u.id WHERE m.id = ?').get(id);
        
        if (!media) {
            return res.status(404).json({ success: false, error: 'Media not found' });
        }
        
        res.json({ success: true, data: media });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/media/upload
 * Upload new media file
 */
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        
        const db = req.app.get('db');
        const { alt_text, caption } = req.body;
        
        const filepath = `/uploads/${req.uploadSubDir}/${req.file.filename}`;
        
        const result = db.prepare(`
            INSERT INTO media (filename, original_name, filepath, mimetype, size, alt_text, caption, uploaded_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
            req.file.filename,
            req.file.originalname,
            filepath,
            req.file.mimetype,
            req.file.size,
            alt_text || '',
            caption || '',
            req.user.id
        );
        
        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                id: result.lastInsertRowid,
                filename: req.file.filename,
                filepath,
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/media/upload-multiple
 * Upload multiple files
 */
router.post('/upload-multiple', authenticate, upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }
        
        const db = req.app.get('db');
        const uploaded = [];
        
        const insertStmt = db.prepare(`
            INSERT INTO media (filename, original_name, filepath, mimetype, size, uploaded_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        
        for (const file of req.files) {
            const filepath = `/uploads/${req.uploadSubDir}/${file.filename}`;
            const result = insertStmt.run(
                file.filename,
                file.originalname,
                filepath,
                file.mimetype,
                file.size,
                req.user.id
            );
            
            uploaded.push({
                id: result.lastInsertRowid,
                filename: file.filename,
                filepath,
                mimetype: file.mimetype,
                size: file.size
            });
        }
        
        res.status(201).json({
            success: true,
            message: `${uploaded.length} files uploaded successfully`,
            data: uploaded
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/media/:id
 * Update media metadata
 */
router.put('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        const { alt_text, caption } = req.body;
        
        const media = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
        if (!media) {
            return res.status(404).json({ success: false, error: 'Media not found' });
        }
        
        db.prepare(`
            UPDATE media SET 
                alt_text = COALESCE(?, alt_text),
                caption = COALESCE(?, caption)
            WHERE id = ?
        `).run(alt_text, caption, id);
        
        res.json({ success: true, message: 'Media updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/media/:id
 * Delete media file
 */
router.delete('/:id', authenticate, (req, res) => {
    try {
        const db = req.app.get('db');
        const { id } = req.params;
        
        const media = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
        if (!media) {
            return res.status(404).json({ success: false, error: 'Media not found' });
        }
        
        // Delete physical file
        const fullPath = path.join(__dirname, '../..', media.filepath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
        
        // Delete from database
        db.prepare('DELETE FROM media WHERE id = ?').run(id);
        
        res.json({ success: true, message: 'Media deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
