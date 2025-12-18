/**
 * Shop.js - Shopping Cart & ZarinPal Payment Integration
 * فروشگاه غنچه لاله زار - سیستم سبد خرید و پرداخت زرین پال
 */

'use strict';

// ==================== Configuration ====================
const CONFIG = {
    // ZarinPal Settings
    zarinpal: {
        merchantId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // Replace with your ZarinPal Merchant ID
        sandbox: true, // Set to false for production
        callbackUrl: window.location.origin + '/verify.html'
    },
    // API Endpoints
    api: {
        baseUrl: window.location.origin,
        payment: '/api/payment/request',
        verify: '/api/payment/verify'
    },
    // Shop Settings
    shop: {
        currency: 'تومان',
        freeShippingThreshold: 500000, // Free shipping above 500,000 Toman
        shippingCost: 45000, // 45,000 Toman shipping
        minOrderAmount: 100000 // Minimum order 100,000 Toman
    }
};

// ==================== Products Database ====================
const PRODUCTS = {
    1: {
        id: 1,
        title: 'غنچه خشک صادراتی - سایز M',
        description: 'غنچه خشک با کیفیت صادراتی، سایز متوسط، مناسب برای دم‌نوش و چای. برداشت شده از مزارع لاله زار کرمان در ارتفاع ۲۷۰۰ متری.',
        price: 385000,
        weight: '250g',
        category: 'dried',
        icon: 'fas fa-seedling',
        inStock: true
    },
    2: {
        id: 2,
        title: 'غنچه خشک صادراتی - سایز L',
        description: 'غنچه خشک درشت با کیفیت عالی، مناسب برای صنایع غذایی و عطرسازی. گلبرگ‌های ضخیم و عطر قوی.',
        price: 425000,
        weight: '250g',
        category: 'dried',
        icon: 'fas fa-seedling',
        inStock: true
    },
    3: {
        id: 3,
        title: 'غنچه خشک - سایز S (اقتصادی)',
        description: 'غنچه خشک ریز، مناسب برای مصارف خانگی و دم‌نوش روزانه. قیمت مناسب با کیفیت تضمینی.',
        price: 295000,
        originalPrice: 350000,
        weight: '250g',
        category: 'dried',
        icon: 'fas fa-seedling',
        inStock: true
    },
    4: {
        id: 4,
        title: 'گلبرگ خشک گل محمدی',
        description: 'گلبرگ‌های خشک شده با حفظ رنگ و عطر طبیعی، مناسب برای تزیین و دم‌نوش.',
        price: 185000,
        weight: '100g',
        category: 'petals',
        icon: 'fas fa-leaf',
        inStock: true
    },
    5: {
        id: 5,
        title: 'گلاب دوآتیشه لاله زار',
        description: 'گلاب خالص و اصل با تقطیر سنتی، مناسب برای مصارف خوراکی و آرایشی.',
        price: 245000,
        weight: '1L',
        category: 'water',
        icon: 'fas fa-tint',
        inStock: true
    },
    6: {
        id: 6,
        title: 'گلاب اعلا بطری شیشه‌ای',
        description: 'گلاب درجه یک در بسته‌بندی شیشه‌ای لوکس، هدیه‌ای خاص.',
        price: 185000,
        weight: '500ml',
        category: 'water',
        icon: 'fas fa-tint',
        inStock: true
    },
    7: {
        id: 7,
        title: 'چای گل محمدی',
        description: 'ترکیب چای و غنچه گل محمدی، طعمی بی‌نظیر و خواص فراوان.',
        price: 165000,
        weight: '200g',
        category: 'tea',
        icon: 'fas fa-mug-hot',
        inStock: true
    },
    8: {
        id: 8,
        title: 'دمنوش گل محمدی',
        description: 'دمنوش خالص گل محمدی بدون افزودنی، آرامبخش طبیعی.',
        price: 145000,
        weight: '150g',
        category: 'tea',
        icon: 'fas fa-mug-hot',
        inStock: true
    },
    9: {
        id: 9,
        title: 'پکیج هدیه گل محمدی',
        description: 'شامل: غنچه خشک ۱۵۰گ + گلاب ۵۰۰میل + گلبرگ ۵۰گ - بسته‌بندی هدیه',
        price: 485000,
        originalPrice: 580000,
        weight: 'پکیج',
        category: 'all',
        icon: 'fas fa-gift',
        inStock: true
    }
};

