/**
 * Admin Panel JavaScript - Ghoncheye Lalehzar
 * Complete Admin Panel with API Integration
 */

'use strict';

// DOM Elements
let sidebar, menuToggle, userBtn, dropdownMenu, logoutBtn;

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!checkAuth()) return;
    
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
    
    // Load dashboard data
    await loadDashboardStats();
    
    initCharts();
    initAnimations();
    
    // Initialize page-specific features
    initPageFeatures();
});

// Check Authentication
function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Load User Info
function loadUserInfo() {
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const userName = document.getElementById('user-name');
            const userRole = document.querySelector('.user-role');
            
            if (userName) {
                userName.textContent = user.first_name || user.username || 'مدیر';
            }
            if (userRole) {
                userRole.textContent = getRoleLabel(user.role);
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
}

// Get role label in Persian
function getRoleLabel(role) {
    const roles = {
        administrator: 'مدیر کل',
        editor: 'ویراستار',
        author: 'نویسنده'
    };
    return roles[role] || 'کاربر';
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
    
    // Set active menu item
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    const menuLinks = document.querySelectorAll('.sidebar-nav a');
    menuLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
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
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            if (confirm('آیا از خروج اطمینان دارید؟')) {
                try {
                    if (typeof api !== 'undefined') {
                        await api.logout();
                    }
                } catch (error) {
                    console.log('Logout API error:', error);
                }
                
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
                window.location.href = 'login.html';
            }
        });
    }
}

