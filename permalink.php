<?php
/**
 * Permalink System for Ghoncheye Lalehzar CMS
 * Similar to WordPress permalink system with support for:
 * - Multiple permalink structures
 * - Custom permalinks per post/page
 * - URL redirects for changed permalinks
 * - Backward compatibility when structure changes
 */

require_once __DIR__ . '/config.php';

/**
 * Available permalink structure patterns
 */
$PERMALINK_STRUCTURES = [
    'plain' => [
        'pattern' => '/?p=%post_id%',
        'label' => 'ساده (Plain)',
        'label_en' => 'Plain',
        'example' => '/?p=123'
    ],
    'day_name' => [
        'pattern' => '/%year%/%month%/%day%/%postname%/',
        'label' => 'روز و نام',
        'label_en' => 'Day and name',
        'example' => '/2024/12/18/sample-post/'
    ],
    'month_name' => [
        'pattern' => '/%year%/%month%/%postname%/',
        'label' => 'ماه و نام',
        'label_en' => 'Month and name',
        'example' => '/2024/12/sample-post/'
    ],
    'numeric' => [
        'pattern' => '/archives/%post_id%',
        'label' => 'عددی (Numeric)',
        'label_en' => 'Numeric',
        'example' => '/archives/123'
    ],
    'post_name' => [
        'pattern' => '/%postname%/',
        'label' => 'نام نوشته (Post name)',
        'label_en' => 'Post name',
        'example' => '/sample-post/'
    ],
    'category_postname' => [
        'pattern' => '/%category%/%postname%/',
        'label' => 'دسته‌بندی و نام',
        'label_en' => 'Category and name',
        'example' => '/news/sample-post/'
    ],
    'custom' => [
        'pattern' => '',
        'label' => 'سفارشی (Custom)',
        'label_en' => 'Custom Structure',
        'example' => ''
    ]
];

/**
 * Get permalink setting value
 */
function getPermalinkSetting($key, $default = null) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM permalink_settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result ? $result['setting_value'] : $default;
    } catch (Exception $e) {
        error_log("Error getting permalink setting: " . $e->getMessage());
        return $default;
    }
}

/**
 * Update permalink setting
 */
