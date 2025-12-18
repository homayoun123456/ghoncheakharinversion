/**
 * WordPress Plugin Repository Integration
 * Ghoncheye Lalehzar CMS
 * 
 * Features:
 * - Search WordPress.org plugin repository
 * - Install, activate, deactivate plugins
 * - View plugin details
 * - Recommended plugins (Yoast SEO, Really Simple SSL, etc.)
 */

// API Configuration
// Use relative URL when served from same origin, otherwise use localhost
const API_BASE = window.location.port === '3001' ? '/api' : 'http://localhost:3001/api';

// State
let currentTab = 'installed';
let installedPlugins = [];
let searchResults = [];
let isLoading = false;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadInstalledPlugins();
    
    // Add enter key support for search
    document.getElementById('plugin-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchPlugins();
        }
    });
});

/**
 * Check authentication status
 */
async function checkAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/check`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Unauthorized');
        }
        
        const data = await response.json();
        if (data.user) {
            document.getElementById('username').textContent = data.user.first_name || data.user.username;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        // Don't redirect for demo purposes
    }
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

/**
 * Toggle sidebar on mobile
 */
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

// ==================== TAB MANAGEMENT ====================

/**
 * Switch between tabs
 */
function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    // Load content based on tab
    switch(tab) {
        case 'installed':
            loadInstalledPlugins();
            break;
        case 'recommended':
            loadRecommendedPlugins();
            break;
        case 'popular':
            loadPopularPlugins();
            break;
    }
}

// ==================== API CALLS ====================

/**
 * Get authorization headers
 */
function getHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Load installed plugins
 */
async function loadInstalledPlugins() {
    const container = document.getElementById('installed-plugins');
    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>در حال بارگذاری افزونه‌ها...</span>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/plugins`, {
            headers: getHeaders()
        });
        
        if (!response.ok) throw new Error('Failed to load plugins');
        
        const data = await response.json();
        installedPlugins = data.data || [];
        
        if (installedPlugins.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-plug"></i>
                    <h3>هیچ افزونه‌ای نصب نشده است</h3>
                    <p>به تب "جستجو در مخزن" یا "پیشنهادی" بروید و افزونه‌های مورد نیاز را نصب کنید</p>
                    <button class="btn btn-primary" onclick="switchTab('recommended')">
                        <i class="fas fa-star"></i>
                        مشاهده افزونه‌های پیشنهادی
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = installedPlugins.map(plugin => createInstalledPluginCard(plugin)).join('');
        
    } catch (error) {
        console.error('Error loading plugins:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>خطا در بارگذاری</h3>
                <p>لطفاً صفحه را رفرش کنید</p>
                <button class="btn btn-primary" onclick="loadInstalledPlugins()">
                    <i class="fas fa-redo"></i>
                    تلاش مجدد
                </button>
            </div>
        `;
    }
}

/**
 * Search plugins in WordPress.org repository
 */
async function searchPlugins() {
    const searchInput = document.getElementById('plugin-search');
    const query = searchInput.value.trim();
    
    if (!query) {
        showToast('لطفاً عبارت جستجو را وارد کنید', 'warning');
        return;
    }
    
    const container = document.getElementById('search-results');
    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>در حال جستجو در مخزن وردپرس...</span>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/plugins/search?search=${encodeURIComponent(query)}`, {
            headers: getHeaders()
        });
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        searchResults = data.data?.plugins || [];
        
        if (searchResults.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>نتیجه‌ای یافت نشد</h3>
                    <p>عبارت دیگری را جستجو کنید</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = searchResults.map(plugin => createSearchPluginCard(plugin)).join('');
        
    } catch (error) {
        console.error('Search error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>خطا در جستجو</h3>
                <p>لطفاً دوباره تلاش کنید</p>
            </div>
        `;
        showToast('خطا در جستجو. لطفاً دوباره تلاش کنید', 'error');
    }
}

/**
 * Quick search preset
 */
function quickSearch(query) {
    document.getElementById('plugin-search').value = query;
    searchPlugins();
}

/**
 * Load recommended plugins
 */
async function loadRecommendedPlugins() {
    const container = document.getElementById('recommended-plugins');
    
    // Update featured cards buttons based on installation status
    updateFeaturedButtons();
    
    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>در حال بارگذاری افزونه‌های پیشنهادی...</span>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/plugins/recommended`, {
            headers: getHeaders()
        });
        
        if (!response.ok) throw new Error('Failed to load recommended');
        
        const data = await response.json();
        const plugins = data.data?.plugins || [];
        
        // Filter out Yoast SEO and Really Simple SSL (shown in featured section)
        const filteredPlugins = plugins.filter(p => 
            p.slug !== 'wordpress-seo' && p.slug !== 'really-simple-ssl'
        );
        
        if (filteredPlugins.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>افزونه‌های بیشتری در دسترس نیست</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredPlugins.map(plugin => createSearchPluginCard(plugin)).join('');
        
    } catch (error) {
        console.error('Error loading recommended:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>خطا در بارگذاری</h3>
                <button class="btn btn-primary" onclick="loadRecommendedPlugins()">
                    <i class="fas fa-redo"></i>
                    تلاش مجدد
                </button>
            </div>
        `;
    }
}

/**
 * Update featured section buttons based on installation status
 */
function updateFeaturedButtons() {
    // Fetch installed plugins first
    fetch(`${API_BASE}/plugins`, { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            const installed = data.data || [];
            
            // Update Yoast SEO button
            const yoastPlugin = installed.find(p => p.slug === 'wordpress-seo');
            const yoastCard = document.querySelector('.featured-card.yoast .btn');
            if (yoastCard) {
                if (yoastPlugin && yoastPlugin.installed_at) {
                    if (yoastPlugin.status === 'active') {
                        yoastCard.outerHTML = `
                            <span class="status-badge active">
                                <i class="fas fa-check-circle"></i>
                                فعال
                            </span>
                        `;
                    } else {
                        yoastCard.outerHTML = `
                            <button class="btn btn-success" onclick="activatePlugin('wordpress-seo')">
                                <i class="fas fa-power-off"></i>
                                فعال‌سازی
                            </button>
                        `;
                    }
                }
            }
            
            // Update Really Simple SSL button
            const sslPlugin = installed.find(p => p.slug === 'really-simple-ssl');
            const sslCard = document.querySelector('.featured-card.ssl .btn');
            if (sslCard) {
                if (sslPlugin && sslPlugin.installed_at) {
                    if (sslPlugin.status === 'active') {
                        sslCard.outerHTML = `
                            <span class="status-badge active">
                                <i class="fas fa-check-circle"></i>
                                فعال
                            </span>
                        `;
                    } else {
                        sslCard.outerHTML = `
                            <button class="btn btn-success" onclick="activatePlugin('really-simple-ssl')">
                                <i class="fas fa-power-off"></i>
                                فعال‌سازی
                            </button>
                        `;
                    }
                }
            }
        })
        .catch(err => console.error('Error updating featured buttons:', err));
}

/**
 * Load popular plugins
 */
async function loadPopularPlugins() {
    const container = document.getElementById('popular-plugins');
    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>در حال بارگذاری افزونه‌های محبوب...</span>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/plugins/popular`, {
            headers: getHeaders()
        });
        
        if (!response.ok) throw new Error('Failed to load popular');
        
        const data = await response.json();
        const plugins = data.data?.plugins || [];
        
        if (plugins.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-fire"></i>
                    <h3>افزونه‌ای یافت نشد</h3>
                </div>
            `;
            return;
        }
        
        container.innerHTML = plugins.map(plugin => createSearchPluginCard(plugin)).join('');
        
    } catch (error) {
        console.error('Error loading popular:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>خطا در بارگذاری</h3>
                <button class="btn btn-primary" onclick="loadPopularPlugins()">
                    <i class="fas fa-redo"></i>
                    تلاش مجدد
                </button>
            </div>
        `;
    }
}

// ==================== PLUGIN ACTIONS ====================

/**
 * Install a plugin
 */
async function installPlugin(slug) {
    const btn = event?.target?.closest('.btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال نصب...';
        btn.disabled = true;
    }
    
    try {
        const response = await fetch(`${API_BASE}/plugins/install`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ slug })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Installation failed');
        }
        
        showToast(`${data.data?.name || 'افزونه'} با موفقیت نصب شد`, 'success');
        
        // Refresh current view
        if (currentTab === 'installed') {
            loadInstalledPlugins();
        } else {
            // Update button state
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check"></i> نصب شده';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-success');
                btn.onclick = () => activatePlugin(slug);
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-power-off"></i> فعال‌سازی';
                    btn.disabled = false;
                }, 1000);
            }
        }
        
    } catch (error) {
        console.error('Install error:', error);
        showToast(error.message || 'خطا در نصب افزونه', 'error');
        
        if (btn) {
            btn.innerHTML = '<i class="fas fa-download"></i> نصب افزونه';
            btn.disabled = false;
        }
    }
}

