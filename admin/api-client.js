/**
 * API Client for Ghoncheye Lalehzar Admin Panel
 * Centralized API communication with automatic token management
 */

class ApiClient {
    constructor(baseUrl = 'http://localhost:3001/api') {
        this.baseUrl = baseUrl;
    }

    /**
     * Get authorization headers
     * @returns {object} Headers object
     */
    getHeaders() {
        const token = localStorage.getItem('auth_token');
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    /**
     * Make API request
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {object} data - Request body data
     * @returns {Promise<object>} API response
     */
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this.getHeaders()
        };

        if (data && method !== 'GET' && method !== 'DELETE') {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error(`API Error [${method} ${endpoint}]:`, error);
            throw error;
        }
    }

    // ==================== AUTH ====================

    async login(username, password) {
        return this.request('/auth/login', 'POST', { username, password });
    }

    async checkAuth() {
        return this.request('/auth/check', 'GET');
    }

    async logout() {
        return this.request('/auth/logout', 'POST');
    }

    // ==================== POSTS ====================

    async getPosts() {
        return this.request('/posts', 'GET');
    }

    async getPost(id) {
        return this.request(`/posts/${id}`, 'GET');
    }

    async createPost(postData) {
        return this.request('/posts', 'POST', postData);
    }

    async updatePost(id, postData) {
        return this.request(`/posts/${id}`, 'PUT', postData);
    }

    async deletePost(id) {
        return this.request(`/posts/${id}`, 'DELETE');
    }

    // ==================== PAGES ====================

    async getPages() {
        return this.request('/pages', 'GET');
    }

    async getPage(id) {
        return this.request(`/pages/${id}`, 'GET');
    }

    async createPage(pageData) {
        return this.request('/pages', 'POST', pageData);
    }

    async updatePage(id, pageData) {
        return this.request(`/pages/${id}`, 'PUT', pageData);
    }

    async deletePage(id) {
        return this.request(`/pages/${id}`, 'DELETE');
    }

    // ==================== USERS ====================

    async getUsers() {
        return this.request('/users', 'GET');
    }

    async getUser(id) {
        return this.request(`/users/${id}`, 'GET');
    }

    // ==================== MEDIA ====================

    async getMedia() {
        return this.request('/media', 'GET');
    }

    async uploadMedia(mediaData) {
        return this.request('/media/upload', 'POST', mediaData);
    }

    // ==================== CATEGORIES ====================

    async getCategories() {
        return this.request('/categories', 'GET');
    }

    async createCategory(categoryData) {
        return this.request('/categories', 'POST', categoryData);
    }

    async updateCategory(id, categoryData) {
        return this.request(`/categories/${id}`, 'PUT', categoryData);
    }

    async deleteCategory(id) {
        return this.request(`/categories/${id}`, 'DELETE');
    }

    // ==================== HEALTH ====================

    async healthCheck() {
        return this.request('/health', 'GET');
    }
}

// Create global instance
const apiClient = new ApiClient();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}
