/**
 * Authentication Module for Ghoncheye Lalehzar Admin Panel
 * Handles login, logout, and session management
 */

const AUTH_TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';
const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Get the stored authentication token
 * @returns {string|null} The auth token or null if not logged in
 */
function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Get the current user data
 * @returns {object|null} The user object or null if not logged in
 */
function getCurrentUser() {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if authenticated
 */
async function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/check`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        return data.authenticated === true;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

/**
 * Login with username and password
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<object>} Login result
 */
async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem(AUTH_TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            return { success: true, user: data.user };
        } else {
            return { success: false, error: data.error || 'Login failed' };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Connection error' };
    }
}

/**
 * Logout the current user
 * @returns {Promise<boolean>} True if logout successful
 */
async function logout() {
    const token = getAuthToken();
    
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    // Clear local storage
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    return true;
}

/**
 * Protect a page - redirect to login if not authenticated
 */
async function requireAuth() {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/**
 * Check if user has a specific role
 * @param {string} role - The role to check
 * @returns {boolean}
 */
function hasRole(role) {
    const user = getCurrentUser();
    if (!user) return false;
    return user.role === role;
}

/**
 * Check if user is admin
 * @returns {boolean}
 */
function isAdmin() {
    return hasRole('administrator');
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAuthToken,
        getCurrentUser,
        checkAuth,
        login,
        logout,
        requireAuth,
        hasRole,
        isAdmin
    };
}
