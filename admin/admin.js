// Admin Panel JavaScript - Ghoncheye Lalehzar

'use strict';

// DOM Elements
let sidebar, menuToggle, userBtn, dropdownMenu, logoutBtn;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Cache DOM elements
    sidebar = document.getElementById('sidebar');
    menuToggle = document.getElementById('menu-toggle');
    userBtn = document.getElementById('user-btn');
    dropdownMenu = document.getElementById('dropdown-menu');
    logoutBtn = document.getElementById('logout-btn');
    
    // Initialize features
    initSidebar();
    initUserDropdown();
    initLogout();
    loadUserInfo();
    initCharts();
    initAnimations();
});

// Check Authentication
function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Load User Info
function loadUserInfo() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const userName = document.getElementById('user-name');
            if (userName) {
                userName.textContent = user.first_name || user.username;
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
}

// Sidebar Toggle
function initSidebar() {
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
        
        // Close sidebar when clicking outside
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 992) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }
}

// User Dropdown
function initUserDropdown() {
    if (userBtn && dropdownMenu) {
        userBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        
        document.addEventListener('click', function(e) {
            if (!dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }
}

// Logout
function initLogout() {
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (confirm('آیا از خروج اطمینان دارید؟')) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                localStorage.removeItem('remember_me');
                window.location.href = 'login.html';
            }
        });
    }
}

// Initialize Charts
function initCharts() {
    // Visits Chart
    const visitsChart = document.getElementById('visits-chart');
    if (visitsChart) {
        new Chart(visitsChart, {
            type: 'line',
            data: {
                labels: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'],
                datasets: [{
                    label: 'بازدید',
                    data: [450, 520, 480, 620, 590, 780, 650],
                    borderColor: '#c2185b',
                    backgroundColor: 'rgba(194, 24, 91, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Traffic Chart
    const trafficChart = document.getElementById('traffic-chart');
    if (trafficChart) {
        new Chart(trafficChart, {
            type: 'doughnut',
            data: {
                labels: ['جستجوی گوگل', 'مستقیم', 'شبکه‌های اجتماعی', 'ارجاع'],
                datasets: [{
                    data: [45, 25, 20, 10],
                    backgroundColor: [
                        '#c2185b',
                        '#4caf50',
                        '#2196f3',
                        '#ff9800'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: 'Vazirmatn'
                            },
                            padding: 15
                        }
                    }
                }
            }
        });
    }
}

// Initialize Animations
function initAnimations() {
    // Animate stat numbers
    const statNumbers = document.querySelectorAll('.stat-info h3');
    statNumbers.forEach(stat => {
        const target = parseInt(stat.textContent);
        animateNumber(stat, 0, target, 1000);
    });
}

// Animate Number
function animateNumber(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        element.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Notification System
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        font-family: 'Vazirmatn', sans-serif;
        animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// API Client
const API = {
    baseUrl: '/api',
    token: localStorage.getItem('auth_token'),
    
    async request(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'خطا در ارتباط با سرور');
            }
            
            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // Posts
    getPosts: () => API.request('/posts'),
    getPost: (id) => API.request(`/posts/${id}`),
    createPost: (data) => API.request('/posts', 'POST', data),
    updatePost: (id, data) => API.request(`/posts/${id}`, 'PUT', data),
    deletePost: (id) => API.request(`/posts/${id}`, 'DELETE'),
    
    // Pages
    getPages: () => API.request('/pages'),
    getPage: (id) => API.request(`/pages/${id}`),
    createPage: (data) => API.request('/pages', 'POST', data),
    updatePage: (id, data) => API.request(`/pages/${id}`, 'PUT', data),
    deletePage: (id) => API.request(`/pages/${id}`, 'DELETE'),
    
    // Users
    getUsers: () => API.request('/users'),
    getUser: (id) => API.request(`/users/${id}`),
    
    // Media
    getMedia: () => API.request('/media'),
    uploadMedia: (data) => API.request('/media/upload', 'POST', data)
};

// Export for use in other files
window.showNotification = showNotification;
window.API = API;