// Load Dashboard Statistics
async function loadDashboardStats() {
    // Check if on dashboard page
    if (!document.querySelector('.stats-grid')) return;
    
    try {
        if (typeof api !== 'undefined') {
            const result = await api.getStats();
            
            if (result.success) {
                updateStatCard('posts-count', result.data.posts);
                updateStatCard('products-count', result.data.products);
                updateStatCard('messages-count', result.data.messages);
                updateStatCard('subscribers-count', result.data.subscribers);
                
                // Update unread badge
                const unreadBadge = document.querySelector('.messages-badge');
                if (unreadBadge && result.data.unreadMessages > 0) {
                    unreadBadge.textContent = result.data.unreadMessages;
                    unreadBadge.style.display = 'inline';
                }
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update stat card value
function updateStatCard(id, value) {
    const element = document.getElementById(id) || document.querySelector(`[data-stat="${id}"]`);
    if (element) {
        element.dataset.target = value;
        animateNumber(element, 0, value, 1500);
    }
}

// Initialize Charts
function initCharts() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') return;
    
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
    const statNumbers = document.querySelectorAll('.stat-info h3, [data-animate="number"]');
    statNumbers.forEach(stat => {
        const target = parseInt(stat.textContent) || parseInt(stat.dataset.target) || 0;
        if (target > 0) {
            animateNumber(stat, 0, target, 1500);
        }
    });
}

// Animate Number
function animateNumber(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        element.textContent = Math.floor(easeProgress * (end - start) + start).toLocaleString('fa-IR');
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Notification System
function showNotification(message, type = 'success') {
    // Remove existing notifications
    document.querySelectorAll('.admin-notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `admin-notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
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
        max-width: 90%;
    `;
    
    document.body.appendChild(notification);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto close after 4 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// Confirm Dialog
function showConfirm(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
    `;
    
    overlay.innerHTML = `
        <div class="confirm-dialog" style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            font-family: 'Vazirmatn', sans-serif;
        ">
            <i class="fas fa-question-circle" style="font-size: 48px; color: #ff9800; margin-bottom: 20px;"></i>
            <p style="margin-bottom: 25px; font-size: 16px;">${message}</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button class="btn-confirm" style="
                    padding: 10px 30px;
                    background: #c2185b;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-family: inherit;
                ">بله</button>
                <button class="btn-cancel" style="
                    padding: 10px 30px;
                    background: #e0e0e0;
                    color: #333;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-family: inherit;
                ">خیر</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.querySelector('.btn-confirm').addEventListener('click', () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    });
    
    overlay.querySelector('.btn-cancel').addEventListener('click', () => {
        overlay.remove();
        if (onCancel) onCancel();
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    });
}

// Initialize Page-specific Features
function initPageFeatures() {
    const currentPage = window.location.pathname.split('/').pop();
    
    switch (currentPage) {
        case 'posts.html':
            initPostsPage();
            break;
        case 'pages.html':
            initPagesPage();
            break;
        case 'products.html':
            initProductsPage();
            break;
        case 'messages.html':
            initMessagesPage();
            break;
        case 'subscribers.html':
            initSubscribersPage();
            break;
        case 'media.html':
            initMediaPage();
            break;
        case 'settings.html':
            initSettingsPage();
            break;
    }
}

// ==================== Posts Page ====================
async function initPostsPage() {
    await loadPosts();
    
    // Add post button
    const addBtn = document.querySelector('.add-post-btn, [data-action="add-post"]');
    if (addBtn) {
        addBtn.addEventListener('click', () => openPostModal());
    }
    
    // Search
    const searchInput = document.querySelector('.search-posts');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (e) => {
            await loadPosts({ search: e.target.value });
        }, 300));
    }
}

async function loadPosts(params = {}) {
    const tableBody = document.querySelector('.posts-table tbody, #posts-list');
    if (!tableBody) return;
    
    try {
        tableBody.innerHTML = '<tr><td colspan="5" class="loading">در حال بارگذاری...</td></tr>';
        
        const result = await api.getPosts(params);
        
        if (result.success && result.data.length > 0) {
            tableBody.innerHTML = result.data.map(post => `
                <tr data-id="${post.id}">
                    <td>${post.title}</td>
                    <td>${post.author_name || 'ناشناس'}</td>
                    <td><span class="status status-${post.status}">${getStatusLabel(post.status)}</span></td>
                    <td>${formatDate(post.created_at)}</td>
                    <td class="actions">
                        <button class="btn-icon edit" onclick="editPost(${post.id})" title="ویرایش">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deletePost(${post.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="empty">مطلبی یافت نشد</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="5" class="error">خطا در بارگذاری: ${error.message}</td></tr>`;
    }
}

function openPostModal(post = null) {
    const modal = document.getElementById('post-modal');
    if (!modal) return;
    
    const form = modal.querySelector('form');
    const title = modal.querySelector('.modal-title');
    
    if (post) {
        title.textContent = 'ویرایش مطلب';
        form.querySelector('[name="title"]').value = post.title;
        form.querySelector('[name="content"]').value = post.content || '';
        form.querySelector('[name="status"]').value = post.status;
        form.dataset.id = post.id;
    } else {
        title.textContent = 'افزودن مطلب جدید';
        form.reset();
        delete form.dataset.id;
    }
    
    modal.classList.add('show');
}

async function editPost(id) {
    try {
        const result = await api.getPost(id);
        if (result.success) {
            openPostModal(result.data);
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function deletePost(id) {
    showConfirm('آیا از حذف این مطلب اطمینان دارید؟', async () => {
        try {
            await api.deletePost(id);
            showNotification('مطلب با موفقیت حذف شد');
            await loadPosts();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

// ==================== Products Page ====================
async function initProductsPage() {
    await loadProducts();
    
    const addBtn = document.querySelector('.add-product-btn, [data-action="add-product"]');
    if (addBtn) {
        addBtn.addEventListener('click', () => openProductModal());
    }
}

async function loadProducts(params = {}) {
    const container = document.querySelector('.products-grid, #products-list');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">در حال بارگذاری...</div>';
        
        const result = await api.getProducts(params);
        
        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(product => `
                <div class="product-card" data-id="${product.id}">
                    <div class="product-image">
                        <img src="${product.image || '/assets/images/placeholder.jpg'}" alt="${product.name}">
                        ${product.featured ? '<span class="badge featured">ویژه</span>' : ''}
                    </div>
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <p>${product.short_description || ''}</p>
                        <span class="status status-${product.status}">${product.status === 'active' ? 'فعال' : 'غیرفعال'}</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn-icon" onclick="editProduct(${product.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon delete" onclick="deleteProduct(${product.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty">محصولی یافت نشد</div>';
        }
    } catch (error) {
        container.innerHTML = `<div class="error">خطا: ${error.message}</div>`;
    }
}

// ==================== Messages Page ====================
async function initMessagesPage() {
    await loadMessages();
}

async function loadMessages(params = {}) {
    const container = document.querySelector('.messages-list, #messages-list');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">در حال بارگذاری...</div>';
        
        const result = await api.getMessages(params);
        
        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(msg => `
                <div class="message-item ${msg.is_read ? '' : 'unread'}" data-id="${msg.id}" onclick="viewMessage(${msg.id})">
                    <div class="message-sender">
                        <strong>${msg.name || 'بدون نام'}</strong>
                        <span>${msg.email}</span>
                    </div>
                    <div class="message-preview">
                        <span class="subject">${msg.subject || 'بدون موضوع'}</span>
                        <span class="snippet">${(msg.message || '').substring(0, 100)}...</span>
                    </div>
                    <div class="message-meta">
                        <span class="date">${formatDate(msg.created_at)}</span>
                        ${msg.is_starred ? '<i class="fas fa-star starred"></i>' : ''}
                    </div>
                </div>
            `).join('');
            
            // Update stats
            const statsEl = document.querySelector('.messages-stats');
            if (statsEl && result.stats) {
                statsEl.innerHTML = `
                    <span>کل: ${result.stats.total}</span>
                    <span>خوانده نشده: ${result.stats.unread}</span>
                    <span>ستاره‌دار: ${result.stats.starred}</span>
                `;
            }
        } else {
            container.innerHTML = '<div class="empty">پیامی یافت نشد</div>';
        }
    } catch (error) {
        container.innerHTML = `<div class="error">خطا: ${error.message}</div>`;
    }
}

async function viewMessage(id) {
    try {
        const result = await api.getMessage(id);
        if (result.success) {
            const msg = result.data;
            const detailPane = document.querySelector('.message-detail, #message-detail');
            
            if (detailPane) {
                detailPane.innerHTML = `
                    <div class="message-header">
                        <h3>${msg.subject || 'بدون موضوع'}</h3>
                        <div class="message-actions">
                            <button onclick="toggleStar(${msg.id})" title="ستاره">
                                <i class="fas fa-star ${msg.is_starred ? 'starred' : ''}"></i>
                            </button>
                            <button onclick="deleteMessage(${msg.id})" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="message-info">
                        <p><strong>از:</strong> ${msg.name || 'نامشخص'} (${msg.email})</p>
                        <p><strong>تلفن:</strong> ${msg.phone || 'ندارد'}</p>
                        <p><strong>شرکت:</strong> ${msg.company || 'ندارد'}</p>
                        <p><strong>کشور:</strong> ${msg.country || 'نامشخص'}</p>
                        <p><strong>محصول:</strong> ${msg.product || 'ندارد'}</p>
                        <p><strong>تاریخ:</strong> ${formatDate(msg.created_at)}</p>
                    </div>
                    <div class="message-body">
                        <p>${msg.message || 'بدون متن'}</p>
                    </div>
                `;
                
                // Mark as read
                document.querySelector(`.message-item[data-id="${id}"]`)?.classList.remove('unread');
            }
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ==================== Subscribers Page ====================
async function initSubscribersPage() {
    await loadSubscribers();
    
    // Export button
    const exportBtn = document.querySelector('[data-action="export-subscribers"]');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => api.exportSubscribers());
    }
}

async function loadSubscribers(params = {}) {
    const tableBody = document.querySelector('.subscribers-table tbody, #subscribers-list');
    if (!tableBody) return;
    
    try {
        tableBody.innerHTML = '<tr><td colspan="5" class="loading">در حال بارگذاری...</td></tr>';
        
        const result = await api.getSubscribers(params);
        
        if (result.success && result.data.length > 0) {
            tableBody.innerHTML = result.data.map(sub => `
                <tr data-id="${sub.id}">
                    <td>${sub.email}</td>
                    <td>${sub.name || '-'}</td>
                    <td><span class="status status-${sub.status}">${sub.status === 'active' ? 'فعال' : 'لغو عضویت'}</span></td>
                    <td>${formatDate(sub.created_at)}</td>
                    <td class="actions">
                        <button class="btn-icon delete" onclick="deleteSubscriber(${sub.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
            
            // Update stats
            if (result.stats) {
                updateElement('.stat-total', result.stats.total);
                updateElement('.stat-active', result.stats.active);
                updateElement('.stat-unsubscribed', result.stats.unsubscribed);
            }
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="empty">مشترکی یافت نشد</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="5" class="error">خطا: ${error.message}</td></tr>`;
    }
}

// ==================== Media Page ====================
async function initMediaPage() {
    await loadMedia();
    initMediaUpload();
}

async function loadMedia(params = {}) {
    const container = document.querySelector('.media-grid, #media-list');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">در حال بارگذاری...</div>';
        
        const result = await api.getMedia(params);
        
        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(item => `
                <div class="media-item" data-id="${item.id}">
                    <div class="media-preview">
                        ${item.mimetype?.startsWith('image/') 
                            ? `<img src="${item.filepath}" alt="${item.alt_text || item.filename}">`
                            : `<i class="fas fa-file"></i>`
                        }
                    </div>
                    <div class="media-info">
                        <span class="filename">${item.original_name || item.filename}</span>
                        <span class="size">${formatFileSize(item.size)}</span>
                    </div>
                    <div class="media-actions">
                        <button class="btn-icon" onclick="copyMediaUrl('${item.filepath}')" title="کپی لینک">
                            <i class="fas fa-link"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteMedia(${item.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty">فایلی یافت نشد</div>';
        }
    } catch (error) {
        container.innerHTML = `<div class="error">خطا: ${error.message}</div>`;
    }
}

function initMediaUpload() {
    const dropZone = document.querySelector('.upload-zone, #upload-zone');
    const fileInput = document.querySelector('#file-input');
    
    if (!dropZone || !fileInput) return;
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await uploadFiles(files);
        }
    });
    
    // Click to upload
    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async () => {
        if (fileInput.files.length > 0) {
            await uploadFiles(fileInput.files);
        }
    });
}

async function uploadFiles(files) {
    const progressContainer = document.querySelector('.upload-progress');
    
    try {
        showNotification('در حال آپلود...', 'info');
        
        const result = await api.uploadMultipleMedia(files);
        
        if (result.success) {
            showNotification(`${result.data.length} فایل آپلود شد`);
            await loadMedia();
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function copyMediaUrl(url) {
    navigator.clipboard.writeText(window.location.origin + url).then(() => {
        showNotification('لینک کپی شد');
    });
}

async function deleteMedia(id) {
    showConfirm('آیا از حذف این فایل اطمینان دارید؟', async () => {
        try {
            await api.deleteMedia(id);
            showNotification('فایل حذف شد');
            await loadMedia();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

// ==================== Settings Page ====================
async function initSettingsPage() {
    await loadSettings();
    
    // Save buttons
    document.querySelectorAll('.save-settings-btn').forEach(btn => {
        btn.addEventListener('click', saveSettings);
    });
    
    // Tab switching
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab)?.classList.add('active');
        });
    });
}

async function loadSettings() {
    try {
        const result = await api.getSettings();
        
        if (result.success) {
            // Populate form fields
            for (const [group, settings] of Object.entries(result.data)) {
                for (const [key, value] of Object.entries(settings)) {
                    const input = document.querySelector(`[name="${key}"]`);
                    if (input) {
                        input.value = value || '';
                    }
                }
            }
        }
    } catch (error) {
        showNotification('خطا در بارگذاری تنظیمات', 'error');
    }
}

async function saveSettings() {
    const form = document.querySelector('.settings-form');
    if (!form) return;
    
    const formData = new FormData(form);
    const settings = {};
    
    for (const [key, value] of formData.entries()) {
        settings[key] = value;
    }
    
    try {
        await api.updateSettings(settings);
        showNotification('تنظیمات ذخیره شد');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ==================== Utility Functions ====================

function getStatusLabel(status) {
    const labels = {
        published: 'منتشر شده',
        draft: 'پیش‌نویس',
        pending: 'در انتظار',
        active: 'فعال',
        inactive: 'غیرفعال'
    };
    return labels[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
        return dateStr;
    }
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateElement(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
}

// Close modals
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
        e.target.closest('.modal')?.classList.remove('show');
    }
});

// Escape key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
    }
});

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, -100%); opacity: 0; }
    }
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        margin-right: 10px;
    }
`;
document.head.appendChild(style);

// Export to window
window.showNotification = showNotification;
window.showConfirm = showConfirm;
window.editPost = editPost;
window.deletePost = deletePost;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.viewMessage = viewMessage;
window.deleteMessage = deleteMessage;
window.deleteSubscriber = deleteSubscriber;
window.copyMediaUrl = copyMediaUrl;
window.deleteMedia = deleteMedia;
