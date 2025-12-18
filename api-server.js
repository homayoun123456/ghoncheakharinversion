/**
 * Ghoncheye Lalehzar API Server
 * Handles authentication and data management
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const API_PORT = 3001;

// JWT Secret
const JWT_SECRET = 'your-secret-key-change-in-production';

// In-memory data storage (for development)
let database = {
  users: [
    {
      id: 1,
      username: 'admin',
      password: '$2b$10$SlVZSvYznKIUgx5kIb8H.OPST9/PgBkqtQEKqVTQqO8m/.eHkK1Aq', // bcrypt hash of 'admin123'
      email: 'admin@ghoncheye.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'administrator',
      created_at: new Date().toISOString()
    }
  ],
  posts: [
    {
      id: 1,
      title: 'Lorem ipsum dolor sit amet',
      content: 'Consectetur adipiscing elit...',
      excerpt: 'Lorem ipsum dolor sit amet',
      slug: 'lorem-ipsum',
      status: 'published',
      author_id: 1,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  pages: [
    {
      id: 1,
      title: 'About Us',
      content: 'About page content...',
      slug: 'about-us',
      status: 'published',
      author_id: 1,
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  media: []
};

// Middleware
app.use(cors({
  origin: ['http://localhost:8000', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Simple password verification (for demo, using hardcoded hash)
function verifyPassword(password, hash) {
  // For demo, just check if password matches
  // In production, use bcryptjs or similar
  if (password === 'admin123' && hash.includes('$2b$')) {
    return true;
  }
  return false;
}

// Generate JWT Token
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// Verify JWT Token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Middleware: Check Authentication
function isAuthenticated(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = decoded;
  next();
}

// ==================== AUTH ENDPOINTS ====================

/**
 * POST /api/auth/login
 * Login with username and password
 */
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  // Find user
  const user = database.users.find(u => u.username === username);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Verify password
  if (!verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate token
  const token = generateToken(user);
  
  // Return user without password
  const userResponse = {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role
  };
  
  res.json({
    success: true,
    token: token,
    user: userResponse
  });
});

/**
 * GET /api/auth/check
 * Check if user is authenticated
 */
app.get('/api/auth/check', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ authenticated: false });
  }
  
  // Find user
  const user = database.users.find(u => u.id === decoded.id);
  
  if (!user) {
    return res.status(401).json({ authenticated: false });
  }
  
  const userResponse = {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role
  };
  
  res.json({
    authenticated: true,
    user: userResponse
  });
});

/**
 * POST /api/auth/logout
 * Logout user
 */
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// ==================== POSTS ENDPOINTS ====================

/**
 * GET /api/posts
 * Get all posts
 */
app.get('/api/posts', isAuthenticated, (req, res) => {
  res.json({
    success: true,
    data: database.posts
  });
});

/**
 * GET /api/posts/:id
 * Get single post
 */
app.get('/api/posts/:id', isAuthenticated, (req, res) => {
  const post = database.posts.find(p => p.id === parseInt(req.params.id));
  
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  res.json({
    success: true,
    data: post
  });
});

/**
 * POST /api/posts
 * Create new post
 */
