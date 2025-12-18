<?php
// config.php - Database configuration
session_start();

// Use SQLite for simplicity instead of MySQL
define('DB_FILE', __DIR__ . '/db/database.sqlite');

// Create database directory if it doesn't exist
if (!file_exists(dirname(DB_FILE))) {
    mkdir(dirname(DB_FILE), 0755, true);
}

// SQLite connection
try {
    $pdo = new PDO("sqlite:" . DB_FILE);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create tables if they don't exist
    $pdo->exec("CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        excerpt TEXT,
        slug TEXT UNIQUE,
        status TEXT DEFAULT 'draft',
        author_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        slug TEXT UNIQUE,
        status TEXT DEFAULT 'draft',
        author_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        role TEXT DEFAULT 'author',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        mimetype TEXT,
        size INTEGER,
        alt_text TEXT,
        caption TEXT,
        description TEXT,
        uploaded_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    // Permalinks settings table
    $pdo->exec("CREATE TABLE IF NOT EXISTS permalink_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    // URL redirects table (for old URLs to redirect to new ones)
    $pdo->exec("CREATE TABLE IF NOT EXISTS url_redirects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        old_url TEXT UNIQUE NOT NULL,
        new_url TEXT NOT NULL,
        redirect_type INTEGER DEFAULT 301,
        content_type TEXT,
        content_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    // Add permalink column to posts if not exists
    try {
        $pdo->exec("ALTER TABLE posts ADD COLUMN permalink TEXT");
    } catch(PDOException $e) {
        // Column might already exist
    }
    
    // Add permalink_structure column to posts (stores which structure was used when created)
    try {
        $pdo->exec("ALTER TABLE posts ADD COLUMN permalink_structure TEXT");
    } catch(PDOException $e) {
        // Column might already exist
    }
    
    // Add custom_permalink column to posts (for manual override)
    try {
        $pdo->exec("ALTER TABLE posts ADD COLUMN custom_permalink TEXT");
    } catch(PDOException $e) {
        // Column might already exist
    }
    
    // Add permalink column to pages if not exists
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN permalink TEXT");
    } catch(PDOException $e) {
        // Column might already exist
    }
    
    // Add custom_permalink column to pages
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN custom_permalink TEXT");
    } catch(PDOException $e) {
        // Column might already exist
    }
    
    // Initialize default permalink settings if not exist
    $defaultSettings = [
        ['post_permalink_structure', '/%year%/%month%/%postname%/'],
        ['page_permalink_structure', '/%pagename%/'],
        ['category_base', 'category'],
        ['tag_base', 'tag'],
        ['use_trailing_slash', '1'],
        ['redirect_old_urls', '1']
    ];
    
    foreach ($defaultSettings as $setting) {
        try {
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM permalink_settings WHERE setting_key = ?");
            $checkStmt->execute([$setting[0]]);
            if ($checkStmt->fetchColumn() == 0) {
                $insertStmt = $pdo->prepare("INSERT INTO permalink_settings (setting_key, setting_value) VALUES (?, ?)");
                $insertStmt->execute([$setting[0], $setting[1]]);
            }
        } catch(PDOException $e) {
            // Log but don't crash
            error_log("Permalink settings initialization error: " . $e->getMessage());
        }
    }
    
    // Create or ensure default admin user exists
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
        $stmt->execute(['admin']);
        
        if ($stmt->fetchColumn() == 0) {
            // No admin user exists, create one
            $defaultPassword = password_hash('admin123', PASSWORD_DEFAULT);
            $insertStmt = $pdo->prepare("INSERT INTO users (username, password, email, first_name, last_name, role)
                       VALUES (?, ?, ?, ?, ?, ?)");
            $insertStmt->execute(['admin', $defaultPassword, 'admin@ghoncheye.com', 'Admin', 'User', 'administrator']);
        } else {
            // Admin user exists, ensure password is correct
            $totalUsersStmt = $pdo->prepare("SELECT COUNT(*) FROM users");
            $totalUsersStmt->execute();
            $totalUsers = $totalUsersStmt->fetchColumn();

            if ($totalUsers == 1) {
                // Only one user exists - reset to default
                $defaultPassword = password_hash('admin123', PASSWORD_DEFAULT);
                $updateStmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = ?");
                $updateStmt->execute([$defaultPassword, 'admin']);
            }
        }
    } catch(PDOException $e) {
        // Log but don't crash on initialization
        error_log("Admin user initialization error: " . $e->getMessage());
    }
    
} catch(PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

// CORS headers - Secure configuration
$allowedOrigins = ['http://localhost:3000', 'http://localhost:8000', 'http://127.0.0.1'];
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($requestOrigin, $allowedOrigins) || $_ENV['APP_ENV'] === 'development') {
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

// Check if it's a preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Utility function to send JSON response
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

// Function to check if user is authenticated via session or JWT token
function isAuthenticated() {
    // Check session first (for traditional PHP session)
    if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
        return true;
    }
    
    // Check for JWT token in Authorization header
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
        // Validate JWT token (basic validation)
        if (validateJWTToken($token)) {
            return true;
        }
    }
    
    return false;
}

// Function to validate JWT token
function validateJWTToken($token) {
    // For now, basic validation. In production, use a proper JWT library
    $parts = explode('.', $token);
    return count($parts) === 3; // JWT has 3 parts: header.payload.signature
}

// Function to get current user
function getCurrentUser() {
    if (isset($_SESSION['admin_user'])) {
        return $_SESSION['admin_user'];
    }
    
    // Try to extract from JWT token
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
        $parts = explode('.', $token);
        if (count($parts) === 3) {
            $payload = json_decode(base64_decode($parts[1]), true);
            return $payload['user'] ?? null;
        }
    }
    
    return null;
}
?>