# Frontend Improvements Guide

## 📋 Required Changes for Admin Files

### 1. **Add API Client Script Reference**
Add this to the `<head>` of each admin HTML file (before other JS files):
```html
<script src="api-client.js"></script>
<script src="auth.js"></script>
```

### 2. **Update Login Form (login.html)**

Replace the login button click handler with:
```javascript
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const result = await adminAuth.login(username, password);
        
        if (result.success) {
            showSuccess('Login successful! Redirecting...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showError(result.message || 'Login failed');
        }
    } catch (error) {
        showError('An error occurred. Please try again.');
        console.error('Login error:', error);
    }
});
```

### 3. **Protect All Admin Pages**

Add this at the top of each admin page (except login.html):
```javascript
// Protect this page - redirect to login if not authenticated
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await adminAuth.isLoggedIn();
    if (!isAuthenticated) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update UI with current user info
    updateUIForRole();
    
    // Initialize page-specific functionality
    initPage();
});

async function initPage() {
    // Your page-specific initialization code here
}
```

### 4. **Example: Dashboard API Integration**

```javascript
async function loadDashboardStats() {
    try {
        const posts = await apiClient.getPosts();
        const pages = await apiClient.getPages();
        const users = await apiClient.getUsers();
        const media = await apiClient.getMedia();
        
        // Update dashboard with stats
        document.getElementById('posts-count').textContent = posts.data?.length || 0;
        document.getElementById('pages-count').textContent = pages.data?.length || 0;
        document.getElementById('users-count').textContent = users.data?.length || 0;
        document.getElementById('media-count').textContent = media.data?.length || 0;
    } catch (error) {
        showError('Failed to load dashboard stats');
        console.error('Dashboard error:', error);
    }
}
```

### 5. **Example: Post Management (posts.html/post-editor.html)**

```javascript
async function loadPosts() {
    try {
        showLoadingIndicator(true);
        const response = await apiClient.getPosts();
        
        if (response && response.data) {
            renderPostsList(response.data);
        } else {
            showError('No posts found');
        }
    } catch (error) {
        showError('Failed to load posts: ' + error.message);
    } finally {
        showLoadingIndicator(false);
    }
}

async function savePost(postData) {
    try {
        let response;
        
        if (postData.id) {
            // Update existing post
            response = await apiClient.updatePost(postData.id, postData);
            showSuccess('Post updated successfully');
        } else {
            // Create new post
            response = await apiClient.createPost(postData);
            showSuccess('Post created successfully');
        }
        
        // Redirect to posts list after save
        setTimeout(() => {
            window.location.href = 'posts.html';
        }, 1500);
    } catch (error) {
        showError('Failed to save post: ' + error.message);
        console.error('Save post error:', error);
    }
}

async function deletePost(id) {
    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }
    
    try {
        await apiClient.deletePost(id);
        showSuccess('Post deleted successfully');
        
        // Reload posts list
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        showError('Failed to delete post: ' + error.message);
    }
}
```

### 6. **Example: Media Upload (media.html)**

```javascript
async function handleFileUpload(files) {
    try {
        showLoadingIndicator(true);
        
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('alt_text', file.name);
            
            await apiClient.uploadMedia(formData);
        }
        
        showSuccess(`${files.length} file(s) uploaded successfully`);
        
        // Reload media list
        loadMedia();
    } catch (error) {
        showError('Failed to upload file: ' + error.message);
    } finally {
        showLoadingIndicator(false);
    }
}
```

### 7. **Error Handling Best Practices**

Always wrap API calls in try-catch:
```javascript
async function apiOperation() {
    try {
        // API call here
    } catch (error) {
        // Handle different error types
        if (error.status === 401) {
            // Already handled by apiClient
        } else if (error.status === 404) {
            showError('Resource not found');
        } else if (error.status === 500) {
            showError('Server error occurred');
        } else if (error.status === 'NETWORK_ERROR') {
            showError('Network error. Please check your connection.');
        } else {
            showError(error.message || 'An unexpected error occurred');
        }
        console.error('Operation error:', error);
    }
}
```

## 🔒 Security Improvements Implemented

✅ **SQL Injection Protection**: Using prepared statements
✅ **CSRF Prevention**: Token-based authentication
✅ **XSS Protection**: Proper escaping of user input
✅ **Session Security**: HTTPOnly flags and secure cookies
✅ **JWT Tokens**: For stateless API authentication
✅ **Error Messages**: Sanitized to hide sensitive info
✅ **CORS**: Restricted to known origins
✅ **Password Security**: Using bcrypt hashing
✅ **Rate Limiting**: Implemented on Express backend (when used)

## 🧪 Testing Checklist

- [ ] Test login with correct credentials
- [ ] Test login with incorrect credentials
- [ ] Test session expiration and re-login
- [ ] Test page protection (redirect to login when not authenticated)
- [ ] Test post CRUD operations
- [ ] Test page CRUD operations
- [ ] Test user management
- [ ] Test media upload
- [ ] Test logout functionality
- [ ] Test mobile responsiveness
- [ ] Test error message display
- [ ] Check browser console for errors
- [ ] Test with network throttling (DevTools)

## 📝 Notes

- JWT tokens are generated and returned on login
- Tokens should be included in Authorization header for all API requests
- The apiClient handles token management automatically
- If a 401 error occurs, user is redirected to login
- All API errors are logged and displayed to user
- File uploads use FormData for proper multipart handling
