# Ghoncheye Lalehzar Admin Panel - Setup Instructions

## 🎯 Overview
The admin panel functionality has been fully implemented with a backend API system that allows all features to work properly.

## ✅ Completed Backend Implementation
- **API System**: Complete PHP API at `api.php` with SQLite database
- **Database**: Automatic SQLite database with tables for posts, pages, users, media
- **Authentication**: Login/logout system with session management
- **Functionality**: All admin features (posts, pages, users, media, etc.) are now working

## 🔧 Key Files Created/Modified
- `api.php` - Main API endpoint
- `config.php` - Database configuration
- `admin/auth.js` - Updated authentication system
- All admin HTML files - Updated API endpoints

## 🚀 How to Deploy

### 1. Server Requirements
- Web server with PHP support (7.4 or higher)
- SQLite support enabled in PHP

### 2. Upload Files
Upload all files to your web server. The structure should be:
```
your-domain.com/
├── admin/
│   ├── login.html
│   ├── dashboard.html
│   └── ... (other admin files)
├── api.php
├── config.php
├── db/ (will be created automatically)
└── ... (other website files)
```

### 3. Default Login
- **URL**: `yoursite.com/admin/login.html`
- **Username**: `admin`
- **Password**: `admin123`

### 4. Database Initialization
The system will automatically create the SQLite database file in the `db/` directory on first use.

## 📋 Admin Panel Features Now Working
✓ Dashboard with statistics  
✓ Posts management (create, edit, delete)  
✓ Pages management  
✓ Media library  
✓ User management  
✓ Settings  
✓ Content editor  
✓ All other admin functions

## ⚠️ Important Notes
- The database file (`db/database.sqlite`) must be writable by the web server
- Change the default password after first login
- If you get a 500 error, check that PHP and SQLite are properly enabled on your server
- For best security, use HTTPS for the admin panel

## 🛠️ Troubleshooting
- If pages don't load, check that your server supports PHP
- If login fails, ensure the database was created properly in the `db/` folder
- If API calls fail, verify that the web server can write to the `db/` directory