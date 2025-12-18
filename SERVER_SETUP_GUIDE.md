# ☑️ Pre-Deployment Checklist - Server Requirements

## 🚨 **CURRENT STATUS: NOT READY FOR DEPLOYMENT**

---

## ❌ **موارد مفقود:**

### **1. PHP نصب نشده** 
```
Status: ❌ NOT INSTALLED
Required: PHP 7.4 or higher
SQLite Support: Required
```

### **2. Web Server نصب نشده**
```
Status: ❌ CHECKING...
Required: Apache / Nginx
```

### **3. Database Setup نشده**
```
Status: ⏳ PENDING
SQLite: Automatic when PHP runs
```

---

## ✅ **برای اجرا روی سرور نیاز دارید:**

### **Server Requirements**

1. **Web Server** (یکی از اینها):
   - Apache 2.4+
   - Nginx 1.10+
   - IIS 7.0+
   - PHP Built-in Server (فقط برای development)

2. **PHP Runtime** ✅ NEEDED
   - Version: 7.4+ (بهتر: 8.0+)
   - Extensions:
     - PDO (Database)
     - SQLite3 (Database)
     - JSON (API)
     - OpenSSL (HTTPS)
     - cURL (HTTP requests)

3. **Database** ✅ AUTOMATIC
   - SQLite 3.x
   - ایجاد خودکار در اولین اجرا

4. **File Permissions**
   - `/db/` directory: Writable (755)
   - `/uploads/` directory: Writable (755)
   - Config files: Readable (644)

---

## 🚀 **گزینه‌های اجرا:**

### **Option 1: PHP Built-in Server** (برای Development)
```bash
# سریع‌ترین برای تست
php -S localhost:8000

# سپس بروید به: http://localhost:8000
```

### **Option 2: Apache + PHP** (برای Production)
```bash
# نیاز به Apache + PHP-FPM
# کاملاً production-ready
```

### **Option 3: Nginx + PHP-FPM** (برای Production)
```bash
# بهترین performance
# کاملاً production-ready
```

### **Option 4: Docker** (بهترین راه)
```dockerfile
FROM php:8.1-apache
RUN docker-php-ext-install pdo pdo_sqlite
```

---

## 📋 **اگر PHP را نصب نکردید:**

### **روی Windows:**

#### **Option A: XAMPP** (آسان‌ترین)
1. XAMPP را دانلود کنید: https://www.apachefriends.org/
2. نصب کنید
3. پروژه را در `htdocs/` قرار دهید
4. Apache را شروع کنید
5. بروید به: http://localhost/ghoncheye

#### **Option B: PHP Standalone**
```powershell
# 1. دانلود PHP
# 2. Extract کنید
# 3. Add به PATH
php -S localhost:8000
```

---

## 🐧 **اگر روی Linux/Mac باشید:**

```bash
# Ubuntu/Debian
sudo apt-get install php php-sqlite3 apache2 libapache2-mod-php

# macOS (با Homebrew)
brew install php sqlite
```

---

## 🔍 **برای شروع فوری (Development):**

### **Step 1: Install PHP**
```bash
# Windows: دانلود XAMPP
# Linux: sudo apt-get install php
# macOS: brew install php
```

### **Step 2: Navigate to project**
```bash
cd "path/to/project"
```

### **Step 3: Run PHP Server**
```bash
php -S localhost:8000
```

### **Step 4: Open in browser**
```
http://localhost:8000
```

### **Step 5: Login**
```
Username: admin
Password: admin123
```

---

## 🛠️ **Installation Guide by OS:**

### **Windows 10/11**

#### **Method 1: XAMPP (Recommended)**
```
1. Download: https://www.apachefriends.org/
2. Run installer
3. Install to: C:\xampp
4. Start Apache
5. Copy project to: C:\xampp\htdocs\ghoncheye
6. Visit: http://localhost/ghoncheye
```

#### **Method 2: PHP Only**
```powershell
# Download PHP from https://www.php.net/downloads
# Extract to: C:\php
# Add to PATH
php -S localhost:8000
```