// ==================== Cart State ====================
let cart = [];

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeCart();
    initializeMobileMenu();
    initializeCategoryFilter();
    initializeSmoothScroll();
    initializeHeaderScroll();
});

/**
 * Initialize cart from localStorage
 */
function initializeCart() {
    const savedCart = localStorage.getItem('ghoncheCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

/**
 * Save cart to localStorage
 */
function saveCart() {
    localStorage.setItem('ghoncheCart', JSON.stringify(cart));
}

// ==================== Cart Functions ====================

/**
 * Add item to cart
 */
function addToCart(productId, title, price, weight) {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            title: title,
            price: price,
            weight: weight,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartUI();
    showToast('محصول به سبد خرید اضافه شد', 'success');
    
    // Animate cart button
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.classList.add('pulse');
        setTimeout(() => cartBtn.classList.remove('pulse'), 300);
    }
}

/**
 * Remove item from cart
 */
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    showToast('محصول از سبد خرید حذف شد', 'success');
}

/**
 * Update item quantity
 */
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

/**
 * Get cart total
 */
function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Get total items count
 */
function getCartItemsCount() {
    return cart.reduce((count, item) => count + item.quantity, 0);
}

/**
 * Calculate shipping cost
 */
function getShippingCost() {
    const total = getCartTotal();
    if (total >= CONFIG.shop.freeShippingThreshold) {
        return 0;
    }
    return CONFIG.shop.shippingCost;
}

/**
 * Format price in Persian
 */
function formatPrice(price) {
    return price.toLocaleString('fa-IR') + ' ' + CONFIG.shop.currency;
}

// ==================== UI Functions ====================

/**
 * Toggle cart sidebar
 */
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

/**
 * Update cart UI elements
 */
function updateCartUI() {
    updateCartCount();
    updateCartItems();
    updateCartFooter();
}

/**
 * Update cart count badge
 */
function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    const count = getCartItemsCount();
    if (countEl) {
        countEl.textContent = count.toLocaleString('fa-IR');
        countEl.style.display = count > 0 ? 'flex' : 'none';
    }
}

/**
 * Update cart items display
 */
function updateCartItems() {
    const container = document.getElementById('cart-items');
    const emptyEl = document.getElementById('cart-empty');
    const footerEl = document.getElementById('cart-footer');
    
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        if (footerEl) footerEl.style.display = 'none';
        return;
    }
    
    if (emptyEl) emptyEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'block';
    
    container.innerHTML = cart.map(item => {
        const product = PRODUCTS[item.id] || {};
        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <i class="${product.icon || 'fas fa-box'}"></i>
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-weight">${item.weight}</div>
                    <div class="cart-item-price">${formatPrice(item.price)}</div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span>${item.quantity.toLocaleString('fa-IR')}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="remove-item" onclick="removeFromCart(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Update cart footer totals
 */
function updateCartFooter() {
    const totalEl = document.getElementById('cart-total-price');
    if (totalEl) {
        const total = getCartTotal();
        const shipping = getShippingCost();
        totalEl.textContent = formatPrice(total + shipping);
    }
}

// ==================== Checkout Functions ====================

/**
 * Proceed to checkout
 */
function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('سبد خرید شما خالی است', 'error');
        return;
    }
    
    const total = getCartTotal();
    if (total < CONFIG.shop.minOrderAmount) {
        showToast(`حداقل مبلغ سفارش ${formatPrice(CONFIG.shop.minOrderAmount)} است`, 'error');
        return;
    }
    
    toggleCart();
    openCheckoutModal();
}

