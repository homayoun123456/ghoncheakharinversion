/**
 * Ghoncheye Lalehzar Simple API Server
 * No external dependencies - Pure Node.js
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');

const API_PORT = 3001;

// In-memory database
const database = {
  users: [
    {
      id: 1,
      username: 'admin',
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
      title: 'Welcome to Ghoncheye Lalehzar',
      content: 'This is our first post about Persian roses...',
      excerpt: 'Welcome to our new CMS',
      slug: 'welcome',
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
      content: 'We are specialists in Persian rose buds export...',
      slug: 'about',
      status: 'published',
      author_id: 1,
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  media: [],
  categories: [
    {
      id: 1,
      name: 'Uncategorized',
      slug: 'uncategorized',
      description: 'Default category',
      post_count: 1,
      created_at: new Date().toISOString()
    }
  ]
};

// Simple JWT (just for demo)
const JWT_SECRET = 'your-secret-key-change-in-production';

function generateToken(user) {
  // Very simple token format: base64(username.timestamp)
  const payload = `${user.username}.${Date.now()}`;
  return Buffer.from(payload).toString('base64');
}

function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username] = decoded.split('.');
    const user = database.users.find(u => u.username === username);
    return user || null;
  } catch (e) {
    return null;
  }
}

function getUser(token) {
  if (!token) return null;
  // Extract from "Bearer <token>"
  const actualToken = token.replace('Bearer ', '');
  return verifyToken(actualToken);
}

// Response helper
function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, error, status = 400) {
  sendJSON(res, { error }, status);
}

// Main server
const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method;

  // Get authorization token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  const user = getUser(authHeader);

  // Parse request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    let bodyData = {};
    try {
      if (body && method !== 'GET' && method !== 'DELETE') {
        bodyData = JSON.parse(body);
      }
    } catch (e) {
      // Ignore parse errors
    }

    // ==================== AUTH ENDPOINTS ====================
    
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { username, password } = bodyData;

      if (!username || !password) {
        return sendError(res, 'Username and password required', 400);
      }

      if (username === 'admin' && password === 'admin123') {
        const adminUser = database.users[0];
        const token = generateToken(adminUser);

        return sendJSON(res, {
          success: true,
          token: token,
          user: {
            id: adminUser.id,
            username: adminUser.username,
            email: adminUser.email,
            first_name: adminUser.first_name,
            last_name: adminUser.last_name,
            role: adminUser.role
          }
        });
      }

      return sendError(res, 'Invalid credentials', 401);
    }

    if (pathname === '/api/auth/check' && method === 'GET') {
      if (!user) {
        return sendError(res, 'Unauthorized', 401);
      }

      return sendJSON(res, {
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        }
      });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      return sendJSON(res, { success: true, message: 'Logged out' });
    }

    // ==================== POSTS ENDPOINTS ====================

    if (pathname === '/api/posts') {
      if (method === 'GET') {
        if (!user) return sendError(res, 'Unauthorized', 401);
        return sendJSON(res, { success: true, data: database.posts });
      }

      if (method === 'POST') {
        if (!user) return sendError(res, 'Unauthorized', 401);
        const { title, content, excerpt, slug, status } = bodyData;

        if (!title) {
          return sendError(res, 'Title is required', 400);
        }

        const newPost = {
          id: Math.max(...database.posts.map(p => p.id), 0) + 1,
          title,
          content: content || '',
          excerpt: excerpt || '',
          slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
          status: status || 'draft',
          author_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        database.posts.push(newPost);
        return sendJSON(res, { success: true, data: newPost }, 201);
      }
    }

    // POST by ID
    const postMatch = pathname.match(/^\/api\/posts\/(\d+)$/);
    if (postMatch) {
      const postId = parseInt(postMatch[1]);

      if (method === 'GET') {
        if (!user) return sendError(res, 'Unauthorized', 401);
        const post = database.posts.find(p => p.id === postId);
        if (!post) return sendError(res, 'Post not found', 404);
        return sendJSON(res, { success: true, data: post });
      }

      if (method === 'PUT') {
        if (!user) return sendError(res, 'Unauthorized', 401);
        const post = database.posts.find(p => p.id === postId);
        if (!post) return sendError(res, 'Post not found', 404);

        if (bodyData.title) post.title = bodyData.title;
        if (bodyData.content) post.content = bodyData.content;
        if (bodyData.excerpt) post.excerpt = bodyData.excerpt;
        if (bodyData.slug) post.slug = bodyData.slug;
        if (bodyData.status) post.status = bodyData.status;
        post.updated_at = new Date().toISOString();

        return sendJSON(res, { success: true, data: post });
      }

      if (method === 'DELETE') {
        if (!user) return sendError(res, 'Unauthorized', 401);
        const index = database.posts.findIndex(p => p.id === postId);
        if (index === -1) return sendError(res, 'Post not found', 404);
        const deleted = database.posts.splice(index, 1);
        return sendJSON(res, { success: true, message: 'Post deleted', data: deleted[0] });
      }
    }

    // ==================== PAGES ENDPOINTS ====================

    if (pathname === '/api/pages') {
      if (method === 'GET') {
        if (!user) return sendError(res, 'Unauthorized', 401);
        return sendJSON(res, { success: true, data: database.pages });
      }

      if (method === 'POST') {
        if (!user) return sendError(res, 'Unauthorized', 401);
        const { title, content, slug, status } = bodyData;

        if (!title) {
          return sendError(res, 'Title is required', 400);
        }

        const newPage = {
          id: Math.max(...database.pages.map(p => p.id), 0) + 1,
          title,
          content: content || '',
          slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
          status: status || 'draft',
          author_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        database.pages.push(newPage);
        return sendJSON(res, { success: true, data: newPage }, 201);
      }
    }

    // PAGE by ID
    const pageMatch = pathname.match(/^\/api\/pages\/(\d+)$/);
    if (pageMatch) {
      const pageId = parseInt(pageMatch[1]);

      if (method === 'GET') {
        if (!user) return sendError(res, 'Unauthorized', 401);
        const page = database.pages.find(p => p.id === pageId);
        if (!page) return sendError(res, 'Page not found', 404);
        return sendJSON(res, { success: true, data: page });
      }

      if (method === 'PUT') {
        if (!user) return sendError(res, 'Unauthorized', 401);
        const page = database.pages.find(p => p.id === pageId);
        if (!page) return sendError(res, 'Page not found', 404);

        if (bodyData.title) page.title = bodyData.title;
        if (bodyData.content) page.content = bodyData.content;
        if (bodyData.slug) page.slug = bodyData.slug;
        if (bodyData.status) page.status = bodyData.status;
        page.updated_at = new Date().toISOString();

        return sendJSON(res, { success: true, data: page });
      }

      if (method === 'DELETE') {
        if (!user) return sendError(res, 'Unauthorized', 401);
        const index = database.pages.findIndex(p => p.id === pageId);
        if (index === -1) return sendError(res, 'Page not found', 404);
        const deleted = database.pages.splice(index, 1);
        return sendJSON(res, { success: true, message: 'Page deleted', data: deleted[0] });
      }
    }

    // ==================== USERS ENDPOINTS ====================

    if (pathname === '/api/users') {
      if (method === 'GET') {
        if (!user) return sendError(res, 'Unauthorized', 401);
        const users = database.users.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          created_at: u.created_at
        }));
        return sendJSON(res, { success: true, data: users });
      }
    }

    // ==================== MEDIA ENDPOINTS ====================

    if (pathname === '/api/media') {
      if (method === 'GET') {
        if (!user) return sendError(res, 'Unauthorized', 401);
        return sendJSON(res, { success: true, data: database.media });
      }
    }

    if (pathname === '/api/media/upload' && method === 'POST') {
      if (!user) return sendError(res, 'Unauthorized', 401);
      const { filename, alt_text, caption } = bodyData;

      if (!filename) {
        return sendError(res, 'Filename is required', 400);
      }

      const newMedia = {
        id: Math.max(...database.media.map(m => m.id || 0), 0) + 1,
        filename,
        filepath: `/uploads/${filename}`,
        alt_text: alt_text || '',
        caption: caption || '',
        uploaded_by: user.id,
        created_at: new Date().toISOString()
      };

      database.media.push(newMedia);
      return sendJSON(res, { success: true, data: newMedia }, 201);
    }

      // ==================== CATEGORIES ENDPOINTS ====================

      if (pathname === '/api/categories') {
        if (method === 'GET') {
          if (!user) return sendError(res, 'Unauthorized', 401);
          return sendJSON(res, { success: true, data: database.categories });
        }

        if (method === 'POST') {
          if (!user) return sendError(res, 'Unauthorized', 401);
          const { name, description, slug } = bodyData;
          if (!name) return sendError(res, 'Name is required', 400);

          const newCat = {
            id: Math.max(...database.categories.map(c => c.id || 0), 0) + 1,
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            description: description || '',
            post_count: 0,
            created_at: new Date().toISOString()
          };

          database.categories.push(newCat);
          return sendJSON(res, { success: true, data: newCat }, 201);
        }
      }

      const catMatch = pathname.match(/^\/api\/categories\/(\d+)$/);
      if (catMatch) {
        const catId = parseInt(catMatch[1]);

        if (method === 'GET') {
          if (!user) return sendError(res, 'Unauthorized', 401);
          const cat = database.categories.find(c => c.id === catId);
          if (!cat) return sendError(res, 'Category not found', 404);
          return sendJSON(res, { success: true, data: cat });
        }

        if (method === 'PUT') {
          if (!user) return sendError(res, 'Unauthorized', 401);
          const cat = database.categories.find(c => c.id === catId);
          if (!cat) return sendError(res, 'Category not found', 404);

          if (bodyData.name) cat.name = bodyData.name;
          if (bodyData.slug) cat.slug = bodyData.slug;
          if (bodyData.description) cat.description = bodyData.description;

          return sendJSON(res, { success: true, data: cat });
        }

        if (method === 'DELETE') {
          if (!user) return sendError(res, 'Unauthorized', 401);
          const index = database.categories.findIndex(c => c.id === catId);
          if (index === -1) return sendError(res, 'Category not found', 404);
          const deleted = database.categories.splice(index, 1);
          return sendJSON(res, { success: true, message: 'Category deleted', data: deleted[0] });
        }
      }

    // ==================== HEALTH CHECK ====================

    if (pathname === '/api/health') {
      return sendJSON(res, {
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    }

    // 404
    sendError(res, 'Not Found', 404);
  });
});

server.listen(API_PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 Ghoncheye Lalehzar API Server (Pure Node.js)           ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  📍 API running at: http://localhost:${API_PORT}/api/              ║`);
  console.log('║  👤 Login: admin / admin123                                ║');
  console.log('║  🔐 Auth: Authorization: Bearer <token>                    ║');
  console.log('║  🛑 Press Ctrl+C to stop                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
});
