// main.js - Optimized for Core Web Vitals and Performance

// Use strict mode for better error handling
'use strict';

// Performance optimization constants
const DEBOUNCE_DELAY = 100;
const THROTTLE_DELAY = 1000;
const IMAGE_THRESHOLD = '0.1';

// DOM elements cache
let elementsCache = {};

// Initialize the application
function init() {
    // Cache DOM elements for better performance
    elementsCache = {
        mobileMenuToggle: document.querySelector('.mobile-menu-toggle'),
        navMenu: document.querySelector('.nav-menu'),
        header: document.querySelector('.header'),
        navLinks: document.querySelectorAll('.nav-menu a[href^="#"]'),
        sections: document.querySelectorAll('section[id]'),
        lazyImages: document.querySelectorAll('img[data-src]'),
        form: document.getElementById('export-form')
    };

    // Initialize all features
    initializeMobileMenu();
    initializeSmoothScrolling();
    initializeHeaderScrollEffect();
    initializeLazyLoading();
    initializeFormHandling();
    initializePerformanceMonitoring();
    initializeAccessibilityFeatures();

    // Run after DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAfterDOMLoaded);
    } else {
        runAfterDOMLoaded();
    }
}

// Run after DOM is fully loaded
function runAfterDOMLoaded() {
    // Initialize animations for elements that come into view
    initializeIntersectionObserver();

    // Track Core Web Vitals
    trackCoreWebVitals();

    // Optimize images
    optimizeImages();
}

// Mobile menu functionality
function initializeMobileMenu() {
    if (elementsCache.mobileMenuToggle && elementsCache.navMenu) {
        elementsCache.mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }

    // Close mobile menu when clicking on a link
    if (elementsCache.navLinks) {
        elementsCache.navLinks.forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });
    }
}

function toggleMobileMenu() {
    if (elementsCache.navMenu) {
        elementsCache.navMenu.classList.toggle('active');
        const icon = elementsCache.mobileMenuToggle.querySelector('i');
        if (elementsCache.navMenu.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
}

function closeMobileMenu() {
    if (window.innerWidth <= 992 && elementsCache.navMenu) {
        elementsCache.navMenu.classList.remove('active');
        const icon = elementsCache.mobileMenuToggle.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

// Smooth scrolling for navigation links
function initializeSmoothScrolling() {
    if (!elementsCache.navLinks) return;

    elementsCache.navLinks.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId) return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerOffset = 100;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Sticky header effect
function initializeHeaderScrollEffect() {
    if (!elementsCache.header) return;

    let lastScrollTop = 0;
    const headerHeight = elementsCache.header.offsetHeight;

    const handleScroll = throttle(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > headerHeight) {
            elementsCache.header.classList.add('scrolled');
        } else {
            elementsCache.header.classList.remove('scrolled');
        }

        lastScrollTop = scrollTop;
    }, THROTTLE_DELAY);

    window.addEventListener('scroll', handleScroll);
}

// Navigation active link highlighting
function initializeNavigationActiveLinks() {
    if (!elementsCache.sections || !elementsCache.navLinks) return;

    const sections = Array.from(elementsCache.sections);
    const navLinks = Array.from(elementsCache.navLinks);

    const observerOptions = {
        rootMargin: '0px 0px -80% 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${entry.target.id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
}

// Lazy loading for images
function initializeLazyLoading() {
    if (!elementsCache.lazyImages || elementsCache.lazyImages.length === 0) return;

    // Create intersection observer for images
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;

                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');

                    // Add loaded class for CSS animations
                    img.classList.add('loaded');

                    // Stop observing this image
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.01
    });

    // Observe all lazy images
    elementsCache.lazyImages.forEach(img => {
        imageObserver.observe(img);
    });

    // Also handle iframes for videos
    const lazyIframes = document.querySelectorAll('iframe[data-src]');
    if (lazyIframes.length > 0) {
        const iframeObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const iframe = entry.target;
                    const src = iframe.dataset.src;

                    if (src) {
                        iframe.src = src;
                        iframe.removeAttribute('data-src');
                        observer.unobserve(iframe);
                    }
                }
            });
        }, {
            rootMargin: '100px 0px',
            threshold: 0.01
        });

        lazyIframes.forEach(iframe => {
            iframeObserver.observe(iframe);
        });
    }
}

