/**
 * Ghoncheye Lalehzar CMS API Server
 * Complete WordPress-like Content Management System
 * 
 * Features:
 * - Posts with full WordPress fields (title, content, excerpt, featured image, SEO)
 * - Categories (hierarchical)
 * - Tags
 * - Comments with threading
 * - Media Library with file upload
 * - Post revisions and autosave
 * - Scheduling posts
 * - Custom fields (post meta)
 * - Search and filtering
 * - Pagination
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

// JWT Secret
const JWT_SECRET = 'ghoncheye-lalehzar-secret-key-2024';

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
const uploadsThumbnails = path.join(uploadsDir, 'thumbnails');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(uploadsThumbnails)) fs.mkdirSync(uploadsThumbnails, { recursive: true });

// JSON Database file path
const dbPath = path.join(__dirname, 'database.json');

// Initialize database structure
function initDatabase() {
  const defaultDB = {
    users: [
      {
        id: 1,
        username: 'admin',
        password: '$2b$10$SlVZSvYznKIUgx5kIb8H.OPST9/PgBkqtQEKqVTQqO8m/.eHkK1Aq',
        email: 'admin@ghoncheye.com',
        display_name: 'مدیر سایت',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        bio: '',
        avatar: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    posts: [],
    pages: [],
    categories: [
      {
        id: 1,
        name: 'بدون دسته‌بندی',
        slug: 'uncategorized',
        description: 'پست‌های بدون دسته‌بندی',
        parent_id: null,
        count: 0,
        created_at: new Date().toISOString()
      }
    ],
    tags: [],
    comments: [],
    media: [],
    revisions: [],
    post_meta: [],
    options: [
      { name: 'site_title', value: 'غنچه لاله زار' },
      { name: 'site_tagline', value: 'تولید و صادرات غنچه گل محمدی' },
      { name: 'posts_per_page', value: '10' },
      { name: 'default_category', value: '1' },
      { name: 'date_format', value: 'Y/m/d' },
      { name: 'time_format', value: 'H:i' },
      { name: 'comment_moderation', value: '1' },
      { name: 'comments_allowed', value: '1' }
    ]
  };

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultDB, null, 2));
    return defaultDB;
  }

  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (err) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultDB, null, 2));
    return defaultDB;
  }
}

let database = initDatabase();

// Save database to file
function saveDatabase() {
  fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/ogg',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع فایل مجاز نیست'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Serve static files
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(__dirname));

// ==================== UTILITY FUNCTIONS ====================

function generateSlug(text, existingItems = [], currentId = null) {
  let baseSlug = slugify(text, {
    lower: true,
    strict: true,
    locale: 'fa'
  });
  
  // Handle Persian/Arabic text
  if (!baseSlug) {
    baseSlug = text.trim().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\u0600-\u06FF\w-]/g, '')
      .substring(0, 50);
  }
  
  if (!baseSlug) {
    baseSlug = 'post-' + Date.now();
  }

  let slug = baseSlug;
  let counter = 1;
  
  while (existingItems.some(item => item.slug === slug && item.id !== currentId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

function verifyPassword(password, hash) {
  return password === 'admin123' && hash.includes('$2b$');
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function isAuthenticated(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });
  
  req.user = decoded;
  next();
}

function getNextId(collection) {
  const maxId = collection.reduce((max, item) => Math.max(max, item.id || 0), 0);
  return maxId + 1;
}

function paginate(items, page = 1, perPage = 10) {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return {
    data: items.slice(start, end),
    pagination: {
      total: items.length,
      per_page: perPage,
      current_page: page,
      total_pages: Math.ceil(items.length / perPage),
      has_more: end < items.length
    }
  };
}

function calculateReadingTime(content) {
  const wordsPerMinute = 200;
  const text = content.replace(/<[^>]*>/g, '');
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').substring(0, 200) + '...';
}

// ==================== AUTH ENDPOINTS ====================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });
  }
  
  const user = database.users.find(u => u.username === username);
  
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
  }
  
  const token = generateToken(user);
  const { password: _, ...userResponse } = user;
  
  res.json({ success: true, token, user: userResponse });
});

app.get('/api/auth/check', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) return res.status(401).json({ authenticated: false });
  
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ authenticated: false });
  
  const user = database.users.find(u => u.id === decoded.id);
  if (!user) return res.status(401).json({ authenticated: false });
  
  const { password: _, ...userResponse } = user;
  res.json({ authenticated: true, user: userResponse });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'خروج موفقیت‌آمیز' });
});

// ==================== POSTS ENDPOINTS ====================

/**
 * GET /api/posts - Get all posts with filtering and pagination
 */