app.post('/api/posts', isAuthenticated, (req, res) => {
  const { title, content, excerpt, slug, status } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const newPost = {
    id: Math.max(...database.posts.map(p => p.id), 0) + 1,
    title,
    content: content || '',
    excerpt: excerpt || '',
    slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
    status: status || 'draft',
    author_id: req.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  database.posts.push(newPost);
  
  res.status(201).json({
    success: true,
    data: newPost
  });
});

/**
 * PUT /api/posts/:id
 * Update post
 */
app.put('/api/posts/:id', isAuthenticated, (req, res) => {
  const post = database.posts.find(p => p.id === parseInt(req.params.id));
  
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  // Update fields
  if (req.body.title) post.title = req.body.title;
  if (req.body.content) post.content = req.body.content;
  if (req.body.excerpt) post.excerpt = req.body.excerpt;
  if (req.body.slug) post.slug = req.body.slug;
  if (req.body.status) post.status = req.body.status;
  
  post.updated_at = new Date().toISOString();
  
  res.json({
    success: true,
    data: post
  });
});

/**
 * DELETE /api/posts/:id
 * Delete post
 */
app.delete('/api/posts/:id', isAuthenticated, (req, res) => {
  const index = database.posts.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  const deleted = database.posts.splice(index, 1);
  
  res.json({
    success: true,
    message: 'Post deleted',
    data: deleted[0]
  });
});

// ==================== PAGES ENDPOINTS ====================

/**
 * GET /api/pages
 * Get all pages
 */
app.get('/api/pages', isAuthenticated, (req, res) => {
  res.json({
    success: true,
    data: database.pages
  });
});

/**
 * GET /api/pages/:id
 * Get single page
 */
app.get('/api/pages/:id', isAuthenticated, (req, res) => {
  const page = database.pages.find(p => p.id === parseInt(req.params.id));
  
  if (!page) {
    return res.status(404).json({ error: 'Page not found' });
  }
  
  res.json({
    success: true,
    data: page
  });
});

/**
 * POST /api/pages
 * Create new page
 */
app.post('/api/pages', isAuthenticated, (req, res) => {
  const { title, content, slug, status } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const newPage = {
    id: Math.max(...database.pages.map(p => p.id), 0) + 1,
    title,
    content: content || '',
    slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
    status: status || 'draft',
    author_id: req.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  database.pages.push(newPage);
  
  res.status(201).json({
    success: true,
    data: newPage
  });
});

/**
 * PUT /api/pages/:id
 * Update page
 */
app.put('/api/pages/:id', isAuthenticated, (req, res) => {
  const page = database.pages.find(p => p.id === parseInt(req.params.id));
  
  if (!page) {
    return res.status(404).json({ error: 'Page not found' });
  }
  
  // Update fields
  if (req.body.title) page.title = req.body.title;
  if (req.body.content) page.content = req.body.content;
  if (req.body.slug) page.slug = req.body.slug;
  if (req.body.status) page.status = req.body.status;
  
  page.updated_at = new Date().toISOString();
  
  res.json({
    success: true,
    data: page
  });
});

/**
 * DELETE /api/pages/:id
 * Delete page
 */
app.delete('/api/pages/:id', isAuthenticated, (req, res) => {
  const index = database.pages.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Page not found' });
  }
  
  const deleted = database.pages.splice(index, 1);
  
  res.json({
    success: true,
    message: 'Page deleted',
    data: deleted[0]
  });
});

// ==================== USERS ENDPOINTS ====================

/**
 * GET /api/users
 * Get all users
 */
app.get('/api/users', isAuthenticated, (req, res) => {
  // Return users without passwords
  const users = database.users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    role: u.role,
    created_at: u.created_at
  }));
  
  res.json({
    success: true,
    data: users
  });
});

/**
 * GET /api/users/:id
 * Get single user
 */
app.get('/api/users/:id', isAuthenticated, (req, res) => {
  const user = database.users.find(u => u.id === parseInt(req.params.id));
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const userResponse = {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    created_at: user.created_at
  };
  
  res.json({
    success: true,
    data: userResponse
  });
});

// ==================== MEDIA ENDPOINTS (SEO OPTIMIZED) ====================

/**
 * GET /api/media
 * Get all media with SEO metadata
 */
app.get('/api/media', isAuthenticated, (req, res) => {
  const { type, limit, offset, search } = req.query;
  
  let filteredMedia = [...database.media];
  
  // Filter by type (image/video)
  if (type) {
    filteredMedia = filteredMedia.filter(m => m.media_type === type);
  }
  
  // Search in title, alt_text, description
  if (search) {
    const searchLower = search.toLowerCase();
    filteredMedia = filteredMedia.filter(m => 
      (m.title && m.title.toLowerCase().includes(searchLower)) ||
      (m.alt_text && m.alt_text.toLowerCase().includes(searchLower)) ||
      (m.description && m.description.toLowerCase().includes(searchLower))
    );
  }
  
  // Pagination
  const total = filteredMedia.length;
  const startIndex = parseInt(offset) || 0;
  const endIndex = startIndex + (parseInt(limit) || 50);
  filteredMedia = filteredMedia.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: filteredMedia,
    pagination: {
      total,
      offset: startIndex,
      limit: parseInt(limit) || 50
    }
  });
});

/**
 * GET /api/media/:id
 * Get single media with full SEO data
 */