// Form handling with validation and WhatsApp integration
function initializeFormHandling() {
    if (!elementsCache.form) return;

    const form = elementsCache.form;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Basic validation
        if (!validateForm(form)) {
            showNotification('Please fill in all required fields.', 'error');
            return;
        }

        // Collect form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Create WhatsApp message
        const message = createWhatsAppMessage(data);
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/989122127437?text=${encodedMessage}`;

        // Open WhatsApp
        window.open(whatsappUrl, '_blank');

        showNotification('Form submitted successfully! Opening WhatsApp...', 'success');

        // Reset form
        setTimeout(() => {
            form.reset();
        }, 1000);
    });

    // Add real-time validation
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            validateField(input);
        });
    });
}

// Function to change language by redirecting to the appropriate URL
function changeLanguage() {
    const selectedLang = document.getElementById('language-switcher').value;

    // Determine current page location to handle relative paths properly
    const pathParts = window.location.pathname.split('/');
    const isRoot = pathParts[pathParts.length - 2] === 'ghoncheye-lalehzar-final-structure';
    const isEn = pathParts[pathParts.length - 2] === 'en';
    const isAr = pathParts[pathParts.length - 2] === 'ar';
    const isZh = pathParts[pathParts.length - 2] === 'zh';

    if (selectedLang === 'en') {
        if (isRoot) {
            window.location.href = './en/';
        } else if (isAr || isZh) {
            window.location.href = '../en/';
        } else {
            // Already on English version or other case
            window.location.href = './';
        }
    } else if (selectedLang === 'fa') {
        if (isEn || isAr || isZh) {
            window.location.href = '../';
        } else {
            // Already on Farsi version
            window.location.href = './';
        }
    } else if (selectedLang === 'ar') {
        if (isRoot) {
            window.location.href = './ar/';
        } else if (isEn || isZh) {
            window.location.href = '../ar/';
        } else {
            // Already on Arabic version
            window.location.href = './';
        }
    } else if (selectedLang === 'zh') {
        if (isRoot) {
            window.location.href = './zh/';
        } else if (isEn || isAr) {
            window.location.href = '../zh/';
        } else {
            // Already on Chinese version
            window.location.href = './';
        }
    }
}

// Form validation
function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            markFieldError(field);
            isValid = false;
        } else {
            markFieldValid(field);
        }
    });

    return isValid;
}

function validateField(field) {
    if (field.hasAttribute('required') && !field.value.trim()) {
        markFieldError(field);
        return false;
    }

    // Email validation
    if (field.type === 'email' && field.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value)) {
            markFieldError(field);
            return false;
        }
    }

    markFieldValid(field);
    return true;
}

function markFieldError(field) {
    field.style.borderColor = '#f44336';
    field.parentElement.classList.add('error');
    field.parentElement.classList.remove('success');
}

function markFieldValid(field) {
    field.style.borderColor = '#4caf50';
    field.parentElement.classList.add('success');
    field.parentElement.classList.remove('error');
}

// Create WhatsApp message
function createWhatsAppMessage(data) {
    // Sanitize input to prevent XSS
    const sanitizeInput = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[<>'"&]/g, (match) => {
            switch (match) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#x27;';
                case '&': return '&amp;';
                default: return match;
            }
        });
    };

    // Language-specific mappings
    const countryNames = {
        'fa': {
            'china': 'چین',
            'turkey': 'ترکیه',
            'germany': 'آلمان',
            'france': 'فرانسه',
            'uk': 'انگلستان',
            'uae': 'امارات متحده عربی',
            'saudi': 'عربستان سعودی',
            'other': 'سایر'
        },
        'en': {
            'china': 'China',
            'turkey': 'Turkey',
            'germany': 'Germany',
            'france': 'France',
            'uk': 'United Kingdom',
            'uae': 'United Arab Emirates',
            'saudi': 'Saudi Arabia',
            'other': 'Other'
        },
        'ar': {
            'china': 'الصين',
            'turkey': 'تركيا',
            'germany': 'ألمانيا',
            'france': 'فرنسا',
            'uk': 'المملكة المتحدة',
            'uae': 'الإمارات العربية المتحدة',
            'saudi': 'المملكة العربية السعودية',
            'other': 'أخرى'
        },
        'zh': {
            'china': '中国',
            'turkey': '土耳其',
            'germany': '德国',
            'france': '法国',
            'uk': '英国',
            'uae': '阿联酋',
            'saudi': '沙特阿拉伯',
            'other': '其他'
        }
    };

    const productNames = {
        'fa': {
            'fresh': 'غنچه تازه',
            'dried-export': 'غنچه خشک صادراتی (S/M/L)',
            'petals': 'گلبرگ خشک',
            'essential-oil': 'عطر گل محمدی',
            'rose-water': 'گلاب',
            'tea-grade': 'درجه چای'
        },
        'en': {
            'fresh': 'Fresh Buds',
            'dried-export': 'Dried Export Buds (S/M/L)',
            'petals': 'Dried Petals',
            'essential-oil': 'Rose Essential Oil',
            'rose-water': 'Rose Water',
            'tea-grade': 'Tea Grade'
        },
        'ar': {
            'fresh': 'أزهار طازجة',
            'dried-export': 'أزهار مجففة (S/M/L)',
            'petals': 'بتلات مجففة',
            'essential-oil': 'الزيت العطري للورد',
            'rose-water': 'ماء الورد',
            'tea-grade': 'لشاي'
        },
        'zh': {
            'fresh': '新鲜花蕾',
            'dried-export': '干制出口花蕾 (S/M/L)',
            'petals': '干花瓣',
            'essential-oil': '玫瑰精油',
            'rose-water': '玫瑰水',
            'tea-grade': '茶叶级'
        }
    };

    const applicationNames = {
        'fa': {
            'food': 'صنایع غذایی',
            'cosmetic': 'لوازم آرایشی',
            'tea': 'چای/دم‌نوش',
            'perfume': 'عطرسازی',
            'other': 'سایر'
        },
        'en': {
            'food': 'Food Industry',
            'cosmetic': 'Cosmetics',
            'tea': 'Tea/Beverage',
            'perfume': 'Perfumery',
            'other': 'Other'
        },
        'ar': {
            'food': 'الصناعات الغذائية',
            'cosmetic': 'ال cosmetology',
            'tea': 'الشاي/المشروبات',
            'perfume': 'العطور',
            'other': 'أخرى'
        },
        'zh': {
            'food': '食品工业',
            'cosmetic': '化妆品',
            'tea': '茶/饮料',
            'perfume': '香料',
            'other': '其他'
        }
    };

    // Determine the current language based on the page
    const htmlLang = document.documentElement.lang;
    const lang = htmlLang || 'en';

    // Get the appropriate language mappings
    const currentCountryNames = countryNames[lang] || countryNames['en'];
    const currentProductNames = productNames[lang] || productNames['en'];
    const currentApplicationNames = applicationNames[lang] || applicationNames['en'];

    // Sanitize inputs
    const sanitizedCompany = sanitizeInput(data.company);
    const sanitizedContact = sanitizeInput(data.contact);
    const sanitizedEmail = sanitizeInput(data.email);
    const sanitizedPhone = sanitizeInput(data.phone);
    const sanitizedVolume = sanitizeInput(data.volume);
    const sanitizedRequirements = sanitizeInput(data.requirements || 'ندارد');

    // Map values using appropriate language
    const countryText = currentCountryNames[data.country] || data.country;
    const productText = currentProductNames[data.product] || data.product;
    const applicationText = currentApplicationNames[data.application] || data.application;

    if (lang === 'fa') {
        return `سلام، فرم نیازسنجی غنچه لاله زار

📋 اطلاعات تماس:
• شرکت: ${sanitizedCompany}
• شخص تماس: ${sanitizedContact}
• ایمیل: ${sanitizedEmail}
• تلفن: ${sanitizedPhone}

🌍 اطلاعات سفارش:
• کشور: ${countryText}
• محصول: ${productText}
• حجم ماهانه: ${sanitizedVolume} کیلوگرم
• کاربرد: ${applicationText}

📝 نیازهای خاص:
${sanitizedRequirements || 'ندارد'}

لطفاً با من تماس بگیرید.`;
    } else {
        return `Hello, Ghoncheye Lalehzar needs assessment form

📋 Contact Information:
• Company: ${sanitizedCompany}
• Contact Person: ${sanitizedContact}
• Email: ${sanitizedEmail}
• Phone: ${sanitizedPhone}

🌍 Order Information:
• Country: ${countryText}
• Product: ${productText}
• Monthly Volume: ${sanitizedVolume} kg
• Application: ${applicationText}

📝 Special Requirements:
${sanitizedRequirements || 'None'}

Please contact me.`;
    }
}

// Notification system
function showNotification(message, type = 'success') {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    // Determine font based on language
    const htmlLang = document.documentElement.lang;
    let fontFamily = "'Poppins', sans-serif";
    if (htmlLang === 'fa') {
        fontFamily = "'Vazirmatn', 'Poppins', sans-serif";
    } else if (htmlLang === 'ar') {
        fontFamily = "'Tajawal', 'Poppins', sans-serif";
    } else if (htmlLang === 'zh') {
        fontFamily = "'Noto Sans SC', 'Poppins', sans-serif";
    }

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        padding: 15px 30px;
        border-radius: 50px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideDown 0.3s ease;
        font-family: ${fontFamily};
        font-weight: 600;
    `;

    const notificationContent = notification.querySelector('.notification-content');
    notificationContent.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    document.body.appendChild(notification);

    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 4000);
}