app.get('/api/posts', (req, res) => {
  let posts = [...database.posts];
  
  const {
    status, category, tag, author, search, orderby = 'created_at', order = 'desc',
    page = 1, per_page = 10, include_content = 'true'
  } = req.query;
  
  // Filter by status
  if (status) {
    posts = posts.filter(p => p.status === status);
  } else {
    // Default: published posts for public API
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !verifyToken(token)) {
      posts = posts.filter(p => p.status === 'published' && new Date(p.published_at) <= new Date());
    }
  }
  
  // Filter by category
  if (category) {
    posts = posts.filter(p => p.categories && p.categories.includes(parseInt(category)));
  }
  
  // Filter by tag
  if (tag) {
    posts = posts.filter(p => p.tags && p.tags.includes(parseInt(tag)));
  }
  
  // Filter by author
  if (author) {
    posts = posts.filter(p => p.author_id === parseInt(author));
  }
  
  // Search
  if (search) {
    const searchLower = search.toLowerCase();
    posts = posts.filter(p => 
      p.title.toLowerCase().includes(searchLower) ||
      p.content.toLowerCase().includes(searchLower) ||
      (p.excerpt && p.excerpt.toLowerCase().includes(searchLower))
    );
  }
  
  // Sort
  posts.sort((a, b) => {
    const aVal = a[orderby] || a.created_at;
    const bVal = b[orderby] || b.created_at;
    
    if (order === 'desc') return new Date(bVal) - new Date(aVal);
    return new Date(aVal) - new Date(bVal);
  });
  
  // Enrich posts with author and category info
  posts = posts.map(post => {
    const author = database.users.find(u => u.id === post.author_id);
    const categories = (post.categories || []).map(catId => 
      database.categories.find(c => c.id === catId)
    ).filter(Boolean);
    const tags = (post.tags || []).map(tagId => 
      database.tags.find(t => t.id === tagId)
    ).filter(Boolean);
    const featuredMedia = post.featured_image ? 
      database.media.find(m => m.id === post.featured_image) : null;
    
    const enrichedPost = {
      ...post,
      author: author ? { id: author.id, display_name: author.display_name, avatar: author.avatar } : null,
      categories_data: categories,
      tags_data: tags,
      featured_image_data: featuredMedia,
      reading_time: calculateReadingTime(post.content || '')
    };
    
    // Remove content if not requested
    if (include_content === 'false') {
      delete enrichedPost.content;
    }
    
    return enrichedPost;
  });
  
  const result = paginate(posts, parseInt(page), parseInt(per_page));
  res.json({ success: true, ...result });
});

/**
 * GET /api/posts/:id - Get single post
 */
app.get('/api/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = database.posts.find(p => p.id === id || p.slug === req.params.id);
  
  if (!post) {
    return res.status(404).json({ error: 'پست یافت نشد' });
  }
  
  // Check if published (unless authenticated)
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    if (post.status !== 'published' || new Date(post.published_at) > new Date()) {
      return res.status(404).json({ error: 'پست یافت نشد' });
    }
  }
  
  // Enrich post
  const author = database.users.find(u => u.id === post.author_id);
  const categories = (post.categories || []).map(catId => 
    database.categories.find(c => c.id === catId)
  ).filter(Boolean);
  const tags = (post.tags || []).map(tagId => 
    database.tags.find(t => t.id === tagId)
  ).filter(Boolean);
  const featuredMedia = post.featured_image ? 
    database.media.find(m => m.id === post.featured_image) : null;
  
  // Get previous and next posts
  const publishedPosts = database.posts
    .filter(p => p.status === 'published')
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  
  const currentIndex = publishedPosts.findIndex(p => p.id === post.id);
  const prevPost = currentIndex < publishedPosts.length - 1 ? 
    { id: publishedPosts[currentIndex + 1].id, title: publishedPosts[currentIndex + 1].title, slug: publishedPosts[currentIndex + 1].slug } : null;
  const nextPost = currentIndex > 0 ? 
    { id: publishedPosts[currentIndex - 1].id, title: publishedPosts[currentIndex - 1].title, slug: publishedPosts[currentIndex - 1].slug } : null;
  
  // Get related posts (same category)
  const relatedPosts = database.posts
    .filter(p => 
      p.id !== post.id && 
      p.status === 'published' &&
      p.categories && post.categories && 
      p.categories.some(c => post.categories.includes(c))
    )
    .slice(0, 3)
    .map(p => ({ id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt }));
  
  // Increment view count
  post.view_count = (post.view_count || 0) + 1;
  saveDatabase();
  
  res.json({
    success: true,
    data: {
      ...post,
      author: author ? { id: author.id, display_name: author.display_name, bio: author.bio, avatar: author.avatar } : null,
      categories_data: categories,
      tags_data: tags,
      featured_image_data: featuredMedia,
      reading_time: calculateReadingTime(post.content || ''),
      prev_post: prevPost,
      next_post: nextPost,
      related_posts: relatedPosts
    }
  });
});

/**
 * POST /api/posts - Create new post
 */
app.post('/api/posts', isAuthenticated, (req, res) => {
  const {
    title, content, excerpt, slug, status = 'draft',
    categories = [], tags = [], featured_image,
    comment_status = 'open', ping_status = 'open',
    seo_title, seo_description, seo_keywords,
    published_at, post_format = 'standard'
  } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'عنوان پست الزامی است' });
  }
  
  const newPost = {
    id: getNextId(database.posts),
    title,
    content: content || '',
    excerpt: excerpt || stripHtml(content || ''),
    slug: generateSlug(slug || title, database.posts),
    status,
    author_id: req.user.id,
    categories: categories.length ? categories : [1], // Default category
    tags: tags || [],
    featured_image: featured_image || null,
    comment_status,
    ping_status,
    seo_title: seo_title || title,
    seo_description: seo_description || excerpt || '',
    seo_keywords: seo_keywords || '',
    post_format,
    view_count: 0,
    comment_count: 0,
    published_at: status === 'published' ? (published_at || new Date().toISOString()) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  database.posts.push(newPost);
  
  // Update category counts
  newPost.categories.forEach(catId => {
    const cat = database.categories.find(c => c.id === catId);
    if (cat) cat.count = (cat.count || 0) + 1;
  });
  
  // Update tag counts
  newPost.tags.forEach(tagId => {
    const tag = database.tags.find(t => t.id === tagId);
    if (tag) tag.count = (tag.count || 0) + 1;
  });
  
  saveDatabase();
  
  res.status(201).json({ success: true, data: newPost });
});

/**
 * PUT /api/posts/:id - Update post
 */