function updatePermalinkSetting($key, $value) {
    global $pdo;
    
    try {
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM permalink_settings WHERE setting_key = ?");
        $checkStmt->execute([$key]);
        
        if ($checkStmt->fetchColumn() > 0) {
            $stmt = $pdo->prepare("UPDATE permalink_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?");
            $stmt->execute([$value, $key]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO permalink_settings (setting_key, setting_value) VALUES (?, ?)");
            $stmt->execute([$key, $value]);
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Error updating permalink setting: " . $e->getMessage());
        return false;
    }
}

/**
 * Generate slug from title (supports Persian/Arabic)
 */
function generateSlug($title, $separator = '-') {
    // Convert to lowercase (for Latin characters)
    $slug = mb_strtolower($title, 'UTF-8');
    
    // Replace Persian/Arabic characters that should be preserved
    // Keep Persian letters, Arabic letters, English letters, and numbers
    $slug = preg_replace('/[^\p{L}\p{N}\s-]/u', '', $slug);
    
    // Replace whitespace and multiple dashes with single separator
    $slug = preg_replace('/[\s_]+/', $separator, $slug);
    $slug = preg_replace('/-+/', $separator, $slug);
    
    // Trim separators from ends
    $slug = trim($slug, $separator);
    
    // If empty (all special chars), generate random slug
    if (empty($slug)) {
        $slug = 'post-' . time();
    }
    
    return $slug;
}

/**
 * Generate permalink for a post
 */
function generatePostPermalink($post, $structure = null) {
    global $pdo;
    
    // If post has a custom permalink, use that
    if (!empty($post['custom_permalink'])) {
        return $post['custom_permalink'];
    }
    
    // If post already has a stored permalink and we want to preserve it
    if (!empty($post['permalink']) && !empty($post['permalink_structure'])) {
        return $post['permalink'];
    }
    
    // Get the permalink structure
    if ($structure === null) {
        $structure = getPermalinkSetting('post_permalink_structure', '/%year%/%month%/%postname%/');
    }
    
    // Parse the date
    $createdAt = strtotime($post['created_at'] ?? date('Y-m-d H:i:s'));
    $year = date('Y', $createdAt);
    $month = date('m', $createdAt);
    $day = date('d', $createdAt);
    
    // Generate slug if not exists
    $slug = !empty($post['slug']) ? $post['slug'] : generateSlug($post['title']);
    
    // Get category if needed
    $category = 'uncategorized';
    if (isset($post['category_id'])) {
        // Fetch category slug
        try {
            $catStmt = $pdo->prepare("SELECT slug FROM categories WHERE id = ?");
            $catStmt->execute([$post['category_id']]);
            $catResult = $catStmt->fetch(PDO::FETCH_ASSOC);
            if ($catResult) {
                $category = $catResult['slug'];
            }
        } catch (Exception $e) {
            // Use default
        }
    }
    
    // Replace placeholders
    $replacements = [
        '%year%' => $year,
        '%month%' => $month,
        '%day%' => $day,
        '%postname%' => $slug,
        '%post_id%' => $post['id'] ?? 0,
        '%category%' => $category,
        '%author%' => $post['author_slug'] ?? 'author'
    ];
    
    $permalink = str_replace(array_keys($replacements), array_values($replacements), $structure);
    
    // Ensure proper formatting
    $useTrailingSlash = getPermalinkSetting('use_trailing_slash', '1') === '1';
    
    // Clean up double slashes
    $permalink = preg_replace('#/+#', '/', $permalink);
    
    // Add or remove trailing slash
    if ($useTrailingSlash && substr($permalink, -1) !== '/') {
        $permalink .= '/';
    } elseif (!$useTrailingSlash && substr($permalink, -1) === '/') {
        $permalink = rtrim($permalink, '/');
    }
    
    // Ensure starts with /
    if (substr($permalink, 0, 1) !== '/') {
        $permalink = '/' . $permalink;
    }
    
    return $permalink;
}

/**
 * Generate permalink for a page
 */
function generatePagePermalink($page) {
    // If page has a custom permalink, use that
    if (!empty($page['custom_permalink'])) {
        return $page['custom_permalink'];
    }
    
    // If page already has a stored permalink
    if (!empty($page['permalink'])) {
        return $page['permalink'];
    }
    
    $structure = getPermalinkSetting('page_permalink_structure', '/%pagename%/');
    
    // Generate slug if not exists
    $slug = !empty($page['slug']) ? $page['slug'] : generateSlug($page['title']);
    
    // Handle parent pages for hierarchy
    $parentSlug = '';
    if (isset($page['parent_id']) && $page['parent_id'] > 0) {
        global $pdo;
        try {
            $parentStmt = $pdo->prepare("SELECT slug FROM pages WHERE id = ?");
            $parentStmt->execute([$page['parent_id']]);
            $parentResult = $parentStmt->fetch(PDO::FETCH_ASSOC);
            if ($parentResult) {
                $parentSlug = $parentResult['slug'] . '/';
            }
        } catch (Exception $e) {
            // Use default
        }
    }
    
    $replacements = [
        '%pagename%' => $parentSlug . $slug,
        '%page_id%' => $page['id'] ?? 0
    ];
    
    $permalink = str_replace(array_keys($replacements), array_values($replacements), $structure);
    
    // Ensure proper formatting
    $useTrailingSlash = getPermalinkSetting('use_trailing_slash', '1') === '1';
    
    // Clean up double slashes
    $permalink = preg_replace('#/+#', '/', $permalink);
    
    // Add or remove trailing slash
    if ($useTrailingSlash && substr($permalink, -1) !== '/') {
        $permalink .= '/';
    } elseif (!$useTrailingSlash && substr($permalink, -1) === '/') {
        $permalink = rtrim($permalink, '/');
    }
    
    // Ensure starts with /
    if (substr($permalink, 0, 1) !== '/') {
        $permalink = '/' . $permalink;
    }
    
    return $permalink;
}

/**
 * Save permalink for a post (stores the permalink with the post)
 */
function savePostPermalink($postId, $permalink = null, $structure = null) {
    global $pdo;
    
    try {
        // Get current post
        $stmt = $pdo->prepare("SELECT * FROM posts WHERE id = ?");
        $stmt->execute([$postId]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$post) {
            return false;
        }
        
        // Generate permalink if not provided
        if ($permalink === null) {
            $structure = $structure ?? getPermalinkSetting('post_permalink_structure', '/%year%/%month%/%postname%/');
            $permalink = generatePostPermalink($post, $structure);
        }
        
        // Save permalink and structure
        $updateStmt = $pdo->prepare("UPDATE posts SET permalink = ?, permalink_structure = ? WHERE id = ?");
        $updateStmt->execute([$permalink, $structure, $postId]);
        
        return $permalink;
    } catch (Exception $e) {
        error_log("Error saving post permalink: " . $e->getMessage());
        return false;
    }
}

/**
 * Save permalink for a page
 */
function savePagePermalink($pageId, $permalink = null) {
    global $pdo;
    
    try {
        // Get current page
        $stmt = $pdo->prepare("SELECT * FROM pages WHERE id = ?");
        $stmt->execute([$pageId]);
        $page = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$page) {
            return false;
        }
        
        // Generate permalink if not provided
        if ($permalink === null) {
            $permalink = generatePagePermalink($page);
        }
        
        // Save permalink
        $updateStmt = $pdo->prepare("UPDATE pages SET permalink = ? WHERE id = ?");
        $updateStmt->execute([$permalink, $pageId]);
        
        return $permalink;
    } catch (Exception $e) {
        error_log("Error saving page permalink: " . $e->getMessage());
        return false;
    }
}

/**
 * Set custom permalink for a post
 */
function setCustomPostPermalink($postId, $customPermalink) {
    global $pdo;
    
    try {
        // Get current permalink for redirect
        $stmt = $pdo->prepare("SELECT permalink FROM posts WHERE id = ?");
        $stmt->execute([$postId]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Clean the custom permalink
        $customPermalink = sanitizePermalink($customPermalink);
        
        // Save old URL for redirect if needed
        if ($post && !empty($post['permalink']) && $post['permalink'] !== $customPermalink) {
            addUrlRedirect($post['permalink'], $customPermalink, 'post', $postId);
        }
        
        // Update post
        $updateStmt = $pdo->prepare("UPDATE posts SET custom_permalink = ?, permalink = ? WHERE id = ?");
        $updateStmt->execute([$customPermalink, $customPermalink, $postId]);
        
        return $customPermalink;
    } catch (Exception $e) {
        error_log("Error setting custom permalink: " . $e->getMessage());
        return false;
    }
}

/**
 * Set custom permalink for a page
 */
function setCustomPagePermalink($pageId, $customPermalink) {
    global $pdo;
    
    try {
        // Get current permalink for redirect
        $stmt = $pdo->prepare("SELECT permalink FROM pages WHERE id = ?");
        $stmt->execute([$pageId]);
        $page = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Clean the custom permalink
        $customPermalink = sanitizePermalink($customPermalink);
        
        // Save old URL for redirect if needed
        if ($page && !empty($page['permalink']) && $page['permalink'] !== $customPermalink) {
            addUrlRedirect($page['permalink'], $customPermalink, 'page', $pageId);
        }
        
        // Update page
        $updateStmt = $pdo->prepare("UPDATE pages SET custom_permalink = ?, permalink = ? WHERE id = ?");
        $updateStmt->execute([$customPermalink, $customPermalink, $pageId]);
        
        return $customPermalink;
    } catch (Exception $e) {
        error_log("Error setting custom permalink: " . $e->getMessage());
        return false;
    }
}

/**
 * Sanitize permalink URL
 */
function sanitizePermalink($url) {
    // Ensure starts with /
    if (substr($url, 0, 1) !== '/') {
        $url = '/' . $url;
    }
    
    // Remove query strings
    $url = strtok($url, '?');
    
    // Clean up double slashes
    $url = preg_replace('#/+#', '/', $url);
    
    // Allow Persian/Arabic characters but sanitize dangerous ones
    $url = preg_replace('/[<>"\'\\\]/', '', $url);
    
    return $url;
}

/**
 * Add URL redirect
 */
function addUrlRedirect($oldUrl, $newUrl, $contentType = null, $contentId = null, $redirectType = 301) {
    global $pdo;
    
    if ($oldUrl === $newUrl) {
        return false;
    }
    
    try {
        // Check if redirect already exists
        $checkStmt = $pdo->prepare("SELECT id FROM url_redirects WHERE old_url = ?");
        $checkStmt->execute([$oldUrl]);
        
        if ($checkStmt->fetch()) {
            // Update existing redirect
            $updateStmt = $pdo->prepare("UPDATE url_redirects SET new_url = ?, redirect_type = ?, content_type = ?, content_id = ? WHERE old_url = ?");
            $updateStmt->execute([$newUrl, $redirectType, $contentType, $contentId, $oldUrl]);
        } else {
            // Create new redirect
            $insertStmt = $pdo->prepare("INSERT INTO url_redirects (old_url, new_url, redirect_type, content_type, content_id) VALUES (?, ?, ?, ?, ?)");
            $insertStmt->execute([$oldUrl, $newUrl, $redirectType, $contentType, $contentId]);
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Error adding URL redirect: " . $e->getMessage());
        return false;
    }
}

/**
 * Resolve URL to content
 */
function resolveUrl($url) {
    global $pdo;
    
    $url = sanitizePermalink($url);
    
    // First check for redirects
    try {
        $redirectStmt = $pdo->prepare("SELECT * FROM url_redirects WHERE old_url = ?");
        $redirectStmt->execute([$url]);
        $redirect = $redirectStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($redirect) {
            return [
                'type' => 'redirect',
                'redirect_to' => $redirect['new_url'],
                'redirect_type' => $redirect['redirect_type'],
                'content_type' => $redirect['content_type'],
                'content_id' => $redirect['content_id']
            ];
        }
    } catch (Exception $e) {
        error_log("Error checking redirects: " . $e->getMessage());
    }
    
    // Try to find in posts
    try {
        $postStmt = $pdo->prepare("SELECT * FROM posts WHERE permalink = ? OR custom_permalink = ? LIMIT 1");
        $postStmt->execute([$url, $url]);
        $post = $postStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($post) {
            return [
                'type' => 'post',
                'content' => $post
            ];
        }
    } catch (Exception $e) {
        error_log("Error finding post: " . $e->getMessage());
    }
    
    // Try to find in pages
    try {
        $pageStmt = $pdo->prepare("SELECT * FROM pages WHERE permalink = ? OR custom_permalink = ? LIMIT 1");
        $pageStmt->execute([$url, $url]);
        $page = $pageStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($page) {
            return [
                'type' => 'page',
                'content' => $page
            ];
        }
    } catch (Exception $e) {
        error_log("Error finding page: " . $e->getMessage());
    }
    
    // Try to match by slug in URL
    $urlParts = explode('/', trim($url, '/'));
    $potentialSlug = end($urlParts);
    
    if (!empty($potentialSlug)) {
        try {
            // Try posts by slug
            $postStmt = $pdo->prepare("SELECT * FROM posts WHERE slug = ? LIMIT 1");
            $postStmt->execute([$potentialSlug]);
            $post = $postStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($post) {
                return [
                    'type' => 'post',
                    'content' => $post
                ];
            }
            
            // Try pages by slug
            $pageStmt = $pdo->prepare("SELECT * FROM pages WHERE slug = ? LIMIT 1");
            $pageStmt->execute([$potentialSlug]);
            $page = $pageStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($page) {
                return [
                    'type' => 'page',
                    'content' => $page
                ];
            }
        } catch (Exception $e) {
            error_log("Error finding by slug: " . $e->getMessage());
        }
    }
    
    return [
        'type' => 'not_found'
    ];
}

/**
 * Get all permalink structures
 */
function getPermalinkStructures() {
    global $PERMALINK_STRUCTURES;
    return $PERMALINK_STRUCTURES;
}

/**
 * Check if permalink is unique
 */
function isPermalinkUnique($permalink, $contentType = 'post', $excludeId = null) {
    global $pdo;
    
    try {
        if ($contentType === 'post') {
            $sql = "SELECT COUNT(*) FROM posts WHERE (permalink = ? OR custom_permalink = ?)";
            if ($excludeId) {
                $sql .= " AND id != ?";
            }
            $stmt = $pdo->prepare($sql);
            if ($excludeId) {
                $stmt->execute([$permalink, $permalink, $excludeId]);
            } else {
                $stmt->execute([$permalink, $permalink]);
            }
        } else {
            $sql = "SELECT COUNT(*) FROM pages WHERE (permalink = ? OR custom_permalink = ?)";
            if ($excludeId) {
                $sql .= " AND id != ?";
            }
            $stmt = $pdo->prepare($sql);
            if ($excludeId) {
                $stmt->execute([$permalink, $permalink, $excludeId]);
            } else {
                $stmt->execute([$permalink, $permalink]);
            }
        }
        
        return $stmt->fetchColumn() == 0;
    } catch (Exception $e) {
        error_log("Error checking permalink uniqueness: " . $e->getMessage());
        return false;
    }
}

/**
 * Ensure permalink is unique by adding suffix if needed
 */
function ensureUniquePermalink($permalink, $contentType = 'post', $excludeId = null) {
    $originalPermalink = $permalink;
    $counter = 1;
    
    while (!isPermalinkUnique($permalink, $contentType, $excludeId)) {
        // Remove trailing slash for manipulation
        $base = rtrim($originalPermalink, '/');
        $permalink = $base . '-' . $counter;
        
        // Add trailing slash if original had one
        if (substr($originalPermalink, -1) === '/') {
            $permalink .= '/';
        }
        
        $counter++;
        
        // Safety limit
        if ($counter > 100) {
            $permalink = $base . '-' . time();
            break;
        }
    }
    
    return $permalink;
}

/**
 * Get all URL redirects
 */
function getUrlRedirects($limit = 50, $offset = 0) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM url_redirects ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        error_log("Error getting URL redirects: " . $e->getMessage());
        return [];
    }
}

/**
 * Delete URL redirect
 */
function deleteUrlRedirect($id) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("DELETE FROM url_redirects WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    } catch (Exception $e) {
        error_log("Error deleting URL redirect: " . $e->getMessage());
        return false;
    }
}

