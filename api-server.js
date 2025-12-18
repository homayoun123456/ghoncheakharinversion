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
  media: [],
  plugins: [
    // Pre-installed/recommended plugins
    {
      slug: 'wordpress-seo',
      name: 'Yoast SEO',
      version: '22.0',
      author: 'Team Yoast',
      description: 'بهترین افزونه سئو برای وردپرس. بهینه‌سازی محتوا، نقشه سایت XML، و بسیاری امکانات دیگر.',
      description_en: 'The first true all-in-one SEO solution for WordPress, including on-page content analysis, XML sitemaps and much more.',
      status: 'inactive',
      installed_at: null,
      icon: 'https://ps.w.org/wordpress-seo/assets/icon-256x256.png',
      rating: 4.8,
      downloads: 500000000,
      requires_php: '7.4',
      tested: '6.4',
      homepage: 'https://yoast.com/wordpress/plugins/seo/'
    },
    {
      slug: 'really-simple-ssl',
      name: 'Really Simple SSL',
      version: '7.2.3',
      author: 'Really Simple Plugins',
      description: 'به راحتی SSL/HTTPS را در سایت خود فعال کنید. این افزونه تمام تنظیمات لازم را به صورت خودکار انجام می‌دهد.',
      description_en: 'Easily improve site security with WordPress hardening, vulnerability detection and SSL certificate generation.',
      status: 'inactive',
      installed_at: null,
      icon: 'https://ps.w.org/really-simple-ssl/assets/icon-256x256.png',
      rating: 4.9,
      downloads: 30000000,
      requires_php: '7.4',
      tested: '6.4',
      homepage: 'https://really-simple-ssl.com/'
    }
  ]
};

