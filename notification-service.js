/**
 * Notification Service - سرویس اطلاع‌رسانی
 * پشتیبانی از پیامک فراز اس ام اس، واتساپ و تلگرام
 * 
 * Ghoncheye Lalehzar - غنچه لاله زار
 */

'use strict';

// ==================== Configuration ====================
const CONFIG = {
    // فراز اس ام اس - Faraz SMS
    farazSMS: {
        apiUrl: 'https://ippanel.com/api/select',
        apiKey: process.env.FARAZ_SMS_API_KEY || 'YOUR_API_KEY',
        username: process.env.FARAZ_SMS_USERNAME || 'YOUR_USERNAME',
        password: process.env.FARAZ_SMS_PASSWORD || 'YOUR_PASSWORD',
        fromNumber: process.env.FARAZ_SMS_FROM || '3000505',
        patternCode: {
            orderConfirm: 'pattern_code_order_confirm',
            orderShipped: 'pattern_code_order_shipped',
            paymentSuccess: 'pattern_code_payment_success',
            newOrder: 'pattern_code_new_order'
        },
        enabled: true
    },
    
    // تلگرام - Telegram Bot
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN',
        apiUrl: 'https://api.telegram.org/bot',
        // Chat IDs
        managerChatId: process.env.TELEGRAM_MANAGER_CHAT_ID || '',
        secretaryChatId: process.env.TELEGRAM_SECRETARY_CHAT_ID || '',
        groupChatId: process.env.TELEGRAM_GROUP_CHAT_ID || '',
        enabled: true
    },
    
    // واتساپ - WhatsApp (via WhatsApp Business API or third-party)
    whatsapp: {
        // Using WhatsApp Business API or services like Twilio, WATI, etc.
        apiUrl: process.env.WHATSAPP_API_URL || 'https://api.whatsapp.com/send',
        apiKey: process.env.WHATSAPP_API_KEY || '',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        // Direct WhatsApp numbers for manual notification
        managerPhone: process.env.WHATSAPP_MANAGER || '989122127437',
        secretaryPhone: process.env.WHATSAPP_SECRETARY || '',
        enabled: true
    },
    
    // گیرندگان پیش‌فرض - Default Recipients
    recipients: {
        manager: {
            name: 'مدیر',
            phone: process.env.MANAGER_PHONE || '09122127437',
            telegramId: process.env.TELEGRAM_MANAGER_CHAT_ID || '',
            whatsapp: process.env.WHATSAPP_MANAGER || '989122127437',
            notifications: ['newOrder', 'payment', 'lowStock', 'dailyReport']
        },
        secretary: {
            name: 'منشی',
            phone: process.env.SECRETARY_PHONE || '',
            telegramId: process.env.TELEGRAM_SECRETARY_CHAT_ID || '',
            whatsapp: process.env.WHATSAPP_SECRETARY || '',
            notifications: ['newOrder', 'payment', 'shipping']
        }
    },
    
    // قالب‌های پیام - Message Templates
    templates: {
        fa: {
            newOrder: {
                sms: 'سفارش جدید #{orderId}\nمبلغ: {amount} تومان\nمشتری: {customerName}\nتلفن: {customerPhone}',
                telegram: '🛒 *سفارش جدید*\n\n📦 شماره سفارش: `{orderId}`\n💰 مبلغ: {amount} تومان\n👤 مشتری: {customerName}\n📱 تلفن: {customerPhone}\n📍 استان: {province}\n🏙 شهر: {city}\n\n📝 محصولات:\n{items}',
                whatsapp: '🛒 سفارش جدید\n\n📦 شماره: {orderId}\n💰 مبلغ: {amount} تومان\n👤 {customerName}\n📱 {customerPhone}'
            },
            paymentSuccess: {
                sms: 'پرداخت موفق\nسفارش: #{orderId}\nمبلغ: {amount} تومان\nکد رهگیری: {refId}',
                telegram: '✅ *پرداخت موفق*\n\n📦 سفارش: `{orderId}`\n💰 مبلغ: {amount} تومان\n🔢 کد رهگیری: `{refId}`\n👤 مشتری: {customerName}',
                whatsapp: '✅ پرداخت موفق\nسفارش: {orderId}\nمبلغ: {amount} تومان'
            },
            orderConfirmCustomer: {
                sms: 'مشتری گرامی، سفارش شما با کد {orderId} ثبت شد.\nغنچه لاله زار\nپیگیری: 09122127437'
            },
            orderShipped: {
                sms: 'سفارش {orderId} ارسال شد.\nکد رهگیری پستی: {trackingCode}\nغنچه لاله زار',
                telegram: '📦 *ارسال سفارش*\n\n📦 سفارش: `{orderId}`\n🚚 کد رهگیری: `{trackingCode}`\n👤 مشتری: {customerName}\n📍 مقصد: {city}',
                whatsapp: '📦 سفارش {orderId} ارسال شد\nکد پیگیری: {trackingCode}'
            },
            orderDelivered: {
                sms: 'سفارش {orderId} تحویل داده شد.\nممنون از خرید شما\nغنچه لاله زار'
            },
            dailyReport: {
                telegram: '📊 *گزارش روزانه*\n\n📅 تاریخ: {date}\n🛒 تعداد سفارشات: {orderCount}\n💰 مجموع فروش: {totalSales} تومان\n✅ پرداخت شده: {paidCount}\n⏳ در انتظار: {pendingCount}'
            },
            lowStock: {
                telegram: '⚠️ *هشدار موجودی*\n\nمحصول: {productName}\nموجودی فعلی: {stock} عدد\n\nلطفاً موجودی را بررسی کنید.'
            }
        }
    }
};