---

### **Linux (Ubuntu/Debian)**

```bash
# Update packages
sudo apt-get update

# Install PHP with required extensions
sudo apt-get install -y \
    php \
    php-cli \
    php-fpm \
    php-sqlite3 \
    php-pdo \
    php-json \
    php-curl \
    apache2 \
    libapache2-mod-php

# Enable Apache PHP module
sudo a2enmod php8.1

# Restart Apache
sudo systemctl restart apache2

# Copy project
sudo cp -r /path/to/project /var/www/html/ghoncheye

# Fix permissions
sudo chown -R www-data:www-data /var/www/html/ghoncheye
sudo chmod -R 755 /var/www/html/ghoncheye
sudo chmod -R 775 /var/www/html/ghoncheye/db

# Visit: http://localhost/ghoncheye
```

---

### **macOS**

```bash
# Install PHP
brew install php

# Install SQLite support
brew install php@8.1

# Or use XAMPP for macOS
# Download: https://www.apachefriends.org/
```

---

## ✨ **What Files Are Already Ready:**

```
✅ api.php - API Endpoints (with security)
✅ config.php - Database Config (SQLite)
✅ index.html - Frontend
✅ admin/ - Admin Panel
   ✅ login.html - Login Page
   ✅ auth.js - Authentication
   ✅ api-client.js - API Client
   ✅ dashboard.js - Dashboard Script
✅ db/ - Database (auto-created)
✅ uploads/ - Media uploads
```

---

## 🚀 **Quick Start (Fastest Way):**

### **Windows with XAMPP:**
```
1. Download XAMPP
2. Install & Start
3. Copy project to htdocs
4. Visit http://localhost
5. Login: admin / admin123
```

### **Linux/Mac with PHP:**
```bash
# In project directory
php -S localhost:8000

# Visit http://localhost:8000
# Login: admin / admin123
```

---

## 🔒 **Security Reminders:**

⚠️ **Before Going to Production:**
- [ ] Change default admin password
- [ ] Set environment variables
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall
- [ ] Set proper file permissions
- [ ] Enable error logging
- [ ] Disable debug mode
- [ ] Backup database regularly

---

## 📊 **Deployment Checklist:**

### **Pre-Deployment**
- [ ] PHP installed (7.4+)
- [ ] SQLite support enabled
- [ ] Web server configured
- [ ] File permissions set (755/775)
- [ ] Database directory writable
- [ ] Uploads directory writable

### **Configuration**
- [ ] Database created
- [ ] Admin user set
- [ ] CORS configured
- [ ] JWT secret set
- [ ] Error logging enabled
- [ ] HTTPS configured

### **Testing**
- [ ] Login works
- [ ] API endpoints respond
- [ ] Database operations work
- [ ] File uploads work
- [ ] Sessions persist
- [ ] Error messages display

### **Optimization**
- [ ] Caching configured
- [ ] Assets minified
- [ ] Images optimized
- [ ] Database indexed
- [ ] Logging configured
- [ ] Monitoring set up

---

## 🆘 **Common Issues:**

### **"PHP not found"**
→ PHP is not installed or not in PATH
→ Install PHP first, then try again

### **"Database error"**
→ SQLite not enabled in PHP
→ Check: `php -m | grep sqlite`

### **"Permission denied"**
→ Fix: `chmod -R 755 /path/to/project`

### **"Port already in use"**
→ Use different port: `php -S localhost:8001`

---

## 📞 **Next Steps:**

1. **Install PHP** (if not already installed)
2. **Run the server** (use PHP built-in or Apache)
3. **Test login** with admin/admin123
4. **Review logs** for any errors
5. **Start integration** with frontend

---

**Status**: 🔴 **NOT READY** (PHP needed)
**Action**: Install PHP and Web Server
**Time**: 15-30 minutes for setup

---

## 🎯 **After Setup:**

Once PHP is installed:
1. Run: `php -S localhost:8000`
2. Open: http://localhost:8000
3. Login: admin / admin123
4. Everything should work! ✅

