# 🌹 Ghoncheye Lalehzar - Backend API

Complete backend API server for the Ghoncheye Lalehzar CMS.

## 📋 Features

- **Authentication** - JWT-based authentication with role-based access control
- **Posts Management** - Full CRUD for blog posts with SEO fields
- **Pages Management** - Static pages with hierarchical structure
- **Products Management** - Product catalog with categories and features
- **Messages** - Contact form submissions with read/star status
- **Subscribers** - Newsletter subscription management with export
- **Media Library** - File upload and management
- **Settings** - Site configuration with grouped settings
- **Users** - User management (admin only)

## 🚀 Quick Start

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

## 📁 Project Structure

```
backend/
├── server.js           # Main Express server
├── database.js         # SQLite database setup
├── package.json        # Dependencies
├── middleware/
│   └── auth.js         # Authentication middleware
├── routes/
│   ├── auth.js         # Authentication endpoints
│   ├── posts.js        # Posts CRUD
│   ├── pages.js        # Pages CRUD
│   ├── products.js     # Products CRUD
│   ├── messages.js     # Messages management
│   ├── subscribers.js  # Subscribers management
│   ├── media.js        # File upload/management
│   ├── settings.js     # Site settings
│   └── users.js        # User management
└── utils/
    ├── helpers.js      # Utility functions
    ├── email.js        # Email service
    └── validation.js   # Input validation
```

## 🔐 Authentication

### Login
```
POST /api/auth/login
Body: { username, password }
Response: { success, token, user }
```

### Check Auth
```
GET /api/auth/check
Header: Authorization: Bearer <token>
Response: { success, authenticated, user }
```

### Update Profile
```
PUT /api/auth/profile
Body: { first_name, last_name, email }
```

### Change Password
```
PUT /api/auth/password
Body: { current_password, new_password }
```

## 📝 API Endpoints

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | List all posts |
| GET | `/api/posts/:id` | Get post by ID or slug |
| POST | `/api/posts` | Create new post |
| PUT | `/api/posts/:id` | Update post |
| DELETE | `/api/posts/:id` | Delete post |

### Pages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pages` | List all pages |
| GET | `/api/pages/:id` | Get page by ID or slug |
| POST | `/api/pages` | Create new page |
| PUT | `/api/pages/:id` | Update page |
| DELETE | `/api/pages/:id` | Delete page |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get product by ID or slug |
| POST | `/api/products` | Create new product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages` | List all messages |
| GET | `/api/messages/:id` | Get message details |
| PUT | `/api/messages/:id` | Update message (read/star) |
| DELETE | `/api/messages/:id` | Delete message |
| PUT | `/api/messages/bulk/mark-read` | Mark multiple as read |

### Subscribers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscribers` | List all subscribers |
| POST | `/api/subscribers` | Add subscriber |
| PUT | `/api/subscribers/:id` | Update subscriber |
| DELETE | `/api/subscribers/:id` | Delete subscriber |
| GET | `/api/subscribers/export/csv` | Export as CSV |

### Media
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/media` | List all media |
| GET | `/api/media/:id` | Get media details |
| POST | `/api/media/upload` | Upload single file |
| POST | `/api/media/upload-multiple` | Upload multiple files |
| PUT | `/api/media/:id` | Update media metadata |
| DELETE | `/api/media/:id` | Delete media |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get all settings |
| GET | `/api/settings/public` | Get public settings |
| PUT | `/api/settings/:key` | Update single setting |
| PUT | `/api/settings` | Update multiple settings |

### Public Endpoints (No Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contact` | Submit contact form |
| POST | `/api/subscribe` | Subscribe to newsletter |
| GET | `/api/unsubscribe/:email` | Unsubscribe |
| GET | `/api/settings/public` | Get public settings |
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Dashboard statistics |

## 🗃️ Database Schema

### Users
```sql
id, username, email, password, first_name, last_name, role, avatar, status, last_login, created_at, updated_at
```

### Posts
```sql
id, title, slug, content, excerpt, featured_image, category, tags, status, author_id, views, meta_title, meta_description, created_at, updated_at, published_at
```

### Products
```sql
id, name, slug, description, short_description, category, price, min_order, unit, sizes, features, image, gallery, status, featured, order_num, meta_title, meta_description, created_at, updated_at
```

### Messages
```sql
id, name, email, phone, company, country, product, volume, application, requirements, subject, message, is_read, is_starred, reply, replied_at, created_at
```

### Subscribers
```sql
id, email, name, status, source, created_at, updated_at
```

## 🔧 Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| JWT_SECRET | (generated) | JWT signing secret |
| NODE_ENV | development | Environment mode |
| SMTP_HOST | - | Email SMTP host |
| SMTP_USER | - | SMTP username |
| SMTP_PASS | - | SMTP password |

## 👤 Default Admin

```
Username: admin
Password: admin123
```

⚠️ **Important**: Change the default password in production!

## 📦 Dependencies

- `express` - Web framework
- `better-sqlite3` - SQLite database
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `multer` - File uploads
- `cors` - Cross-origin support
- `express-session` - Session management

## 📄 License

MIT License - Ghoncheye Lalehzar
