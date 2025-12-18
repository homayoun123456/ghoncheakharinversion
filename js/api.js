/**
 * Frontend API Client
 * Ghoncheye Lalehzar - Public Website
 */

(function() {
    'use strict';

    const API_BASE = '/api';

    /**
     * Make API request
     */
    async function apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    /**
     * Submit contact form
     */
    async function submitContactForm(formData) {
        return apiRequest('/contact', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
    }

    /**
     * Subscribe to newsletter
     */
    async function subscribeNewsletter(email, name = '') {
        return apiRequest('/subscribe', {
            method: 'POST',
            body: JSON.stringify({ email, name })
        });
    }

    /**
     * Get public settings
     */
    async function getSettings() {
        return apiRequest('/settings/public');
    }

    /**
     * Get products
     */
    async function getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `/products?${queryString}` : '/products';
        return apiRequest(url);
    }

    /**
     * Get single product
     */
    async function getProduct(slug) {
        return apiRequest(`/products/${slug}`);
    }

    /**
     * Get posts
     */
    async function getPosts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `/posts?${queryString}` : '/posts';
        return apiRequest(url);
    }

    /**
     * Get single post
     */
    async function getPost(slug) {
        return apiRequest(`/posts/${slug}`);
    }

    /**
     * Get pages
     */
    async function getPages() {
        return apiRequest('/pages');
    }

    /**
     * Get single page
     */
    async function getPage(slug) {
        return apiRequest(`/pages/${slug}`);
    }

    // ==================== Form Handlers ====================

    /**
     * Initialize contact form
     */
    function initContactForm() {
        const form = document.querySelector('#contact-form, .contact-form form, form[action*="contact"]');
        
        if (!form) return;

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
            const originalText = submitBtn?.textContent || submitBtn?.value;

            try {
                // Show loading state
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'در حال ارسال...';
                    submitBtn.value = 'در حال ارسال...';
                }

                // Collect form data
                const formData = {};
                const inputs = form.querySelectorAll('input, select, textarea');
                
                inputs.forEach(input => {
                    if (input.name && input.value) {
                        formData[input.name] = input.value;
                    }
                });

                // Submit
                const result = await submitContactForm(formData);

                if (result.success) {
                    showNotification('success', result.message || 'پیام شما با موفقیت ارسال شد!');
                    form.reset();
                } else {
                    throw new Error(result.error);
                }

            } catch (error) {
                showNotification('error', error.message || 'خطا در ارسال پیام. لطفاً مجدداً تلاش کنید.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    submitBtn.value = originalText;
                }
            }
        });
    }

    /**
     * Initialize newsletter form
     */
    function initNewsletterForm() {
        const forms = document.querySelectorAll('.newsletter-form, form[action*="subscribe"], form[action*="newsletter"]');
        
        forms.forEach(form => {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();

                const emailInput = form.querySelector('input[type="email"], input[name="email"]');
                const nameInput = form.querySelector('input[name="name"]');
                const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
                const originalText = submitBtn?.textContent || submitBtn?.value;

                if (!emailInput || !emailInput.value) {
                    showNotification('error', 'لطفاً ایمیل خود را وارد کنید');
                    return;
                }

                try {
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = '...';
                    }

                    const result = await subscribeNewsletter(
                        emailInput.value,
                        nameInput?.value || ''
                    );

                    if (result.success) {
                        showNotification('success', result.message || 'با تشکر از عضویت شما!');
                        form.reset();
                    } else {
                        throw new Error(result.error);
                    }

                } catch (error) {
                    showNotification('error', error.message || 'خطا در ثبت‌نام');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                        submitBtn.value = originalText;
                    }
                }
            });
        });
    }

    /**
     * Show notification
     */
    function showNotification(type, message) {
        // Try to use existing notification system
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        // Fallback notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#4caf50' : '#f44336'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-family: inherit;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    /**
     * Load dynamic content from API
     */
    async function loadDynamicContent() {
        // Load products if container exists
        const productsContainer = document.querySelector('[data-load="products"]');
        if (productsContainer) {
            try {
                const result = await getProducts({ featured: 'true' });
                if (result.success && result.data) {
                    renderProducts(productsContainer, result.data);
                }
            } catch (error) {
                console.error('Failed to load products:', error);
            }
        }

        // Load posts if container exists
        const postsContainer = document.querySelector('[data-load="posts"]');
        if (postsContainer) {
            try {
                const result = await getPosts({ limit: 3 });
                if (result.success && result.data) {
                    renderPosts(postsContainer, result.data);
                }
            } catch (error) {
                console.error('Failed to load posts:', error);
            }
        }
    }

    /**
     * Render products to container
     */
    function renderProducts(container, products) {
        if (!products.length) {
            container.innerHTML = '<p>محصولی یافت نشد</p>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-card" data-aos="fade-up">
                <div class="product-image">
                    <img src="${product.image || '/assets/images/placeholder.jpg'}" alt="${product.name}" loading="lazy">
                </div>
                <div class="product-content">
                    <h3>${product.name}</h3>
                    <p>${product.short_description || ''}</p>
                    <a href="/products/${product.slug}" class="btn btn-outline">جزئیات بیشتر</a>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render posts to container
     */
    function renderPosts(container, posts) {
        if (!posts.length) {
            container.innerHTML = '<p>مطلبی یافت نشد</p>';
            return;
        }

        container.innerHTML = posts.map(post => `
            <article class="post-card" data-aos="fade-up">
                ${post.featured_image ? `<img src="${post.featured_image}" alt="${post.title}" loading="lazy">` : ''}
                <div class="post-content">
                    <h3><a href="/blog/${post.slug}">${post.title}</a></h3>
                    <p>${post.excerpt || ''}</p>
                    <a href="/blog/${post.slug}" class="read-more">ادامه مطلب</a>
                </div>
            </article>
        `).join('');
    }

    // ==================== Initialize ====================

    function init() {
        initContactForm();
        initNewsletterForm();
        loadDynamicContent();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose to global scope
    window.GhoncheyeAPI = {
        submitContactForm,
        subscribeNewsletter,
        getSettings,
        getProducts,
        getProduct,
        getPosts,
        getPost,
        getPages,
        getPage
    };

})();