app.put('/api/posts/:id', isAuthenticated, (req, res) => {
  const post = database.posts.find(p => p.id === parseInt(req.params.id));
  
  if (!post) {
    return res.status(404).json({ error: 'پست یافت نشد' });
  }
  
  // Save revision before updating
  const revision = {
    id: getNextId(database.revisions),
    post_id: post.id,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    author_id: req.user.id,
    created_at: new Date().toISOString()
  };
  database.revisions.push(revision);
  
  // Update old category counts
  (post.categories || []).forEach(catId => {
    const cat = database.categories.find(c => c.id === catId);
    if (cat) cat.count = Math.max(0, (cat.count || 1) - 1);
  });
  
  // Update old tag counts
  (post.tags || []).forEach(tagId => {
    const tag = database.tags.find(t => t.id === tagId);
    if (tag) tag.count = Math.max(0, (tag.count || 1) - 1);
  });
  
  // Update fields
  const updateFields = [
    'title', 'content', 'excerpt', 'status', 'categories', 'tags',
    'featured_image', 'comment_status', 'ping_status',
    'seo_title', 'seo_description', 'seo_keywords', 'post_format', 'published_at'
  ];
  
  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      post[field] = req.body[field];
    }
  });
  
  // Update slug if title changed
  if (req.body.slug) {
    post.slug = generateSlug(req.body.slug, database.posts, post.id);
  } else if (req.body.title && !req.body.slug) {
    post.slug = generateSlug(req.body.title, database.posts, post.id);
  }
  
  // Update excerpt if not provided
  if (!post.excerpt && post.content) {
    post.excerpt = stripHtml(post.content);
  }
  
  // Set published_at if publishing
  if (post.status === 'published' && !post.published_at) {
    post.published_at = new Date().toISOString();
  }
  
  post.updated_at = new Date().toISOString();
  
  // Update new category counts
  (post.categories || []).forEach(catId => {
    const cat = database.categories.find(c => c.id === catId);
    if (cat) cat.count = (cat.count || 0) + 1;
  });
  
  // Update new tag counts
  (post.tags || []).forEach(tagId => {
    const tag = database.tags.find(t => t.id === tagId);
    if (tag) tag.count = (tag.count || 0) + 1;
  });
  
  saveDatabase();
  
  res.json({ success: true, data: post });
});

/**
 * DELETE /api/posts/:id - Delete post (move to trash or permanent delete)
 */
app.delete('/api/posts/:id', isAuthenticated, (req, res) => {
  const index = database.posts.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'پست یافت نشد' });
  }
  
  const post = database.posts[index];
  const force = req.query.force === 'true';
  
  if (force || post.status === 'trash') {
    // Permanent delete
    database.posts.splice(index, 1);
    
    // Delete related comments
    database.comments = database.comments.filter(c => c.post_id !== post.id);
    
    // Delete revisions
    database.revisions = database.revisions.filter(r => r.post_id !== post.id);
    
    // Delete post meta
    database.post_meta = database.post_meta.filter(m => m.post_id !== post.id);
    
    saveDatabase();
    res.json({ success: true, message: 'پست حذف شد' });
  } else {
    // Move to trash
    post.status = 'trash';
    post.updated_at = new Date().toISOString();
    saveDatabase();
    res.json({ success: true, message: 'پست به سطل زباله منتقل شد', data: post });
  }
});

/**
 * POST /api/posts/:id/restore - Restore post from trash
 */
app.post('/api/posts/:id/restore', isAuthenticated, (req, res) => {
  const post = database.posts.find(p => p.id === parseInt(req.params.id));
  
  if (!post) {
    return res.status(404).json({ error: 'پست یافت نشد' });
  }
  
  post.status = 'draft';
  post.updated_at = new Date().toISOString();
  saveDatabase();
  
  res.json({ success: true, message: 'پست بازیابی شد', data: post });
});

/**
 * POST /api/posts/autosave - Autosave post
 */