// Add CSS animations dynamically
function addCSSAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }

        @keyframes slideUp {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px);
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize Intersection Observer for animations
function initializeIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
        // Fallback for browsers that don't support Intersection Observer
        return;
    }

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Elements to animate
    const animateElements = [
        ...document.querySelectorAll('.product-card'),
        ...document.querySelectorAll('.quality-item'),
        ...document.querySelectorAll('.trust-item'),
        ...document.querySelectorAll('.certificate-item'),
        ...document.querySelectorAll('.process-step'),
        ...document.querySelectorAll('.why-item'),
        ...document.querySelectorAll('.contact-card')
    ];

    animateElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(element);
    });
}

// Performance monitoring
function initializePerformanceMonitoring() {
    // Measure First Contentful Paint (FCP)
    if ('performance' in window) {
        performance.getEntriesByType('paint').forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
                console.log('FCP:', entry.startTime);
                // In a real app, you would send this to your analytics
            }
        });
    }

    // Measure Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver(entryList => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('LCP:', lastEntry.startTime);
            // In a real app, you would send this to your analytics
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    }
}

// Track Core Web Vitals
function trackCoreWebVitals() {
    // This is a simplified version - in production you'd use the web-vitals library
    // For now, we'll just log the metrics
    if ('measureWebVitals' in navigator) {
        // This would be implemented with a library like web-vitals
        console.log('Core Web Vitals tracking initialized');
    }
}