/**
 * Activate a plugin
 */
async function activatePlugin(slug) {
    const btn = event?.target?.closest('.btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> فعال‌سازی...';
        btn.disabled = true;
    }
    
    try {
        const response = await fetch(`${API_BASE}/plugins/activate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ slug })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Activation failed');
        }
        
        showToast(`${data.data?.name || 'افزونه'} فعال شد`, 'success');
        loadInstalledPlugins();
        
    } catch (error) {
        console.error('Activate error:', error);
        showToast(error.message || 'خطا در فعال‌سازی', 'error');
        
        if (btn) {
            btn.innerHTML = '<i class="fas fa-power-off"></i> فعال‌سازی';
            btn.disabled = false;
        }
    }
}

/**
 * Deactivate a plugin
 */
async function deactivatePlugin(slug) {
    const btn = event?.target?.closest('.btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> غیرفعال‌سازی...';
        btn.disabled = true;
    }
    
    try {
        const response = await fetch(`${API_BASE}/plugins/deactivate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ slug })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Deactivation failed');
        }
        
        showToast(`${data.data?.name || 'افزونه'} غیرفعال شد`, 'success');
        loadInstalledPlugins();
        
    } catch (error) {
        console.error('Deactivate error:', error);
        showToast(error.message || 'خطا در غیرفعال‌سازی', 'error');
        
        if (btn) {
            btn.innerHTML = '<i class="fas fa-pause"></i> غیرفعال';
            btn.disabled = false;
        }
    }
}