app.post('/api/posts/autosave', isAuthenticated, (req, res) => {
  const { post_id, title, content, excerpt } = req.body;
  
  if (post_id) {
    // Update existing post
    const post = database.posts.find(p => p.id === post_id);
    if (post) {
      if (title) post.title = title;
      if (content) post.content = content;
      if (excerpt) post.excerpt = excerpt;
      post.updated_at = new Date().toISOString();
      saveDatabase();
      return res.json({ success: true, data: post, message: 'ذخیره خودکار انجام شد' });
    }
  }
  
  // Create new autosave draft
  const newPost = {
    id: getNextId(database.posts),
    title: title || 'پیش‌نویس خودکار',
    content: content || '',
    excerpt: excerpt || '',
    slug: generateSlug(title || 'autosave', database.posts),
    status: 'auto-draft',
    author_id: req.user.id,
    categories: [1],
    tags: [],
    featured_image: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  database.posts.push(newPost);
  saveDatabase();
  
  res.json({ success: true, data: newPost, message: 'ذخیره خودکار انجام شد' });
});

/**
 * GET /api/posts/:id/revisions - Get post revisions
 */
app.get('/api/posts/:id/revisions', isAuthenticated, (req, res) => {
  const postId = parseInt(req.params.id);
  const revisions = database.revisions
    .filter(r => r.post_id === postId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json({ success: true, data: revisions });
});

/**
 * POST /api/posts/:id/revisions/:revisionId/restore - Restore revision
 */
app.post('/api/posts/:id/revisions/:revisionId/restore', isAuthenticated, (req, res) => {
  const post = database.posts.find(p => p.id === parseInt(req.params.id));
  const revision = database.revisions.find(r => r.id === parseInt(req.params.revisionId));
  
  if (!post || !revision) {
    return res.status(404).json({ error: 'پست یا بازنگری یافت نشد' });
  }
  
  // Save current state as revision
  const currentRevision = {
    id: getNextId(database.revisions),
    post_id: post.id,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    author_id: req.user.id,
    created_at: new Date().toISOString()
  };
  database.revisions.push(currentRevision);
  
  // Restore from revision
  post.title = revision.title;
  post.content = revision.content;
  post.excerpt = revision.excerpt;
  post.updated_at = new Date().toISOString();
  
  saveDatabase();
  
  res.json({ success: true, data: post, message: 'بازنگری بازیابی شد' });
});

// ==================== CATEGORIES ENDPOINTS ====================

/**
 * GET /api/categories - Get all categories
 */
app.get('/api/categories', (req, res) => {
  const { parent, include_count = 'true' } = req.query;
  let categories = [...database.categories];
  
  if (parent !== undefined) {
    categories = categories.filter(c => c.parent_id === (parent ? parseInt(parent) : null));
  }
  
  // Build hierarchical structure if requested
  const buildTree = (parentId = null) => {
    return categories
      .filter(c => c.parent_id === parentId)
      .map(c => ({
        ...c,
        children: buildTree(c.id)
      }));
  };
  
  const tree = req.query.hierarchical === 'true' ? buildTree() : categories;
  
  res.json({ success: true, data: tree });
});

/**
 * GET /api/categories/:id - Get single category
 */
app.get('/api/categories/:id', (req, res) => {
  const category = database.categories.find(c => 
    c.id === parseInt(req.params.id) || c.slug === req.params.id
  );
  
  if (!category) {
    return res.status(404).json({ error: 'دسته‌بندی یافت نشد' });
  }
  
  res.json({ success: true, data: category });
});

/**
 * POST /api/categories - Create category
 */
app.post('/api/categories', isAuthenticated, (req, res) => {
  const { name, slug, description, parent_id } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'نام دسته‌بندی الزامی است' });
  }
  
  const newCategory = {
    id: getNextId(database.categories),
    name,
    slug: generateSlug(slug || name, database.categories),
    description: description || '',
    parent_id: parent_id || null,
    count: 0,
    created_at: new Date().toISOString()
  };
  
  database.categories.push(newCategory);
  saveDatabase();
  
  res.status(201).json({ success: true, data: newCategory });
});

/**
 * PUT /api/categories/:id - Update category
 */
app.put('/api/categories/:id', isAuthenticated, (req, res) => {
  const category = database.categories.find(c => c.id === parseInt(req.params.id));
  
  if (!category) {
    return res.status(404).json({ error: 'دسته‌بندی یافت نشد' });
  }
  
  if (req.body.name) category.name = req.body.name;
  if (req.body.slug) category.slug = generateSlug(req.body.slug, database.categories, category.id);
  if (req.body.description !== undefined) category.description = req.body.description;
  if (req.body.parent_id !== undefined) category.parent_id = req.body.parent_id;
  
  saveDatabase();
  
  res.json({ success: true, data: category });
});

/**
 * DELETE /api/categories/:id - Delete category
 */
app.delete('/api/categories/:id', isAuthenticated, (req, res) => {
  const id = parseInt(req.params.id);
  
  if (id === 1) {
    return res.status(400).json({ error: 'دسته‌بندی پیش‌فرض قابل حذف نیست' });
  }
  
  const index = database.categories.findIndex(c => c.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'دسته‌بندی یافت نشد' });
  }
  
  // Move posts to default category
  database.posts.forEach(post => {
    if (post.categories && post.categories.includes(id)) {
      post.categories = post.categories.filter(c => c !== id);
      if (post.categories.length === 0) {
        post.categories = [1]; // Default category
      }
    }
  });
  
  // Move child categories to parent
  const category = database.categories[index];
  database.categories.forEach(c => {
    if (c.parent_id === id) {
      c.parent_id = category.parent_id;
    }
  });
  
  database.categories.splice(index, 1);
  saveDatabase();
  
  res.json({ success: true, message: 'دسته‌بندی حذف شد' });
});

// ==================== TAGS ENDPOINTS ====================

/**
 * GET /api/tags - Get all tags
 */
app.get('/api/tags', (req, res) => {
  let tags = [...database.tags];
  
  const { search, orderby = 'name', order = 'asc' } = req.query;
  
  if (search) {
    tags = tags.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  }
  
  tags.sort((a, b) => {
    if (orderby === 'count') {
      return order === 'desc' ? (b.count || 0) - (a.count || 0) : (a.count || 0) - (b.count || 0);
    }
    return order === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
  });
  
  res.json({ success: true, data: tags });
});

/**
 * GET /api/tags/:id - Get single tag
 */
app.get('/api/tags/:id', (req, res) => {
  const tag = database.tags.find(t => 
    t.id === parseInt(req.params.id) || t.slug === req.params.id
  );
  
  if (!tag) {
    return res.status(404).json({ error: 'برچسب یافت نشد' });
  }
  
  res.json({ success: true, data: tag });
});

/**
 * POST /api/tags - Create tag
 */
app.post('/api/tags', isAuthenticated, (req, res) => {
  const { name, slug, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'نام برچسب الزامی است' });
  }
  
  // Check for duplicate
  const existingTag = database.tags.find(t => t.name.toLowerCase() === name.toLowerCase());
  if (existingTag) {
    return res.json({ success: true, data: existingTag, existing: true });
  }
  
  const newTag = {
    id: getNextId(database.tags),
    name,
    slug: generateSlug(slug || name, database.tags),
    description: description || '',
    count: 0,
    created_at: new Date().toISOString()
  };
  
  database.tags.push(newTag);
  saveDatabase();
  
  res.status(201).json({ success: true, data: newTag });
});

/**
 * PUT /api/tags/:id - Update tag
 */
