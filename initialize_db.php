<?php
// initialize_db.php - Database initialization script

// Create database directory if it doesn't exist
$dbDir = __DIR__ . '/db';
if (!file_exists($dbDir)) {
    mkdir($dbDir, 0755, true);
}

// SQLite database file
$dbFile = $dbDir . '/database.sqlite';

try {
    // Connect to SQLite database
    $pdo = new PDO("sqlite:$dbFile");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create posts table
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
    
    // Create pages table
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
    
    // Create users table
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
    
    // Create media table
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
    
    // Create settings table
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    // Check if admin user already exists
    $stmt = $pdo->query("SELECT COUNT(*) FROM users");
    $userCount = $stmt->fetchColumn();
    
    if ($userCount == 0) {
        // Create default admin user
        $defaultPassword = password_hash('admin123', PASSWORD_DEFAULT);
        $pdo->exec("INSERT INTO users (username, password, email, first_name, last_name, role) 
                   VALUES ('admin', '$defaultPassword', 'admin@ghoncheye.com', 'Admin', 'User', 'administrator')");
        echo "Database initialized successfully. Default admin user created: username: admin, password: admin123\n";
    } else {
        echo "Database already exists and is initialized.\n";
    }
    
    // Close connection
    $pdo = null;
    echo "Database setup completed successfully!\n";
    
} catch (PDOException $e) {
    die("Database initialization failed: " . $e->getMessage() . "\n");
}
?>