// Optimize images
function optimizeImages() {
    // Preload critical images
    const criticalImages = [
        'hero-image-placeholder',
        'product-card',
        'certificate-item'
    ];

    criticalImages.forEach(className => {
        const images = document.querySelectorAll(`.${className} img`);
        images.forEach(img => {
            if (img.src && !img.complete) {
                img.decode().catch(() => {
                    // Handle image decode failure if needed
                });
            }
        });
    });
}

// Initialize accessibility features
function initializeAccessibilityFeatures() {
    // Add skip link for accessibility
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to content';
    skipLink.className = 'skip-link sr-only';
    skipLink.tabIndex = 1;
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Ensure all interactive elements are keyboard accessible
    const interactiveElements = document.querySelectorAll('a, button, input, select, textarea');
    interactiveElements.forEach(el => {
        el.addEventListener('focus', () => {
            el.classList.add('focusable');
        });
        el.addEventListener('blur', () => {
            el.classList.remove('focusable');
        });
    });
}

// Utility functions for performance
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

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Initialize everything when the script loads
document.addEventListener('DOMContentLoaded', init);
// Add the CSS animations early to avoid FOUC
addCSSAnimations();

// ==========================================
// Media Gallery with SEO Optimization
// ==========================================

// Media Gallery Class
class MediaGallery {
    constructor() {
        this.mediaItems = [];
        this.currentIndex = 0;
        this.lightbox = null;
        this.filterButtons = null;
        this.mediaGrid = null;
        this.isLightboxOpen = false;
        
        this.init();
    }
    
    init() {
        // Cache DOM elements
        this.lightbox = document.getElementById('media-lightbox');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.mediaGrid = document.querySelector('.media-grid');
        this.loadMoreBtn = document.getElementById('load-more-media');
        
        if (!this.mediaGrid) return;
        
        // Initialize components
        this.initializeMediaItems();
        this.initializeFilters();
        this.initializeLightbox();
        this.initializeLazyLoadingMedia();
        this.initializeVideoPlayers();
        this.initializeKeyboardNavigation();
        this.initializeLoadMore();
        
        // Track media views for analytics
        this.initializeAnalytics();
    }
    
