<?php
// api.php - Main API endpoint handler
require_once 'config.php';
require_once 'permalink.php';

// Parse the request
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];

// Remove query string from URI
$fullPath = $requestUri;
if ($queryStringPos = strpos($requestUri, '?')) {
    $fullPath = substr($requestUri, 0, $queryStringPos);
    $queryString = substr($requestUri, $queryStringPos + 1);
} else {
    $queryString = '';
}

// Extract API path (remove base path)
$basePath = dirname($_SERVER['SCRIPT_NAME']);
$apiPath = str_replace($basePath, '', $fullPath);

// Remove leading slash
$apiPath = ltrim($apiPath, '/');
$originalPath = $apiPath; // Keep original path for route detection

// Check if this is a path-based request (e.g., api.php/auth/login) or query-based (e.g., api.php?posts)
if (strpos($apiPath, 'api.php') !== false) {
    // Remove 'api.php' from the path if present
    $apiPath = str_replace('api.php', '', $apiPath);
    $apiPath = ltrim($apiPath, '/');
}

// Split the path into segments
$pathSegments = explode('/', $apiPath);
$resource = isset($pathSegments[0]) ? $pathSegments[0] : null;
$id = isset($pathSegments[1]) ? $pathSegments[1] : null;

// Handle query string parameters as fallback
if (!$resource && $queryString) {
    // Split query string to get first parameter as resource
    parse_str($queryString, $queryArray);
    $resource = key($queryArray);

    // If resource exists in query, extract additional parameters
    if ($resource) {
        $id = null; // We'll determine this from the request method and resource
    }
}

// Determine if authentication is required for this request
$isAuthRequest = ($resource === 'auth' || isset($_GET['auth'])) &&
                 in_array($_GET['auth'] ?? ($pathSegments[1] ?? null), ['login', 'check', 'logout']);

if (!$isAuthRequest) {
    if (!isAuthenticated()) {
        sendJsonResponse(['error' => 'Unauthorized'], 401);
    }
}

// Handle requests based on resource - enhanced to support both path and query formats
// Special handling for auth via query parameters (e.g., ?auth=login)
if (isset($_GET['auth'])) {
    $authAction = $_GET['auth'];
    $pathSegments = ['auth', $authAction]; // Simulate path segments for auth action
    handleAuth($pathSegments);
}
// For resource-based queries (e.g., ?posts, ?posts=123)
elseif ($resource === 'auth') {
    handleAuth($pathSegments);
} elseif ($resource === 'posts' || (isset($_GET['posts']) && !$resource)) {
    $targetResource = $resource ?: 'posts';
    // Handle both ?posts and ?posts=ID cases
    $targetId = null;
    if (isset($_GET['posts']) && $_GET['posts'] !== '') {
        $targetId = $_GET['posts'] === 'login' || $_GET['posts'] === 'check' || $_GET['posts'] === 'logout' ? null : $_GET['posts'];
    } else {
        $targetId = $id;
    }
    handlePosts($requestMethod, $targetId);
} elseif ($resource === 'pages' || (isset($_GET['pages']) && !$resource)) {
    $targetResource = $resource ?: 'pages';
    $targetId = isset($_GET['pages']) && is_numeric($_GET['pages']) ? $_GET['pages'] : $id;
    handlePages($requestMethod, $targetId);
} elseif ($resource === 'users' || (isset($_GET['users']) && !$resource)) {
    $targetResource = $resource ?: 'users';
    $targetId = isset($_GET['users']) && is_numeric($_GET['users']) ? $_GET['users'] : $id;
    handleUsers($requestMethod, $targetId);
} elseif ($resource === 'media' || (isset($_GET['media']) && !$resource)) {
    $targetResource = $resource ?: 'media';
    // Special case for upload
    if (isset($_GET['media']) && $_GET['media'] === 'upload') {
        // Call uploadMedia directly since it's already defined in the media section
        if ($requestMethod === 'POST') {
            uploadMedia();
        } else {
            sendJsonResponse(['error' => 'Upload requires POST method'], 405);
        }
    } else {
        $targetId = isset($_GET['media']) && is_numeric($_GET['media']) ? $_GET['media'] : $id;
        handleMedia($requestMethod, $targetId);
    }
} elseif ($resource === 'settings' || (isset($_GET['settings']) && !$resource)) {
    $targetResource = $resource ?: 'settings';
    $targetId = isset($_GET['settings']) && is_numeric($_GET['settings']) ? $_GET['settings'] : $id;
    handleSettings($requestMethod, $targetId);
} elseif ($resource === 'categories' || (isset($_GET['categories']) && !$resource)) {
    // Categories functionality - may be implemented separately or return empty for now
    handleCategories($requestMethod, $id);
} elseif ($resource === 'permalinks' || (isset($_GET['permalinks']) && !$resource)) {
    // Permalink management
    $action = isset($_GET['permalinks']) && !is_numeric($_GET['permalinks']) ? $_GET['permalinks'] : $id;
    handlePermalinks($requestMethod, $action);
} elseif ($resource === 'resolve' || (isset($_GET['resolve']) && !$resource)) {
    // URL resolution
    handleUrlResolve();
} elseif ($resource === 'redirects' || (isset($_GET['redirects']) && !$resource)) {
    // URL redirects management
    $targetId = isset($_GET['redirects']) && is_numeric($_GET['redirects']) ? $_GET['redirects'] : $id;
    handleRedirects($requestMethod, $targetId);
} else {
    sendJsonResponse(['error' => 'Endpoint not found'], 404);
}

// Authentication handlers
function handleAuth($pathSegments) {
    // Determine action from either path segments or query parameters
    $action = isset($pathSegments[1]) ? $pathSegments[1] : null;

    // If action is still null, try to get it from $_GET
    if (!$action && isset($_GET['auth'])) {
        $action = $_GET['auth'];
    }

    switch ($action) {
        case 'login':
            handleLogin();
            break;
        case 'logout':
            handleLogout();
            break;
        case 'check':
            handleAuthCheck();
            break;
        default:
            sendJsonResponse(['error' => 'Auth endpoint not found'], 404);
            break;
    }
}