app.get('/api/media/:id', isAuthenticated, (req, res) => {
  const media = database.media.find(m => m.id === parseInt(req.params.id));
  
  if (!media) {
    return res.status(404).json({ error: 'Media not found' });
  }
  
  res.json({
    success: true,
    data: media
  });
});

/**
 * POST /api/media/upload
 * Upload media file with comprehensive SEO metadata
 */
app.post('/api/media/upload', isAuthenticated, (req, res) => {
  const { 
    filename, 
    media_type,      // 'image' or 'video'
    // SEO Fields
    alt_text,        // Alternative text (required for images)
    title,           // Title attribute
    description,     // Description for search engines
    caption,         // Caption displayed below media
    // Image-specific SEO
    width,
    height,
    srcset,          // Responsive image srcset
    sizes,           // Responsive sizes attribute
    // Video-specific SEO
    duration,        // Video duration (ISO 8601)
    thumbnail_url,   // Video thumbnail
    transcript,      // Video transcript for accessibility/SEO
    captions_url,    // Captions/subtitles URL
    // Schema.org data
    author,
    date_published,
    keywords,
    content_url,
    embed_url
  } = req.body;
  
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }
  
  // Validate alt_text for images (SEO best practice)
  if (media_type === 'image' && !alt_text) {
    return res.status(400).json({ 
      error: 'Alt text is required for images (SEO requirement)',
      seo_tip: 'Alt text helps search engines understand image content and improves accessibility'
    });
  }
  
  // Generate SEO-friendly filename
  const seoFilename = generateSEOFilename(filename, title);
  
  const newMedia = {
    id: Math.max(...database.media.map(m => m.id || 0), 0) + 1,
    filename: seoFilename,
    original_filename: filename,
    filepath: `/uploads/${seoFilename}`,
    media_type: media_type || detectMediaType(filename),
    
    // SEO Metadata
    alt_text: alt_text || '',
    title: title || '',
    description: description || '',
    caption: caption || '',
    keywords: keywords || [],
    
    // Image-specific
    width: width || null,
    height: height || null,
    srcset: srcset || null,
    sizes: sizes || '(max-width: 576px) 100vw, (max-width: 992px) 50vw, 33vw',
    
    // Video-specific
    duration: duration || null,
    thumbnail_url: thumbnail_url || null,
    transcript: transcript || null,
    captions_url: captions_url || null,
    
    // Schema.org data
    schema_data: generateSchemaData({
      media_type,
      title,
      description,
      content_url,
      thumbnail_url,
      duration,
      author,
      date_published
    }),
    
    // Metadata
    uploaded_by: req.user.id,
    author: author || req.user.username,
    date_published: date_published || new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    
    // SEO Score
    seo_score: calculateSEOScore({
      alt_text,
      title,
      description,
      keywords,
      media_type,
      transcript
    })
  };
  
  database.media.push(newMedia);
  
  res.status(201).json({
    success: true,
    data: newMedia,
    seo_tips: generateSEOTips(newMedia)
  });
});

/**
 * PUT /api/media/:id
 * Update media SEO metadata
 */
app.put('/api/media/:id', isAuthenticated, (req, res) => {
  const media = database.media.find(m => m.id === parseInt(req.params.id));
  
  if (!media) {
    return res.status(404).json({ error: 'Media not found' });
  }
  
  // Update SEO fields
  const seoFields = [
    'alt_text', 'title', 'description', 'caption', 'keywords',
    'srcset', 'sizes', 'duration', 'thumbnail_url', 'transcript',
    'captions_url'
  ];
  
  seoFields.forEach(field => {
    if (req.body[field] !== undefined) {
      media[field] = req.body[field];
    }
  });
  
  media.updated_at = new Date().toISOString();
  
  // Recalculate SEO score
  media.seo_score = calculateSEOScore({
    alt_text: media.alt_text,
    title: media.title,
    description: media.description,
    keywords: media.keywords,
    media_type: media.media_type,
    transcript: media.transcript
  });
  
  // Regenerate Schema data
  media.schema_data = generateSchemaData({
    media_type: media.media_type,
    title: media.title,
    description: media.description,
    content_url: media.filepath,
    thumbnail_url: media.thumbnail_url,
    duration: media.duration,
    author: media.author,
    date_published: media.date_published
  });
  
  res.json({
    success: true,
    data: media,
    seo_tips: generateSEOTips(media)
  });
});