    // Initialize media items with SEO data
    initializeMediaItems() {
        const items = this.mediaGrid.querySelectorAll('.media-item');
        
        items.forEach((item, index) => {
            const type = item.dataset.type;
            const img = item.querySelector('.media-image');
            const video = item.querySelector('.media-video');
            const title = item.querySelector('.media-info h3')?.textContent || '';
            const description = item.querySelector('meta[itemprop="description"]')?.content || '';
            const altText = img?.alt || '';
            
            this.mediaItems.push({
                element: item,
                type,
                index,
                title,
                description,
                altText,
                imageSrc: img?.dataset?.src || img?.src,
                videoSrc: video?.querySelector('source')?.dataset?.src,
                loaded: false
            });
        });
    }
    
    // Filter functionality
    initializeFilters() {
        if (!this.filterButtons) return;
        
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilter(e.currentTarget);
            });
        });
    }
    
    handleFilter(button) {
        const filter = button.dataset.filter;
        
        // Update active state
        this.filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Filter items with animation
        this.mediaItems.forEach((item, index) => {
            const element = item.element;
            
            if (filter === 'all' || item.type === filter) {
                element.classList.remove('hidden');
                element.style.animationDelay = `${index * 0.1}s`;
            } else {
                element.classList.add('hidden');
            }
        });
        
        // Update Schema.org data for filtered view
        this.updateSchemaForFilter(filter);
    }
    
    // Update Schema.org structured data based on filter
    updateSchemaForFilter(filter) {
        // This helps search engines understand the current view
        const gallerySchema = document.querySelector('script[type="application/ld+json"]');
        if (gallerySchema) {
            try {
                const schema = JSON.parse(gallerySchema.textContent);
                if (schema['@type'] === 'ImageGallery') {
                    // Update filter info (for analytics/tracking purposes)
                    console.log('Gallery filtered:', filter);
                }
            } catch (e) {
                // Schema parsing error, ignore
            }
        }
    }
    
    // Lightbox functionality
    initializeLightbox() {
        if (!this.lightbox) return;
        
        const zoomButtons = document.querySelectorAll('.media-zoom-btn');
        const closeBtn = this.lightbox.querySelector('.lightbox-close');
        const prevBtn = this.lightbox.querySelector('.lightbox-prev');
        const nextBtn = this.lightbox.querySelector('.lightbox-next');
        const overlay = this.lightbox.querySelector('.lightbox-overlay');
        
        // Open lightbox
        zoomButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.openLightbox(parseInt(btn.dataset.index) || index);
            });
        });
        
        // Close lightbox
        closeBtn?.addEventListener('click', () => this.closeLightbox());
        overlay?.addEventListener('click', () => this.closeLightbox());
        
        // Navigation
        prevBtn?.addEventListener('click', () => this.navigateLightbox(-1));
        nextBtn?.addEventListener('click', () => this.navigateLightbox(1));
    }
    
    openLightbox(index) {
        this.currentIndex = index;
        this.isLightboxOpen = true;
        
        // Get only image items for lightbox
        const imageItems = this.mediaItems.filter(item => item.type === 'image');
        const item = imageItems[index];
        
        if (!item) return;
        
        const lightboxImage = this.lightbox.querySelector('.lightbox-image');
        const lightboxVideo = this.lightbox.querySelector('.lightbox-video');
        const titleEl = this.lightbox.querySelector('.lightbox-title');
        const descEl = this.lightbox.querySelector('.lightbox-description');
        const counterEl = this.lightbox.querySelector('.lightbox-counter');
        
        // Show image, hide video
        lightboxImage.style.display = 'block';
        lightboxVideo.style.display = 'none';
        
        // Set content
        lightboxImage.src = item.imageSrc;
        lightboxImage.alt = item.altText;
        titleEl.textContent = item.title;
        descEl.textContent = item.description;
        counterEl.textContent = `${index + 1} از ${imageItems.length}`;
        
        // Show lightbox
        this.lightbox.hidden = false;
        this.lightbox.removeAttribute('hidden');
        document.body.style.overflow = 'hidden';
        
        // Focus management for accessibility
        this.lightbox.focus();
        
        // Track view for SEO analytics
        this.trackMediaView(item);
    }
    
    closeLightbox() {
        this.isLightboxOpen = false;
        this.lightbox.hidden = true;
        document.body.style.overflow = '';
    }
    
    navigateLightbox(direction) {
        const imageItems = this.mediaItems.filter(item => item.type === 'image');
        this.currentIndex = (this.currentIndex + direction + imageItems.length) % imageItems.length;
        this.openLightbox(this.currentIndex);
    }
    
    // Keyboard navigation
    initializeKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!this.isLightboxOpen) return;
            
            switch (e.key) {
                case 'Escape':
                    this.closeLightbox();
                    break;
                case 'ArrowRight':
                    this.navigateLightbox(-1); // RTL
                    break;
                case 'ArrowLeft':
                    this.navigateLightbox(1); // RTL
                    break;
            }
        });
    }
    
    // Lazy loading for media
    initializeLazyLoadingMedia() {
        const mediaObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    
                    // Handle images
                    if (target.tagName === 'IMG' && target.dataset.src) {
                        this.loadImage(target);
                    }
                    
                    // Handle video posters
                    if (target.classList.contains('video-poster') && target.dataset.poster) {
                        target.style.backgroundImage = `url('${target.dataset.poster}')`;
                    }
                    
                    // Handle picture sources
                    if (target.tagName === 'IMG') {
                        const picture = target.closest('picture');
                        if (picture) {
                            picture.querySelectorAll('source').forEach(source => {
                                if (source.dataset.srcset) {
                                    source.srcset = source.dataset.srcset;
                                }
                            });
                        }
                        
                        // Handle srcset
                        if (target.dataset.srcset) {
                            target.srcset = target.dataset.srcset;
                        }
                    }
                    
                    mediaObserver.unobserve(target);
                }
            });
        }, {
            rootMargin: '100px 0px',
            threshold: 0.1
        });
        
        // Observe images
        document.querySelectorAll('.media-image[data-src]').forEach(img => {
            mediaObserver.observe(img);
        });
        
        // Observe video posters
        document.querySelectorAll('.video-poster[data-poster]').forEach(poster => {
            mediaObserver.observe(poster);
        });
    }
    
    loadImage(img) {
        const src = img.dataset.src;
        
        // Create a new image to preload
        const preloadImg = new Image();
        preloadImg.onload = () => {
            img.src = src;
            img.classList.add('loaded');
            img.removeAttribute('data-src');
        };
        preloadImg.onerror = () => {
            console.error('Failed to load image:', src);
        };
        preloadImg.src = src;
    }
    
    // Video player functionality
    initializeVideoPlayers() {
        const playButtons = document.querySelectorAll('.video-play-btn');
        
        playButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.playVideo(btn);
            });
        });
    }
    
    playVideo(button) {
        const wrapper = button.closest('.video-wrapper');
        const poster = wrapper.querySelector('.video-poster');
        const video = wrapper.querySelector('.media-video');
        
        if (!video) return;
        
        // Load video sources
        video.querySelectorAll('source').forEach(source => {
            if (source.dataset.src) {
                source.src = source.dataset.src;
            }
        });
        
        // Load video poster
        if (video.dataset.poster) {
            video.poster = video.dataset.poster;
        }
        
        video.load();
        
        // Hide poster, show video
        poster.style.display = 'none';
        video.style.display = 'block';
        
        // Play video
        video.play().catch(error => {
            console.log('Video autoplay prevented:', error);
        });
        
        // Track video play for SEO analytics
        this.trackVideoPlay(wrapper);
    }
    
    // Load more functionality
    initializeLoadMore() {
        if (!this.loadMoreBtn) return;
        
        this.loadMoreBtn.addEventListener('click', () => {
            this.loadMoreMedia();
        });
    }
    
    async loadMoreMedia() {
        this.loadMoreBtn.disabled = true;
        this.loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>در حال بارگذاری...</span>';
        
        // Simulate loading more items (in production, fetch from API)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In production, you would fetch more items from the API here
        // For now, just hide the button
        this.loadMoreBtn.style.display = 'none';
    }
    
    // Analytics tracking for SEO
    initializeAnalytics() {
        // Track when media items come into view
        const analyticsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const item = this.mediaItems.find(i => i.element === entry.target);
                    if (item && !item.viewed) {
                        item.viewed = true;
                        this.trackMediaImpression(item);
                    }
                }
            });
        }, {
            threshold: 0.5
        });
        
        this.mediaItems.forEach(item => {
            analyticsObserver.observe(item.element);
        });
    }
    
    trackMediaView(item) {
        // Send to analytics (Google Analytics, etc.)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'media_view', {
                'media_type': item.type,
                'media_title': item.title,
                'media_index': item.index
            });
        }
        console.log('Media viewed:', item.title);
    }
    
    trackVideoPlay(wrapper) {
        const title = wrapper.querySelector('.media-info h3')?.textContent || 'Unknown Video';
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'video_play', {
                'video_title': title
            });
        }
        console.log('Video played:', title);
    }
    
    trackMediaImpression(item) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'media_impression', {
                'media_type': item.type,
                'media_title': item.title
            });
        }
    }
}

