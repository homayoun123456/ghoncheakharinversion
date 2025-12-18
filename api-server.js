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
      permalink: '/2024/12/lorem-ipsum/',
      permalink_structure: '/%year%/%month%/%postname%/',
      custom_permalink: null,
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
      permalink: '/about-us/',
      custom_permalink: null,
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  media: [],
  permalink_settings: {
    post_permalink_structure: '/%year%/%month%/%postname%/',
    page_permalink_structure: '/%pagename%/',
    category_base: 'category',
    tag_base: 'tag',
    use_trailing_slash: '1',
    redirect_old_urls: '1'
  },
  url_redirects: []
};

// ==================== PERMALINK UTILITIES ====================

/**
 * Available permalink structures
 */
const PERMALINK_STRUCTURES = {
  plain: {
    pattern: '/?p=%post_id%',
    label: 'ساده (Plain)',
    label_en: 'Plain',
    example: '/?p=123'
  },
  day_name: {
    pattern: '/%year%/%month%/%day%/%postname%/',
    label: 'روز و نام',
    label_en: 'Day and name',
    example: '/2024/12/18/sample-post/'
  },
  month_name: {
    pattern: '/%year%/%month%/%postname%/',
    label: 'ماه و نام',
    label_en: 'Month and name',
    example: '/2024/12/sample-post/'
  },
  numeric: {
    pattern: '/archives/%post_id%',
    label: 'عددی (Numeric)',
    label_en: 'Numeric',
    example: '/archives/123'
  },
  post_name: {
    pattern: '/%postname%/',
    label: 'نام نوشته (Post name)',
    label_en: 'Post name',
    example: '/sample-post/'
  },
  category_postname: {
    pattern: '/%category%/%postname%/',
    label: 'دسته‌بندی و نام',
    label_en: 'Category and name',
    example: '/news/sample-post/'
  },
  custom: {
    pattern: '',
    label: 'سفارشی (Custom)',
    label_en: 'Custom Structure',
    example: ''
  }
};

/**
 * Generate slug from title (supports Persian/Arabic)
 */
function generateSlug(title) {
  let slug = title.toLowerCase();
  // Keep Persian/Arabic letters, English letters, and numbers
  slug = slug.replace(/[^\u0600-\u06FF\u0750-\u077Fa-z0-9\s-]/g, '');
  slug = slug.replace(/[\s_]+/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-|-$/g, '');
  
  if (!slug) {
    slug = 'post-' + Date.now();
  }
  
  return slug;
}

/**
 * Generate permalink for a post
 */
function generatePostPermalink(post, structure = null) {
  // If post has a custom permalink, use that
  if (post.custom_permalink) {
    return post.custom_permalink;
  }
  
  // If post already has a stored permalink
  if (post.permalink && post.permalink_structure) {
    return post.permalink;
  }
  
  // Get the permalink structure
  if (!structure) {
    structure = database.permalink_settings.post_permalink_structure || '/%year%/%month%/%postname%/';
  }
  
  // Parse the date
  const createdAt = new Date(post.created_at || Date.now());
  const year = createdAt.getFullYear();
  const month = String(createdAt.getMonth() + 1).padStart(2, '0');
  const day = String(createdAt.getDate()).padStart(2, '0');
  
  // Generate slug if not exists
  const slug = post.slug || generateSlug(post.title);
  
  // Replace placeholders
  let permalink = structure
    .replace('%year%', year)
    .replace('%month%', month)
    .replace('%day%', day)
    .replace('%postname%', slug)
    .replace('%post_id%', post.id || 0)
    .replace('%category%', 'uncategorized')
    .replace('%author%', 'author');
  
  // Clean up double slashes
  permalink = permalink.replace(/\/+/g, '/');
  
  // Handle trailing slash
  const useTrailingSlash = database.permalink_settings.use_trailing_slash === '1';
  if (useTrailingSlash && !permalink.endsWith('/')) {
    permalink += '/';
  } else if (!useTrailingSlash && permalink.endsWith('/')) {
    permalink = permalink.slice(0, -1);
  }
  
  // Ensure starts with /
  if (!permalink.startsWith('/')) {
    permalink = '/' + permalink;
  }
  
  return permalink;
}

/**
 * Generate permalink for a page
 */
