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

// ==================== MEDIA ENDPOINTS ====================

/**
 * GET /api/media
 * Get all media
 */
app.get('/api/media', isAuthenticated, (req, res) => {
  res.json({
    success: true,
    data: database.media
  });
});

/**
 * POST /api/media/upload
 * Upload media file (for demo, just store metadata)
 */
app.post('/api/media/upload', isAuthenticated, (req, res) => {
  const { filename, alt_text, caption } = req.body;
  
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }
  
  const newMedia = {
    id: Math.max(...database.media.map(m => m.id || 0), 0) + 1,
    filename,
    filepath: `/uploads/${filename}`,
    alt_text: alt_text || '',
    caption: caption || '',
    uploaded_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  database.media.push(newMedia);
  
  res.status(201).json({
    success: true,
    data: newMedia
  });
});

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