// ==========================================
// Media Upload with SEO Fields
// ==========================================

class MediaUploader {
    constructor(options = {}) {
        this.uploadZone = options.uploadZone || document.querySelector('.media-upload-zone');
        this.form = options.form || document.querySelector('.media-upload-form');
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        this.allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        
        if (this.uploadZone) {
            this.init();
        }
    }
    
    init() {
        this.initDragAndDrop();
        this.initFileInput();
        this.initSEOFields();
    }
    
    initDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, () => {
                this.uploadZone.classList.add('dragover');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, () => {
                this.uploadZone.classList.remove('dragover');
            });
        });
        
        this.uploadZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });
    }
    
    initFileInput() {
        const input = this.uploadZone.querySelector('input[type="file"]');
        if (input) {
            this.uploadZone.addEventListener('click', () => input.click());
            input.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }
    }
    
    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (this.validateFile(file)) {
                this.uploadFile(file);
            }
        });
    }
    
    validateFile(file) {
        const isImage = this.allowedImageTypes.includes(file.type);
        const isVideo = this.allowedVideoTypes.includes(file.type);
        
        if (!isImage && !isVideo) {
            showNotification('فرمت فایل پشتیبانی نمی‌شود. لطفاً از JPEG، PNG، WebP، MP4 یا WebM استفاده کنید.', 'error');
            return false;
        }
        
        if (file.size > this.maxFileSize) {
            showNotification('حجم فایل بیش از حد مجاز است. حداکثر 10MB', 'error');
            return false;
        }
        
        return true;
    }
    
    async uploadFile(file) {
        const progressBar = this.form?.querySelector('.upload-progress');
        const progressBarInner = progressBar?.querySelector('.upload-progress-bar');
        
        if (progressBar) {
            progressBar.classList.add('active');
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        // Add SEO fields
        const altText = document.getElementById('media-alt-text')?.value || '';
        const title = document.getElementById('media-title')?.value || '';
        const description = document.getElementById('media-description')?.value || '';
        const caption = document.getElementById('media-caption')?.value || '';
        
        formData.append('alt_text', altText);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('caption', caption);
        
        try {
            // Simulate upload (replace with actual API call)
            for (let i = 0; i <= 100; i += 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (progressBarInner) {
                    progressBarInner.style.width = `${i}%`;
                }
            }
            
            showNotification('فایل با موفقیت آپلود شد!', 'success');
            this.resetForm();
            
        } catch (error) {
            showNotification('خطا در آپلود فایل. لطفاً دوباره تلاش کنید.', 'error');
        } finally {
            if (progressBar) {
                progressBar.classList.remove('active');
            }
        }
    }
    
    initSEOFields() {
        // Alt text character counter
        const altTextInput = document.getElementById('media-alt-text');
        const altTextCounter = document.getElementById('alt-text-counter');
        
        if (altTextInput && altTextCounter) {
            altTextInput.addEventListener('input', () => {
                const length = altTextInput.value.length;
                altTextCounter.textContent = `${length}/125 کاراکتر`;
                
                if (length > 125) {
                    altTextCounter.classList.add('error');
                } else if (length > 100) {
                    altTextCounter.classList.add('warning');
                } else {
                    altTextCounter.classList.remove('warning', 'error');
                }
            });
        }
        
        // Title character counter
        const titleInput = document.getElementById('media-title');
        const titleCounter = document.getElementById('title-counter');
        
        if (titleInput && titleCounter) {
            titleInput.addEventListener('input', () => {
                const length = titleInput.value.length;
                titleCounter.textContent = `${length}/70 کاراکتر`;
                
                if (length > 70) {
                    titleCounter.classList.add('error');
                } else if (length > 60) {
                    titleCounter.classList.add('warning');
                } else {
                    titleCounter.classList.remove('warning', 'error');
                }
            });
        }
        
        // Description counter
        const descInput = document.getElementById('media-description');
        const descCounter = document.getElementById('description-counter');
        
        if (descInput && descCounter) {
            descInput.addEventListener('input', () => {
                const length = descInput.value.length;
                descCounter.textContent = `${length}/160 کاراکتر`;
                
                if (length > 160) {
                    descCounter.classList.add('error');
                } else if (length > 140) {
                    descCounter.classList.add('warning');
                } else {
                    descCounter.classList.remove('warning', 'error');
                }
            });
        }
    }
    
    resetForm() {
        if (this.form) {
            this.form.reset();
        }
    }
}