// ==================== Notification Service Class ====================
class NotificationService {
    constructor(config = CONFIG) {
        this.config = config;
        this.logs = [];
    }
    
    // ==================== SMS Methods (Faraz SMS) ====================
    
    /**
     * ارسال پیامک ساده
     * @param {string} to - شماره گیرنده
     * @param {string} message - متن پیام
     */
    async sendSMS(to, message) {
        if (!this.config.farazSMS.enabled) {
            console.log('[SMS Disabled] Would send to:', to, message);
            return { success: false, reason: 'SMS disabled' };
        }
        
        try {
            // Normalize phone number
            const phone = this.normalizePhone(to);
            
            // Faraz SMS API request
            const response = await fetch(this.config.farazSMS.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    op: 'send',
                    uname: this.config.farazSMS.username,
                    pass: this.config.farazSMS.password,
                    message: message,
                    from: this.config.farazSMS.fromNumber,
                    to: [phone]
                })
            });
            
            const result = await response.json();
            
            this.log('sms', to, message, result);
            
            return {
                success: result[0] > 0,
                messageId: result[0],
                result: result
            };
            
        } catch (error) {
            console.error('SMS Error:', error);
            this.log('sms', to, message, { error: error.message });
            return { success: false, error: error.message };
        }
    }
    
    /**
     * ارسال پیامک با الگو (Pattern)
     * @param {string} to - شماره گیرنده
     * @param {string} patternCode - کد الگو
     * @param {object} values - مقادیر الگو
     */
    async sendPatternSMS(to, patternCode, values) {
        if (!this.config.farazSMS.enabled) {
            console.log('[SMS Pattern Disabled] Would send pattern:', patternCode, 'to:', to);
            return { success: false, reason: 'SMS disabled' };
        }
        
        try {
            const phone = this.normalizePhone(to);
            
            const response = await fetch(this.config.farazSMS.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    op: 'pattern',
                    user: this.config.farazSMS.username,
                    pass: this.config.farazSMS.password,
                    fromNum: this.config.farazSMS.fromNumber,
                    toNum: phone,
                    patternCode: patternCode,
                    inputData: Object.entries(values).map(([key, value]) => ({ [key]: value }))
                })
            });
            
            const result = await response.json();
            
            this.log('sms-pattern', to, patternCode, result);
            
            return {
                success: result.status === 'ok' || result[0] > 0,
                result: result
            };
            
        } catch (error) {
            console.error('SMS Pattern Error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * ارسال پیامک گروهی
     * @param {array} recipients - لیست گیرندگان
     * @param {string} message - متن پیام
     */
    async sendBulkSMS(recipients, message) {
        const results = [];
        for (const recipient of recipients) {
            const result = await this.sendSMS(recipient, message);
            results.push({ recipient, ...result });
        }
        return results;
    }
    
    // ==================== Telegram Methods ====================
    
    /**
     * ارسال پیام تلگرام
     * @param {string} chatId - آیدی چت
     * @param {string} message - متن پیام
     * @param {object} options - گزینه‌های اضافی
     */
    async sendTelegram(chatId, message, options = {}) {
        if (!this.config.telegram.enabled || !this.config.telegram.botToken) {
            console.log('[Telegram Disabled] Would send to:', chatId);
            return { success: false, reason: 'Telegram disabled' };
        }
        
        try {
            const url = `${this.config.telegram.apiUrl}${this.config.telegram.botToken}/sendMessage`;
            
            const body = {
                chat_id: chatId,
                text: message,
                parse_mode: options.parseMode || 'Markdown',
                disable_web_page_preview: options.disablePreview || true
            };
            
            // Add inline keyboard if provided
            if (options.keyboard) {
                body.reply_markup = {
                    inline_keyboard: options.keyboard
                };
            }
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            const result = await response.json();
            
            this.log('telegram', chatId, message, result);
            
            return {
                success: result.ok,
                messageId: result.result?.message_id,
                result: result
            };
            
        } catch (error) {
            console.error('Telegram Error:', error);
            this.log('telegram', chatId, message, { error: error.message });
            return { success: false, error: error.message };
        }
    }
    
    /**
     * ارسال پیام به مدیر در تلگرام
     * @param {string} message - متن پیام
     */
    async sendTelegramToManager(message, options = {}) {
        const chatId = this.config.telegram.managerChatId;
        if (!chatId) {
            console.log('[Telegram] Manager chat ID not configured');
            return { success: false, reason: 'Manager chat ID not set' };
        }
        return this.sendTelegram(chatId, message, options);
    }
    
    /**
     * ارسال پیام به منشی در تلگرام
     * @param {string} message - متن پیام
     */
    async sendTelegramToSecretary(message, options = {}) {
        const chatId = this.config.telegram.secretaryChatId;
        if (!chatId) {
            console.log('[Telegram] Secretary chat ID not configured');
            return { success: false, reason: 'Secretary chat ID not set' };
        }
        return this.sendTelegram(chatId, message, options);
    }
    
    /**
     * ارسال پیام به گروه تلگرام
     * @param {string} message - متن پیام
     */
    async sendTelegramToGroup(message, options = {}) {
        const chatId = this.config.telegram.groupChatId;
        if (!chatId) {
            console.log('[Telegram] Group chat ID not configured');
            return { success: false, reason: 'Group chat ID not set' };
        }
        return this.sendTelegram(chatId, message, options);
    }
    
    // ==================== WhatsApp Methods ====================
    
    /**
     * ایجاد لینک واتساپ برای ارسال پیام
     * @param {string} phone - شماره تلفن
     * @param {string} message - متن پیام
     */
    generateWhatsAppLink(phone, message) {
        const normalizedPhone = this.normalizePhone(phone, true);
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
    }
    
    /**
     * ارسال پیام واتساپ (با استفاده از WhatsApp Business API)
     * @param {string} to - شماره گیرنده
     * @param {string} message - متن پیام
     */
    async sendWhatsApp(to, message) {
        if (!this.config.whatsapp.enabled || !this.config.whatsapp.apiKey) {
            // Generate link for manual sending
            const link = this.generateWhatsAppLink(to, message);
            console.log('[WhatsApp] API not configured. Manual link:', link);
            return { 
                success: false, 
                reason: 'WhatsApp API not configured',
                manualLink: link 
            };
        }
        
        try {
            // WhatsApp Business API request
            // Note: This is a template for WhatsApp Business API
            // You need to adapt this to your specific provider (Meta, Twilio, WATI, etc.)
            
            const phone = this.normalizePhone(to, true);
            
            const response = await fetch(this.config.whatsapp.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.whatsapp.apiKey}`
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phone,
                    type: 'text',
                    text: { body: message }
                })
            });
            
            const result = await response.json();
            
            this.log('whatsapp', to, message, result);
            
            return {
                success: result.messages?.length > 0,
                messageId: result.messages?.[0]?.id,
                result: result
            };
            
        } catch (error) {
            console.error('WhatsApp Error:', error);
            return { 
                success: false, 
                error: error.message,
                manualLink: this.generateWhatsAppLink(to, message)
            };
        }
    }
    
    /**
     * ارسال پیام واتساپ به مدیر
     * @param {string} message - متن پیام
     */
    async sendWhatsAppToManager(message) {
        const phone = this.config.whatsapp.managerPhone;
        if (!phone) {
            console.log('[WhatsApp] Manager phone not configured');
            return { success: false, reason: 'Manager phone not set' };
        }
        return this.sendWhatsApp(phone, message);
    }
    
    // ==================== High-Level Notification Methods ====================
    
    /**
     * اطلاع‌رسانی سفارش جدید
     * @param {object} order - اطلاعات سفارش
     */
    async notifyNewOrder(order) {
        const results = {
            sms: [],
            telegram: [],
            whatsapp: []
        };
        
        // Prepare data
        const data = {
            orderId: order.id,
            amount: order.total?.toLocaleString('fa-IR') || '0',
            customerName: order.customer?.name || 'نامشخص',
            customerPhone: order.customer?.phone || '',
            province: order.customer?.province || '',
            city: order.customer?.city || '',
            items: order.items?.map(i => `• ${i.title} (×${i.quantity})`).join('\n') || ''
        };
        
        // Get templates
        const templates = this.config.templates.fa.newOrder;
        
        // Send to manager - Telegram
        if (this.config.telegram.managerChatId) {
            const telegramMsg = this.parseTemplate(templates.telegram, data);
            const keyboard = [[
                { text: '✅ تأیید', callback_data: `confirm_${order.id}` },
                { text: '❌ لغو', callback_data: `cancel_${order.id}` }
            ]];
            results.telegram.push(
                await this.sendTelegramToManager(telegramMsg, { keyboard })
            );
        }
        
        // Send to manager - SMS
        if (this.config.recipients.manager.phone) {
            const smsMsg = this.parseTemplate(templates.sms, data);
            results.sms.push(
                await this.sendSMS(this.config.recipients.manager.phone, smsMsg)
            );
        }
        
        // Send to secretary - Telegram
        if (this.config.telegram.secretaryChatId) {
            const telegramMsg = this.parseTemplate(templates.telegram, data);
            results.telegram.push(
                await this.sendTelegramToSecretary(telegramMsg)
            );
        }
        
        // Send WhatsApp to manager
        if (this.config.whatsapp.managerPhone) {
            const waMsg = this.parseTemplate(templates.whatsapp, data);
            results.whatsapp.push(
                await this.sendWhatsAppToManager(waMsg)
            );
        }
        
        // Send confirmation SMS to customer
        if (order.customer?.phone) {
            const customerTemplate = this.config.templates.fa.orderConfirmCustomer.sms;
            const customerMsg = this.parseTemplate(customerTemplate, data);
            results.sms.push(
                await this.sendSMS(order.customer.phone, customerMsg)
            );
        }
        
        return results;
    }
    
    /**
     * اطلاع‌رسانی پرداخت موفق
     * @param {object} order - اطلاعات سفارش
     * @param {string} refId - کد رهگیری پرداخت
     */
    async notifyPaymentSuccess(order, refId) {
        const results = {
            sms: [],
            telegram: [],
            whatsapp: []
        };
        
        const data = {
            orderId: order.id,
            amount: order.total?.toLocaleString('fa-IR') || '0',
            customerName: order.customer?.name || 'نامشخص',
            customerPhone: order.customer?.phone || '',
            refId: refId
        };
        
        const templates = this.config.templates.fa.paymentSuccess;
        
        // Notify manager via Telegram
        if (this.config.telegram.managerChatId) {
            const msg = this.parseTemplate(templates.telegram, data);
            results.telegram.push(await this.sendTelegramToManager(msg));
        }
        
        // Notify secretary via Telegram
        if (this.config.telegram.secretaryChatId) {
            const msg = this.parseTemplate(templates.telegram, data);
            results.telegram.push(await this.sendTelegramToSecretary(msg));
        }
        
        // SMS to manager
        if (this.config.recipients.manager.phone) {
            const msg = this.parseTemplate(templates.sms, data);
            results.sms.push(await this.sendSMS(this.config.recipients.manager.phone, msg));
        }
        
        return results;
    }
    
    /**
     * اطلاع‌رسانی ارسال سفارش
     * @param {object} order - اطلاعات سفارش
     * @param {string} trackingCode - کد رهگیری پستی
     */
    async notifyOrderShipped(order, trackingCode) {
        const results = {
            sms: [],
            telegram: [],
            whatsapp: []
        };
        
        const data = {
            orderId: order.id,
            trackingCode: trackingCode,
            customerName: order.customer?.name || '',
            customerPhone: order.customer?.phone || '',
            city: order.customer?.city || ''
        };
        
        const templates = this.config.templates.fa.orderShipped;
        
        // SMS to customer
        if (order.customer?.phone) {
            const msg = this.parseTemplate(templates.sms, data);
            results.sms.push(await this.sendSMS(order.customer.phone, msg));
        }
        
        // Telegram to manager
        if (this.config.telegram.managerChatId) {
            const msg = this.parseTemplate(templates.telegram, data);
            results.telegram.push(await this.sendTelegramToManager(msg));
        }
        
        return results;
    }
    
    /**
     * ارسال گزارش روزانه
     * @param {object} reportData - اطلاعات گزارش
     */
    async sendDailyReport(reportData) {
        const data = {
            date: new Date().toLocaleDateString('fa-IR'),
            orderCount: reportData.orderCount || 0,
            totalSales: reportData.totalSales?.toLocaleString('fa-IR') || '0',
            paidCount: reportData.paidCount || 0,
            pendingCount: reportData.pendingCount || 0
        };
        
        const template = this.config.templates.fa.dailyReport.telegram;
        const msg = this.parseTemplate(template, data);
        
        return this.sendTelegramToManager(msg);
    }
    
    /**
     * هشدار موجودی کم
     * @param {string} productName - نام محصول
     * @param {number} stock - موجودی فعلی
     */
    async notifyLowStock(productName, stock) {
        const data = {
            productName: productName,
            stock: stock
        };
        
        const template = this.config.templates.fa.lowStock.telegram;
        const msg = this.parseTemplate(template, data);
        
        return this.sendTelegramToManager(msg);
    }
    
    // ==================== Helper Methods ====================
    
    /**
     * نرمال‌سازی شماره تلفن
     * @param {string} phone - شماره تلفن
     * @param {boolean} international - فرمت بین‌المللی
     */
    normalizePhone(phone, international = false) {
        if (!phone) return '';
        
        // Remove spaces and dashes
        let normalized = phone.replace(/[\s\-\(\)]/g, '');
        
        // Convert Persian/Arabic digits to English
        normalized = normalized.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
        
        // Handle different formats
        if (normalized.startsWith('+98')) {
            normalized = normalized.substring(3);
        } else if (normalized.startsWith('98')) {
            normalized = normalized.substring(2);
        } else if (normalized.startsWith('0')) {
            normalized = normalized.substring(1);
        }
        
        // Add country code for international format
        if (international) {
            return '98' + normalized;
        }
        
        return '0' + normalized;
    }
    
    /**
     * پارس کردن قالب پیام
     * @param {string} template - قالب پیام
     * @param {object} data - داده‌ها
     */
    parseTemplate(template, data) {
        let result = template;
        for (const [key, value] of Object.entries(data)) {
            result = result.replace(new RegExp(`{${key}}`, 'g'), value || '');
        }
        return result;
    }
    
    /**
     * ثبت لاگ
     */
    log(channel, recipient, message, result) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            channel,
            recipient,
            message: message.substring(0, 100),
            success: result.success || result.ok,
            result
        };
        
        this.logs.push(logEntry);
        
        // Keep only last 100 logs in memory
        if (this.logs.length > 100) {
            this.logs.shift();
        }
        
        console.log(`[${channel.toUpperCase()}] ${recipient}: ${result.success ? '✓' : '✗'}`);
    }
    
    /**
     * دریافت لاگ‌ها
     */
    getLogs(limit = 50) {
        return this.logs.slice(-limit);
    }
    
    /**
     * آپدیت تنظیمات
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    /**
     * بررسی وضعیت سرویس‌ها
     */
    getStatus() {
        return {
            sms: {
                enabled: this.config.farazSMS.enabled,
                configured: !!this.config.farazSMS.username && !!this.config.farazSMS.password
            },
            telegram: {
                enabled: this.config.telegram.enabled,
                configured: !!this.config.telegram.botToken,
                managerSet: !!this.config.telegram.managerChatId,
                secretarySet: !!this.config.telegram.secretaryChatId
            },
            whatsapp: {
                enabled: this.config.whatsapp.enabled,
                configured: !!this.config.whatsapp.apiKey,
                managerSet: !!this.config.whatsapp.managerPhone
            }
        };
    }
}

// ==================== Export ====================
const notificationService = new NotificationService();

module.exports = {
    NotificationService,
    notificationService,
    CONFIG
};