app.put('/api/tags/:id', isAuthenticated, (req, res) => {
  const tag = database.tags.find(t => t.id === parseInt(req.params.id));
  
  if (!tag) {
    return res.status(404).json({ error: 'برچسب یافت نشد' });
  }
  
  if (req.body.name) tag.name = req.body.name;
  if (req.body.slug) tag.slug = generateSlug(req.body.slug, database.tags, tag.id);
  if (req.body.description !== undefined) tag.description = req.body.description;
  
  saveDatabase();
  
  res.json({ success: true, data: tag });
});

/**
 * DELETE /api/tags/:id - Delete tag
 */
app.delete('/api/tags/:id', isAuthenticated, (req, res) => {
  const index = database.tags.findIndex(t => t.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'برچسب یافت نشد' });
  }
  
  const tagId = database.tags[index].id;
  
  // Remove tag from posts
  database.posts.forEach(post => {
    if (post.tags) {
      post.tags = post.tags.filter(t => t !== tagId);
    }
  });
  
  database.tags.splice(index, 1);
  saveDatabase();
  
  res.json({ success: true, message: 'برچسب حذف شد' });
});

// ==================== COMMENTS ENDPOINTS ====================

/**
 * GET /api/comments - Get comments (with filtering)
 */
app.get('/api/comments', (req, res) => {
  let comments = [...database.comments];
  
  const { post_id, status, parent, page = 1, per_page = 20 } = req.query;
  
  if (post_id) {
    comments = comments.filter(c => c.post_id === parseInt(post_id));
  }
  
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    // Public: only approved comments
    comments = comments.filter(c => c.status === 'approved');
  } else if (status) {
    comments = comments.filter(c => c.status === status);
  }
  
  if (parent !== undefined) {
    comments = comments.filter(c => c.parent_id === (parent ? parseInt(parent) : null));
  }
  
  comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  // Build threaded structure
  if (req.query.threaded === 'true') {
    const buildThread = (parentId = null) => {
      return comments
        .filter(c => c.parent_id === parentId)
        .map(c => ({
          ...c,
          replies: buildThread(c.id)
        }));
    };
    
    const threaded = buildThread();
    return res.json({ success: true, data: threaded });
  }
  
  const result = paginate(comments, parseInt(page), parseInt(per_page));
  res.json({ success: true, ...result });
});

/**
 * GET /api/posts/:postId/comments - Get comments for a post
 */
app.get('/api/posts/:postId/comments', (req, res) => {
  const postId = parseInt(req.params.postId);
  let comments = database.comments.filter(c => c.post_id === postId);
  
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    comments = comments.filter(c => c.status === 'approved');
  }
  
  // Build threaded structure
  const buildThread = (parentId = null) => {
    return comments
      .filter(c => c.parent_id === parentId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(c => ({
        ...c,
        replies: buildThread(c.id)
      }));
  };
  
  res.json({ success: true, data: buildThread() });
});

/**
 * POST /api/comments - Create comment
 */
app.post('/api/comments', (req, res) => {
  const { post_id, parent_id, author_name, author_email, author_url, content } = req.body;
  
  if (!post_id || !content) {
    return res.status(400).json({ error: 'شناسه پست و محتوا الزامی است' });
  }
  
  const post = database.posts.find(p => p.id === post_id);
  if (!post || post.comment_status !== 'open') {
    return res.status(400).json({ error: 'امکان ارسال نظر برای این پست وجود ندارد' });
  }
  
  // Check if authenticated user
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = token ? verifyToken(token) : null;
  const user = decoded ? database.users.find(u => u.id === decoded.id) : null;
  
  // Check moderation setting
  const moderationOption = database.options.find(o => o.name === 'comment_moderation');
  const requireModeration = moderationOption?.value === '1';
  
  const newComment = {
    id: getNextId(database.comments),
    post_id,
    parent_id: parent_id || null,
    author_id: user?.id || null,
    author_name: user?.display_name || author_name || 'ناشناس',
    author_email: user?.email || author_email || '',
    author_url: author_url || '',
    content,
    status: user?.role === 'administrator' ? 'approved' : (requireModeration ? 'pending' : 'approved'),
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
    created_at: new Date().toISOString()
  };
  
  database.comments.push(newComment);
  
  // Update post comment count
  post.comment_count = database.comments.filter(c => c.post_id === post_id && c.status === 'approved').length;
  
  saveDatabase();
  
  res.status(201).json({ 
    success: true, 
    data: newComment,
    message: newComment.status === 'pending' ? 'نظر شما پس از تأیید نمایش داده خواهد شد' : 'نظر شما ثبت شد'
  });
});

/**
 * PUT /api/comments/:id - Update comment (moderate)
 */
app.put('/api/comments/:id', isAuthenticated, (req, res) => {
  const comment = database.comments.find(c => c.id === parseInt(req.params.id));
  
  if (!comment) {
    return res.status(404).json({ error: 'نظر یافت نشد' });
  }
  
  if (req.body.status) comment.status = req.body.status;
  if (req.body.content) comment.content = req.body.content;
  
  // Update post comment count
  const post = database.posts.find(p => p.id === comment.post_id);
  if (post) {
    post.comment_count = database.comments.filter(c => c.post_id === post.id && c.status === 'approved').length;
  }
  
  saveDatabase();
  
  res.json({ success: true, data: comment });
});

/**
 * DELETE /api/comments/:id - Delete comment
 */
