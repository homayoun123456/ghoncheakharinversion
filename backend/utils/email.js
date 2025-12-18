/**
 * Email Service Utility
 * Ghoncheye Lalehzar CMS
 * 
 * Note: This is a placeholder for email functionality.
 * In production, integrate with services like:
 * - Nodemailer with SMTP
 * - SendGrid
 * - Mailgun
 * - AWS SES
 */

const config = {
    from: process.env.EMAIL_FROM || 'noreply@ghoncheye.com',
    smtpHost: process.env.SMTP_HOST || 'smtp.example.com',
    smtpPort: process.env.SMTP_PORT || 587,
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || ''
};

/**
 * Send email (placeholder - logs to console)
 * @param {object} options - Email options
 * @returns {Promise<boolean>}
 */
async function sendEmail({ to, subject, html, text }) {
    // In development, just log
    console.log('📧 Email would be sent:');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Content: ${text || html?.substring(0, 100)}...`);
    
    // TODO: Implement real email sending
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({...});
    
    return true;
}

/**
 * Send contact form notification
 * @param {object} message - Message data
 */
async function sendContactNotification(message) {
    const subject = `New Contact Form Submission: ${message.subject || 'No Subject'}`;
    const html = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${message.name || 'Not provided'}</p>
        <p><strong>Email:</strong> ${message.email}</p>
        <p><strong>Phone:</strong> ${message.phone || 'Not provided'}</p>
        <p><strong>Company:</strong> ${message.company || 'Not provided'}</p>
        <p><strong>Country:</strong> ${message.country || 'Not provided'}</p>
        <p><strong>Product Interest:</strong> ${message.product || 'Not provided'}</p>
        <p><strong>Volume:</strong> ${message.volume || 'Not provided'}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${message.message || 'No message'}</p>
    `;
    
    return sendEmail({
        to: config.from,
        subject,
        html,
        text: `New contact from ${message.name} (${message.email}): ${message.message}`
    });
}

/**
 * Send newsletter welcome email
 * @param {string} email - Subscriber email
 * @param {string} name - Subscriber name
 */
async function sendWelcomeEmail(email, name) {
    const subject = 'خوش آمدید به خبرنامه غنچه لاله زار | Welcome to Our Newsletter';
    const html = `
        <div dir="rtl" style="font-family: Tahoma, sans-serif;">
            <h2>با تشکر از عضویت شما در خبرنامه!</h2>
            <p>سلام ${name || 'دوست عزیز'},</p>
            <p>شما با موفقیت در خبرنامه غنچه لاله زار عضو شدید.</p>
            <p>از این پس، آخرین اخبار و محصولات ما را دریافت خواهید کرد.</p>
            <hr>
            <p style="direction: ltr; text-align: left;">
                <strong>Ghoncheye Lalehzar</strong><br>
                Premium Rose Products Since 1985
            </p>
        </div>
    `;
    
    return sendEmail({
        to: email,
        subject,
        html,
        text: `Welcome to Ghoncheye Lalehzar Newsletter!`
    });
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} resetToken - Reset token
 */
async function sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.SITE_URL || 'http://localhost:3000'}/admin/reset-password?token=${resetToken}`;
    
    const subject = 'بازیابی رمز عبور | Password Reset';
    const html = `
        <div dir="rtl" style="font-family: Tahoma, sans-serif;">
            <h2>درخواست بازیابی رمز عبور</h2>
            <p>برای بازیابی رمز عبور خود روی لینک زیر کلیک کنید:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>این لینک تا ۱ ساعت معتبر است.</p>
            <p>اگر شما این درخواست را ارسال نکرده‌اید، این ایمیل را نادیده بگیرید.</p>
        </div>
    `;
    
    return sendEmail({
        to: email,
        subject,
        html,
        text: `Reset your password: ${resetUrl}`
    });
}

/**
 * Send order confirmation (for future e-commerce)
 * @param {object} order - Order data
 */
async function sendOrderConfirmation(order) {
    const subject = `Order Confirmation #${order.id}`;
    const html = `
        <h2>Thank you for your order!</h2>
        <p>Order Number: <strong>#${order.id}</strong></p>
        <p>We have received your order and will process it shortly.</p>
        <p>We will contact you at ${order.email} or ${order.phone} for confirmation.</p>
    `;
    
    return sendEmail({
        to: order.email,
        subject,
        html,
        text: `Order #${order.id} confirmed`
    });
}

module.exports = {
    sendEmail,
    sendContactNotification,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendOrderConfirmation
};
