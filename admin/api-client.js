/**
 * API Client for Admin Panel
 * Ghoncheye Lalehzar CMS
 */

class APIClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('admin_token');
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('admin_token', token);
        } else {
            localStorage.removeItem('admin_token');
        }
    }

    /**
     * Get authentication token
     */
    getToken() {
        return this.token || localStorage.getItem('admin_token');
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getToken();
    }

    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if available
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle 401 - Unauthorized
                if (response.status === 401) {
                    this.setToken(null);
                    window.location.href = '/admin/login.html';
                    return;
                }
                
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    /**
     * GET request
     */
    get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST request
     */
    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    /**
     * Upload file
     */
    async upload(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        for (const [key, value] of Object.entries(additionalData)) {
            formData.append(key, value);
        }

        const url = `${this.baseURL}${endpoint}`;
        const headers = {};
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData
        });

        return response.json();
    }

    // ==================== AUTH ====================
    
    async login(username, password) {
        const data = await this.post('/auth/login', { username, password });
        if (data.success && data.token) {
            this.setToken(data.token);
            localStorage.setItem('admin_user', JSON.stringify(data.user));
        }
        return data;
    }

    async logout() {
        try {
            await this.post('/auth/logout', {});
        } finally {
            this.setToken(null);
            localStorage.removeItem('admin_user');
        }
    }

    async checkAuth() {
        return this.get('/auth/check');
    }

    async getProfile() {
        return this.get('/auth/me');
    }

    async updateProfile(data) {
        return this.put('/auth/profile', data);
    }

    async changePassword(currentPassword, newPassword) {
        return this.put('/auth/password', {
            current_password: currentPassword,
            new_password: newPassword
        });
    }

    // ==================== STATS ====================

    async getStats() {
        return this.get('/stats');
    }

    // ==================== POSTS ====================

    async getPosts(params = {}) {
        return this.get('/posts', params);
    }

    async getPost(id) {
        return this.get(`/posts/${id}`);
    }

    async createPost(data) {
        return this.post('/posts', data);
    }

    async updatePost(id, data) {
        return this.put(`/posts/${id}`, data);
    }

    async deletePost(id) {
        return this.delete(`/posts/${id}`);
    }

    // ==================== PAGES ====================

    async getPages(params = {}) {
        return this.get('/pages', params);
    }

    async getPage(id) {
        return this.get(`/pages/${id}`);
    }

    async createPage(data) {
        return this.post('/pages', data);
    }

    async updatePage(id, data) {
        return this.put(`/pages/${id}`, data);
    }

    async deletePage(id) {
        return this.delete(`/pages/${id}`);
    }

    // ==================== PRODUCTS ====================

    async getProducts(params = {}) {
        return this.get('/products', params);
    }

    async getProduct(id) {
        return this.get(`/products/${id}`);
    }

    async createProduct(data) {
        return this.post('/products', data);
    }

    async updateProduct(id, data) {
        return this.put(`/products/${id}`, data);
    }

    async deleteProduct(id) {
        return this.delete(`/products/${id}`);
    }

    // ==================== MESSAGES ====================

    async getMessages(params = {}) {
        return this.get('/messages', params);
    }

    async getMessage(id) {
        return this.get(`/messages/${id}`);
    }

    async updateMessage(id, data) {
        return this.put(`/messages/${id}`, data);
    }

    async deleteMessage(id) {
        return this.delete(`/messages/${id}`);
    }

    async markMessagesRead(ids) {
        return this.put('/messages/bulk/mark-read', { ids });
    }

    // ==================== SUBSCRIBERS ====================

    async getSubscribers(params = {}) {
        return this.get('/subscribers', params);
    }

    async getSubscriber(id) {
        return this.get(`/subscribers/${id}`);
    }

    async createSubscriber(data) {
        return this.post('/subscribers', data);
    }

    async updateSubscriber(id, data) {
        return this.put(`/subscribers/${id}`, data);
    }

    async deleteSubscriber(id) {
        return this.delete(`/subscribers/${id}`);
    }

    async exportSubscribers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        window.location.href = `${this.baseURL}/subscribers/export/csv?${queryString}`;
    }

    // ==================== MEDIA ====================

    async getMedia(params = {}) {
        return this.get('/media', params);
    }

    async getMediaItem(id) {
        return this.get(`/media/${id}`);
    }

    async uploadMedia(file, data = {}) {
        return this.upload('/media/upload', file, data);
    }

    async uploadMultipleMedia(files) {
        const formData = new FormData();
        for (const file of files) {
            formData.append('files', file);
        }

        const url = `${this.baseURL}/media/upload-multiple`;
        const headers = {};
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData
        });

        return response.json();
    }

    async updateMedia(id, data) {
        return this.put(`/media/${id}`, data);
    }

    async deleteMedia(id) {
        return this.delete(`/media/${id}`);
    }

    // ==================== SETTINGS ====================

    async getSettings(group) {
        const params = group ? { group } : {};
        return this.get('/settings', params);
    }

    async getPublicSettings() {
        return this.get('/settings/public');
    }

    async updateSetting(key, value) {
        return this.put(`/settings/${key}`, { value });
    }

    async updateSettings(settings) {
        return this.put('/settings', settings);
    }

    // ==================== USERS ====================

    async getUsers(params = {}) {
        return this.get('/users', params);
    }

    async getUser(id) {
        return this.get(`/users/${id}`);
    }

    async createUser(data) {
        return this.post('/users', data);
    }

    async updateUser(id, data) {
        return this.put(`/users/${id}`, data);
    }

    async deleteUser(id) {
        return this.delete(`/users/${id}`);
    }
}

// Create global instance
const api = new APIClient();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIClient, api };
}
