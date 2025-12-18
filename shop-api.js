/**
 * Shop API Server with ZarinPal Payment Integration
 * فروشگاه غنچه لاله زار - API سرور پرداخت
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// ==================== Configuration ====================
const CONFIG = {
    zarinpal: {
        // Replace with your actual ZarinPal Merchant ID
        merchantId: process.env.ZARINPAL_MERCHANT_ID || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        sandbox: process.env.NODE_ENV !== 'production',
        // ZarinPal API URLs
        requestUrl: 'https://api.zarinpal.com/pg/v4/payment/request.json',
        verifyUrl: 'https://api.zarinpal.com/pg/v4/payment/verify.json',
        sandboxRequestUrl: 'https://sandbox.zarinpal.com/pg/v4/payment/request.json',
        sandboxVerifyUrl: 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json',
        // Payment gateway URLs
        paymentUrl: 'https://www.zarinpal.com/pg/StartPay/',
        sandboxPaymentUrl: 'https://sandbox.zarinpal.com/pg/StartPay/'
    },
    shop: {
        name: 'فروشگاه غنچه لاله زار',
        phone: '+989122127437',
        minOrderAmount: 100000 // 100,000 Toman
    }
};

// ==================== In-Memory Database ====================
let orders = [];
let orderCounter = 1000;

// ==================== Middleware ====================
app.use(cors({
    origin: ['http://localhost:8000', 'http://localhost:3000', 'http://localhost:3002'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// ==================== Helper Functions ====================

/**
 * Generate unique order ID
 */
function generateOrderId() {
    orderCounter++;
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `GL-${orderCounter}-${random}`;
}

/**
 * Get ZarinPal API URL based on environment
 */
function getZarinPalUrl(type) {
    const isSandbox = CONFIG.zarinpal.sandbox;
    
    switch (type) {
        case 'request':
            return isSandbox ? CONFIG.zarinpal.sandboxRequestUrl : CONFIG.zarinpal.requestUrl;
        case 'verify':
            return isSandbox ? CONFIG.zarinpal.sandboxVerifyUrl : CONFIG.zarinpal.verifyUrl;
        case 'payment':
            return isSandbox ? CONFIG.zarinpal.sandboxPaymentUrl : CONFIG.zarinpal.paymentUrl;
        default:
            return null;
    }
}

/**
 * Call ZarinPal API
 */
async function callZarinPalAPI(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        return await response.json();
    } catch (error) {
        console.error('ZarinPal API Error:', error);
        throw error;
    }
}

/**
 * Format order for storage
 */