function generatePagePermalink(page) {
  // If page has a custom permalink, use that
  if (page.custom_permalink) {
    return page.custom_permalink;
  }
  
  // If page already has a stored permalink
  if (page.permalink) {
    return page.permalink;
  }
  
  const structure = database.permalink_settings.page_permalink_structure || '/%pagename%/';
  
  // Generate slug if not exists
  const slug = page.slug || generateSlug(page.title);
  
  let permalink = structure
    .replace('%pagename%', slug)
    .replace('%page_id%', page.id || 0);
  
  // Clean up double slashes
  permalink = permalink.replace(/\/+/g, '/');
  
  // Handle trailing slash
  const useTrailingSlash = database.permalink_settings.use_trailing_slash === '1';
  if (useTrailingSlash && !permalink.endsWith('/')) {
    permalink += '/';
  } else if (!useTrailingSlash && permalink.endsWith('/')) {
    permalink = permalink.slice(0, -1);
  }
  
  // Ensure starts with /
  if (!permalink.startsWith('/')) {
    permalink = '/' + permalink;
  }
  
  return permalink;
}

/**
 * Sanitize permalink URL
 */
function sanitizePermalink(url) {
  // Ensure starts with /
  if (!url.startsWith('/')) {
    url = '/' + url;
  }
  
  // Remove query strings
  url = url.split('?')[0];
  
  // Clean up double slashes
  url = url.replace(/\/+/g, '/');
  
  // Remove dangerous characters
  url = url.replace(/[<>"'\\]/g, '');
  
  return url;
}

/**
 * Check if permalink is unique
 */
function isPermalinkUnique(permalink, contentType = 'post', excludeId = null) {
  if (contentType === 'post') {
    return !database.posts.some(p => 
      (p.permalink === permalink || p.custom_permalink === permalink) && 
      p.id !== excludeId
    );
  } else {
    return !database.pages.some(p => 
      (p.permalink === permalink || p.custom_permalink === permalink) && 
      p.id !== excludeId
    );
  }
}

/**
 * Ensure permalink is unique
 */
function ensureUniquePermalink(permalink, contentType = 'post', excludeId = null) {
  const originalPermalink = permalink;
  let counter = 1;
  
  while (!isPermalinkUnique(permalink, contentType, excludeId)) {
    const base = originalPermalink.replace(/\/$/, '');
    permalink = base + '-' + counter;
    
    if (originalPermalink.endsWith('/')) {
      permalink += '/';
    }
    
    counter++;
    
    if (counter > 100) {
      permalink = base + '-' + Date.now();
      break;
    }
  }
  
  return permalink;
}

/**
 * Add URL redirect
 */
function addUrlRedirect(oldUrl, newUrl, contentType = null, contentId = null, redirectType = 301) {
  if (oldUrl === newUrl) return false;
  
  const existingIndex = database.url_redirects.findIndex(r => r.old_url === oldUrl);
  
  if (existingIndex >= 0) {
    database.url_redirects[existingIndex] = {
      ...database.url_redirects[existingIndex],
      new_url: newUrl,
      redirect_type: redirectType,
      content_type: contentType,
      content_id: contentId
    };
  } else {
    database.url_redirects.push({
      id: Math.max(...database.url_redirects.map(r => r.id || 0), 0) + 1,
      old_url: oldUrl,
      new_url: newUrl,
      redirect_type: redirectType,
      content_type: contentType,
      content_id: contentId,
      created_at: new Date().toISOString()
    });
  }
  
  return true;
}

/**
 * Resolve URL to content
 */
function resolveUrl(url) {
  url = sanitizePermalink(url);
  
  // Check for redirects
  const redirect = database.url_redirects.find(r => r.old_url === url);
  if (redirect) {
    return {
      type: 'redirect',
      redirect_to: redirect.new_url,
      redirect_type: redirect.redirect_type,
      content_type: redirect.content_type,
      content_id: redirect.content_id
    };
  }
  
  // Try to find in posts
  const post = database.posts.find(p => 
    p.permalink === url || p.custom_permalink === url
  );
  if (post) {
    return { type: 'post', content: post };
  }
  
  // Try to find in pages
  const page = database.pages.find(p => 
    p.permalink === url || p.custom_permalink === url
  );
  if (page) {
    return { type: 'page', content: page };
  }
  
  // Try to match by slug
  const urlParts = url.replace(/^\/|\/$/g, '').split('/');
  const potentialSlug = urlParts[urlParts.length - 1];
  
  if (potentialSlug) {
    const postBySlug = database.posts.find(p => p.slug === potentialSlug);
    if (postBySlug) {
      return { type: 'post', content: postBySlug };
    }
    
    const pageBySlug = database.pages.find(p => p.slug === potentialSlug);
    if (pageBySlug) {
      return { type: 'page', content: pageBySlug };
    }
  }
  
  return { type: 'not_found' };
}

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
  const { title, content, excerpt, slug, status, custom_permalink } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const postSlug = slug || generateSlug(title);
  const permalinkStructure = database.permalink_settings.post_permalink_structure;
  
  const newPost = {
    id: Math.max(...database.posts.map(p => p.id), 0) + 1,
    title,
    content: content || '',
    excerpt: excerpt || '',
    slug: postSlug,
    status: status || 'draft',
    author_id: req.user.id,
    permalink: '',
    permalink_structure: permalinkStructure,
    custom_permalink: custom_permalink ? sanitizePermalink(custom_permalink) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Generate permalink
  let permalink = custom_permalink 
    ? sanitizePermalink(custom_permalink) 
    : generatePostPermalink(newPost, permalinkStructure);
  
  permalink = ensureUniquePermalink(permalink, 'post', newPost.id);
  newPost.permalink = permalink;
  
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
  
  const oldPermalink = post.permalink;
  const oldSlug = post.slug;
  
  // Update fields
  if (req.body.title) post.title = req.body.title;
  if (req.body.content) post.content = req.body.content;
  if (req.body.excerpt) post.excerpt = req.body.excerpt;
  if (req.body.slug) post.slug = req.body.slug;
  if (req.body.status) post.status = req.body.status;
  
  // Handle custom permalink
  if (req.body.custom_permalink !== undefined) {
    if (req.body.custom_permalink) {
      const newCustomPermalink = sanitizePermalink(req.body.custom_permalink);
      const uniquePermalink = ensureUniquePermalink(newCustomPermalink, 'post', post.id);
      
      // Add redirect from old URL
      if (oldPermalink && oldPermalink !== uniquePermalink) {
        const shouldRedirect = database.permalink_settings.redirect_old_urls === '1';
        if (shouldRedirect) {
          addUrlRedirect(oldPermalink, uniquePermalink, 'post', post.id);
        }
      }
      
      post.custom_permalink = uniquePermalink;
      post.permalink = uniquePermalink;
    } else {
      // Clear custom permalink, regenerate
      post.custom_permalink = null;
      const newPermalink = generatePostPermalink(post, post.permalink_structure);
      const uniquePermalink = ensureUniquePermalink(newPermalink, 'post', post.id);
      
      if (oldPermalink && oldPermalink !== uniquePermalink) {
        const shouldRedirect = database.permalink_settings.redirect_old_urls === '1';
        if (shouldRedirect) {
          addUrlRedirect(oldPermalink, uniquePermalink, 'post', post.id);
        }
      }
      
      post.permalink = uniquePermalink;
    }
  } else if (req.body.slug && req.body.slug !== oldSlug && !post.custom_permalink) {
    // Slug changed, regenerate permalink
    const newPermalink = generatePostPermalink(post, post.permalink_structure);
    const uniquePermalink = ensureUniquePermalink(newPermalink, 'post', post.id);
    
    if (oldPermalink && oldPermalink !== uniquePermalink) {
      const shouldRedirect = database.permalink_settings.redirect_old_urls === '1';
      if (shouldRedirect) {
        addUrlRedirect(oldPermalink, uniquePermalink, 'post', post.id);
      }
    }
    
    post.permalink = uniquePermalink;
  }
  
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
  const { title, content, slug, status, custom_permalink } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const pageSlug = slug || generateSlug(title);
  
  const newPage = {
    id: Math.max(...database.pages.map(p => p.id), 0) + 1,
    title,
    content: content || '',
    slug: pageSlug,
    status: status || 'draft',
    author_id: req.user.id,
    permalink: '',
    custom_permalink: custom_permalink ? sanitizePermalink(custom_permalink) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Generate permalink
  let permalink = custom_permalink 
    ? sanitizePermalink(custom_permalink) 
    : generatePagePermalink(newPage);
  
  permalink = ensureUniquePermalink(permalink, 'page', newPage.id);
  newPage.permalink = permalink;
  
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
  
  const oldPermalink = page.permalink;
  const oldSlug = page.slug;
  
  // Update fields
  if (req.body.title) page.title = req.body.title;
  if (req.body.content) page.content = req.body.content;
  if (req.body.slug) page.slug = req.body.slug;
  if (req.body.status) page.status = req.body.status;
  
  // Handle custom permalink
  if (req.body.custom_permalink !== undefined) {
    if (req.body.custom_permalink) {
      const newCustomPermalink = sanitizePermalink(req.body.custom_permalink);
      const uniquePermalink = ensureUniquePermalink(newCustomPermalink, 'page', page.id);
      
      // Add redirect from old URL
      if (oldPermalink && oldPermalink !== uniquePermalink) {
        const shouldRedirect = database.permalink_settings.redirect_old_urls === '1';
        if (shouldRedirect) {
          addUrlRedirect(oldPermalink, uniquePermalink, 'page', page.id);
        }
      }
      
      page.custom_permalink = uniquePermalink;
      page.permalink = uniquePermalink;
    } else {
      // Clear custom permalink, regenerate
      page.custom_permalink = null;
      const newPermalink = generatePagePermalink(page);
      const uniquePermalink = ensureUniquePermalink(newPermalink, 'page', page.id);
      
      if (oldPermalink && oldPermalink !== uniquePermalink) {
        const shouldRedirect = database.permalink_settings.redirect_old_urls === '1';
        if (shouldRedirect) {
          addUrlRedirect(oldPermalink, uniquePermalink, 'page', page.id);
        }
      }
      
      page.permalink = uniquePermalink;
    }
  } else if (req.body.slug && req.body.slug !== oldSlug && !page.custom_permalink) {
    // Slug changed, regenerate permalink
    const newPermalink = generatePagePermalink(page);
    const uniquePermalink = ensureUniquePermalink(newPermalink, 'page', page.id);
    
    if (oldPermalink && oldPermalink !== uniquePermalink) {
      const shouldRedirect = database.permalink_settings.redirect_old_urls === '1';
      if (shouldRedirect) {
        addUrlRedirect(oldPermalink, uniquePermalink, 'page', page.id);
      }
    }
    
    page.permalink = uniquePermalink;
  }
  
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

// ==================== PERMALINK ENDPOINTS ====================

/**
 * GET /api/permalinks/settings
 * Get permalink settings and available structures
 */
app.get('/api/permalinks/settings', isAuthenticated, (req, res) => {
  res.json({
    success: true,
    settings: database.permalink_settings,
    structures: PERMALINK_STRUCTURES
  });
});

/**
 * PUT /api/permalinks/settings
 * Update permalink settings
 */
app.put('/api/permalinks/settings', isAuthenticated, (req, res) => {
  const updated = [];
  
  for (const [key, value] of Object.entries(req.body)) {
    if (key in database.permalink_settings) {
      database.permalink_settings[key] = value;
      updated.push(key);
    }
  }
  
  res.json({
    success: true,
    message: 'Permalink settings updated',
    updated: updated
  });
});

/**
 * GET /api/permalinks/structures
 * Get available permalink structures
 */
app.get('/api/permalinks/structures', isAuthenticated, (req, res) => {
  res.json({
    success: true,
    structures: PERMALINK_STRUCTURES
  });
});

/**
 * POST /api/permalinks/preview
 * Preview a permalink without saving
 */
app.post('/api/permalinks/preview', isAuthenticated, (req, res) => {
  const { title, slug, content_type, structure, id, created_at } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const data = {
    id: id || 0,
    title,
    slug: slug || generateSlug(title),
    created_at: created_at || new Date().toISOString()
  };
  
  let permalink;
  if (content_type === 'page') {
    permalink = generatePagePermalink(data);
  } else {
    permalink = generatePostPermalink(data, structure);
  }
  
  const protocol = req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  res.json({
    success: true,
    permalink: permalink,
    full_url: baseUrl + permalink
  });
});

/**
 * POST /api/permalinks/generate
 * Regenerate permalinks for all posts/pages
 */
app.post('/api/permalinks/generate', isAuthenticated, (req, res) => {
  const { content_type, structure, preserve_existing } = req.body;
  const contentType = content_type || 'all';
  const preserveExisting = preserve_existing !== false;
  
  let updated = 0;
  let redirectsCreated = 0;
  
  // Update posts
  if (contentType === 'post' || contentType === 'all') {
    const postsToUpdate = preserveExisting 
      ? database.posts.filter(p => !p.custom_permalink)
      : database.posts;
    
    const permalinkStructure = structure || database.permalink_settings.post_permalink_structure;
    
    postsToUpdate.forEach(post => {
      const oldPermalink = post.permalink;
      const newPermalink = generatePostPermalink({ ...post, permalink: null }, permalinkStructure);
      const uniquePermalink = ensureUniquePermalink(newPermalink, 'post', post.id);
      
      if (oldPermalink && oldPermalink !== uniquePermalink) {
        const shouldRedirect = database.permalink_settings.redirect_old_urls === '1';
        if (shouldRedirect) {
          addUrlRedirect(oldPermalink, uniquePermalink, 'post', post.id);
          redirectsCreated++;
        }
      }
      
      post.permalink = uniquePermalink;
      post.permalink_structure = permalinkStructure;
      updated++;
    });
  }
  
  // Update pages
  if (contentType === 'page' || contentType === 'all') {
    const pagesToUpdate = preserveExisting 
      ? database.pages.filter(p => !p.custom_permalink)
      : database.pages;
    
    pagesToUpdate.forEach(page => {
      const oldPermalink = page.permalink;
      const newPermalink = generatePagePermalink({ ...page, permalink: null });
      const uniquePermalink = ensureUniquePermalink(newPermalink, 'page', page.id);
      
      if (oldPermalink && oldPermalink !== uniquePermalink) {
        const shouldRedirect = database.permalink_settings.redirect_old_urls === '1';
        if (shouldRedirect) {
          addUrlRedirect(oldPermalink, uniquePermalink, 'page', page.id);
          redirectsCreated++;
        }
      }
      
      page.permalink = uniquePermalink;
      updated++;
    });
  }
  
  res.json({
    success: true,
    message: 'Permalinks regenerated successfully',
    updated: updated,
    redirects_created: redirectsCreated
  });
});

/**
 * POST /api/resolve
 * Resolve a URL to content
 */
app.post('/api/resolve', (req, res) => {
  const url = req.body.url || req.query.url;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  const result = resolveUrl(url);
  
  res.json({
    success: true,
    result: result
  });
});

/**
 * GET /api/resolve
 * Resolve a URL to content
 */
app.get('/api/resolve', (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  const result = resolveUrl(url);
  
  res.json({
    success: true,
    result: result
  });
});

// ==================== URL REDIRECTS ENDPOINTS ====================

/**
 * GET /api/redirects
 * Get all URL redirects
 */
app.get('/api/redirects', isAuthenticated, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  
  const totalItems = database.url_redirects.length;
  const redirects = database.url_redirects.slice(offset, offset + limit);
  
  res.json({
    success: true,
    redirects: redirects,
    pagination: {
      current_page: page,
      per_page: limit,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit)
    }
  });
});

/**
 * POST /api/redirects
 * Create new redirect
 */
app.post('/api/redirects', isAuthenticated, (req, res) => {
  const { old_url, new_url, redirect_type, content_type, content_id } = req.body;
  
  if (!old_url || !new_url) {
    return res.status(400).json({ error: 'old_url and new_url are required' });
  }
  
  if (addUrlRedirect(
    sanitizePermalink(old_url), 
    sanitizePermalink(new_url), 
    content_type, 
    content_id, 
    redirect_type || 301
  )) {
    res.json({
      success: true,
      message: 'Redirect created successfully'
    });
  } else {
    res.status(500).json({ error: 'Failed to create redirect' });
  }
});

/**
 * DELETE /api/redirects/:id
 * Delete a redirect
 */
app.delete('/api/redirects/:id', isAuthenticated, (req, res) => {
  const index = database.url_redirects.findIndex(r => r.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Redirect not found' });
  }
  
  database.url_redirects.splice(index, 1);
  
  res.json({
    success: true,
    message: 'Redirect deleted successfully'
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