function handleLogin() {
    global $pdo;

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonResponse(['error' => 'Method not allowed'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['username']) || !isset($input['password'])) {
        sendJsonResponse(['error' => 'Username and password required'], 400);
    }

    $username = $input['username'];
    $password = $input['password'];

    try {
        $stmt = $pdo->prepare("SELECT id, username, password, email, first_name, last_name, role FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_user'] = [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'role' => $user['role']
            ];

            // Generate JWT token for API requests
            $token = generateJWTToken($user);

            sendJsonResponse([
                'success' => true,
                'token' => $token,
                'user' => $_SESSION['admin_user']
            ]);
        } else {
            // Log failed login attempts (security measure)
            error_log("Failed login attempt for username: " . sanitizeForLog($username));
            sendJsonResponse(['error' => 'Invalid credentials'], 401);
        }
    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        sendJsonResponse(['error' => 'An error occurred during login'], 500);
    }
}

/**
 * Generate a JWT token for the authenticated user
 */
function generateJWTToken($user) {
    $secret = $_ENV['JWT_SECRET'] ?? 'your-secret-key-change-in-production';
    $issuedAt = time();
    $expire = $issuedAt + (24 * 60 * 60); // 24 hours
    
    $payload = [
        'iss' => 'Ghoncheye Lalehzar',
        'aud' => 'admin-panel',
        'iat' => $issuedAt,
        'exp' => $expire,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role']
        ]
    ];
    
    // Simple JWT encoding (use firebase/jwt library in production)
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode($payload);
    
    $headerEncoded = base64url_encode($header);
    $payloadEncoded = base64url_encode($payload);
    
    $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", $secret, true);
    $signatureEncoded = base64url_encode($signature);
    
    return "$headerEncoded.$payloadEncoded.$signatureEncoded";
}

/**
 * Utility function for base64url encoding
 */
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Sanitize data for logging
 */
function sanitizeForLog($data) {
    return preg_replace('/[^a-zA-Z0-9._-]/', '*', $data);
}

function handleLogout() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    session_destroy();
    session_start();
    
    sendJsonResponse(['success' => true, 'message' => 'Logged out successfully']);
}

function handleAuthCheck() {
    if (isAuthenticated()) {
        $user = getCurrentUser();
        sendJsonResponse([
            'authenticated' => true,
            'user' => $user ?: $_SESSION['admin_user'] ?? null
        ]);
    } else {
        sendJsonResponse([
            'authenticated' => false,
            'error' => 'Not authenticated'
        ], 401);
    }
}

// Posts handlers
function handlePosts($requestMethod, $id) {
    switch ($requestMethod) {
        case 'GET':
            if ($id) {
                getPost($id);
            } else {
                getPosts();
            }
            break;
        case 'POST':
            createPost();
            break;
        case 'PUT':
            if ($id) {
                updatePost($id);
            } else {
                sendJsonResponse(['error' => 'ID required for update'], 400);
            }
            break;
        case 'DELETE':
            if ($id) {
                deletePost($id);
            } else {
                sendJsonResponse(['error' => 'ID required for delete'], 400);
            }
            break;
        default:
            sendJsonResponse(['error' => 'Method not allowed'], 405);
            break;
    }
}