function formatOrder(orderData, authority) {
    return {
        id: generateOrderId(),
        authority: authority,
        customer: orderData.customer,
        items: orderData.items,
        subtotal: orderData.subtotal,
        shipping: orderData.shipping,
        total: orderData.total,
        status: 'pending',
        refId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

// ==================== API Endpoints ====================

/**
 * POST /api/payment/request
 * Create payment request with ZarinPal
 */
app.post('/api/payment/request', async (req, res) => {
    try {
        const { amount, description, callbackUrl, customerPhone, customerEmail, orderData } = req.body;
        
        // Validate request
        if (!amount || amount < CONFIG.shop.minOrderAmount) {
            return res.status(400).json({
                success: false,
                message: `حداقل مبلغ سفارش ${CONFIG.shop.minOrderAmount.toLocaleString('fa-IR')} تومان است`
            });
        }
        
        // Prepare ZarinPal request
        const zarinpalData = {
            merchant_id: CONFIG.zarinpal.merchantId,
            amount: amount, // Amount in Toman
            description: description || `خرید از ${CONFIG.shop.name}`,
            callback_url: callbackUrl,
            metadata: {
                mobile: customerPhone,
                email: customerEmail || ''
            }
        };
        
        // For demo/sandbox, simulate the API call
        if (CONFIG.zarinpal.sandbox && CONFIG.zarinpal.merchantId.includes('xxxx')) {
            // Simulated response for demo
            const authority = 'A00000000000000000000000000' + Math.random().toString(36).substr(2, 9);
            
            // Store order
            const order = formatOrder(orderData, authority);
            orders.push(order);
            
            return res.json({
                success: true,
                authority: authority,
                paymentUrl: getZarinPalUrl('payment') + authority,
                orderId: order.id
            });
        }
        
        // Real ZarinPal API call
        const apiUrl = getZarinPalUrl('request');
        const response = await callZarinPalAPI(apiUrl, zarinpalData);
        
        if (response.data && response.data.code === 100) {
            const authority = response.data.authority;
            
            // Store order
            const order = formatOrder(orderData, authority);
            orders.push(order);
            
            return res.json({
                success: true,
                authority: authority,
                paymentUrl: getZarinPalUrl('payment') + authority,
                orderId: order.id
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'خطا در ایجاد تراکنش',
                errorCode: response.errors?.code || response.data?.code
            });
        }
        
    } catch (error) {
        console.error('Payment request error:', error);
        return res.status(500).json({
            success: false,
            message: 'خطا در برقراری ارتباط با درگاه پرداخت'
        });
    }
});

/**
 * POST /api/payment/verify
 * Verify payment with ZarinPal
 */
app.post('/api/payment/verify', async (req, res) => {
    try {
        const { authority, amount } = req.body;
        
        if (!authority) {
            return res.status(400).json({
                success: false,
                message: 'کد تراکنش نامعتبر است'
            });
        }
        
        // Find order by authority
        const order = orders.find(o => o.authority === authority);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'سفارش یافت نشد'
            });
        }
        
        // For demo/sandbox, simulate verification
        if (CONFIG.zarinpal.sandbox && CONFIG.zarinpal.merchantId.includes('xxxx')) {
            // Simulated successful verification
            const refId = Math.floor(Math.random() * 9000000000) + 1000000000;
            
            // Update order
            order.status = 'paid';
            order.refId = refId.toString();
            order.updatedAt = new Date().toISOString();
            
            return res.json({
                success: true,
                refId: refId.toString(),
                orderId: order.id,
                message: 'پرداخت با موفقیت انجام شد'
            });
        }
        
        // Real ZarinPal verification
        const verifyData = {
            merchant_id: CONFIG.zarinpal.merchantId,
            authority: authority,
            amount: amount || order.total
        };
        
        const apiUrl = getZarinPalUrl('verify');
        const response = await callZarinPalAPI(apiUrl, verifyData);
        
        if (response.data && response.data.code === 100) {
            // Update order
            order.status = 'paid';
            order.refId = response.data.ref_id.toString();
            order.updatedAt = new Date().toISOString();
            
            return res.json({
                success: true,
                refId: response.data.ref_id.toString(),
                orderId: order.id,
                cardPan: response.data.card_pan,
                message: 'پرداخت با موفقیت انجام شد'
            });
        } else if (response.data && response.data.code === 101) {
            // Already verified
            return res.json({
                success: true,
                refId: order.refId,
                orderId: order.id,
                message: 'این تراکنش قبلاً تأیید شده است'
            });
        } else {
            // Update order status
            order.status = 'failed';
            order.updatedAt = new Date().toISOString();
            
            return res.status(400).json({
                success: false,
                message: 'پرداخت ناموفق',
                errorCode: response.errors?.code || response.data?.code
            });
        }
        
    } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'خطا در تأیید پرداخت'
        });
    }
});

/**
 * GET /api/orders
 * Get all orders (for admin)
 */
app.get('/api/orders', (req, res) => {
    res.json({
        success: true,
        data: orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
});

/**
 * GET /api/orders/:id
 * Get single order by ID
 */
app.get('/api/orders/:id', (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    
    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'سفارش یافت نشد'
        });
    }
    
    res.json({
        success: true,
        data: order
    });
});

/**
 * GET /api/orders/track/:authority
 * Track order by authority code
 */
app.get('/api/orders/track/:authority', (req, res) => {
    const order = orders.find(o => o.authority === req.params.authority);
    
    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'سفارش یافت نشد'
        });
    }
    
    // Return limited info for public tracking
    res.json({
        success: true,
        data: {
            id: order.id,
            status: order.status,
            total: order.total,
            createdAt: order.createdAt
        }
    });
});

/**
 * PUT /api/orders/:id/status
 * Update order status (for admin)
 */
app.put('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    const order = orders.find(o => o.id === req.params.id);
    
    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'سفارش یافت نشد'
        });
    }
    
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'وضعیت نامعتبر'
        });
    }
    
    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    res.json({
        success: true,
        data: order
    });
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'ghoncheye-shop-api',
        timestamp: new Date().toISOString(),
        zarinpalMode: CONFIG.zarinpal.sandbox ? 'sandbox' : 'production'
    });
});

// ==================== Error Handling ====================
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'خطای سرور'
    });
});

// ==================== Start Server ====================
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🛒 Ghoncheye Lalehzar Shop API Server                      ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  📍 API running at: http://localhost:${PORT}/api/              ║`);
    console.log(`║  🔧 Mode: ${CONFIG.zarinpal.sandbox ? 'Sandbox (Demo)' : 'Production'}                              ║`);
    console.log('║  💳 ZarinPal Payment Gateway Integrated                    ║');
    console.log('║  🛑 Press Ctrl+C to stop                                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Available endpoints:');
    console.log('  POST /api/payment/request  - Create payment request');
    console.log('  POST /api/payment/verify   - Verify payment');
    console.log('  GET  /api/orders           - List all orders');
    console.log('  GET  /api/orders/:id       - Get order details');
    console.log('  PUT  /api/orders/:id/status - Update order status');
    console.log('  GET  /api/health           - Health check');
    console.log('');
});

module.exports = app;
