# راهنمای سئو رسانه‌ها - Media SEO Guide

## معرفی
این راهنما امکانات سئو برای تصاویر و ویدیوها در سایت غنچه لاله زار را توضیح می‌دهد.

---

## ویژگی‌های سئو تصاویر

### 1. متن جایگزین (Alt Text)
- **اهمیت**: موتورهای جستجو از این متن برای درک محتوای تصویر استفاده می‌کنند
- **طول بهینه**: 10 تا 125 کاراکتر
- **مثال**: `alt="غنچه گل محمدی تازه - Fresh Rose Buds Rosa Damascena"`

### 2. عنوان (Title)
- **اهمیت**: هنگام hover روی تصویر نمایش داده می‌شود
- **طول بهینه**: 10 تا 70 کاراکتر
- **مثال**: `title="غنچه تازه گل محمدی - برداشت صبحگاهی با کیفیت صادراتی"`

### 3. تصاویر واکنش‌گرا (Responsive Images)
```html
<img 
    src="image.jpg"
    srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
    sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 33vw"
    alt="توضیح تصویر"
>
```

### 4. فرمت WebP
- پشتیبانی خودکار از WebP برای مرورگرهای سازگار
- کاهش 25-35% حجم فایل

### 5. Lazy Loading
```html
<img loading="lazy" decoding="async" ...>
```

---

## ویژگی‌های سئو ویدیوها

### 1. تصویر پیش‌نمایش (Thumbnail)
- الزامی برای نمایش در نتایج جستجو
- ابعاد پیشنهادی: 1280x720 پیکسل

### 2. زیرنویس و کپشن
```html
<track kind="captions" src="captions-fa.vtt" srclang="fa" label="فارسی">
```

### 3. متن پیاده‌شده (Transcript)
- بهبود دسترسی‌پذیری
- کمک به موتورهای جستجو برای درک محتوا

### 4. مدت زمان (Duration)
- فرمت ISO 8601: `PT2M30S` (2 دقیقه و 30 ثانیه)

---

## Schema.org Structured Data

### برای تصاویر (ImageObject)
```json
{
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "name": "مزارع گل محمدی لاله زار",
    "description": "نمای پانوراما از مزارع گل محمدی",
    "contentUrl": "https://example.com/image.jpg",
    "author": {
        "@type": "Organization",
        "name": "غنچه لاله زار"
    },
    "datePublished": "2024-01-15"
}
```

### برای ویدیوها (VideoObject)
```json
{
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": "فرآیند برداشت گل محمدی",
    "description": "ویدیوی آموزشی از فرآیند برداشت",
    "thumbnailUrl": "https://example.com/thumbnail.jpg",
    "uploadDate": "2024-01-20",
    "duration": "PT2M30S",
    "contentUrl": "https://example.com/video.mp4"
}
```

---

## API Endpoints

### دریافت همه رسانه‌ها
```
GET /api/media
Query Parameters:
  - type: image | video
  - limit: number
  - offset: number
  - search: string
```

### آپلود رسانه
```
POST /api/media/upload
Body:
{
    "filename": "rose-buds.jpg",
    "media_type": "image",
    "alt_text": "غنچه گل محمدی",
    "title": "غنچه تازه",
    "description": "توضیحات",
    "keywords": ["گل محمدی", "لاله زار"]
}
```

### به‌روزرسانی متادیتای سئو
```
PUT /api/media/:id
Body: { "alt_text": "...", "title": "..." }
```

### دریافت Schema.org
```
GET /api/media/:id/schema
```

### دریافت Sitemap رسانه‌ها
```
GET /api/media/sitemap
```

---

## امتیاز سئو

سیستم امتیازدهی خودکار بر اساس:

| فیلد | امتیاز |
|------|--------|
| Alt Text (وجود) | 15 |
| Alt Text (طول بهینه) | 15 |
| Title (وجود) | 10 |
| Title (طول بهینه) | 10 |
| Description (وجود) | 12 |
| Description (طول بهینه) | 13 |
| Keywords (وجود) | 8 |
| Keywords (تعداد بهینه) | 7 |
| Transcript (برای ویدیو) | 10 |

**حداکثر امتیاز: 100**

---

## بهترین شیوه‌ها

### تصاویر
1. ✅ همیشه از alt text استفاده کنید
2. ✅ نام فایل‌ها را SEO-friendly بنویسید
3. ✅ از فرمت WebP استفاده کنید
4. ✅ تصاویر را بهینه‌سازی کنید (کمتر از 200KB)
5. ✅ از srcset برای واکنش‌گرایی استفاده کنید

### ویدیوها
1. ✅ Thumbnail جذاب انتخاب کنید
2. ✅ زیرنویس فارسی و انگلیسی اضافه کنید
3. ✅ متن پیاده‌شده بنویسید
4. ✅ مدت زمان را مشخص کنید
5. ✅ عنوان و توضیحات کامل بنویسید

---

## مثال کامل HTML

```html
<article class="media-item" itemscope itemtype="https://schema.org/ImageObject">
    <picture>
        <source type="image/webp" srcset="image.webp">
        <img 
            src="image.jpg"
            srcset="image-400.jpg 400w, image-800.jpg 800w"
            sizes="(max-width: 576px) 100vw, 33vw"
            alt="غنچه گل محمدی لاله زار کرمان"
            title="غنچه تازه با کیفیت صادراتی"
            loading="lazy"
            decoding="async"
            width="400"
            height="300"
            itemprop="contentUrl"
        >
    </picture>
    <meta itemprop="name" content="غنچه گل محمدی">
    <meta itemprop="description" content="توضیحات کامل">
    <meta itemprop="keywords" content="گل محمدی, لاله زار">
</article>
```

---

## پشتیبانی
برای سوالات بیشتر با تیم توسعه تماس بگیرید.