function getPosts() {
    global $pdo;
    
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $offset = ($page - 1) * $limit;
    
    try {
        // Count total posts
        $countStmt = $pdo->query("SELECT COUNT(*) as total FROM posts");
        $totalItems = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get posts with pagination
        $stmt = $pdo->prepare("SELECT * FROM posts ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get author info for each post
        foreach ($posts as &$post) {
            $authorStmt = $pdo->prepare("SELECT first_name, last_name FROM users WHERE id = ?");
            $authorStmt->execute([$post['author_id']]);
            $author = $authorStmt->fetch(PDO::FETCH_ASSOC);
            $post['author_first_name'] = $author ? $author['first_name'] : 'Unknown';
            $post['author_last_name'] = $author ? $author['last_name'] : 'Unknown';
        }
        
        sendJsonResponse([
            'posts' => $posts,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => $totalItems,
                'total_pages' => ceil($totalItems / $limit)
            ]
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

function getPost($id) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM posts WHERE id = ?");
        $stmt->execute([$id]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$post) {
            sendJsonResponse(['error' => 'Post not found'], 404);
        }
        
        // Get author info
        $authorStmt = $pdo->prepare("SELECT first_name, last_name FROM users WHERE id = ?");
        $authorStmt->execute([$post['author_id']]);
        $author = $authorStmt->fetch(PDO::FETCH_ASSOC);
        $post['author_first_name'] = $author ? $author['first_name'] : 'Unknown';
        $post['author_last_name'] = $author ? $author['last_name'] : 'Unknown';
        
        sendJsonResponse(['post' => $post]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

function createPost() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['error' => 'Invalid JSON data'], 400);
    }
    
    $requiredFields = ['title', 'content'];
    foreach ($requiredFields as $field) {
        if (!isset($input[$field]) || empty(trim($input[$field]))) {
            sendJsonResponse(['error' => "$field is required"], 400);
        }
    }
    
    try {
        $slug = isset($input['slug']) ? $input['slug'] : createSlug($input['title']);
        $authorId = getCurrentUser()['id'];
        
        // Get current permalink structure
        $permalinkStructure = getPermalinkSetting('post_permalink_structure', '/%year%/%month%/%postname%/');
        
        // Prepare post data for permalink generation
        $postData = [
            'id' => 0, // Will be updated after insert
            'title' => $input['title'],
            'slug' => $slug,
            'created_at' => date('Y-m-d H:i:s'),
            'category_id' => $input['category_id'] ?? null
        ];
        
        // Generate permalink
        $permalink = generatePostPermalink($postData, $permalinkStructure);
        
        // Handle custom permalink if provided
        $customPermalink = null;
        if (!empty($input['custom_permalink'])) {
            $customPermalink = sanitizePermalink($input['custom_permalink']);
            $permalink = $customPermalink;
        }
        
        $stmt = $pdo->prepare("INSERT INTO posts (title, content, excerpt, slug, status, author_id, permalink, permalink_structure, custom_permalink, created_at, updated_at) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
        $stmt->execute([
            $input['title'],
            $input['content'],
            $input['excerpt'] ?? '',
            $slug,
            $input['status'] ?? 'draft',
            $authorId,
            $permalink,
            $permalinkStructure,
            $customPermalink
        ]);
        
        $postId = $pdo->lastInsertId();
        
        // Update permalink with actual post ID if needed
        $postData['id'] = $postId;
        $finalPermalink = $customPermalink ?? generatePostPermalink($postData, $permalinkStructure);
        $finalPermalink = ensureUniquePermalink($finalPermalink, 'post', $postId);
        
        // Update with final permalink
        $updateStmt = $pdo->prepare("UPDATE posts SET permalink = ? WHERE id = ?");
        $updateStmt->execute([$finalPermalink, $postId]);
        
        getPost($postId); // Return the created post
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to create post: ' . $e->getMessage()], 500);
    }
}

function updatePost($id) {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['error' => 'Invalid JSON data'], 400);
    }
    
    try {
        // Check if post exists
        $checkStmt = $pdo->prepare("SELECT * FROM posts WHERE id = ?");
        $checkStmt->execute([$id]);
        $post = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$post) {
            sendJsonResponse(['error' => 'Post not found'], 404);
        }
        
        // Handle slug change
        $newSlug = $input['slug'] ?? $post['slug'];
        
        // Handle custom permalink
        $customPermalink = null;
        $newPermalink = $post['permalink']; // Keep existing permalink by default
        
        if (isset($input['custom_permalink'])) {
            if (!empty($input['custom_permalink'])) {
                $customPermalink = sanitizePermalink($input['custom_permalink']);
                $newPermalink = ensureUniquePermalink($customPermalink, 'post', $id);
                
                // Add redirect from old URL if different
                if (!empty($post['permalink']) && $post['permalink'] !== $newPermalink) {
                    $shouldRedirect = getPermalinkSetting('redirect_old_urls', '1') === '1';
                    if ($shouldRedirect) {
                        addUrlRedirect($post['permalink'], $newPermalink, 'post', $id);
                    }
                }
            } else {
                // Clear custom permalink, regenerate from structure
                $customPermalink = null;
                $postData = array_merge($post, [
                    'slug' => $newSlug,
                    'title' => $input['title'] ?? $post['title']
                ]);
                $newPermalink = generatePostPermalink($postData, $post['permalink_structure']);
                $newPermalink = ensureUniquePermalink($newPermalink, 'post', $id);
            }
        } elseif ($newSlug !== $post['slug'] && empty($post['custom_permalink'])) {
            // Slug changed and no custom permalink, regenerate
            $postData = array_merge($post, [
                'slug' => $newSlug,
                'title' => $input['title'] ?? $post['title']
            ]);
            $newPermalink = generatePostPermalink($postData, $post['permalink_structure']);
            $newPermalink = ensureUniquePermalink($newPermalink, 'post', $id);
            
            // Add redirect from old URL
            if (!empty($post['permalink']) && $post['permalink'] !== $newPermalink) {
                $shouldRedirect = getPermalinkSetting('redirect_old_urls', '1') === '1';
                if ($shouldRedirect) {
                    addUrlRedirect($post['permalink'], $newPermalink, 'post', $id);
                }
            }
        }
        
        // Update the post
        $stmt = $pdo->prepare("UPDATE posts SET title = ?, content = ?, excerpt = ?, slug = ?, status = ?, permalink = ?, custom_permalink = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([
            $input['title'] ?? $post['title'],
            $input['content'] ?? $post['content'],
            $input['excerpt'] ?? $post['excerpt'],
            $newSlug,
            $input['status'] ?? $post['status'],
            $newPermalink,
            $customPermalink,
            $id
        ]);
        
        getPost($id); // Return the updated post
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to update post: ' . $e->getMessage()], 500);
    }
}

function deletePost($id) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("DELETE FROM posts WHERE id = ?");
        $result = $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            sendJsonResponse(['success' => true]);
        } else {
            sendJsonResponse(['error' => 'Post not found'], 404);
        }
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to delete post: ' . $e->getMessage()], 500);
    }
}

// Pages handlers
function handlePages($requestMethod, $id) {
    switch ($requestMethod) {
        case 'GET':
            if ($id) {
                getPage($id);
            } else {
                getPages();
            }
            break;
        case 'POST':
            createPage();
            break;
        case 'PUT':
            if ($id) {
                updatePage($id);
            } else {
                sendJsonResponse(['error' => 'ID required for update'], 400);
            }
            break;
        case 'DELETE':
            if ($id) {
                deletePage($id);
            } else {
                sendJsonResponse(['error' => 'ID required for delete'], 400);
            }
            break;
        default:
            sendJsonResponse(['error' => 'Method not allowed'], 405);
            break;
    }
}

