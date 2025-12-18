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
    const currentPath = window.location.pathname;
    
    // Check if we're in a language subdirectory
    const isInEn = currentPath.includes('/en/');
    const isInAr = currentPath.includes('/ar/');
    const isInZh = currentPath.includes('/zh/');
    const isInLangDir = isInEn || isInAr || isInZh;

    // Build the base path
    let basePath = '';
    if (isInLangDir) {
        basePath = '../';
    } else {
        basePath = './';
    }

    // Redirect based on selected language
    switch (selectedLang) {
        case 'fa':
            window.location.href = isInLangDir ? '../index.html' : './index.html';
            break;
        case 'en':
            window.location.href = basePath + 'en/index.html';
            break;
        case 'ar':
            window.location.href = basePath + 'ar/index.html';
            break;
        case 'zh':
            window.location.href = basePath + 'zh/index.html';
            break;
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