// Middleware
app.use(cors({
  origin: ['http://localhost:8000', 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
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

// Serve static files from admin directory
app.use('/admin', express.static(path.join(__dirname, 'admin')));

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

// ==================== WORDPRESS PLUGINS ENDPOINTS ====================

// WordPress.org Plugin API URL
const WP_PLUGIN_API = 'https://api.wordpress.org/plugins/info/1.2/';

/**
 * Helper function to fetch from WordPress.org API
 */
async function fetchWordPressPlugins(params) {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const url = new URL(WP_PLUGIN_API);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    https.get(url.toString(), (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * GET /api/plugins
 * Get all installed plugins
 */
app.get('/api/plugins', isAuthenticated, (req, res) => {
  res.json({
    success: true,
    data: database.plugins
  });
});

/**
 * GET /api/plugins/search
 * Search WordPress.org plugin repository
 */
app.get('/api/plugins/search', isAuthenticated, async (req, res) => {
  try {
    const { search, page = 1, per_page = 12 } = req.query;
    
    if (!search) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    const params = {
      action: 'query_plugins',
      'request[search]': search,
      'request[page]': page,
      'request[per_page]': per_page,
      'request[fields][icons]': '1',
      'request[fields][banners]': '1',
      'request[fields][short_description]': '1',
      'request[fields][ratings]': '1',
      'request[fields][downloaded]': '1',
      'request[fields][active_installs]': '1',
      'request[fields][last_updated]': '1',
      'request[fields][requires]': '1',
      'request[fields][requires_php]': '1',
      'request[fields][tested]': '1'
    };
    
    const result = await fetchWordPressPlugins(params);
    
    res.json({
      success: true,
      data: {
        plugins: result.plugins || [],
        info: result.info || {},
        total: result.info?.results || 0,
        pages: result.info?.pages || 1
      }
    });
  } catch (error) {
    console.error('WordPress API Error:', error);
    res.status(500).json({ error: 'Failed to search plugins', message: error.message });
  }
});

/**
 * GET /api/plugins/info/:slug
 * Get detailed plugin information from WordPress.org
 */
app.get('/api/plugins/info/:slug', isAuthenticated, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const params = {
      action: 'plugin_information',
      'request[slug]': slug,
      'request[fields][icons]': '1',
      'request[fields][banners]': '1',
      'request[fields][description]': '1',
      'request[fields][short_description]': '1',
      'request[fields][ratings]': '1',
      'request[fields][downloaded]': '1',
      'request[fields][active_installs]': '1',
      'request[fields][last_updated]': '1',
      'request[fields][requires]': '1',
      'request[fields][requires_php]': '1',
      'request[fields][tested]': '1',
      'request[fields][sections]': '1',
      'request[fields][screenshots]': '1',
      'request[fields][changelog]': '1',
      'request[fields][contributors]': '1',
      'request[fields][homepage]': '1',
      'request[fields][tags]': '1'
    };
    
    const result = await fetchWordPressPlugins(params);
    
    if (!result || result.error) {
      return res.status(404).json({ error: 'Plugin not found' });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('WordPress API Error:', error);
    res.status(500).json({ error: 'Failed to get plugin info', message: error.message });
  }
});

/**
 * GET /api/plugins/popular
 * Get popular plugins from WordPress.org
 */
app.get('/api/plugins/popular', isAuthenticated, async (req, res) => {
  try {
    const { page = 1, per_page = 12 } = req.query;
    
    const params = {
      action: 'query_plugins',
      'request[browse]': 'popular',
      'request[page]': page,
      'request[per_page]': per_page,
      'request[fields][icons]': '1',
      'request[fields][banners]': '1',
      'request[fields][short_description]': '1',
      'request[fields][ratings]': '1',
      'request[fields][downloaded]': '1',
      'request[fields][active_installs]': '1',
      'request[fields][last_updated]': '1',
      'request[fields][requires]': '1',
      'request[fields][requires_php]': '1',
      'request[fields][tested]': '1'
    };
    
    const result = await fetchWordPressPlugins(params);
    
    res.json({
      success: true,
      data: {
        plugins: result.plugins || [],
        info: result.info || {},
        total: result.info?.results || 0,
        pages: result.info?.pages || 1
      }
    });
  } catch (error) {
    console.error('WordPress API Error:', error);
    res.status(500).json({ error: 'Failed to get popular plugins', message: error.message });
  }
});

/**
 * GET /api/plugins/recommended
 * Get recommended plugins (Yoast SEO, Really Simple SSL, etc.)
 */
app.get('/api/plugins/recommended', isAuthenticated, async (req, res) => {
  try {
    const recommendedSlugs = [
      'wordpress-seo',           // Yoast SEO
      'really-simple-ssl',       // Really Simple SSL
      'contact-form-7',          // Contact Form 7
      'elementor',               // Elementor Page Builder
      'woocommerce',             // WooCommerce
      'wordfence',               // Wordfence Security
      'jetpack',                 // Jetpack
      'google-site-kit'          // Site Kit by Google
    ];
    
    const plugins = [];
    
    for (const slug of recommendedSlugs) {
      try {
        const params = {
          action: 'plugin_information',
          'request[slug]': slug,
          'request[fields][icons]': '1',
          'request[fields][banners]': '1',
          'request[fields][short_description]': '1',
          'request[fields][ratings]': '1',
          'request[fields][downloaded]': '1',
          'request[fields][active_installs]': '1',
          'request[fields][requires_php]': '1',
          'request[fields][tested]': '1'
        };
        
        const result = await fetchWordPressPlugins(params);
        if (result && !result.error) {
          plugins.push(result);
        }
      } catch (e) {
        console.log(`Failed to fetch ${slug}:`, e.message);
      }
    }
    
    res.json({
      success: true,
      data: { plugins }
    });
  } catch (error) {
    console.error('WordPress API Error:', error);
    res.status(500).json({ error: 'Failed to get recommended plugins', message: error.message });
  }
});

/**
 * POST /api/plugins/install
 * Install a plugin from WordPress.org
 */
app.post('/api/plugins/install', isAuthenticated, async (req, res) => {
  try {
    const { slug } = req.body;
    
    if (!slug) {
      return res.status(400).json({ error: 'Plugin slug is required' });
    }
    
    // Check if already installed
    const existingPlugin = database.plugins.find(p => p.slug === slug);
    if (existingPlugin && existingPlugin.installed_at) {
      return res.status(400).json({ error: 'Plugin is already installed' });
    }
    
    // Fetch plugin info from WordPress.org
    const params = {
      action: 'plugin_information',
      'request[slug]': slug,
      'request[fields][icons]': '1',
      'request[fields][short_description]': '1',
      'request[fields][ratings]': '1',
      'request[fields][downloaded]': '1',
      'request[fields][requires_php]': '1',
      'request[fields][tested]': '1',
      'request[fields][homepage]': '1'
    };
    
    const pluginInfo = await fetchWordPressPlugins(params);
    
    if (!pluginInfo || pluginInfo.error) {
      return res.status(404).json({ error: 'Plugin not found in WordPress repository' });
    }
    
    // Create or update plugin entry
    const newPlugin = {
      slug: pluginInfo.slug,
      name: pluginInfo.name,
      version: pluginInfo.version,
      author: pluginInfo.author ? pluginInfo.author.replace(/<[^>]*>/g, '') : 'Unknown',
      description: pluginInfo.short_description,
      description_en: pluginInfo.short_description,
      status: 'inactive',
      installed_at: new Date().toISOString(),
      icon: pluginInfo.icons?.['2x'] || pluginInfo.icons?.['1x'] || pluginInfo.icons?.default || '',
      rating: pluginInfo.rating / 20, // WordPress rating is out of 100, convert to 5
      downloads: pluginInfo.downloaded || 0,
      active_installs: pluginInfo.active_installs || 0,
      requires_php: pluginInfo.requires_php || '7.0',
      tested: pluginInfo.tested || '',
      homepage: pluginInfo.homepage || `https://wordpress.org/plugins/${slug}/`,
      download_link: pluginInfo.download_link || ''
    };
    
    // Update or add to database
    const existingIndex = database.plugins.findIndex(p => p.slug === slug);
    if (existingIndex !== -1) {
      database.plugins[existingIndex] = { ...database.plugins[existingIndex], ...newPlugin };
    } else {
      database.plugins.push(newPlugin);
    }
    
    res.json({
      success: true,
      message: `${pluginInfo.name} installed successfully`,
      data: newPlugin
    });
  } catch (error) {
    console.error('Install Error:', error);
    res.status(500).json({ error: 'Failed to install plugin', message: error.message });
  }
});

/**
 * POST /api/plugins/activate
 * Activate an installed plugin
 */
app.post('/api/plugins/activate', isAuthenticated, (req, res) => {
  const { slug } = req.body;
  
  if (!slug) {
    return res.status(400).json({ error: 'Plugin slug is required' });
  }
  
  const plugin = database.plugins.find(p => p.slug === slug);
  
  if (!plugin) {
    return res.status(404).json({ error: 'Plugin not found' });
  }
  
  if (!plugin.installed_at) {
    return res.status(400).json({ error: 'Plugin must be installed first' });
  }
  
  plugin.status = 'active';
  
  res.json({
    success: true,
    message: `${plugin.name} activated successfully`,
    data: plugin
  });
});

/**
 * POST /api/plugins/deactivate
 * Deactivate an active plugin
 */
app.post('/api/plugins/deactivate', isAuthenticated, (req, res) => {
  const { slug } = req.body;
  
  if (!slug) {
    return res.status(400).json({ error: 'Plugin slug is required' });
  }
  
  const plugin = database.plugins.find(p => p.slug === slug);
  
  if (!plugin) {
    return res.status(404).json({ error: 'Plugin not found' });
  }
  
  plugin.status = 'inactive';
  
  res.json({
    success: true,
    message: `${plugin.name} deactivated successfully`,
    data: plugin
  });
});

/**
 * DELETE /api/plugins/:slug
 * Delete/Uninstall a plugin
 */
app.delete('/api/plugins/:slug', isAuthenticated, (req, res) => {
  const { slug } = req.params;
  
  const index = database.plugins.findIndex(p => p.slug === slug);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Plugin not found' });
  }
  
  const plugin = database.plugins[index];
  
  if (plugin.status === 'active') {
    return res.status(400).json({ error: 'Please deactivate the plugin before deleting' });
  }
  
  database.plugins.splice(index, 1);
  
  res.json({
    success: true,
    message: `${plugin.name} deleted successfully`,
    data: plugin
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