function getPages() {
    global $pdo;
    
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $offset = ($page - 1) * $limit;
    
    try {
        // Count total pages
        $countStmt = $pdo->query("SELECT COUNT(*) as total FROM pages");
        $totalItems = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get pages with pagination
        $stmt = $pdo->prepare("SELECT * FROM pages ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $pages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get author info for each page
        foreach ($pages as &$page) {
            $authorStmt = $pdo->prepare("SELECT first_name, last_name FROM users WHERE id = ?");
            $authorStmt->execute([$page['author_id']]);
            $author = $authorStmt->fetch(PDO::FETCH_ASSOC);
            $page['author_first_name'] = $author ? $author['first_name'] : 'Unknown';
            $page['author_last_name'] = $author ? $author['last_name'] : 'Unknown';
        }
        
        sendJsonResponse([
            'pages' => $pages,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => $totalItems,
                'total_pages' => ceil($totalItems / $limit)
            ]
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

function getPage($id) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM pages WHERE id = ?");
        $stmt->execute([$id]);
        $page = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$page) {
            sendJsonResponse(['error' => 'Page not found'], 404);
        }
        
        // Get author info
        $authorStmt = $pdo->prepare("SELECT first_name, last_name FROM users WHERE id = ?");
        $authorStmt->execute([$page['author_id']]);
        $author = $authorStmt->fetch(PDO::FETCH_ASSOC);
        $page['author_first_name'] = $author ? $author['first_name'] : 'Unknown';
        $page['author_last_name'] = $author ? $author['last_name'] : 'Unknown';
        
        sendJsonResponse(['page' => $page]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

function createPage() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['error' => 'Invalid JSON data'], 400);
    }
    
    $requiredFields = ['title', 'content'];
    foreach ($requiredFields as $field) {
        if (!isset($input[$field]) || empty(trim($input[$field]))) {
            sendJsonResponse(['error' => "$field is required"], 400);
        }
    }
    
    try {
        $slug = isset($input['slug']) ? $input['slug'] : createSlug($input['title']);
        $authorId = getCurrentUser()['id'];
        
        // Prepare page data for permalink generation
        $pageData = [
            'id' => 0,
            'title' => $input['title'],
            'slug' => $slug,
            'parent_id' => $input['parent_id'] ?? null
        ];
        
        // Generate permalink
        $permalink = generatePagePermalink($pageData);
        
        // Handle custom permalink if provided
        $customPermalink = null;
        if (!empty($input['custom_permalink'])) {
            $customPermalink = sanitizePermalink($input['custom_permalink']);
            $permalink = $customPermalink;
        }
        
        $stmt = $pdo->prepare("INSERT INTO pages (title, content, slug, status, author_id, permalink, custom_permalink, created_at, updated_at) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
        $stmt->execute([
            $input['title'],
            $input['content'],
            $slug,
            $input['status'] ?? 'draft',
            $authorId,
            $permalink,
            $customPermalink
        ]);
        
        $pageId = $pdo->lastInsertId();
        
        // Update permalink with actual page ID if needed
        $pageData['id'] = $pageId;
        $finalPermalink = $customPermalink ?? generatePagePermalink($pageData);
        $finalPermalink = ensureUniquePermalink($finalPermalink, 'page', $pageId);
        
        // Update with final permalink
        $updateStmt = $pdo->prepare("UPDATE pages SET permalink = ? WHERE id = ?");
        $updateStmt->execute([$finalPermalink, $pageId]);
        
        getPage($pageId); // Return the created page
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to create page: ' . $e->getMessage()], 500);
    }
}

function updatePage($id) {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['error' => 'Invalid JSON data'], 400);
    }
    
    try {
        // Check if page exists
        $checkStmt = $pdo->prepare("SELECT * FROM pages WHERE id = ?");
        $checkStmt->execute([$id]);
        $page = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$page) {
            sendJsonResponse(['error' => 'Page not found'], 404);
        }
        
        // Handle slug change
        $newSlug = $input['slug'] ?? $page['slug'];
        
        // Handle custom permalink
        $customPermalink = null;
        $newPermalink = $page['permalink']; // Keep existing permalink by default
        
        if (isset($input['custom_permalink'])) {
            if (!empty($input['custom_permalink'])) {
                $customPermalink = sanitizePermalink($input['custom_permalink']);
                $newPermalink = ensureUniquePermalink($customPermalink, 'page', $id);
                
                // Add redirect from old URL if different
                if (!empty($page['permalink']) && $page['permalink'] !== $newPermalink) {
                    $shouldRedirect = getPermalinkSetting('redirect_old_urls', '1') === '1';
                    if ($shouldRedirect) {
                        addUrlRedirect($page['permalink'], $newPermalink, 'page', $id);
                    }
                }
            } else {
                // Clear custom permalink, regenerate
                $customPermalink = null;
                $pageData = array_merge($page, [
                    'slug' => $newSlug,
                    'title' => $input['title'] ?? $page['title']
                ]);
                $newPermalink = generatePagePermalink($pageData);
                $newPermalink = ensureUniquePermalink($newPermalink, 'page', $id);
            }
        } elseif ($newSlug !== $page['slug'] && empty($page['custom_permalink'])) {
            // Slug changed and no custom permalink, regenerate
            $pageData = array_merge($page, [
                'slug' => $newSlug,
                'title' => $input['title'] ?? $page['title']
            ]);
            $newPermalink = generatePagePermalink($pageData);
            $newPermalink = ensureUniquePermalink($newPermalink, 'page', $id);
            
            // Add redirect from old URL
            if (!empty($page['permalink']) && $page['permalink'] !== $newPermalink) {
                $shouldRedirect = getPermalinkSetting('redirect_old_urls', '1') === '1';
                if ($shouldRedirect) {
                    addUrlRedirect($page['permalink'], $newPermalink, 'page', $id);
                }
            }
        }
        
        // Update the page
        $stmt = $pdo->prepare("UPDATE pages SET title = ?, content = ?, slug = ?, status = ?, permalink = ?, custom_permalink = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([
            $input['title'] ?? $page['title'],
            $input['content'] ?? $page['content'],
            $newSlug,
            $input['status'] ?? $page['status'],
            $newPermalink,
            $customPermalink,
            $id
        ]);
        
        getPage($id); // Return the updated page
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to update page: ' . $e->getMessage()], 500);
    }
}

function deletePage($id) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("DELETE FROM pages WHERE id = ?");
        $result = $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            sendJsonResponse(['success' => true]);
        } else {
            sendJsonResponse(['error' => 'Page not found'], 404);
        }
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to delete page: ' . $e->getMessage()], 500);
    }
}

// Users handlers
function handleUsers($requestMethod, $id) {
    switch ($requestMethod) {
        case 'GET':
            if ($id) {
                getUser($id);
            } else {
                getUsers();
            }
            break;
        case 'POST':
            createUser();
            break;
        case 'PUT':
            if ($id) {
                updateUser($id);
            } else {
                sendJsonResponse(['error' => 'ID required for update'], 400);
            }
            break;
        case 'DELETE':
            if ($id) {
                deleteUser($id);
            } else {
                sendJsonResponse(['error' => 'ID required for delete'], 400);
            }
            break;
        default:
            sendJsonResponse(['error' => 'Method not allowed'], 405);
            break;
    }
}