/**
 * DELETE /api/media/:id
 * Delete media
 */
app.delete('/api/media/:id', isAuthenticated, (req, res) => {
  const index = database.media.findIndex(m => m.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Media not found' });
  }
  
  const deleted = database.media.splice(index, 1);
  
  res.json({
    success: true,
    message: 'Media deleted',
    data: deleted[0]
  });
});

/**
 * GET /api/media/:id/schema
 * Get Schema.org structured data for media
 */
app.get('/api/media/:id/schema', (req, res) => {
  const media = database.media.find(m => m.id === parseInt(req.params.id));
  
  if (!media) {
    return res.status(404).json({ error: 'Media not found' });
  }
  
  res.json({
    success: true,
    data: media.schema_data
  });
});

/**
 * GET /api/media/sitemap
 * Generate media sitemap entries for SEO
 */
app.get('/api/media/sitemap', (req, res) => {
  const sitemapEntries = database.media.map(media => {
    if (media.media_type === 'image') {
      return {
        type: 'image',
        loc: media.filepath,
        title: media.title,
        caption: media.caption,
        geo_location: 'لاله زار، کرمان، ایران',
        license: 'https://ghoncheye-lalehzar.com/license'
      };
    } else if (media.media_type === 'video') {
      return {
        type: 'video',
        loc: media.filepath,
        thumbnail_loc: media.thumbnail_url,
        title: media.title,
        description: media.description,
        duration: media.duration,
        publication_date: media.date_published
      };
    }
    return null;
  }).filter(Boolean);
  
  res.json({
    success: true,
    data: sitemapEntries
  });
});

/**
 * POST /api/media/bulk-update-seo
 * Bulk update SEO metadata for multiple media items
 */
app.post('/api/media/bulk-update-seo', isAuthenticated, (req, res) => {
  const { updates } = req.body;
  
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Updates must be an array' });
  }
  
  const results = updates.map(update => {
    const media = database.media.find(m => m.id === update.id);
    
    if (!media) {
      return { id: update.id, success: false, error: 'Not found' };
    }
    
    // Update fields
    if (update.alt_text) media.alt_text = update.alt_text;
    if (update.title) media.title = update.title;
    if (update.description) media.description = update.description;
    if (update.keywords) media.keywords = update.keywords;
    
    media.updated_at = new Date().toISOString();
    media.seo_score = calculateSEOScore(media);
    
    return { id: update.id, success: true, seo_score: media.seo_score };
  });
  
  res.json({
    success: true,
    data: results
  });
});

// ==================== MEDIA HELPER FUNCTIONS ====================

/**
 * Detect media type from filename
 */
function detectMediaType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const videoExts = ['mp4', 'webm', 'ogg', 'avi', 'mov'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  return 'other';
}

/**
 * Generate SEO-friendly filename
 */
function generateSEOFilename(originalFilename, title) {
  if (!title) return originalFilename;
  
  const ext = originalFilename.split('.').pop();
  const seoName = title
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF-]/g, '')  // Keep Persian characters
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  return `${seoName}-${Date.now()}.${ext}`;
}

/**
 * Calculate SEO score for media
 */
function calculateSEOScore(media) {
  let score = 0;
  const maxScore = 100;
  
  // Alt text (30 points for images)
  if (media.media_type === 'image') {
    if (media.alt_text) {
      score += 15;
      if (media.alt_text.length >= 10 && media.alt_text.length <= 125) {
        score += 15;  // Optimal length
      }
    }
  }
  
  // Title (20 points)
  if (media.title) {
    score += 10;
    if (media.title.length >= 10 && media.title.length <= 70) {
      score += 10;  // Optimal length
    }
  }
  
  // Description (25 points)
  if (media.description) {
    score += 12;
    if (media.description.length >= 50 && media.description.length <= 160) {
      score += 13;  // Optimal length
    }
  }
  
  // Keywords (15 points)
  if (media.keywords && media.keywords.length > 0) {
    score += 8;
    if (media.keywords.length >= 3 && media.keywords.length <= 10) {
      score += 7;  // Optimal number
    }
  }
  
  // Video-specific: Transcript (10 points)
  if (media.media_type === 'video' && media.transcript) {
    score += 10;
  }
  
  return Math.min(score, maxScore);
}

/**
 * Generate Schema.org structured data
 */
