/**
 * Database Configuration - SQLite with better-sqlite3
 * Ghoncheye Lalehzar CMS
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            role TEXT DEFAULT 'editor',
            avatar TEXT,
            status TEXT DEFAULT 'active',
            last_login DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Posts table
    db.exec(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            content TEXT,
            excerpt TEXT,
            featured_image TEXT,
            category TEXT,
            tags TEXT,
            status TEXT DEFAULT 'draft',
            author_id INTEGER,
            views INTEGER DEFAULT 0,
            meta_title TEXT,
            meta_description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            published_at DATETIME,
            FOREIGN KEY (author_id) REFERENCES users(id)
        )
    `);

    // Pages table
    db.exec(`
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            content TEXT,
            template TEXT DEFAULT 'default',
            parent_id INTEGER,
            order_num INTEGER DEFAULT 0,
            status TEXT DEFAULT 'draft',
            author_id INTEGER,
            meta_title TEXT,
            meta_description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES users(id),
            FOREIGN KEY (parent_id) REFERENCES pages(id)
        )
    `);

    // Products table
    db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            description TEXT,
            short_description TEXT,
            category TEXT,
            price TEXT,
            min_order TEXT,
            unit TEXT DEFAULT 'kg',
            sizes TEXT,
            features TEXT,
            image TEXT,
            gallery TEXT,
            status TEXT DEFAULT 'active',
            featured INTEGER DEFAULT 0,
            order_num INTEGER DEFAULT 0,
            meta_title TEXT,
            meta_description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Messages table
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT NOT NULL,
            phone TEXT,
            company TEXT,
            country TEXT,
            product TEXT,
            volume TEXT,
            application TEXT,
            requirements TEXT,
            subject TEXT,
            message TEXT,
            is_read INTEGER DEFAULT 0,
            is_starred INTEGER DEFAULT 0,
            reply TEXT,
            replied_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Subscribers table
    db.exec(`
        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            status TEXT DEFAULT 'active',
            source TEXT DEFAULT 'website',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Media table
    db.exec(`
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            original_name TEXT,
            filepath TEXT NOT NULL,
            mimetype TEXT,
            size INTEGER,
            alt_text TEXT,
            caption TEXT,
            uploaded_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (uploaded_by) REFERENCES users(id)
        )
    `);

    // Settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            type TEXT DEFAULT 'text',
            group_name TEXT DEFAULT 'general',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Activity log table
    db.exec(`
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Create indexes
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
        CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
        CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
        CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
        CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);
        CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
    `);

    console.log('✅ Database initialized successfully');
}

// Seed default data
function seedDefaultData() {
    // Check if admin user exists
    const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    
    if (!adminExists) {
        // Create admin user
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.prepare(`
            INSERT INTO users (username, email, password, first_name, last_name, role, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('admin', 'admin@ghoncheye.com', hashedPassword, 'ادمین', 'سیستم', 'administrator', 'active');
        
        console.log('✅ Admin user created (admin / admin123)');
    }
    
    // Check if products exist
    const productsExist = db.prepare('SELECT COUNT(*) as count FROM products').get();
    
    if (productsExist.count === 0) {
        // Insert default products
        const products = [
            {
                name: 'غنچه تازه',
                slug: 'fresh-buds',
                short_description: 'برداشت شده در اوج کیفیت برای فرآوری فوری',
                category: 'buds',
                features: JSON.stringify(['نوع برتر Rosa Damascena', 'چیده شده در طلوع آفتاب', 'در اندازه‌های مختلف موجود', 'حفظ خواص طبیعی']),
                status: 'active'
            },
            {
                name: 'غنچه خشک صادراتی',
                slug: 'dried-export-buds',
                short_description: 'غنچه خشک با کیفیت صادراتی در اندازه‌های S/M/L',
                category: 'buds',
                features: JSON.stringify(['اندازه‌بندی استاندارد S/M/L', 'کنترل سطح رطوبت', 'حفظ رنگ و عطر طبیعی', 'بسته‌بندی وکیوم']),
                status: 'active',
                featured: 1
            },
            {
                name: 'گلبرگ خشک',
                slug: 'dried-petals',
                short_description: 'گلبرگ خشک با کیفیت بالا برای کاربردهای مختلف',
                category: 'petals',
                features: JSON.stringify(['جدا شده با دقت', 'حفظ رنگ طبیعی', 'کیفیت درجه غذایی', 'تست خلوص']),
                status: 'active'
            },
            {
                name: 'عطر گل محمدی',
                slug: 'rose-essential-oil',
                short_description: 'عطر خالص گل محمدی از Rosa Damascena',
                category: 'oil',
                features: JSON.stringify(['روش تقطیر با بخار', 'استانداردهای کیفیت بالا', 'بسته‌بندی مناسب', 'گواهی آنالیز']),
                status: 'active'
            },
            {
                name: 'گلاب',
                slug: 'rose-water',
                short_description: 'گلاب درجه صنعتی برای کاربردهای مختلف',
                category: 'water',
                features: JSON.stringify(['فرآیند تقطیر طبیعی', 'کیفیت درجه غذایی', 'نگهداری مناسب', 'تست دسته‌ای']),
                status: 'active'
            },
            {
                name: 'درجه چای',
                slug: 'tea-grade',
                short_description: 'انتخاب ویژه برای صنعت چای و نوشیدنی',
                category: 'tea',
                features: JSON.stringify(['کیفیت درجه چای', 'مرتب شده بر اساس اندازه', 'کنترل رطوبت', 'مطابق با استانداردهای ایمنی غذایی']),
                status: 'active'
            }
        ];
        
        const insertProduct = db.prepare(`
            INSERT INTO products (name, slug, short_description, category, features, status, featured)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const product of products) {
            insertProduct.run(
                product.name,
                product.slug,
                product.short_description,
                product.category,
                product.features,
                product.status,
                product.featured || 0
            );
        }
        
        console.log('✅ Default products created');
    }
    
    // Check if settings exist
    const settingsExist = db.prepare('SELECT COUNT(*) as count FROM settings').get();
    
    if (settingsExist.count === 0) {
        // Insert default settings
        const settings = [
            { key: 'site_title', value: 'غنچه لاله زار', group_name: 'general' },
            { key: 'site_tagline', value: 'تولید و صادرات غنچه گل محمدی', group_name: 'general' },
            { key: 'site_description', value: 'تولید و صادرات غنچه گل محمدی (Rosa Damascena) با کیفیت برتر', group_name: 'general' },
            { key: 'contact_email', value: 'info@ghoncheye.com', group_name: 'contact' },
            { key: 'contact_phone', value: '+98 912 212 7437', group_name: 'contact' },
            { key: 'contact_whatsapp', value: '+989122127437', group_name: 'contact' },
            { key: 'contact_address', value: 'لاله زار کرمان، ایران', group_name: 'contact' },
            { key: 'map_lat', value: '29.4633', group_name: 'contact' },
            { key: 'map_lng', value: '56.8037', group_name: 'contact' },
            { key: 'social_instagram', value: '', group_name: 'social' },
            { key: 'social_telegram', value: '', group_name: 'social' },
            { key: 'social_linkedin', value: '', group_name: 'social' },
            { key: 'primary_color', value: '#c2185b', group_name: 'appearance' },
            { key: 'secondary_color', value: '#303f9f', group_name: 'appearance' }
        ];
        
        const insertSetting = db.prepare(`
            INSERT INTO settings (key, value, group_name)
            VALUES (?, ?, ?)
        `);
        
        for (const setting of settings) {
            insertSetting.run(setting.key, setting.value, setting.group_name);
        }
        
        console.log('✅ Default settings created');
    }
}

// Initialize
initializeDatabase();
seedDefaultData();

module.exports = db;