function getUsers() {
    global $pdo;
    
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $offset = ($page - 1) * $limit;
    
    try {
        // Count total users
        $countStmt = $pdo->query("SELECT COUNT(*) as total FROM users");
        $totalItems = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get users with pagination
        $stmt = $pdo->prepare("SELECT id, username, email, first_name, last_name, role, created_at FROM users ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendJsonResponse([
            'users' => $users,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => $totalItems,
                'total_pages' => ceil($totalItems / $limit)
            ]
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

function getUser($id) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT id, username, email, first_name, last_name, role, created_at FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            sendJsonResponse(['error' => 'User not found'], 404);
        }
        
        sendJsonResponse(['user' => $user]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

function createUser() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['error' => 'Invalid JSON data'], 400);
    }
    
    $requiredFields = ['username', 'email', 'password'];
    foreach ($requiredFields as $field) {
        if (!isset($input[$field]) || empty(trim($input[$field]))) {
            sendJsonResponse(['error' => "$field is required"], 400);
        }
    }
    
    // Check if username or email already exists
    $checkStmt = $pdo->prepare("SELECT * FROM users WHERE username = ? OR email = ?");
    $checkStmt->execute([$input['username'], $input['email']]);
    if ($checkStmt->fetch()) {
        sendJsonResponse(['error' => 'Username or email already exists'], 400);
    }
    
    try {
        $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("INSERT INTO users (username, password, email, first_name, last_name, role, created_at, updated_at) 
                              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
        $stmt->execute([
            $input['username'],
            $hashedPassword,
            $input['email'],
            $input['first_name'] ?? '',
            $input['last_name'] ?? '',
            $input['role'] ?? 'author'
        ]);
        
        $userId = $pdo->lastInsertId();
        getUser($userId); // Return the created user
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to create user: ' . $e->getMessage()], 500);
    }
}

function updateUser($id) {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['error' => 'Invalid JSON data'], 400);
    }
    
    try {
        // Check if user exists
        $checkStmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $checkStmt->execute([$id]);
        $user = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            sendJsonResponse(['error' => 'User not found'], 404);
        }
        
        // Prepare update fields
        $updateFields = [];
        $params = [];
        
        if (isset($input['username']) && $input['username'] !== $user['username']) {
            // Check if new username already exists
            $checkUserStmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND id != ?");
            $checkUserStmt->execute([$input['username'], $id]);
            if ($checkUserStmt->fetch()) {
                sendJsonResponse(['error' => 'Username already exists'], 400);
            }
            $updateFields[] = "username = ?";
            $params[] = $input['username'];
        }
        
        if (isset($input['email']) && $input['email'] !== $user['email']) {
            // Check if new email already exists
            $checkEmailStmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND id != ?");
            $checkEmailStmt->execute([$input['email'], $id]);
            if ($checkEmailStmt->fetch()) {
                sendJsonResponse(['error' => 'Email already exists'], 400);
            }
            $updateFields[] = "email = ?";
            $params[] = $input['email'];
        }
        
        if (isset($input['password']) && !empty($input['password'])) {
            $updateFields[] = "password = ?";
            $params[] = password_hash($input['password'], PASSWORD_DEFAULT);
        }
        
        if (isset($input['first_name'])) {
            $updateFields[] = "first_name = ?";
            $params[] = $input['first_name'];
        }
        
        if (isset($input['last_name'])) {
            $updateFields[] = "last_name = ?";
            $params[] = $input['last_name'];
        }
        
        if (isset($input['role'])) {
            $updateFields[] = "role = ?";
            $params[] = $input['role'];
        }
        
        if (count($updateFields) > 0) {
            $updateFields[] = "updated_at = CURRENT_TIMESTAMP";
            $params[] = $id; // Add ID for WHERE clause
            
            $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }
        
        getUser($id); // Return the updated user
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to update user: ' . $e->getMessage()], 500);
    }
}

function deleteUser($id) {
    global $pdo;
    
    try {
        // Don't allow deleting the current user
        $currentUserId = getCurrentUser()['id'];
        if ($id == $currentUserId) {
            sendJsonResponse(['error' => 'Cannot delete the current user'], 400);
        }
        
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $result = $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            sendJsonResponse(['success' => true]);
        } else {
            sendJsonResponse(['error' => 'User not found'], 404);
        }
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to delete user: ' . $e->getMessage()], 500);
    }
}

// Media handlers
function handleMedia($requestMethod, $id) {
    switch ($requestMethod) {
        case 'GET':
            if ($id) {
                getMedia($id);
            } else {
                getMediaList();
            }
            break;
        case 'POST':
            if (!$id) { // Upload media
                uploadMedia();
            } else {
                sendJsonResponse(['error' => 'Invalid endpoint'], 404);
            }
            break;
        case 'PUT':
            if ($id) {
                updateMedia($id);
            } else {
                sendJsonResponse(['error' => 'ID required for update'], 400);
            }
            break;
        case 'DELETE':
            if ($id) {
                deleteMedia($id);
            } else {
                sendJsonResponse(['error' => 'ID required for delete'], 400);
            }
            break;
        default:
            sendJsonResponse(['error' => 'Method not allowed'], 405);
            break;
    }
}