/**
 * Open checkout modal
 */
function openCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        updateOrderSummary();
        modal.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close checkout modal
 */
function closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }
}

/**
 * Update order summary in checkout modal
 */
function updateOrderSummary() {
    const itemsContainer = document.getElementById('order-items-summary');
    const subtotalEl = document.getElementById('summary-subtotal');
    const shippingEl = document.getElementById('summary-shipping');
    const totalEl = document.getElementById('summary-total');
    
    if (!itemsContainer) return;
    
    // Items
    itemsContainer.innerHTML = cart.map(item => `
        <div class="summary-item">
            <span class="summary-item-name">${item.title}</span>
            <span class="summary-item-qty">×${item.quantity.toLocaleString('fa-IR')}</span>
            <span class="summary-item-price">${formatPrice(item.price * item.quantity)}</span>
        </div>
    `).join('');
    
    // Totals
    const subtotal = getCartTotal();
    const shipping = getShippingCost();
    const total = subtotal + shipping;
    
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'رایگان' : formatPrice(shipping);
    if (totalEl) totalEl.textContent = formatPrice(total);
}

/**
 * Submit order and redirect to ZarinPal
 */
async function submitOrder(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Validate form
    if (!form.checkValidity()) {
        showToast('لطفاً تمام فیلدهای اجباری را پر کنید', 'error');
        return;
    }
    
    // Collect form data
    const formData = new FormData(form);
    const orderData = {
        customer: {
            name: formData.get('name'),
            phone: formData.get('phone'),
            email: formData.get('email') || '',
            province: formData.get('province'),
            city: formData.get('city'),
            address: formData.get('address'),
            postalCode: formData.get('postal_code')
        },
        items: cart.map(item => ({
            id: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            weight: item.weight
        })),
        subtotal: getCartTotal(),
        shipping: getShippingCost(),
        total: getCartTotal() + getShippingCost()
    };
    
    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    try {
        // In production, this would send to your server
        // which then communicates with ZarinPal API
        const response = await initiatePayment(orderData);
        
        if (response.success) {
            // Store order data for verification
            localStorage.setItem('pendingOrder', JSON.stringify(orderData));
            localStorage.setItem('paymentAuthority', response.authority);
            
            // Redirect to ZarinPal
            window.location.href = response.paymentUrl;
        } else {
            showToast(response.message || 'خطا در اتصال به درگاه پرداخت', 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showToast('خطا در برقراری ارتباط با سرور', 'error');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

/**
 * Initiate payment with ZarinPal
 * In production, this should call your backend server
 */
async function initiatePayment(orderData) {
    // For demo purposes, we'll simulate the API call
    // In production, you should NEVER expose your merchant ID on the frontend
    
    const amount = orderData.total;
    const description = `خرید از فروشگاه غنچه لاله زار - ${orderData.items.length} محصول`;
    const callbackUrl = CONFIG.zarinpal.callbackUrl;
    
    // Simulate API response for demo
    // In production, replace this with actual server call:
    /*
    const response = await fetch(CONFIG.api.baseUrl + CONFIG.api.payment, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: amount,
            description: description,
            callbackUrl: callbackUrl,
            customerPhone: orderData.customer.phone,
            customerEmail: orderData.customer.email
        })
    });
    return await response.json();
    */
    
    // Demo response - simulates successful payment initiation
    return new Promise((resolve) => {
        setTimeout(() => {
            const authority = 'A00000000000000000000000000' + Math.random().toString(36).substr(2, 9);
            
            // For sandbox/testing
            const baseUrl = CONFIG.zarinpal.sandbox 
                ? 'https://sandbox.zarinpal.com/pg/StartPay/' 
                : 'https://www.zarinpal.com/pg/StartPay/';
            
            resolve({
                success: true,
                authority: authority,
                paymentUrl: baseUrl + authority
            });
        }, 1500);
    });
}

/**
 * Clear cart after successful payment
 */
function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
    localStorage.removeItem('pendingOrder');
    localStorage.removeItem('paymentAuthority');
}

// ==================== Quick View ====================

/**
 * Show quick view modal
 */
function quickView(productId) {
    const product = PRODUCTS[productId];
    if (!product) return;
    
    const modal = document.getElementById('quick-view-modal');
    const body = document.getElementById('quick-view-body');
    const overlay = document.getElementById('modal-overlay');
    
    if (!modal || !body) return;
    
    body.innerHTML = `
        <div class="quick-view-image">
            <i class="${product.icon}"></i>
        </div>
        <h2 class="quick-view-title">${product.title}</h2>
        <p class="quick-view-desc">${product.description}</p>
        <div class="product-meta">
            <span class="product-weight"><i class="fas fa-weight-hanging"></i> ${product.weight}</span>
        </div>
        <div class="quick-view-price">
            ${product.originalPrice ? `<span class="old-price">${formatPrice(product.originalPrice)}</span>` : ''}
            ${formatPrice(product.price)}
        </div>
        <button class="btn btn-add-cart" onclick="addToCart(${product.id}, '${product.title}', ${product.price}, '${product.weight}'); closeQuickView();">
            <i class="fas fa-cart-plus"></i>
            افزودن به سبد خرید
        </button>
    `;
    
    modal.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

/**
 * Close quick view modal
 */
function closeQuickView() {
    const modal = document.getElementById('quick-view-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// ==================== Category Filter ====================

/**
 * Initialize category filter buttons
 */
function initializeCategoryFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const products = document.querySelectorAll('.shop-product-card');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter products
            products.forEach(product => {
                const productCategory = product.dataset.category;
                if (category === 'all' || productCategory === category) {
                    product.style.display = 'block';
                    product.style.animation = 'fadeInUp 0.5s ease forwards';
                } else {
                    product.style.display = 'none';
                }
            });
        });
    });
}

// ==================== Toast Notification ====================

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const messageEl = document.getElementById('toast-message');
    
    if (!toast || !messageEl) return;
    
    // Update content
    messageEl.textContent = message;
    toast.className = 'toast ' + type;
    
    // Update icon
    const icon = toast.querySelector('i');
    if (icon) {
        icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== Mobile Menu ====================

/**
 * Initialize mobile menu
 */
function initializeMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (toggle && navMenu) {
        toggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            const icon = this.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
        
        // Close menu on link click
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 992) {
                    navMenu.classList.remove('active');
                    const icon = toggle.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }
}

// ==================== Smooth Scroll ====================

/**
 * Initialize smooth scrolling for anchor links
 */
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                const headerOffset = 100;
                const elementPosition = targetEl.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ==================== Header Scroll Effect ====================

/**
 * Initialize header scroll effect
 */
function initializeHeaderScroll() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    let lastScroll = 0;
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
}

// ==================== Keyboard Navigation ====================

/**
 * Handle keyboard events
 */
document.addEventListener('keydown', function(e) {
    // Close modals on Escape
    if (e.key === 'Escape') {
        closeCheckoutModal();
        closeQuickView();
        
        const cartSidebar = document.getElementById('cart-sidebar');
        if (cartSidebar && cartSidebar.classList.contains('open')) {
            toggleCart();
        }
    }
});

// ==================== CSS Animation for Cart Button ====================
const style = document.createElement('style');
style.textContent = `
    .cart-btn.pulse {
        animation: pulse 0.3s ease;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

// ==================== Export Functions for Global Use ====================
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.toggleCart = toggleCart;
window.proceedToCheckout = proceedToCheckout;
window.closeCheckoutModal = closeCheckoutModal;
window.submitOrder = submitOrder;
window.quickView = quickView;
window.closeQuickView = closeQuickView;
window.clearCart = clearCart;
