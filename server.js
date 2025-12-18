const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const BASE_DIR = __dirname;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // If root, serve index.html
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  // Build file path
  let filePath = path.join(BASE_DIR, pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Check if file/directory exists
  fs.stat(filePath, (err, stats) => {
    if (err) {
      // Try to serve index.html for directories
      if (pathname.endsWith('/')) {
        filePath = path.join(filePath, 'index.html');
      } else {
        // Try adding .html
        fs.stat(filePath + '.html', (err2, stats2) => {
          if (!err2) {
            filePath = filePath + '.html';
            serveFile();
          } else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - File Not Found</h1><p>Path: ' + pathname + '</p>');
          }
        });
        return;
      }
      serveFile();
      return;
    }

    if (stats.isDirectory()) {
      // Try to serve index.html from directory
      filePath = path.join(filePath, 'index.html');
      fs.stat(filePath, (err2) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<h1>404 - No index.html in directory</h1>');
        } else {
          serveFile();
        }
      });
    } else {
      serveFile();
    }
  });

  function serveFile() {
    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 - Server Error: ' + err.message);
        return;
      }

      // Set headers
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
        'Cache-Control': 'no-cache'
      });

      res.end(content);
    });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 Ghoncheye Lalehzar CMS - Development Server            ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  📍 Server running at: http://localhost:${PORT}                     ║`);
  console.log('║  📝 Login: admin / admin123                                ║');
  console.log('║  🔓 Admin Panel: http://localhost:' + PORT + '/admin/login.html           ║');
  console.log('║  🛑 Press Ctrl+C to stop                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⏳ Waiting for requests...\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Try another port:`);
    console.error(`   node server.js --port 8001`);
  } else {
    console.error('❌ Server error:', err);
  }
});