function getMediaList() {
    global $pdo;
    
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $offset = ($page - 1) * $limit;
    
    try {
        // Count total media
        $countStmt = $pdo->query("SELECT COUNT(*) as total FROM media");
        $totalItems = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get media with pagination
        $stmt = $pdo->prepare("SELECT * FROM media ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $media = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get uploader info for each media
        foreach ($media as &$item) {
            $authorStmt = $pdo->prepare("SELECT first_name, last_name FROM users WHERE id = ?");
            $authorStmt->execute([$item['uploaded_by']]);
            $author = $authorStmt->fetch(PDO::FETCH_ASSOC);
            $item['author_first_name'] = $author ? $author['first_name'] : 'Unknown';
            $item['author_last_name'] = $author ? $author['last_name'] : 'Unknown';
        }
        
        sendJsonResponse([
            'media' => $media,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => $totalItems,
                'total_pages' => ceil($totalItems / $limit)
            ]
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

function getMedia($id) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM media WHERE id = ?");
        $stmt->execute([$id]);
        $media = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$media) {
            sendJsonResponse(['error' => 'Media not found'], 404);
        }
        
        // Get author info
        $authorStmt = $pdo->prepare("SELECT first_name, last_name FROM users WHERE id = ?");
        $authorStmt->execute([$media['uploaded_by']]);
        $author = $authorStmt->fetch(PDO::FETCH_ASSOC);
        $media['author_first_name'] = $author ? $author['first_name'] : 'Unknown';
        $media['author_last_name'] = $author ? $author['last_name'] : 'Unknown';
        
        sendJsonResponse(['media' => $media]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

function uploadMedia() {
    if (!isset($_FILES['file'])) {
        sendJsonResponse(['error' => 'No file uploaded'], 400);
    }
    
    global $pdo;
    
    $file = $_FILES['file'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate file
    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendJsonResponse(['error' => 'File upload error'], 400);
    }
    
    // Allowed file types
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!in_array($file['type'], $allowedTypes)) {
        sendJsonResponse(['error' => 'File type not allowed'], 400);
    }
    
    // Create uploads directory
    $uploadDir = __DIR__ . '/uploads';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '.' . $extension;
    $filepath = $uploadDir . '/' . $filename;
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        sendJsonResponse(['error' => 'Failed to move uploaded file'], 500);
    }
    
    // Get file info
    $size = filesize($filepath);
    $altText = $input['alt_text'] ?? '';
    $caption = $input['caption'] ?? '';
    $description = $input['description'] ?? '';
    $uploadedBy = getCurrentUser()['id'];
    
    try {
        $stmt = $pdo->prepare("INSERT INTO media (filename, filepath, mimetype, size, alt_text, caption, description, uploaded_by, created_at) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)");
        $stmt->execute([
            $file['name'],
            'uploads/' . $filename,
            $file['type'],
            $size,
            $altText,
            $caption,
            $description,
            $uploadedBy
        ]);
        
        $mediaId = $pdo->lastInsertId();
        getMedia($mediaId); // Return the uploaded media
    } catch (Exception $e) {
        // Delete the file if database insertion fails
        unlink($filepath);
        sendJsonResponse(['error' => 'Failed to save media: ' . $e->getMessage()], 500);
    }
}

function updateMedia($id) {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['error' => 'Invalid JSON data'], 400);
    }
    
    try {
        // Check if media exists
        $checkStmt = $pdo->prepare("SELECT * FROM media WHERE id = ?");
        $checkStmt->execute([$id]);
        $media = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$media) {
            sendJsonResponse(['error' => 'Media not found'], 404);
        }
        
        // Update the media
        $stmt = $pdo->prepare("UPDATE media SET alt_text = ?, caption = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([
            $input['alt_text'] ?? $media['alt_text'],
            $input['caption'] ?? $media['caption'],
            $input['description'] ?? $media['description'],
            $id
        ]);
        
        getMedia($id); // Return the updated media
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to update media: ' . $e->getMessage()], 500);
    }
}

function deleteMedia($id) {
    global $pdo;
    
    try {
        // Get the media record to delete the file
        $stmt = $pdo->prepare("SELECT * FROM media WHERE id = ?");
        $stmt->execute([$id]);
        $media = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$media) {
            sendJsonResponse(['error' => 'Media not found'], 404);
        }
        
        // Delete the actual file
        $filepath = __DIR__ . '/' . $media['filepath'];
        if (file_exists($filepath)) {
            unlink($filepath);
        }
        
        // Delete the database record
        $stmt = $pdo->prepare("DELETE FROM media WHERE id = ?");
        $result = $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            sendJsonResponse(['success' => true]);
        } else {
            sendJsonResponse(['error' => 'Media not found'], 404);
        }
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to delete media: ' . $e->getMessage()], 500);
    }
}

// Settings handlers
function handleSettings($requestMethod, $id) {
    switch ($requestMethod) {
        case 'GET':
            getSettings($id);
            break;
        case 'PUT':
            updateSettings($id);
            break;
        case 'POST':
            updateSettings($id);
            break;
        default:
            sendJsonResponse(['error' => 'Method not allowed'], 405);
            break;
    }
}

function getSettings($key = null) {
    global $pdo;
    
    try {
        if ($key) {
            $stmt = $pdo->prepare("SELECT * FROM settings WHERE key = ?");
            $stmt->execute([$key]);
            $setting = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$setting) {
                sendJsonResponse(['error' => 'Setting not found'], 404);
            }
            
            sendJsonResponse(['setting' => $setting]);
        } else {
            $stmt = $pdo->query("SELECT * FROM settings ORDER BY key");
            $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendJsonResponse(['settings' => $settings]);
        }
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

function updateSettings($key = null) {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['error' => 'Invalid JSON data'], 400);
    }
    
    if (!$key && !isset($input['key'])) {
        sendJsonResponse(['error' => 'Key is required'], 400);
    }
    
    $key = $key ?: $input['key'];
    $value = $input['value'] ?? '';
    
    try {
        // Check if setting exists
        $checkStmt = $pdo->prepare("SELECT * FROM settings WHERE key = ?");
        $checkStmt->execute([$key]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // Update existing setting
            $stmt = $pdo->prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?");
            $stmt->execute([$value, $key]);
        } else {
            // Create new setting
            $stmt = $pdo->prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)");
            $stmt->execute([$key, $value]);
        }
        
        // Return the updated setting
        getSettings($key);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to update setting: ' . $e->getMessage()], 500);
    }
}

// Categories handlers
function handleCategories($requestMethod, $id) {
    switch ($requestMethod) {
        case 'GET':
            if ($id) {
                getCategory($id);
            } else {
                getCategories();
            }
            break;
        case 'POST':
            if (!$id) {
                createCategory();
            } else {
                sendJsonResponse(['error' => 'Invalid endpoint'], 404);
            }
            break;
        case 'PUT':
            if ($id) {
                updateCategory($id);
            } else {
                sendJsonResponse(['error' => 'ID required for update'], 400);
            }
            break;
        case 'DELETE':
            if ($id) {
                deleteCategory($id);
            } else {
                sendJsonResponse(['error' => 'ID required for delete'], 400);
            }
            break;
        default:
            sendJsonResponse(['error' => 'Method not allowed'], 405);
            break;
    }
}

function getCategories() {
    // For now, return an empty array or some default categories
    // In a real implementation, you would have a categories table
    sendJsonResponse([
        'categories' => [
            ['id' => 1, 'name' => 'Uncategorized', 'slug' => 'uncategorized'],
            ['id' => 2, 'name' => 'News', 'slug' => 'news'],
            ['id' => 3, 'name' => 'Products', 'slug' => 'products'],
            ['id' => 4, 'name' => 'Announcements', 'slug' => 'announcements']
        ],
        'pagination' => [
            'current_page' => 1,
            'per_page' => 20,
            'total_items' => 4,
            'total_pages' => 1
        ]
    ]);
}

