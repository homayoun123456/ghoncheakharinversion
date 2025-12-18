/**
 * Helper Utilities
 * Ghoncheye Lalehzar CMS
 */

/**
 * Generate URL-friendly slug from text
 * @param {string} text - Input text
 * @returns {string} - URL-friendly slug
 */
function generateSlug(text) {
    // Persian/Arabic character map
    const persianMap = {
        'آ': 'a', 'ا': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's',
        'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z',
        'ر': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's',
        'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f',
        'ق': 'gh', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n',
        'و': 'v', 'ه': 'h', 'ی': 'y', 'ي': 'y', 'ك': 'k', 'ة': 'h',
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
        '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
        '،': '', '؟': '', '؛': ''
    };
    
    let slug = text.toLowerCase();
    
    // Replace Persian/Arabic characters
    for (const [persian, latin] of Object.entries(persianMap)) {
        slug = slug.replace(new RegExp(persian, 'g'), latin);
    }
    
    // Replace spaces and special characters with hyphens
    slug = slug
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);
    
    return slug || `item-${Date.now()}`;
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number (Iranian format)
 * @param {string} phone - Phone number
 * @returns {boolean}
 */
function isValidPhone(phone) {
    const phoneRegex = /^(\+98|0)?9\d{9}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string
 * @returns {string} - Sanitized string
 */
function sanitizeHtml(html) {
    if (!html) return '';
    
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate random token
 * @param {number} length - Token length
 * @returns {string}
 */
function generateToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return token;
}

/**
 * Parse pagination parameters
 * @param {object} query - Query parameters
 * @returns {object} - Parsed pagination
 */
function parsePagination(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {string} locale - Locale (fa, en, ar, zh)
 * @returns {string}
 */
function formatDate(date, locale = 'fa') {
    const d = new Date(date);
    
    if (locale === 'fa') {
        return d.toLocaleDateString('fa-IR');
    } else if (locale === 'ar') {
        return d.toLocaleDateString('ar-SA');
    } else if (locale === 'zh') {
        return d.toLocaleDateString('zh-CN');
    }
    
    return d.toLocaleDateString('en-US');
}

/**
 * Extract excerpt from content
 * @param {string} content - Full content
 * @param {number} length - Excerpt length
 * @returns {string}
 */
function extractExcerpt(content, length = 160) {
    if (!content) return '';
    
    // Remove HTML tags
    const text = content.replace(/<[^>]*>/g, '');
    
    if (text.length <= length) return text;
    
    // Cut at word boundary
    const excerpt = text.substring(0, length);
    const lastSpace = excerpt.lastIndexOf(' ');
    
    return (lastSpace > 0 ? excerpt.substring(0, lastSpace) : excerpt) + '...';
}

module.exports = {
    generateSlug,
    isValidEmail,
    isValidPhone,
    sanitizeHtml,
    formatFileSize,
    generateToken,
    parsePagination,
    formatDate,
    extractExcerpt
};