/**
 * Delete a plugin
 */
async function deletePlugin(slug) {
    if (!confirm('آیا از حذف این افزونه مطمئن هستید؟')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/plugins/${slug}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Deletion failed');
        }
        
        showToast(`${data.data?.name || 'افزونه'} حذف شد`, 'success');
        loadInstalledPlugins();
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast(error.message || 'خطا در حذف افزونه', 'error');
    }
}

/**
 * View plugin details
 */
async function viewPluginDetails(slug) {
    const modal = document.getElementById('plugin-modal');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>در حال بارگذاری اطلاعات...</span>
        </div>
    `;
    
    modal.classList.add('active');
    
    try {
        const response = await fetch(`${API_BASE}/plugins/info/${slug}`, {
            headers: getHeaders()
        });
        
        if (!response.ok) throw new Error('Failed to load plugin info');
        
        const data = await response.json();
        const plugin = data.data;
        
        // Check if plugin is installed
        const installedPlugin = installedPlugins.find(p => p.slug === slug);
        const isInstalled = installedPlugin && installedPlugin.installed_at;
        const isActive = installedPlugin && installedPlugin.status === 'active';
        
        const icon = plugin.icons?.['2x'] || plugin.icons?.['1x'] || plugin.icons?.default || '';
        const rating = plugin.rating ? (plugin.rating / 20).toFixed(1) : 'N/A';
        const downloads = formatNumber(plugin.downloaded || 0);
        const activeInstalls = formatNumber(plugin.active_installs || 0);
        
        modalBody.innerHTML = `
            <div class="modal-plugin-header">
                ${icon ? `<img src="${icon}" alt="${plugin.name}" class="modal-plugin-icon">` : 
                    `<div class="plugin-icon-placeholder"><i class="fas fa-plug"></i></div>`}
                <div class="modal-plugin-info">
                    <h2>${plugin.name}</h2>
                    <div class="modal-plugin-meta">
                        <span><i class="fas fa-user"></i> ${plugin.author ? plugin.author.replace(/<[^>]*>/g, '') : 'Unknown'}</span>
                        <span><i class="fas fa-code-branch"></i> v${plugin.version}</span>
                        <span><i class="fas fa-star"></i> ${rating}/5</span>
                        <span><i class="fas fa-download"></i> ${downloads} دانلود</span>
                        <span><i class="fas fa-users"></i> ${activeInstalls} نصب فعال</span>
                    </div>
                </div>
            </div>
            
            <div class="modal-plugin-description">
                <h3>توضیحات</h3>
                <p>${plugin.short_description || plugin.description || 'بدون توضیحات'}</p>
            </div>
            
            <div class="modal-plugin-description">
                <h3>اطلاعات فنی</h3>
                <p>
                    <strong>نسخه PHP مورد نیاز:</strong> ${plugin.requires_php || 'نامشخص'}<br>
                    <strong>تست شده با وردپرس:</strong> ${plugin.tested || 'نامشخص'}<br>
                    <strong>آخرین بروزرسانی:</strong> ${plugin.last_updated || 'نامشخص'}
                </p>
            </div>
            
            <div class="modal-plugin-actions">
                ${isInstalled ? 
                    (isActive ? 
                        `<button class="btn btn-warning" onclick="deactivatePlugin('${slug}'); closeModal();">
                            <i class="fas fa-pause"></i>
                            غیرفعال‌سازی
                        </button>
                        <button class="btn btn-danger" onclick="deactivatePlugin('${slug}'); setTimeout(() => deletePlugin('${slug}'), 500); closeModal();">
                            <i class="fas fa-trash"></i>
                            حذف
                        </button>` :
                        `<button class="btn btn-success" onclick="activatePlugin('${slug}'); closeModal();">
                            <i class="fas fa-power-off"></i>
                            فعال‌سازی
                        </button>
                        <button class="btn btn-danger" onclick="deletePlugin('${slug}'); closeModal();">
                            <i class="fas fa-trash"></i>
                            حذف
                        </button>`
                    ) :
                    `<button class="btn btn-primary" onclick="installPlugin('${slug}'); closeModal();">
                        <i class="fas fa-download"></i>
                        نصب افزونه
                    </button>`
                }
                <a href="https://wordpress.org/plugins/${slug}/" target="_blank" class="btn btn-outline">
                    <i class="fas fa-external-link-alt"></i>
                    مشاهده در WordPress.org
                </a>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading plugin details:', error);
        modalBody.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>خطا در بارگذاری اطلاعات</h3>
                <button class="btn btn-primary" onclick="closeModal()">بستن</button>
            </div>
        `;
    }
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('plugin-modal').classList.remove('active');
}

// ==================== UI HELPERS ====================

/**
 * Create installed plugin card HTML
 */
function createInstalledPluginCard(plugin) {
    const isActive = plugin.status === 'active';
    const icon = plugin.icon || '';
    
    return `
        <div class="plugin-card">
            <div class="plugin-card-header">
                ${icon ? 
                    `<img src="${icon}" alt="${plugin.name}" class="plugin-icon">` : 
                    `<div class="plugin-icon-placeholder"><i class="fas fa-plug"></i></div>`
                }
                <div class="plugin-title-section">
                    <h3 class="plugin-title">${plugin.name}</h3>
                    <span class="plugin-author">توسط ${plugin.author || 'نامشخص'}</span>
                    <span class="plugin-version">نسخه ${plugin.version}</span>
                </div>
            </div>
            <p class="plugin-description">${plugin.description || plugin.description_en || 'بدون توضیحات'}</p>
            <div class="plugin-stats">
                <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                    <i class="fas ${isActive ? 'fa-check-circle' : 'fa-pause-circle'}"></i>
                    ${isActive ? 'فعال' : 'غیرفعال'}
                </span>
                ${plugin.rating ? `
                    <span class="plugin-stat">
                        <i class="fas fa-star stars"></i>
                        ${plugin.rating.toFixed(1)}
                    </span>
                ` : ''}
            </div>
            <div class="plugin-actions">
                ${isActive ? 
                    `<button class="btn btn-warning btn-sm" onclick="deactivatePlugin('${plugin.slug}')">
                        <i class="fas fa-pause"></i>
                        غیرفعال
                    </button>` :
                    `<button class="btn btn-success btn-sm" onclick="activatePlugin('${plugin.slug}')">
                        <i class="fas fa-power-off"></i>
                        فعال‌سازی
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deletePlugin('${plugin.slug}')">
                        <i class="fas fa-trash"></i>
                        حذف
                    </button>`
                }
                <button class="btn btn-outline btn-sm" onclick="viewPluginDetails('${plugin.slug}')">
                    <i class="fas fa-info-circle"></i>
                    جزئیات
                </button>
            </div>
        </div>
    `;
}

/**
 * Create search result plugin card HTML
 */
function createSearchPluginCard(plugin) {
    const icon = plugin.icons?.['2x'] || plugin.icons?.['1x'] || plugin.icons?.default || '';
    const rating = plugin.rating ? (plugin.rating / 20).toFixed(1) : 'N/A';
    const downloads = formatNumber(plugin.downloaded || 0);
    const activeInstalls = formatNumber(plugin.active_installs || 0);
    const author = plugin.author ? plugin.author.replace(/<[^>]*>/g, '') : 'Unknown';
    
    // Check if already installed
    const installedPlugin = installedPlugins.find(p => p.slug === plugin.slug);
    const isInstalled = installedPlugin && installedPlugin.installed_at;
    const isActive = installedPlugin && installedPlugin.status === 'active';
    
    let actionButton;
    if (isInstalled) {
        if (isActive) {
            actionButton = `
                <span class="status-badge active">
                    <i class="fas fa-check-circle"></i>
                    نصب و فعال
                </span>
            `;
        } else {
            actionButton = `
                <button class="btn btn-success btn-sm" onclick="activatePlugin('${plugin.slug}')">
                    <i class="fas fa-power-off"></i>
                    فعال‌سازی
                </button>
            `;
        }
    } else {
        actionButton = `
            <button class="btn btn-primary btn-sm" onclick="installPlugin('${plugin.slug}')">
                <i class="fas fa-download"></i>
                نصب
            </button>
        `;
    }
    
    return `
        <div class="plugin-card">
            <div class="plugin-card-header">
                ${icon ? 
                    `<img src="${icon}" alt="${plugin.name}" class="plugin-icon">` : 
                    `<div class="plugin-icon-placeholder"><i class="fas fa-plug"></i></div>`
                }
                <div class="plugin-title-section">
                    <h3 class="plugin-title">${plugin.name}</h3>
                    <span class="plugin-author">توسط ${author}</span>
                    <span class="plugin-version">نسخه ${plugin.version}</span>
                </div>
            </div>
            <p class="plugin-description">${plugin.short_description || 'بدون توضیحات'}</p>
            <div class="plugin-stats">
                <span class="plugin-stat">
                    <i class="fas fa-star stars"></i>
                    ${rating}
                </span>
                <span class="plugin-stat">
                    <i class="fas fa-users"></i>
                    ${activeInstalls}+ نصب
                </span>
            </div>
            <div class="plugin-actions">
                ${actionButton}
                <button class="btn btn-outline btn-sm" onclick="viewPluginDetails('${plugin.slug}')">
                    <i class="fas fa-info-circle"></i>
                    جزئیات
                </button>
            </div>
        </div>
    `;
}

/**
 * Format large numbers
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});