// ==========================================
// Image Optimization Utilities
// ==========================================

const ImageOptimization = {
    // Check WebP support
    supportsWebP: false,
    
    async checkWebPSupport() {
        return new Promise((resolve) => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                this.supportsWebP = webP.height === 2;
                resolve(this.supportsWebP);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    },
    
    // Generate responsive image srcset
    generateSrcset(basePath, sizes = [400, 800, 1200]) {
        const extension = basePath.split('.').pop();
        const pathWithoutExt = basePath.replace(`.${extension}`, '');
        
        return sizes.map(size => `${pathWithoutExt}-${size}.${extension} ${size}w`).join(', ');
    },
    
    // Calculate optimal image dimensions based on container
    calculateOptimalSize(containerWidth, aspectRatio = 4/3) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const optimalWidth = Math.ceil(containerWidth * devicePixelRatio);
        const optimalHeight = Math.ceil(optimalWidth / aspectRatio);
        
        return { width: optimalWidth, height: optimalHeight };
    },
    
    // Preload critical images for LCP optimization
    preloadCriticalImage(src, type = 'image/jpeg') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        link.type = type;
        document.head.appendChild(link);
    },
    
    // Generate blurhash placeholder (simplified version)
    generatePlaceholder(width, height, color = '#f0f0f0') {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Crect fill='${encodeURIComponent(color)}' width='${width}' height='${height}'/%3E%3C/svg%3E`;
    }
};

// ==========================================
// Video SEO Optimization
// ==========================================

const VideoSEO = {
    // Generate video schema markup
    generateVideoSchema(options) {
        return {
            "@context": "https://schema.org",
            "@type": "VideoObject",
            "name": options.title,
            "description": options.description,
            "thumbnailUrl": options.thumbnailUrl,
            "uploadDate": options.uploadDate,
            "duration": options.duration,
            "contentUrl": options.contentUrl,
            "embedUrl": options.embedUrl,
            "publisher": {
                "@type": "Organization",
                "name": options.publisherName,
                "logo": {
                    "@type": "ImageObject",
                    "url": options.publisherLogo
                }
            }
        };
    },
    
    // Add video captions for accessibility and SEO
    addCaptions(video, captionsUrl, language = 'fa') {
        const track = document.createElement('track');
        track.kind = 'captions';
        track.src = captionsUrl;
        track.srclang = language;
        track.label = language === 'fa' ? 'فارسی' : 'English';
        track.default = true;
        video.appendChild(track);
    },
    
    // Generate video sitemap entry
    generateSitemapEntry(options) {
        return `
<video:video>
    <video:thumbnail_loc>${options.thumbnailUrl}</video:thumbnail_loc>
    <video:title>${options.title}</video:title>
    <video:description>${options.description}</video:description>
    <video:content_loc>${options.contentUrl}</video:content_loc>
    <video:duration>${options.durationSeconds}</video:duration>
    <video:publication_date>${options.uploadDate}</video:publication_date>
</video:video>`;
    }
};

// Initialize Media Gallery when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check WebP support
    ImageOptimization.checkWebPSupport().then(supported => {
        if (supported) {
            document.documentElement.classList.add('webp-supported');
        }
    });
    
    // Initialize media gallery
    const gallery = new MediaGallery();
    
    // Initialize media uploader (if upload form exists)
    const uploader = new MediaUploader();
    
    // Make available globally for external use
    window.MediaGallery = MediaGallery;
    window.MediaUploader = MediaUploader;
    window.ImageOptimization = ImageOptimization;
    window.VideoSEO = VideoSEO;
});