function getCategory($id) {
    // For now, return a default category or error
    sendJsonResponse(['error' => 'Category not found'], 404);
}

function createCategory() {
    sendJsonResponse(['error' => 'Categories feature not fully implemented'], 501);
}

function updateCategory($id) {
    sendJsonResponse(['error' => 'Categories feature not fully implemented'], 501);
}

function deleteCategory($id) {
    sendJsonResponse(['error' => 'Categories feature not fully implemented'], 501);
}

// Helper function to create slug
function createSlug($title) {
    $slug = strtolower(trim($title));
    $slug = preg_replace('/[^a-z0-9-]/', '-', $slug);
    $slug = preg_replace('/-+/', '-', $slug);
    $slug = trim($slug, '-');
    
    // Ensure uniqueness
    global $pdo;
    $originalSlug = $slug;
    $counter = 1;
    
    while (true) {
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM posts WHERE slug = ? UNION SELECT COUNT(*) FROM pages WHERE slug = ?");
        $checkStmt->execute([$slug, $slug]);
        $result = $checkStmt->fetchColumn();
        
        if ($result == 0) {
            break;
        }
        
        $slug = $originalSlug . '-' . $counter;
        $counter++;
    }
    
    return $slug;
}

// ==================== PERMALINK ENDPOINTS ====================

/**
 * Handle permalink-related requests
 */
function handlePermalinks($requestMethod, $action) {
    switch ($action) {
        case 'settings':
            if ($requestMethod === 'GET') {
                getPermalinkSettings();
            } elseif ($requestMethod === 'POST' || $requestMethod === 'PUT') {
                updatePermalinkSettings();
            }
            break;
        case 'structures':
            getAvailableStructures();
            break;
        case 'preview':
            previewPermalinkEndpoint();
            break;
        case 'generate':
            regeneratePermalinks();
            break;
        case 'update-missing':
            updateMissingPermalinksEndpoint();
            break;
        default:
            if ($requestMethod === 'GET') {
                getPermalinkSettings();
            } else {
                sendJsonResponse(['error' => 'Invalid permalink action'], 400);
            }
    }
}

/**
 * Get all permalink settings
 */
function getPermalinkSettings() {
    global $pdo;
    
    try {
        $stmt = $pdo->query("SELECT * FROM permalink_settings ORDER BY setting_key");
        $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert to key-value format
        $settingsMap = [];
        foreach ($settings as $setting) {
            $settingsMap[$setting['setting_key']] = $setting['setting_value'];
        }
        
        sendJsonResponse([
            'success' => true,
            'settings' => $settingsMap,
            'structures' => getPermalinkStructures()
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to get permalink settings'], 500);
    }
}

/**
 * Update permalink settings
 */
function updatePermalinkSettings() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['error' => 'Invalid JSON data'], 400);
    }
    
    try {
        $updated = [];
        
        // Update each setting
        foreach ($input as $key => $value) {
            if (updatePermalinkSetting($key, $value)) {
                $updated[] = $key;
            }
        }
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Permalink settings updated',
            'updated' => $updated
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to update permalink settings: ' . $e->getMessage()], 500);
    }
}

/**
 * Get available permalink structures
 */
function getAvailableStructures() {
    sendJsonResponse([
        'success' => true,
        'structures' => getPermalinkStructures()
    ]);
}

/**
 * Preview a permalink without saving
 */
function previewPermalinkEndpoint() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['title'])) {
        sendJsonResponse(['error' => 'Title is required'], 400);
    }
    
    $contentType = $input['content_type'] ?? 'post';
    $structure = $input['structure'] ?? null;
    
    $data = [
        'id' => $input['id'] ?? 0,
        'title' => $input['title'],
        'slug' => $input['slug'] ?? generateSlug($input['title']),
        'created_at' => $input['created_at'] ?? date('Y-m-d H:i:s'),
        'category_id' => $input['category_id'] ?? null,
        'parent_id' => $input['parent_id'] ?? null
    ];
    
    $permalink = previewPermalink($data, $contentType, $structure);
    
    sendJsonResponse([
        'success' => true,
        'permalink' => $permalink,
        'full_url' => getFullUrl($permalink)
    ]);
}

/**
 * Regenerate permalinks for all posts/pages based on new structure
 * Note: This only updates posts/pages that don't have custom permalinks
 */