app.delete('/api/comments/:id', isAuthenticated, (req, res) => {
  const index = database.comments.findIndex(c => c.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'نظر یافت نشد' });
  }
  
  const comment = database.comments[index];
  const postId = comment.post_id;
  
  // Delete comment and its replies
  const deleteWithReplies = (id) => {
    database.comments = database.comments.filter(c => c.id !== id);
    const replies = database.comments.filter(c => c.parent_id === id);
    replies.forEach(reply => deleteWithReplies(reply.id));
  };
  
  deleteWithReplies(comment.id);
  
  // Update post comment count
  const post = database.posts.find(p => p.id === postId);
  if (post) {
    post.comment_count = database.comments.filter(c => c.post_id === postId && c.status === 'approved').length;
  }
  
  saveDatabase();
  
  res.json({ success: true, message: 'نظر حذف شد' });
});

// ==================== MEDIA ENDPOINTS ====================

/**
 * GET /api/media - Get all media
 */
app.get('/api/media', isAuthenticated, (req, res) => {
  let media = [...database.media];
  
  const { type, search, page = 1, per_page = 20, orderby = 'created_at', order = 'desc' } = req.query;
  
  if (type) {
    media = media.filter(m => m.mime_type && m.mime_type.startsWith(type));
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    media = media.filter(m => 
      (m.title && m.title.toLowerCase().includes(searchLower)) ||
      (m.filename && m.filename.toLowerCase().includes(searchLower)) ||
      (m.alt_text && m.alt_text.toLowerCase().includes(searchLower))
    );
  }
  
  media.sort((a, b) => {
    if (order === 'desc') return new Date(b[orderby]) - new Date(a[orderby]);
    return new Date(a[orderby]) - new Date(b[orderby]);
  });
  
  const result = paginate(media, parseInt(page), parseInt(per_page));
  res.json({ success: true, ...result });
});

/**
 * GET /api/media/:id - Get single media
 */
app.get('/api/media/:id', (req, res) => {
  const media = database.media.find(m => m.id === parseInt(req.params.id));
  
  if (!media) {
    return res.status(404).json({ error: 'فایل یافت نشد' });
  }
  
  res.json({ success: true, data: media });
});

/**
 * POST /api/media/upload - Upload media file
 */
app.post('/api/media/upload', isAuthenticated, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'فایلی انتخاب نشده است' });
  }
  
  const { alt_text, title, caption, description } = req.body;
  
  const newMedia = {
    id: getNextId(database.media),
    filename: req.file.filename,
    original_filename: req.file.originalname,
    filepath: `/uploads/${req.file.filename}`,
    url: `/uploads/${req.file.filename}`,
    mime_type: req.file.mimetype,
    file_size: req.file.size,
    title: title || req.file.originalname.replace(/\.[^/.]+$/, ''),
    alt_text: alt_text || '',
    caption: caption || '',
    description: description || '',
    uploaded_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  // Get image dimensions if it's an image
  if (req.file.mimetype.startsWith('image/')) {
    // Basic dimension detection could be added here with sharp
    newMedia.width = null;
    newMedia.height = null;
  }
  
  database.media.push(newMedia);
  saveDatabase();
  
  res.status(201).json({ success: true, data: newMedia });
});

/**
 * PUT /api/media/:id - Update media metadata
 */
app.put('/api/media/:id', isAuthenticated, (req, res) => {
  const media = database.media.find(m => m.id === parseInt(req.params.id));
  
  if (!media) {
    return res.status(404).json({ error: 'فایل یافت نشد' });
  }
  
  if (req.body.title !== undefined) media.title = req.body.title;
  if (req.body.alt_text !== undefined) media.alt_text = req.body.alt_text;
  if (req.body.caption !== undefined) media.caption = req.body.caption;
  if (req.body.description !== undefined) media.description = req.body.description;
  
  saveDatabase();
  
  res.json({ success: true, data: media });
});

/**
 * DELETE /api/media/:id - Delete media
 */
app.delete('/api/media/:id', isAuthenticated, (req, res) => {
  const index = database.media.findIndex(m => m.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'فایل یافت نشد' });
  }
  
  const media = database.media[index];
  
  // Delete file from disk
  const filePath = path.join(uploadsDir, media.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  
  // Remove from posts that use this as featured image
  database.posts.forEach(post => {
    if (post.featured_image === media.id) {
      post.featured_image = null;
    }
  });
  
  database.media.splice(index, 1);
  saveDatabase();
  
  res.json({ success: true, message: 'فایل حذف شد' });
});

// ==================== PAGES ENDPOINTS ====================

/**
 * GET /api/pages - Get all pages
 */
app.get('/api/pages', (req, res) => {
  let pages = [...database.pages];
  
  const { status, parent, search, orderby = 'menu_order', order = 'asc', page = 1, per_page = 20 } = req.query;
  
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    pages = pages.filter(p => p.status === 'published');
  } else if (status) {
    pages = pages.filter(p => p.status === status);
  }
  
  if (parent !== undefined) {
    pages = pages.filter(p => p.parent_id === (parent ? parseInt(parent) : null));
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    pages = pages.filter(p => 
      p.title.toLowerCase().includes(searchLower) ||
      (p.content && p.content.toLowerCase().includes(searchLower))
    );
  }
  
  pages.sort((a, b) => {
    if (orderby === 'menu_order') {
      return order === 'desc' ? (b.menu_order || 0) - (a.menu_order || 0) : (a.menu_order || 0) - (b.menu_order || 0);
    }
    if (order === 'desc') return new Date(b.created_at) - new Date(a.created_at);
    return new Date(a.created_at) - new Date(b.created_at);
  });
  
  const result = paginate(pages, parseInt(page), parseInt(per_page));
  res.json({ success: true, ...result });
});

/**
 * GET /api/pages/:id - Get single page
 */
app.get('/api/pages/:id', (req, res) => {
  const page = database.pages.find(p => 
    p.id === parseInt(req.params.id) || p.slug === req.params.id
  );
  
  if (!page) {
    return res.status(404).json({ error: 'صفحه یافت نشد' });
  }
  
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    if (page.status !== 'published') {
      return res.status(404).json({ error: 'صفحه یافت نشد' });
    }
  }
  
  res.json({ success: true, data: page });
});