/**
 * Update all existing posts with permalinks based on current structure
 * (Only for posts that don't have permalinks yet)
 */
function updateMissingPermalinks() {
    global $pdo;
    
    $updated = 0;
    
    try {
        // Update posts without permalinks
        $postsStmt = $pdo->query("SELECT * FROM posts WHERE permalink IS NULL OR permalink = ''");
        $posts = $postsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        $structure = getPermalinkSetting('post_permalink_structure', '/%year%/%month%/%postname%/');
        
        foreach ($posts as $post) {
            $permalink = generatePostPermalink($post, $structure);
            $permalink = ensureUniquePermalink($permalink, 'post', $post['id']);
            savePostPermalink($post['id'], $permalink, $structure);
            $updated++;
        }
        
        // Update pages without permalinks
        $pagesStmt = $pdo->query("SELECT * FROM pages WHERE permalink IS NULL OR permalink = ''");
        $pages = $pagesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($pages as $page) {
            $permalink = generatePagePermalink($page);
            $permalink = ensureUniquePermalink($permalink, 'page', $page['id']);
            savePagePermalink($page['id'], $permalink);
            $updated++;
        }
        
        return $updated;
    } catch (Exception $e) {
        error_log("Error updating missing permalinks: " . $e->getMessage());
        return false;
    }
}

/**
 * Get full URL for a post/page
 */
function getFullUrl($permalink, $baseUrl = null) {
    if ($baseUrl === null) {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $baseUrl = $protocol . '://' . $host;
    }
    
    return rtrim($baseUrl, '/') . $permalink;
}

/**
 * Preview permalink without saving
 */
function previewPermalink($data, $contentType = 'post', $structure = null) {
    if ($contentType === 'post') {
        return generatePostPermalink($data, $structure);
    } else {
        return generatePagePermalink($data);
    }
}
?>
