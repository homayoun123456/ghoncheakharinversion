/**
 * Blog Frontend Application for Ghoncheye Lalehzar
 * Handles blog listing, search, and single post display
 */

const API_BASE = '/api';
let currentPage = 1;
let currentSearch = '';
let currentCategory = '';
let currentTag = '';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  currentPage = parseInt(urlParams.get('page')) || 1;
  currentSearch = urlParams.get('search') || '';
  currentCategory = urlParams.get('category') || '';
  currentTag = urlParams.get('tag') || '';
  
  if (document.getElementById('posts-container')) {
    loadPosts();
    loadCategories();
    loadRecentPosts();
    loadTags();
  }
  
  if (document.getElementById('single-post-content')) {
    loadSinglePost();
  }
  
  initViewToggle();
  initSearch();
});

// ==================== API HELPER ====================

async function api(endpoint) {
  try {
    const response = await fetch(API_BASE + endpoint);
    if (!response.ok) throw new Error('خطای سرور');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

// ==================== POSTS LISTING ====================

async function loadPosts() {
  const container = document.getElementById('posts-container');
  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <span>در حال بارگذاری...</span>
    </div>
  `;
  
  let url = `/posts?status=published&page=${currentPage}&per_page=9`;
  if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
  if (currentCategory) url += `&category=${currentCategory}`;
  if (currentTag) url += `&tag=${currentTag}`;
  
  const response = await api(url);
  
  if (!response || !response.data || response.data.length === 0) {
    container.innerHTML = `
      <div class="no-posts">
        <i class="fas fa-file-alt"></i>
        <h3>هیچ نوشته‌ای یافت نشد</h3>
        <p>در حال حاضر نوشته‌ای برای نمایش وجود ندارد</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = response.data.map(post => renderPostCard(post)).join('');
  renderPagination(response.pagination);
}

function renderPostCard(post) {
  const category = post.categories_data?.[0];
  const featuredImage = post.featured_image_data;
  
  return `
    <article class="post-card">
      <div class="post-thumbnail">
        ${featuredImage 
          ? `<img src="${featuredImage.url}" alt="${featuredImage.alt_text || post.title}">`
          : `<div class="post-thumbnail-placeholder"><i class="fas fa-rose"></i></div>`
        }
        ${category ? `<span class="post-category">${category.name}</span>` : ''}
      </div>
      <div class="post-body">
        <div class="post-meta">
          <span><i class="fas fa-calendar"></i> ${formatDate(post.published_at || post.created_at)}</span>
          <span><i class="fas fa-user"></i> ${post.author?.display_name || 'نویسنده'}</span>
        </div>
        <h2 class="post-title">
          <a href="/post.html?slug=${post.slug}">${post.title}</a>
        </h2>
        <p class="post-excerpt">${post.excerpt || stripHtml(post.content).substring(0, 150) + '...'}</p>
        <div class="post-footer">
          <a href="/post.html?slug=${post.slug}" class="read-more">
            ادامه مطلب <i class="fas fa-arrow-left"></i>
          </a>
          <span class="post-reading-time">
            <i class="fas fa-clock"></i> ${post.reading_time || 1} دقیقه
          </span>
        </div>
      </div>
    </article>
  `;
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  if (!container || !pagination || pagination.total_pages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }
  
  const { current_page, total_pages } = pagination;
  let html = '';
  
  // Previous button
  html += `<button ${current_page === 1 ? 'disabled' : ''} onclick="goToPage(${current_page - 1})">
    <i class="fas fa-chevron-right"></i> قبلی
  </button>`;
  
  // Page numbers
  for (let i = 1; i <= total_pages; i++) {
    if (i === 1 || i === total_pages || (i >= current_page - 2 && i <= current_page + 2)) {
      html += `<button class="${i === current_page ? 'active' : ''}" onclick="goToPage(${i})">${toPersianNum(i)}</button>`;
    } else if (i === current_page - 3 || i === current_page + 3) {
      html += '<span style="padding: 10px;">...</span>';
    }
  }
  
  // Next button
  html += `<button ${current_page === total_pages ? 'disabled' : ''} onclick="goToPage(${current_page + 1})">
    بعدی <i class="fas fa-chevron-left"></i>
  </button>`;
  
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadPosts();
  updateURL();
}

// ==================== SIDEBAR WIDGETS ====================

async function loadCategories() {
  const container = document.getElementById('categories-list');
  if (!container) return;
  
  const response = await api('/categories');
  
  if (!response || !response.data) {
    container.innerHTML = '<li>خطا در بارگذاری</li>';
    return;
  }
  
  container.innerHTML = response.data.map(cat => `
    <li>
      <a href="/blog.html?category=${cat.id}" ${currentCategory == cat.id ? 'style="color: #e91e63; font-weight: bold;"' : ''}>
        ${cat.name}
        <span class="count">${cat.count || 0}</span>
      </a>
    </li>
  `).join('');
}

async function loadRecentPosts() {
  const container = document.getElementById('recent-posts');
  if (!container) return;
  
  const response = await api('/posts?status=published&per_page=5&include_content=false');
  
  if (!response || !response.data) {
    container.innerHTML = '<div>خطا در بارگذاری</div>';
    return;
  }
  
  container.innerHTML = response.data.map(post => {
    const featuredImage = post.featured_image_data;
    return `
      <div class="recent-post-item">
        <div class="recent-post-thumb">
          ${featuredImage 
            ? `<img src="${featuredImage.url}" alt="${post.title}">`
            : `<div class="recent-post-thumb-placeholder"><i class="fas fa-rose"></i></div>`
          }
        </div>
        <div class="recent-post-info">
          <h4><a href="/post.html?slug=${post.slug}">${post.title}</a></h4>
          <span><i class="fas fa-calendar"></i> ${formatDate(post.published_at || post.created_at)}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function loadTags() {
  const container = document.getElementById('tags-cloud');
  if (!container) return;
  
  const response = await api('/tags?orderby=count&order=desc');
  
  if (!response || !response.data || response.data.length === 0) {
    container.innerHTML = '<span>برچسبی وجود ندارد</span>';
    return;
  }
  
  container.innerHTML = response.data.slice(0, 15).map(tag => `
    <a href="/blog.html?tag=${tag.id}" class="tag-link" ${currentTag == tag.id ? 'style="background: #e91e63; color: #fff;"' : ''}>${tag.name}</a>
  `).join('');
}

// ==================== SINGLE POST ====================

async function loadSinglePost() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');
  
  if (!slug) {
    window.location.href = '/blog.html';
    return;
  }
  
  const response = await api(`/posts/${slug}`);
  
  if (!response || !response.data) {
    document.getElementById('single-post-content').innerHTML = `
      <div class="no-posts">
        <i class="fas fa-exclamation-circle"></i>
        <h3>نوشته یافت نشد</h3>
        <p>متأسفانه نوشته مورد نظر شما یافت نشد</p>
        <a href="/blog.html" class="btn btn-primary" style="margin-top: 20px;">بازگشت به وبلاگ</a>
      </div>
    `;
    return;
  }
  
  const post = response.data;
  const category = post.categories_data?.[0];
  const featuredImage = post.featured_image_data;
  
  // Update page title
  document.title = `${post.title} | غنچه لاله زار`;
  
  // Update meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.content = post.seo_description || post.excerpt || stripHtml(post.content).substring(0, 160);
  }
  
  // Render post header
  document.getElementById('post-header').innerHTML = `
    ${category ? `<span class="post-category">${category.name}</span>` : ''}
    <h1>${post.title}</h1>
    <div class="post-meta">
      <span><i class="fas fa-calendar"></i> ${formatDate(post.published_at || post.created_at)}</span>
      <span><i class="fas fa-user"></i> ${post.author?.display_name || 'نویسنده'}</span>
      <span><i class="fas fa-clock"></i> ${post.reading_time || 1} دقیقه مطالعه</span>
      <span><i class="fas fa-eye"></i> ${toPersianNum(post.view_count || 1)} بازدید</span>
    </div>
  `;
  
  // Render featured image
  if (featuredImage) {
    document.getElementById('post-featured').innerHTML = `
      <img src="${featuredImage.url}" alt="${featuredImage.alt_text || post.title}">
    `;
    document.getElementById('post-featured').style.display = 'block';
  }
  
  // Render post content
  document.getElementById('single-post-content').innerHTML = `
    <div class="post-content">${post.content}</div>
  `;
  
  // Render tags
  if (post.tags_data && post.tags_data.length > 0) {
    document.getElementById('post-tags').innerHTML = `
      <h4><i class="fas fa-tags"></i> برچسب‌ها:</h4>
      <div class="tags-cloud">
        ${post.tags_data.map(tag => `
          <a href="/blog.html?tag=${tag.id}" class="tag-link">${tag.name}</a>
        `).join('')}
      </div>
    `;
  }
  
  // Render navigation
  if (post.prev_post || post.next_post) {
    document.getElementById('post-navigation').innerHTML = `
      <div class="post-nav-link">
        ${post.prev_post ? `
          <span>نوشته قبلی</span>
          <a href="/post.html?slug=${post.prev_post.slug}">
            <i class="fas fa-arrow-right"></i>
            ${post.prev_post.title}
          </a>
        ` : ''}
      </div>
      <div class="post-nav-link" style="text-align: left;">
        ${post.next_post ? `
          <span>نوشته بعدی</span>
          <a href="/post.html?slug=${post.next_post.slug}">
            ${post.next_post.title}
            <i class="fas fa-arrow-left"></i>
          </a>
        ` : ''}
      </div>
    `;
  }
  
  // Render author box
  if (post.author) {
    document.getElementById('author-box').innerHTML = `
      <div class="author-avatar">${post.author.display_name.charAt(0)}</div>
      <div class="author-info">
        <h4>${post.author.display_name}</h4>
        <p>${post.author.bio || 'نویسنده وبلاگ غنچه لاله زار'}</p>
      </div>
    `;
  }
  
  // Render related posts
  if (post.related_posts && post.related_posts.length > 0) {
    document.getElementById('related-posts').innerHTML = `
      <h3>نوشته‌های مرتبط</h3>
      <div class="related-posts-grid">
        ${post.related_posts.map(related => `
          <article class="post-card">
            <div class="post-thumbnail">
              <div class="post-thumbnail-placeholder"><i class="fas fa-rose"></i></div>
            </div>
            <div class="post-body">
              <h2 class="post-title">
                <a href="/post.html?slug=${related.slug}">${related.title}</a>
              </h2>
              <p class="post-excerpt">${related.excerpt || ''}</p>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }
  
  // Load comments
  loadComments(post.id);
}

// ==================== COMMENTS ====================

async function loadComments(postId) {
  const container = document.getElementById('comments-list');
  if (!container) return;
  
  const response = await api(`/posts/${postId}/comments`);
  
  if (!response || !response.data || response.data.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #888;">هنوز دیدگاهی ثبت نشده است</p>';
    return;
  }
  
  container.innerHTML = renderComments(response.data);
  
  // Update comments count
  const countEl = document.getElementById('comments-count');
  if (countEl) {
    countEl.textContent = `${toPersianNum(countTotalComments(response.data))} دیدگاه`;
  }
}

function renderComments(comments) {
  return comments.map(comment => `
    <div class="comment">
      <div class="comment-avatar">${comment.author_name.charAt(0)}</div>
      <div class="comment-body">
        <div class="comment-header">
          <span class="comment-author">${comment.author_name}</span>
          <span class="comment-date">${formatDate(comment.created_at)}</span>
        </div>
        <div class="comment-content">${comment.content}</div>
        <div class="comment-reply">
          <a href="#comment-form" onclick="replyTo(${comment.id}, '${comment.author_name}')">
            <i class="fas fa-reply"></i> پاسخ
          </a>
        </div>
        ${comment.replies && comment.replies.length > 0 ? `
          <div class="comment-replies">
            ${renderComments(comment.replies)}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function countTotalComments(comments) {
  return comments.reduce((count, comment) => {
    return count + 1 + (comment.replies ? countTotalComments(comment.replies) : 0);
  }, 0);
}

function replyTo(commentId, authorName) {
  document.getElementById('reply-to').value = commentId;
  document.getElementById('reply-to-name').textContent = `در پاسخ به ${authorName}`;
  document.getElementById('cancel-reply').style.display = 'inline';
  document.getElementById('comment-form').scrollIntoView({ behavior: 'smooth' });
}

function cancelReply() {
  document.getElementById('reply-to').value = '';
  document.getElementById('reply-to-name').textContent = '';
  document.getElementById('cancel-reply').style.display = 'none';
}

async function submitComment(e) {
  e.preventDefault();
  
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');
  
  // Get post ID first
  const postResponse = await api(`/posts/${slug}`);
  if (!postResponse || !postResponse.data) {
    alert('خطا در ثبت دیدگاه');
    return;
  }
  
  const formData = {
    post_id: postResponse.data.id,
    parent_id: document.getElementById('reply-to')?.value || null,
    author_name: document.getElementById('comment-name').value,
    author_email: document.getElementById('comment-email').value,
    content: document.getElementById('comment-content').value
  };
  
  try {
    const response = await fetch(API_BASE + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(data.message || 'دیدگاه شما ثبت شد');
      document.getElementById('comment-form-element').reset();
      cancelReply();
      loadComments(postResponse.data.id);
    } else {
      alert(data.error || 'خطا در ثبت دیدگاه');
    }
  } catch (error) {
    alert('خطا در ثبت دیدگاه');
  }
}

// ==================== SEARCH & FILTERS ====================

function initSearch() {
  const searchInput = document.getElementById('blog-search');
  if (searchInput) {
    searchInput.value = currentSearch;
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchPosts();
      }
    });
  }
}

function searchPosts() {
  const searchInput = document.getElementById('blog-search');
  currentSearch = searchInput.value.trim();
  currentPage = 1;
  loadPosts();
  updateURL();
}

function updateURL() {
  const params = new URLSearchParams();
  if (currentPage > 1) params.set('page', currentPage);
  if (currentSearch) params.set('search', currentSearch);
  if (currentCategory) params.set('category', currentCategory);
  if (currentTag) params.set('tag', currentTag);
  
  const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
  window.history.pushState({}, '', newURL);
}

// ==================== VIEW TOGGLE ====================

function initViewToggle() {
  const buttons = document.querySelectorAll('.view-options button');
  const postsGrid = document.getElementById('posts-container');
  
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (btn.dataset.view === 'list') {
        postsGrid.classList.add('list-view');
      } else {
        postsGrid.classList.remove('list-view');
      }
    });
  });
}

// ==================== UTILITIES ====================

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function toPersianNum(num) {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/\d/g, d => persianDigits[d]);
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Make functions globally accessible
window.goToPage = goToPage;
window.searchPosts = searchPosts;
window.replyTo = replyTo;
window.cancelReply = cancelReply;
window.submitComment = submitComment;