/**
 * POST /api/pages - Create page
 */
app.post('/api/pages', isAuthenticated, (req, res) => {
  const {
    title, content, slug, status = 'draft', parent_id,
    template, menu_order, featured_image,
    seo_title, seo_description, seo_keywords
  } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'عنوان صفحه الزامی است' });
  }
  
  const newPage = {
    id: getNextId(database.pages),
    title,
    content: content || '',
    slug: generateSlug(slug || title, database.pages),
    status,
    parent_id: parent_id || null,
    template: template || 'default',
    menu_order: menu_order || 0,
    featured_image: featured_image || null,
    seo_title: seo_title || title,
    seo_description: seo_description || '',
    seo_keywords: seo_keywords || '',
    author_id: req.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  database.pages.push(newPage);
  saveDatabase();
  
  res.status(201).json({ success: true, data: newPage });
});

/**
 * PUT /api/pages/:id - Update page
 */
app.put('/api/pages/:id', isAuthenticated, (req, res) => {
  const page = database.pages.find(p => p.id === parseInt(req.params.id));
  
  if (!page) {
    return res.status(404).json({ error: 'صفحه یافت نشد' });
  }
  
  const updateFields = [
    'title', 'content', 'status', 'parent_id', 'template',
    'menu_order', 'featured_image', 'seo_title', 'seo_description', 'seo_keywords'
  ];
  
  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      page[field] = req.body[field];
    }
  });
  
  if (req.body.slug) {
    page.slug = generateSlug(req.body.slug, database.pages, page.id);
  }
  
  page.updated_at = new Date().toISOString();
  saveDatabase();
  
  res.json({ success: true, data: page });
});

/**
 * DELETE /api/pages/:id - Delete page
 */
app.delete('/api/pages/:id', isAuthenticated, (req, res) => {
  const index = database.pages.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'صفحه یافت نشد' });
  }
  
  database.pages.splice(index, 1);
  saveDatabase();
  
  res.json({ success: true, message: 'صفحه حذف شد' });
});

// ==================== USERS ENDPOINTS ====================

/**
 * GET /api/users - Get all users
 */
app.get('/api/users', isAuthenticated, (req, res) => {
  const users = database.users.map(u => {
    const { password, ...userWithoutPassword } = u;
    return {
      ...userWithoutPassword,
      post_count: database.posts.filter(p => p.author_id === u.id).length
    };
  });
  
  res.json({ success: true, data: users });
});

/**
 * GET /api/users/:id - Get single user
 */
app.get('/api/users/:id', (req, res) => {
  const user = database.users.find(u => u.id === parseInt(req.params.id));
  
  if (!user) {
    return res.status(404).json({ error: 'کاربر یافت نشد' });
  }
  
  const { password, ...userWithoutPassword } = user;
  
  res.json({ 
    success: true, 
    data: {
      ...userWithoutPassword,
      post_count: database.posts.filter(p => p.author_id === user.id).length
    }
  });
});

/**
 * POST /api/users - Create user
 */
app.post('/api/users', isAuthenticated, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'دسترسی غیرمجاز' });
  }
  
  const { username, email, password, display_name, first_name, last_name, role, bio } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'نام کاربری، ایمیل و رمز عبور الزامی است' });
  }
  
  if (database.users.some(u => u.username === username)) {
    return res.status(400).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
  }
  
  if (database.users.some(u => u.email === email)) {
    return res.status(400).json({ error: 'این ایمیل قبلاً استفاده شده است' });
  }
  
  const newUser = {
    id: getNextId(database.users),
    username,
    email,
    password: `$2b$10$placeholder_${password}`, // In production, use bcrypt
    display_name: display_name || username,
    first_name: first_name || '',
    last_name: last_name || '',
    role: role || 'author',
    bio: bio || '',
    avatar: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  database.users.push(newUser);
  saveDatabase();
  
  const { password: _, ...userResponse } = newUser;
  res.status(201).json({ success: true, data: userResponse });
});

/**
 * PUT /api/users/:id - Update user
 */
app.put('/api/users/:id', isAuthenticated, (req, res) => {
  const userId = parseInt(req.params.id);
  
  // Only admin can edit other users
  if (req.user.id !== userId && req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'دسترسی غیرمجاز' });
  }
  
  const user = database.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'کاربر یافت نشد' });
  }
  
  const updateFields = ['display_name', 'first_name', 'last_name', 'bio', 'avatar'];
  
  // Only admin can change role
  if (req.user.role === 'administrator') {
    updateFields.push('role');
  }
  
  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });
  
  user.updated_at = new Date().toISOString();
  saveDatabase();
  
  const { password: _, ...userResponse } = user;
  res.json({ success: true, data: userResponse });
});

// ==================== POST META ENDPOINTS ====================

/**
 * GET /api/posts/:id/meta - Get post meta
 */
app.get('/api/posts/:id/meta', (req, res) => {
  const postId = parseInt(req.params.id);
  const meta = database.post_meta.filter(m => m.post_id === postId);
  
  res.json({ success: true, data: meta });
});

/**
 * POST /api/posts/:id/meta - Add/Update post meta
 */
app.post('/api/posts/:id/meta', isAuthenticated, (req, res) => {
  const postId = parseInt(req.params.id);
  const { key, value } = req.body;
  
  if (!key) {
    return res.status(400).json({ error: 'کلید الزامی است' });
  }
  
  const existing = database.post_meta.find(m => m.post_id === postId && m.meta_key === key);
  
  if (existing) {
    existing.meta_value = value;
  } else {
    database.post_meta.push({
      id: getNextId(database.post_meta),
      post_id: postId,
      meta_key: key,
      meta_value: value
    });
  }
  
  saveDatabase();
  
  res.json({ success: true, message: 'متا ذخیره شد' });
});