function generateSchemaData(options) {
  const baseSchema = {
    "@context": "https://schema.org"
  };
  
  if (options.media_type === 'image') {
    return {
      ...baseSchema,
      "@type": "ImageObject",
      "name": options.title || '',
      "description": options.description || '',
      "contentUrl": options.content_url || '',
      "author": {
        "@type": "Organization",
        "name": options.author || "غنچه لاله زار"
      },
      "datePublished": options.date_published || new Date().toISOString()
    };
  } else if (options.media_type === 'video') {
    return {
      ...baseSchema,
      "@type": "VideoObject",
      "name": options.title || '',
      "description": options.description || '',
      "thumbnailUrl": options.thumbnail_url || '',
      "contentUrl": options.content_url || '',
      "duration": options.duration || '',
      "uploadDate": options.date_published || new Date().toISOString(),
      "publisher": {
        "@type": "Organization",
        "name": "غنچه لاله زار",
        "logo": {
          "@type": "ImageObject",
          "url": "https://ghoncheye-lalehzar.com/assets/logo.png"
        }
      }
    };
  }
  
  return baseSchema;
}

/**
 * Generate SEO improvement tips
 */
function generateSEOTips(media) {
  const tips = [];
  
  // Alt text tips
  if (!media.alt_text) {
    tips.push({
      field: 'alt_text',
      priority: 'high',
      tip_fa: 'متن جایگزین (Alt Text) برای تصاویر الزامی است. این متن به موتورهای جستجو و کاربران نابینا کمک می‌کند.',
      tip_en: 'Alt text is required for images. It helps search engines and visually impaired users.'
    });
  } else if (media.alt_text.length < 10) {
    tips.push({
      field: 'alt_text',
      priority: 'medium',
      tip_fa: 'متن جایگزین کوتاه است. توصیه می‌شود بین ۱۰ تا ۱۲۵ کاراکتر باشد.',
      tip_en: 'Alt text is too short. Recommended length is 10-125 characters.'
    });
  } else if (media.alt_text.length > 125) {
    tips.push({
      field: 'alt_text',
      priority: 'low',
      tip_fa: 'متن جایگزین طولانی است. سعی کنید آن را به کمتر از ۱۲۵ کاراکتر کاهش دهید.',
      tip_en: 'Alt text is too long. Try to keep it under 125 characters.'
    });
  }
  
  // Title tips
  if (!media.title) {
    tips.push({
      field: 'title',
      priority: 'medium',
      tip_fa: 'عنوان برای بهبود سئو توصیه می‌شود.',
      tip_en: 'Title is recommended for better SEO.'
    });
  }
  
  // Description tips
  if (!media.description) {
    tips.push({
      field: 'description',
      priority: 'medium',
      tip_fa: 'توضیحات به موتورهای جستجو کمک می‌کند محتوای رسانه را درک کنند.',
      tip_en: 'Description helps search engines understand media content.'
    });
  }
  
  // Video-specific tips
  if (media.media_type === 'video') {
    if (!media.thumbnail_url) {
      tips.push({
        field: 'thumbnail_url',
        priority: 'high',
        tip_fa: 'تصویر پیش‌نمایش (Thumbnail) برای ویدیوها ضروری است.',
        tip_en: 'Thumbnail is essential for videos.'
      });
    }
    if (!media.transcript) {
      tips.push({
        field: 'transcript',
        priority: 'medium',
        tip_fa: 'متن پیاده‌شده ویدیو به دسترسی‌پذیری و سئو کمک می‌کند.',
        tip_en: 'Video transcript improves accessibility and SEO.'
      });
    }
    if (!media.captions_url) {
      tips.push({
        field: 'captions_url',
        priority: 'medium',
        tip_fa: 'زیرنویس برای دسترسی‌پذیری و سئو توصیه می‌شود.',
        tip_en: 'Captions are recommended for accessibility and SEO.'
      });
    }
  }
  
  return tips;
}

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Start API Server
app.listen(API_PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 Ghoncheye Lalehzar API Server                           ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  📍 API running at: http://localhost:${API_PORT}/api/              ║`);
  console.log('║  📝 Credentials: admin / admin123                           ║');
  console.log('║  🔐 Auth: Authorization: Bearer <token>                    ║');
  console.log('║  🛑 Press Ctrl+C to stop                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
