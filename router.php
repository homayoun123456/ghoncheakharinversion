<?php
/**
 * URL Router for Ghoncheye Lalehzar CMS
 * Handles pretty URLs and redirects to appropriate content
 * 
 * Usage: Configure your web server to route all requests through this file
 * Example .htaccess for Apache:
 *   RewriteEngine On
 *   RewriteCond %{REQUEST_FILENAME} !-f
 *   RewriteCond %{REQUEST_FILENAME} !-d
 *   RewriteRule ^(.*)$ router.php?url=$1 [QSA,L]
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/permalink.php';

// Get the requested URL
$requestUrl = $_GET['url'] ?? '';
$requestUrl = '/' . ltrim($requestUrl, '/');

// Clean up the URL
$requestUrl = sanitizePermalink($requestUrl);

// Try to resolve the URL
$result = resolveUrl($requestUrl);

switch ($result['type']) {
    case 'redirect':
        // Perform redirect
        $redirectUrl = $result['redirect_to'];
        $redirectType = $result['redirect_type'] ?? 301;
        
        if ($redirectType == 301) {
            header('HTTP/1.1 301 Moved Permanently');
        } else {
            header('HTTP/1.1 302 Found');
        }
        header('Location: ' . $redirectUrl);
        exit();
        break;
        
    case 'post':
        // Display post content
        $post = $result['content'];
        displayPost($post);
        break;
        
    case 'page':
        // Display page content
        $page = $result['content'];
        displayPage($page);
        break;
        
    case 'not_found':
    default:
        // Show 404 error
        header('HTTP/1.0 404 Not Found');
        display404();
        break;
}

/**
 * Display post content
 */
function displayPost($post) {
    global $pdo;
    
    // Check if post is published
    if ($post['status'] !== 'published') {
        header('HTTP/1.0 404 Not Found');
        display404();
        return;
    }
    
    // Get author info
    $authorStmt = $pdo->prepare("SELECT first_name, last_name FROM users WHERE id = ?");
    $authorStmt->execute([$post['author_id']]);
    $author = $authorStmt->fetch(PDO::FETCH_ASSOC);
    $authorName = $author ? trim($author['first_name'] . ' ' . $author['last_name']) : 'Unknown';
    
    // Get site settings
    $siteTitle = 'Ghoncheye Lalehzar';
    
    // Output HTML
    ?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($post['title']); ?> - <?php echo htmlspecialchars($siteTitle); ?></title>
    <meta name="description" content="<?php echo htmlspecialchars($post['excerpt'] ?? substr(strip_tags($post['content']), 0, 160)); ?>">
    <link rel="canonical" href="<?php echo getFullUrl($post['permalink']); ?>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Vazirmatn', 'Tahoma', sans-serif;
            line-height: 1.8;
            color: #333;
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        header {
            background: #2c3e50;
            color: white;
            padding: 20px 0;
            margin-bottom: 30px;
        }
        header .container {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        header a {
            color: white;
            text-decoration: none;
        }
        article {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        article h1 {
            font-size: 2rem;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        .meta {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .content {
            font-size: 1.1rem;
        }
        .content p { margin-bottom: 1.5em; }
        .content img { max-width: 100%; height: auto; border-radius: 5px; }
        .content h2, .content h3 { margin-top: 1.5em; margin-bottom: 0.5em; color: #2c3e50; }
        footer {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <a href="/"><h2><?php echo htmlspecialchars($siteTitle); ?></h2></a>
            <nav>
                <a href="/">صفحه اصلی</a>
            </nav>
        </div>
    </header>
    
    <main class="container">
        <article>
            <h1><?php echo htmlspecialchars($post['title']); ?></h1>
            <div class="meta">
                <span>نویسنده: <?php echo htmlspecialchars($authorName); ?></span>
                <span> | </span>
                <span>تاریخ: <?php echo date('Y/m/d', strtotime($post['created_at'])); ?></span>
            </div>
            <div class="content">
                <?php echo $post['content']; ?>
            </div>
        </article>
    </main>
    
    <footer>
        <p>&copy; <?php echo date('Y'); ?> <?php echo htmlspecialchars($siteTitle); ?></p>
    </footer>
</body>
</html>
    <?php
}

/**
 * Display page content
 */
function displayPage($page) {
    global $pdo;
    
    // Check if page is published
    if ($page['status'] !== 'published') {
        header('HTTP/1.0 404 Not Found');
        display404();
        return;
    }
    
    // Get site settings
    $siteTitle = 'Ghoncheye Lalehzar';
    
    // Output HTML
    ?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($page['title']); ?> - <?php echo htmlspecialchars($siteTitle); ?></title>
    <link rel="canonical" href="<?php echo getFullUrl($page['permalink']); ?>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Vazirmatn', 'Tahoma', sans-serif;
            line-height: 1.8;
            color: #333;
            background: #f5f5f5;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        header {
            background: #2c3e50;
            color: white;
            padding: 20px 0;
            margin-bottom: 30px;
        }
        header .container {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        header a {
            color: white;
            text-decoration: none;
        }
        article {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        article h1 {
            font-size: 2rem;
            margin-bottom: 30px;
            color: #2c3e50;
        }
        .content {
            font-size: 1.1rem;
        }
        .content p { margin-bottom: 1.5em; }
        .content img { max-width: 100%; height: auto; border-radius: 5px; }
        .content h2, .content h3 { margin-top: 1.5em; margin-bottom: 0.5em; color: #2c3e50; }
        footer {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <a href="/"><h2><?php echo htmlspecialchars($siteTitle); ?></h2></a>
            <nav>
                <a href="/">صفحه اصلی</a>
            </nav>
        </div>
    </header>
    
    <main class="container">
        <article>
            <h1><?php echo htmlspecialchars($page['title']); ?></h1>
            <div class="content">
                <?php echo $page['content']; ?>
            </div>
        </article>
    </main>
    
    <footer>
        <p>&copy; <?php echo date('Y'); ?> <?php echo htmlspecialchars($siteTitle); ?></p>
    </footer>
</body>
</html>
    <?php
}

/**
 * Display 404 error page
 */
function display404() {
    $siteTitle = 'Ghoncheye Lalehzar';
    ?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>صفحه یافت نشد - <?php echo htmlspecialchars($siteTitle); ?></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Vazirmatn', 'Tahoma', sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 20px;
        }
        h1 {
            font-size: 8rem;
            margin-bottom: 20px;
            text-shadow: 3px 3px 0 rgba(0,0,0,0.2);
        }
        h2 {
            font-size: 2rem;
            margin-bottom: 30px;
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 30px;
            opacity: 0.9;
        }
        a {
            display: inline-block;
            padding: 15px 40px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            transition: transform 0.3s;
        }
        a:hover {
            transform: translateY(-3px);
        }
    </style>
</head>
<body>
    <h1>404</h1>
    <h2>صفحه مورد نظر یافت نشد</h2>
    <p>متأسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.</p>
    <a href="/">بازگشت به صفحه اصلی</a>
</body>
</html>
    <?php
}
?>