function regeneratePermalinks() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $contentType = $input['content_type'] ?? 'all'; // 'post', 'page', or 'all'
    $newStructure = $input['structure'] ?? null;
    $preserveExisting = $input['preserve_existing'] ?? true;
    
    $updated = 0;
    $redirectsCreated = 0;
    
    try {
        // Update posts
        if ($contentType === 'post' || $contentType === 'all') {
            if ($preserveExisting) {
                // Only update posts without custom permalinks
                $postsStmt = $pdo->query("SELECT * FROM posts WHERE custom_permalink IS NULL OR custom_permalink = ''");
            } else {
                $postsStmt = $pdo->query("SELECT * FROM posts");
            }
            $posts = $postsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $structure = $newStructure ?? getPermalinkSetting('post_permalink_structure', '/%year%/%month%/%postname%/');
            
            foreach ($posts as $post) {
                $oldPermalink = $post['permalink'];
                $newPermalink = generatePostPermalink($post, $structure);
                $newPermalink = ensureUniquePermalink($newPermalink, 'post', $post['id']);
                
                // Create redirect if URL changed
                if (!empty($oldPermalink) && $oldPermalink !== $newPermalink) {
                    $shouldRedirect = getPermalinkSetting('redirect_old_urls', '1') === '1';
                    if ($shouldRedirect) {
                        addUrlRedirect($oldPermalink, $newPermalink, 'post', $post['id']);
                        $redirectsCreated++;
                    }
                }
                
                // Update post
                $updateStmt = $pdo->prepare("UPDATE posts SET permalink = ?, permalink_structure = ? WHERE id = ?");
                $updateStmt->execute([$newPermalink, $structure, $post['id']]);
                $updated++;
            }
        }
        
        // Update pages
        if ($contentType === 'page' || $contentType === 'all') {
            if ($preserveExisting) {
                $pagesStmt = $pdo->query("SELECT * FROM pages WHERE custom_permalink IS NULL OR custom_permalink = ''");
            } else {
                $pagesStmt = $pdo->query("SELECT * FROM pages");
            }
            $pages = $pagesStmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($pages as $page) {
                $oldPermalink = $page['permalink'];
                $newPermalink = generatePagePermalink($page);
                $newPermalink = ensureUniquePermalink($newPermalink, 'page', $page['id']);
                
                // Create redirect if URL changed
                if (!empty($oldPermalink) && $oldPermalink !== $newPermalink) {
                    $shouldRedirect = getPermalinkSetting('redirect_old_urls', '1') === '1';
                    if ($shouldRedirect) {
                        addUrlRedirect($oldPermalink, $newPermalink, 'page', $page['id']);
                        $redirectsCreated++;
                    }
                }
                
                // Update page
                $updateStmt = $pdo->prepare("UPDATE pages SET permalink = ? WHERE id = ?");
                $updateStmt->execute([$newPermalink, $page['id']]);
                $updated++;
            }
        }
        
        sendJsonResponse([
            'success' => true,
            'message' => "Permalinks regenerated successfully",
            'updated' => $updated,
            'redirects_created' => $redirectsCreated
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to regenerate permalinks: ' . $e->getMessage()], 500);
    }
}

/**
 * Update posts/pages that don't have permalinks yet
 */
function updateMissingPermalinksEndpoint() {
    $count = updateMissingPermalinks();
    
    if ($count === false) {
        sendJsonResponse(['error' => 'Failed to update missing permalinks'], 500);
    }
    
    sendJsonResponse([
        'success' => true,
        'message' => "Updated $count items with missing permalinks",
        'updated' => $count
    ]);
}

// ==================== URL RESOLUTION ====================

/**
 * Handle URL resolution requests
 */
function handleUrlResolve() {
    $url = $_GET['url'] ?? null;
    
    if (!$url) {
        $input = json_decode(file_get_contents('php://input'), true);
        $url = $input['url'] ?? null;
    }
    
    if (!$url) {
        sendJsonResponse(['error' => 'URL is required'], 400);
    }
    
    $result = resolveUrl($url);
    
    sendJsonResponse([
        'success' => true,
        'result' => $result
    ]);
}

// ==================== URL REDIRECTS ====================

/**
 * Handle redirect management requests
 */
function handleRedirects($requestMethod, $id) {
    switch ($requestMethod) {
        case 'GET':
            if ($id) {
                getRedirect($id);
            } else {
                getRedirects();
            }
            break;
        case 'POST':
            createRedirect();
            break;
        case 'PUT':
            if ($id) {
                updateRedirect($id);
            } else {
                sendJsonResponse(['error' => 'ID required for update'], 400);
            }
            break;
        case 'DELETE':
            if ($id) {
                deleteRedirectEndpoint($id);
            } else {
                sendJsonResponse(['error' => 'ID required for delete'], 400);
            }
            break;
        default:
            sendJsonResponse(['error' => 'Method not allowed'], 405);
    }
}

/**
 * Get all redirects
 */
function getRedirects() {
    global $pdo;
    
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $offset = ($page - 1) * $limit;
    
    try {
        // Count total redirects
        $countStmt = $pdo->query("SELECT COUNT(*) as total FROM url_redirects");
        $totalItems = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get redirects with pagination
        $redirects = getUrlRedirects($limit, $offset);
        
        sendJsonResponse([
            'success' => true,
            'redirects' => $redirects,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => $totalItems,
                'total_pages' => ceil($totalItems / $limit)
            ]
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to get redirects'], 500);
    }
}

/**
 * Get single redirect
 */
function getRedirect($id) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM url_redirects WHERE id = ?");
        $stmt->execute([$id]);
        $redirect = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$redirect) {
            sendJsonResponse(['error' => 'Redirect not found'], 404);
        }
        
        sendJsonResponse([
            'success' => true,
            'redirect' => $redirect
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to get redirect'], 500);
    }
}

/**
 * Create new redirect
 */
function createRedirect() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['old_url']) || !isset($input['new_url'])) {
        sendJsonResponse(['error' => 'old_url and new_url are required'], 400);
    }
    
    $oldUrl = sanitizePermalink($input['old_url']);
    $newUrl = sanitizePermalink($input['new_url']);
    $redirectType = $input['redirect_type'] ?? 301;
    $contentType = $input['content_type'] ?? null;
    $contentId = $input['content_id'] ?? null;
    
    if (addUrlRedirect($oldUrl, $newUrl, $contentType, $contentId, $redirectType)) {
        sendJsonResponse([
            'success' => true,
            'message' => 'Redirect created successfully'
        ]);
    } else {
        sendJsonResponse(['error' => 'Failed to create redirect'], 500);
    }
}

/**
 * Update redirect
 */
function updateRedirect($id) {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['error' => 'Invalid JSON data'], 400);
    }
    
    try {
        // Check if exists
        $checkStmt = $pdo->prepare("SELECT * FROM url_redirects WHERE id = ?");
        $checkStmt->execute([$id]);
        $redirect = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$redirect) {
            sendJsonResponse(['error' => 'Redirect not found'], 404);
        }
        
        $oldUrl = isset($input['old_url']) ? sanitizePermalink($input['old_url']) : $redirect['old_url'];
        $newUrl = isset($input['new_url']) ? sanitizePermalink($input['new_url']) : $redirect['new_url'];
        $redirectType = $input['redirect_type'] ?? $redirect['redirect_type'];
        
        $updateStmt = $pdo->prepare("UPDATE url_redirects SET old_url = ?, new_url = ?, redirect_type = ? WHERE id = ?");
        $updateStmt->execute([$oldUrl, $newUrl, $redirectType, $id]);
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Redirect updated successfully'
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['error' => 'Failed to update redirect: ' . $e->getMessage()], 500);
    }
}

/**
 * Delete redirect
 */
function deleteRedirectEndpoint($id) {
    if (deleteUrlRedirect($id)) {
        sendJsonResponse([
            'success' => true,
            'message' => 'Redirect deleted successfully'
        ]);
    } else {
        sendJsonResponse(['error' => 'Failed to delete redirect'], 500);
    }
}
?>