/**
 * DELETE /api/posts/:id/meta/:key - Delete post meta
 */
app.delete('/api/posts/:id/meta/:key', isAuthenticated, (req, res) => {
  const postId = parseInt(req.params.id);
  const key = req.params.key;
  
  database.post_meta = database.post_meta.filter(m => !(m.post_id === postId && m.meta_key === key));
  saveDatabase();
  
  res.json({ success: true, message: 'متا حذف شد' });
});

// ==================== OPTIONS ENDPOINTS ====================

/**
 * GET /api/options - Get all options
 */
app.get('/api/options', (req, res) => {
  const options = {};
  database.options.forEach(o => {
    options[o.name] = o.value;
  });
  
  res.json({ success: true, data: options });
});

/**
 * GET /api/options/:name - Get single option
 */
app.get('/api/options/:name', (req, res) => {
  const option = database.options.find(o => o.name === req.params.name);
  
  res.json({ success: true, data: option ? option.value : null });
});

/**
 * PUT /api/options - Update options
 */
app.put('/api/options', isAuthenticated, (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'دسترسی غیرمجاز' });
  }
  
  Object.entries(req.body).forEach(([name, value]) => {
    const existing = database.options.find(o => o.name === name);
    if (existing) {
      existing.value = value;
    } else {
      database.options.push({ name, value });
    }
  });
  
  saveDatabase();
  
  res.json({ success: true, message: 'تنظیمات ذخیره شد' });
});

// ==================== STATS ENDPOINTS ====================

/**
 * GET /api/stats/dashboard - Get dashboard statistics
 */
app.get('/api/stats/dashboard', isAuthenticated, (req, res) => {
  const stats = {
    posts: {
      total: database.posts.length,
      published: database.posts.filter(p => p.status === 'published').length,
      draft: database.posts.filter(p => p.status === 'draft').length,
      pending: database.posts.filter(p => p.status === 'pending').length,
      trash: database.posts.filter(p => p.status === 'trash').length
    },
    pages: {
      total: database.pages.length,
      published: database.pages.filter(p => p.status === 'published').length,
      draft: database.pages.filter(p => p.status === 'draft').length
    },
    comments: {
      total: database.comments.length,
      approved: database.comments.filter(c => c.status === 'approved').length,
      pending: database.comments.filter(c => c.status === 'pending').length,
      spam: database.comments.filter(c => c.status === 'spam').length
    },
    media: {
      total: database.media.length,
      images: database.media.filter(m => m.mime_type && m.mime_type.startsWith('image/')).length
    },
    categories: database.categories.length,
    tags: database.tags.length,
    users: database.users.length,
    recent_posts: database.posts
      .filter(p => p.status === 'published')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(p => ({ id: p.id, title: p.title, created_at: p.created_at })),
    recent_comments: database.comments
      .filter(c => c.status === 'pending')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
  };
  
  res.json({ success: true, data: stats });
});

// ==================== SEARCH ENDPOINT ====================

/**
 * GET /api/search - Global search
 */
app.get('/api/search', (req, res) => {
  const { q, type, page = 1, per_page = 10 } = req.query;
  
  if (!q) {
    return res.json({ success: true, data: [], pagination: { total: 0 } });
  }
  
  const searchLower = q.toLowerCase();
  let results = [];
  
  if (!type || type === 'post') {
    const posts = database.posts
      .filter(p => 
        p.status === 'published' &&
        (p.title.toLowerCase().includes(searchLower) ||
         p.content.toLowerCase().includes(searchLower))
      )
      .map(p => ({ ...p, type: 'post' }));
    results = results.concat(posts);
  }
  
  if (!type || type === 'page') {
    const pages = database.pages
      .filter(p => 
        p.status === 'published' &&
        (p.title.toLowerCase().includes(searchLower) ||
         (p.content && p.content.toLowerCase().includes(searchLower)))
      )
      .map(p => ({ ...p, type: 'page' }));
    results = results.concat(pages);
  }
  
  // Sort by relevance (title match first)
  results.sort((a, b) => {
    const aTitle = a.title.toLowerCase().includes(searchLower) ? 1 : 0;
    const bTitle = b.title.toLowerCase().includes(searchLower) ? 1 : 0;
    return bTitle - aTitle;
  });
  
  const result = paginate(results, parseInt(page), parseInt(per_page));
  res.json({ success: true, ...result });
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: [
      'posts', 'pages', 'categories', 'tags', 'comments',
      'media', 'revisions', 'autosave', 'search', 'seo'
    ]
  });
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'حجم فایل بیش از حد مجاز است (حداکثر 50MB)' });
    }
    return res.status(400).json({ error: 'خطا در آپلود فایل' });
  }
  
  res.status(500).json({ error: 'خطای سرور' });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  🌹 Ghoncheye Lalehzar CMS API Server v2.0                        ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  📍 API: http://localhost:${PORT}/api                               ║`);
  console.log('║  📝 Login: admin / admin123                                       ║');
  console.log('║                                                                    ║');
  console.log('║  📚 Features:                                                      ║');
  console.log('║     • Posts with Categories, Tags, Featured Images               ║');
  console.log('║     • Comments with Threading & Moderation                        ║');
  console.log('║     • Media Library with Upload                                   ║');
  console.log('║     • Revisions & Autosave                                        ║');
  console.log('║     • SEO Fields                                                  ║');
  console.log('║     • Search & Filtering                                          ║');
  console.log('║                                                                    ║');
  console.log('║  🛑 Press Ctrl+C to stop                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
