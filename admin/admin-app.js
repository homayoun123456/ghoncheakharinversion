/**
 * Ghoncheye Lalehzar CMS Admin Application
 * Complete WordPress-like Admin Interface
 */

// API Configuration
const API_BASE = '/api';
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let currentPage = 1;
let editingPostId = null;
let selectedMediaId = null;
let mediaSelectionMode = null; // 'featured' or 'content'
let searchTimeout = null;
let autosaveInterval = null;
let selectedTags = [];

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initEventListeners();
});

function initEventListeners() {
  // Login form
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  
  // Logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // Sidebar navigation
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });
  
  // Sidebar toggle (mobile)
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
  });
  
  // Quick draft form
  document.getElementById('quick-draft-form').addEventListener('submit', handleQuickDraft);
  
  // Category form
  document.getElementById('category-form').addEventListener('submit', handleCategorySubmit);
  
  // Tag form
  document.getElementById('tag-form').addEventListener('submit', handleTagSubmit);
  
  // Settings form
  document.getElementById('settings-form').addEventListener('submit', handleSettingsSubmit);
  
  // Select all posts
  document.getElementById('select-all-posts')?.addEventListener('change', toggleSelectAllPosts);
  
  // Comment filter tabs
  document.querySelectorAll('#page-comments .filter-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#page-comments .filter-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadComments(1, tab.dataset.status);
    });
  });
  
  // File upload
  setupFileUpload('file-input', 'upload-area', 'upload-progress');
  setupFileUpload('direct-file-input', 'direct-upload-area', 'direct-upload-progress');
  
  // SEO character counters
  document.getElementById('seo-title')?.addEventListener('input', updateSeoPreview);
  document.getElementById('seo-description')?.addEventListener('input', updateSeoPreview);
  document.getElementById('post-title')?.addEventListener('input', updateSeoPreview);
  
  // Tags input
  document.getElementById('tags-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  });
  
  // Autosave
  startAutosave();
}

// ==================== AUTHENTICATION ====================

async function checkAuth() {
  if (!authToken) {
    showLoginScreen();
    return;
  }
  
  try {
    const response = await api('/auth/check');
    if (response.authenticated) {
      currentUser = response.user;
      showDashboard();
      loadDashboardData();
    } else {
      showLoginScreen();
    }
  } catch (error) {
    showLoginScreen();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const response = await api('/auth/login', 'POST', { username, password });
    if (response.success) {
      authToken = response.token;
      localStorage.setItem('authToken', authToken);
      currentUser = response.user;
      showDashboard();
      loadDashboardData();
      showNotification('خوش آمدید!', 'success');
    }
  } catch (error) {
    document.getElementById('login-error').textContent = error.message || 'خطا در ورود';
  }
}

function handleLogout(e) {
  e.preventDefault();
  localStorage.removeItem('authToken');
  authToken = null;
  currentUser = null;
  showLoginScreen();
  showNotification('با موفقیت خارج شدید', 'success');
}

function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('current-user').textContent = currentUser?.display_name || 'کاربر';
}

// ==================== API HELPER ====================

async function api(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(API_BASE + endpoint, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'خطای سرور');
  }
  
  return data;
}

async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error('Upload failed'));
      }
    });
    
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    
    xhr.open('POST', API_BASE + '/media/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.send(formData);
  });
}

// ==================== NAVIGATION ====================

function navigateTo(page) {
  // Update sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  
  // Update page visibility
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  
  // Update header title
  const titles = {
    'dashboard': 'داشبورد',
    'posts': 'نوشته‌ها',
    'new-post': editingPostId ? 'ویرایش نوشته' : 'نوشته جدید',
    'pages': 'برگه‌ها',
    'media': 'رسانه‌ها',
    'categories': 'دسته‌بندی‌ها',
    'tags': 'برچسب‌ها',
    'comments': 'دیدگاه‌ها',
    'users': 'کاربران',
    'settings': 'تنظیمات'
  };
  document.getElementById('page-title').textContent = titles[page] || page;
  
  // Load page data
  switch (page) {
    case 'dashboard':
      loadDashboardData();
      break;
    case 'posts':
      loadPosts();
      break;
    case 'new-post':
      initPostEditor();
      break;
    case 'pages':
      loadPages();
      break;
    case 'media':
      loadMedia();
      break;
    case 'categories':
      loadCategories();
      break;
    case 'tags':
      loadTags();
      break;
    case 'comments':
      loadComments();
      break;
    case 'users':
      loadUsers();
      break;
    case 'settings':
      loadSettings();
      break;
  }
  
  // Close mobile sidebar
  document.querySelector('.sidebar').classList.remove('open');
}

// ==================== DASHBOARD ====================

async function loadDashboardData() {
  try {
    const stats = await api('/stats/dashboard');
    
    document.getElementById('stat-posts').textContent = stats.data.posts.total;
    document.getElementById('stat-comments').textContent = stats.data.comments.total;
    document.getElementById('stat-media').textContent = stats.data.media.total;
    document.getElementById('stat-users').textContent = stats.data.users;
    
    // Pending comments badge
    const pendingBadge = document.getElementById('pending-comments-badge');
    if (stats.data.comments.pending > 0) {
      pendingBadge.textContent = stats.data.comments.pending;
      pendingBadge.classList.remove('hidden');
    } else {
      pendingBadge.classList.add('hidden');
    }
    
    // Recent posts
    const recentPostsList = document.getElementById('recent-posts-list');
    if (stats.data.recent_posts.length > 0) {
      recentPostsList.innerHTML = stats.data.recent_posts.map(post => `
        <div class="recent-post-item">
          <a href="#" onclick="editPost(${post.id}); return false;">${post.title}</a>
          <span>${formatDate(post.created_at)}</span>
        </div>
      `).join('');
    } else {
      recentPostsList.innerHTML = '<p>هنوز نوشته‌ای وجود ندارد</p>';
    }
    
    // Pending comments
    const pendingCommentsList = document.getElementById('pending-comments-list');
    if (stats.data.recent_comments.length > 0) {
      pendingCommentsList.innerHTML = stats.data.recent_comments.map(comment => `
        <div class="recent-post-item">
          <span>${comment.author_name}: ${truncate(comment.content, 50)}</span>
          <a href="#" onclick="navigateTo('comments'); return false;">بررسی</a>
        </div>
      `).join('');
    } else {
      pendingCommentsList.innerHTML = '<p>دیدگاهی در انتظار بررسی نیست</p>';
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

async function handleQuickDraft(e) {
  e.preventDefault();
  const title = document.getElementById('quick-draft-title').value;
  const content = document.getElementById('quick-draft-content').value;
  
  if (!title) {
    showNotification('لطفاً عنوان را وارد کنید', 'error');
    return;
  }
  
  try {
    await api('/posts', 'POST', { title, content, status: 'draft' });
    document.getElementById('quick-draft-title').value = '';
    document.getElementById('quick-draft-content').value = '';
    showNotification('پیش‌نویس ذخیره شد', 'success');
    loadDashboardData();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// ==================== POSTS ====================

async function loadPosts(page = 1) {
  currentPage = page;
  const status = document.getElementById('filter-status')?.value || '';
  const category = document.getElementById('filter-category')?.value || '';
  const search = document.getElementById('search-posts')?.value || '';
  
  try {
    let url = `/posts?page=${page}&per_page=15`;
    if (status) url += `&status=${status}`;
    if (category) url += `&category=${category}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    const response = await api(url);
    
    const tbody = document.getElementById('posts-list');
    if (response.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">هیچ نوشته‌ای یافت نشد</td></tr>';
    } else {
      tbody.innerHTML = response.data.map(post => `
        <tr>
          <td><input type="checkbox" class="post-checkbox" value="${post.id}"></td>
          <td>
            <strong><a href="#" onclick="editPost(${post.id}); return false;">${post.title}</a></strong>
            <span class="status-badge status-${post.status}">${getStatusLabel(post.status)}</span>
            <div class="row-actions">
              <a href="#" onclick="editPost(${post.id}); return false;">ویرایش</a>
              <a href="#" class="delete" onclick="deletePost(${post.id}); return false;">زباله‌دان</a>
              <a href="/blog/${post.slug}" target="_blank">مشاهده</a>
            </div>
          </td>
          <td>${post.author?.display_name || '—'}</td>
          <td>${(post.categories_data || []).map(c => c.name).join(', ') || '—'}</td>
          <td>${(post.tags_data || []).map(t => t.name).join(', ') || '—'}</td>
          <td>${post.comment_count || 0}</td>
          <td>${formatDate(post.created_at)}</td>
        </tr>
      `).join('');
    }
    
    renderPagination('posts-pagination', response.pagination, loadPosts);
    await loadCategoriesForFilter();
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

async function loadCategoriesForFilter() {
  try {
    const response = await api('/categories');
    const select = document.getElementById('filter-category');
    if (select) {
      const currentValue = select.value;
      select.innerHTML = '<option value="">همه دسته‌بندی‌ها</option>' + 
        response.data.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
      select.value = currentValue;
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

function filterPosts() {
  loadPosts(1);
}

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadPosts(1), 300);
}

async function editPost(id) {
  editingPostId = id;
  navigateTo('new-post');
}

async function deletePost(id) {
  if (!confirm('آیا از حذف این نوشته اطمینان دارید؟')) return;
  
  try {
    await api(`/posts/${id}`, 'DELETE');
    showNotification('نوشته به زباله‌دان منتقل شد', 'success');
    loadPosts(currentPage);
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// ==================== POST EDITOR ====================

async function initPostEditor() {
  // Reset form
  document.getElementById('post-id').value = '';
  document.getElementById('post-title').value = '';
  document.getElementById('post-slug').value = '';
  document.getElementById('post-content').innerHTML = '';
  document.getElementById('post-excerpt').value = '';
  document.getElementById('post-status').value = 'draft';
  document.getElementById('featured-image-id').value = '';
  document.getElementById('featured-image-preview').innerHTML = '<span>تصویر شاخصی انتخاب نشده است</span>';
  document.getElementById('remove-featured-btn').classList.add('hidden');
  document.getElementById('seo-title').value = '';
  document.getElementById('seo-description').value = '';
  document.getElementById('seo-keywords').value = '';
  selectedTags = [];
  renderSelectedTags();
  
  // Load categories
  await loadCategoriesCheckboxes();
  
  // Load tags
  await loadPopularTags();
  
  // If editing, load post data
  if (editingPostId) {
    try {
      const response = await api(`/posts/${editingPostId}`);
      const post = response.data;
      
      document.getElementById('post-id').value = post.id;
      document.getElementById('post-title').value = post.title;
      document.getElementById('post-slug').value = post.slug;
      document.getElementById('post-content').innerHTML = post.content;
      document.getElementById('post-excerpt').value = post.excerpt || '';
      document.getElementById('post-status').value = post.status;
      
      if (post.published_at) {
        document.getElementById('post-publish-date').value = post.published_at.substring(0, 16);
      }
      
      // Categories
      (post.categories || []).forEach(catId => {
        const checkbox = document.querySelector(`#categories-checkboxes input[value="${catId}"]`);
        if (checkbox) checkbox.checked = true;
      });
      
      // Tags
      selectedTags = (post.tags_data || []).map(t => ({ id: t.id, name: t.name }));
      renderSelectedTags();
      
      // Featured image
      if (post.featured_image_data) {
        document.getElementById('featured-image-id').value = post.featured_image_data.id;
        document.getElementById('featured-image-preview').innerHTML = 
          `<img src="${post.featured_image_data.url}" alt="${post.featured_image_data.alt_text || ''}">`;
        document.getElementById('remove-featured-btn').classList.remove('hidden');
      }
      
      // SEO
      document.getElementById('seo-title').value = post.seo_title || '';
      document.getElementById('seo-description').value = post.seo_description || '';
      document.getElementById('seo-keywords').value = post.seo_keywords || '';
      
      // Post format
      const formatRadio = document.querySelector(`input[name="post-format"][value="${post.post_format || 'standard'}"]`);
      if (formatRadio) formatRadio.checked = true;
      
      // Comments
      document.getElementById('allow-comments').checked = post.comment_status === 'open';
      
      updateSeoPreview();
    } catch (error) {
      showNotification('خطا در بارگذاری نوشته', 'error');
      editingPostId = null;
    }
  } else {
    editingPostId = null;
  }
  
  document.getElementById('page-title').textContent = editingPostId ? 'ویرایش نوشته' : 'نوشته جدید';
}

async function loadCategoriesCheckboxes() {
  try {
    const response = await api('/categories');
    const container = document.getElementById('categories-checkboxes');
    
    const buildCategoryHTML = (categories, level = 0) => {
      return categories.map(cat => `
        <label class="category-checkbox ${level > 0 ? 'child' : ''}" style="padding-right: ${level * 20}px">
          <input type="checkbox" value="${cat.id}">
          ${cat.name}
        </label>
        ${cat.children ? buildCategoryHTML(cat.children, level + 1) : ''}
      `).join('');
    };
    
    container.innerHTML = buildCategoryHTML(response.data);
    
    // Update parent select in new category form
    const parentSelect = document.getElementById('new-category-parent');
    if (parentSelect) {
      parentSelect.innerHTML = '<option value="">— دسته‌بندی والد —</option>' + 
        response.data.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

async function loadPopularTags() {
  try {
    const response = await api('/tags?orderby=count&order=desc');
    const container = document.getElementById('popular-tags');
    container.innerHTML = '<span class="label">برچسب‌های پرکاربرد:</span> ' + 
      response.data.slice(0, 10).map(tag => 
        `<span class="popular-tag" onclick="addTagFromPopular(${tag.id}, '${tag.name}')">${tag.name}</span>`
      ).join('');
  } catch (error) {
    console.error('Error loading tags:', error);
  }
}

function renderSelectedTags() {
  const container = document.getElementById('selected-tags');
  container.innerHTML = selectedTags.map(tag => `
    <span class="tag-item">
      ${tag.name}
      <button type="button" onclick="removeTag(${tag.id})">&times;</button>
    </span>
  `).join('');
}

async function addTag() {
  const input = document.getElementById('tags-input');
  const name = input.value.trim();
  
  if (!name) return;
  if (selectedTags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
    showNotification('این برچسب قبلاً اضافه شده است', 'warning');
    return;
  }
  
  try {
    const response = await api('/tags', 'POST', { name });
    selectedTags.push({ id: response.data.id, name: response.data.name });
    renderSelectedTags();
    input.value = '';
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

function addTagFromPopular(id, name) {
  if (selectedTags.some(t => t.id === id)) {
    showNotification('این برچسب قبلاً اضافه شده است', 'warning');
    return;
  }
  selectedTags.push({ id, name });
  renderSelectedTags();
}

function removeTag(id) {
  selectedTags = selectedTags.filter(t => t.id !== id);
  renderSelectedTags();
}

async function savePost(status) {
  const postId = document.getElementById('post-id').value;
  const title = document.getElementById('post-title').value;
  
  if (!title) {
    showNotification('لطفاً عنوان را وارد کنید', 'error');
    return;
  }
  
  // Get selected categories
  const categories = Array.from(document.querySelectorAll('#categories-checkboxes input:checked'))
    .map(cb => parseInt(cb.value));
  
  const postData = {
    title,
    slug: document.getElementById('post-slug').value,
    content: document.getElementById('post-content').innerHTML,
    excerpt: document.getElementById('post-excerpt').value,
    status: status || document.getElementById('post-status').value,
    categories: categories.length ? categories : [1],
    tags: selectedTags.map(t => t.id),
    featured_image: document.getElementById('featured-image-id').value || null,
    comment_status: document.getElementById('allow-comments').checked ? 'open' : 'closed',
    ping_status: document.getElementById('allow-pingback')?.checked ? 'open' : 'closed',
    seo_title: document.getElementById('seo-title').value,
    seo_description: document.getElementById('seo-description').value,
    seo_keywords: document.getElementById('seo-keywords').value,
    post_format: document.querySelector('input[name="post-format"]:checked')?.value || 'standard',
    published_at: document.getElementById('post-publish-date').value || null
  };
  
  try {
    let response;
    if (postId) {
      response = await api(`/posts/${postId}`, 'PUT', postData);
    } else {
      response = await api('/posts', 'POST', postData);
      document.getElementById('post-id').value = response.data.id;
      editingPostId = response.data.id;
    }
    
    showNotification(status === 'published' ? 'نوشته منتشر شد' : 'نوشته ذخیره شد', 'success');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

function toggleNewCategory() {
  document.getElementById('new-category-form').classList.toggle('hidden');
}

async function addNewCategory() {
  const name = document.getElementById('new-category-name').value;
  const parentId = document.getElementById('new-category-parent').value;
  
  if (!name) {
    showNotification('نام دسته‌بندی را وارد کنید', 'error');
    return;
  }
  
  try {
    const response = await api('/categories', 'POST', { 
      name, 
      parent_id: parentId ? parseInt(parentId) : null 
    });
    
    document.getElementById('new-category-name').value = '';
    toggleNewCategory();
    
    // Reload categories and check the new one
    await loadCategoriesCheckboxes();
    const checkbox = document.querySelector(`#categories-checkboxes input[value="${response.data.id}"]`);
    if (checkbox) checkbox.checked = true;
    
    showNotification('دسته‌بندی اضافه شد', 'success');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// Editor toolbar functions
function execCmd(command) {
  document.execCommand(command, false, null);
  document.getElementById('post-content').focus();
}

function execCmdWithArg(command, arg) {
  if (arg) {
    document.execCommand(command, false, arg);
    document.getElementById('post-content').focus();
  }
}

function insertLink() {
  const url = prompt('آدرس پیوند را وارد کنید:');
  if (url) {
    document.execCommand('createLink', false, url);
  }
}

function insertVideo() {
  const url = prompt('آدرس ویدیو را وارد کنید (YouTube, Vimeo):');
  if (url) {
    let embedCode = '';
    
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (ytMatch) {
      embedCode = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe>`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      embedCode = `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`;
    }
    
    if (embedCode) {
      document.execCommand('insertHTML', false, embedCode);
    } else {
      showNotification('آدرس ویدیو معتبر نیست', 'error');
    }
  }
}

function toggleEditorMode() {
  const visual = document.getElementById('post-content');
  const html = document.getElementById('post-content-html');
  const btn = document.getElementById('toggle-html-btn');
  
  if (visual.classList.contains('hidden')) {
    visual.innerHTML = html.value;
    visual.classList.remove('hidden');
    html.classList.add('hidden');
    btn.classList.remove('active');
  } else {
    html.value = visual.innerHTML;
    html.classList.remove('hidden');
    visual.classList.add('hidden');
    btn.classList.add('active');
  }
}

function toggleFullscreen() {
  const editor = document.querySelector('.editor-main');
  editor.classList.toggle('editor-fullscreen');
}

function updateSeoPreview() {
  const title = document.getElementById('seo-title').value || document.getElementById('post-title').value || 'عنوان نوشته';
  const description = document.getElementById('seo-description').value || document.getElementById('post-excerpt').value || 'توضیحات نوشته...';
  const slug = document.getElementById('post-slug').value || 'slug';
  
  document.getElementById('gp-title').textContent = title;
  document.getElementById('gp-url').textContent = `ghoncheye-lalehzar.com/blog/${slug}`;
  document.getElementById('gp-desc').textContent = description;
  
  document.getElementById('seo-title-count').textContent = title.length;
  document.getElementById('seo-desc-count').textContent = description.length;
}

function startAutosave() {
  autosaveInterval = setInterval(async () => {
    const title = document.getElementById('post-title')?.value;
    const content = document.getElementById('post-content')?.innerHTML;
    const postId = document.getElementById('post-id')?.value;
    
    if (title && content && document.getElementById('page-new-post').classList.contains('active')) {
      try {
        await api('/posts/autosave', 'POST', {
          post_id: postId || null,
          title,
          content,
          excerpt: document.getElementById('post-excerpt')?.value
        });
      } catch (error) {
        console.error('Autosave failed:', error);
      }
    }
  }, 60000); // Every minute
}

function removeFeaturedImage() {
  document.getElementById('featured-image-id').value = '';
  document.getElementById('featured-image-preview').innerHTML = '<span>تصویر شاخصی انتخاب نشده است</span>';
  document.getElementById('remove-featured-btn').classList.add('hidden');
}

// ==================== MEDIA ====================

async function loadMedia(page = 1) {
  const type = document.getElementById('filter-media-type')?.value || '';
  const search = document.getElementById('search-media')?.value || '';
  
  try {
    let url = `/media?page=${page}&per_page=24`;
    if (type) url += `&type=${type}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    const response = await api(url);
    
    const grid = document.getElementById('media-grid');
    if (response.data.length === 0) {
      grid.innerHTML = '<p class="loading">هیچ فایلی یافت نشد</p>';
    } else {
      grid.innerHTML = response.data.map(media => renderMediaItem(media)).join('');
    }
    
    renderPagination('media-pagination', response.pagination, loadMedia);
  } catch (error) {
    console.error('Error loading media:', error);
  }
}

function renderMediaItem(media, selectable = false) {
  const isImage = media.mime_type?.startsWith('image/');
  
  return `
    <div class="media-item" data-id="${media.id}" ${selectable ? `onclick="toggleMediaSelection(${media.id})"` : ''}>
      ${isImage 
        ? `<img src="${media.url}" alt="${media.alt_text || ''}" class="thumbnail">`
        : `<div class="file-icon"><i class="fas ${getFileIcon(media.mime_type)}"></i></div>`
      }
      <div class="file-info">
        <div class="file-name">${media.title || media.filename}</div>
        <div class="file-size">${formatFileSize(media.file_size)}</div>
      </div>
      ${selectable ? '<div class="check-mark"><i class="fas fa-check"></i></div>' : ''}
    </div>
  `;
}

function filterMedia() {
  loadMedia(1);
}

function debounceSearchMedia() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadMedia(1), 300);
}

function setMediaView(view) {
  document.querySelectorAll('.view-toggle button').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  // Could implement list view here
}

function openUploadModal() {
  document.getElementById('upload-modal').classList.add('active');
}

function openMediaLibrary(mode) {
  mediaSelectionMode = mode;
  selectedMediaId = null;
  document.getElementById('media-modal').classList.add('active');
  loadModalMedia();
}

async function loadModalMedia() {
  const search = document.getElementById('modal-media-search')?.value || '';
  
  try {
    let url = '/media?per_page=30&type=image';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    const response = await api(url);
    
    const grid = document.getElementById('modal-media-grid');
    grid.innerHTML = response.data.map(media => renderMediaItem(media, true)).join('');
  } catch (error) {
    console.error('Error loading media:', error);
  }
}

function debounceModalMediaSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadModalMedia(), 300);
}

function switchMediaTab(tab) {
  document.querySelectorAll('.modal-tabs .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById(`media-tab-${tab}`).classList.add('active');
}

function toggleMediaSelection(id) {
  const item = document.querySelector(`.modal-media-grid .media-item[data-id="${id}"]`);
  
  // Deselect previous
  document.querySelectorAll('.modal-media-grid .media-item').forEach(i => i.classList.remove('selected'));
  
  // Select new
  item.classList.add('selected');
  selectedMediaId = id;
  
  document.getElementById('select-media-btn').disabled = false;
}

async function selectMedia() {
  if (!selectedMediaId) return;
  
  try {
    const response = await api(`/media/${selectedMediaId}`);
    const media = response.data;
    
    if (mediaSelectionMode === 'featured') {
      document.getElementById('featured-image-id').value = media.id;
      document.getElementById('featured-image-preview').innerHTML = 
        `<img src="${media.url}" alt="${media.alt_text || ''}">`;
      document.getElementById('remove-featured-btn').classList.remove('hidden');
    } else if (mediaSelectionMode === 'content') {
      const img = `<img src="${media.url}" alt="${media.alt_text || ''}" style="max-width: 100%;">`;
      document.execCommand('insertHTML', false, img);
    }
    
    closeModal('media-modal');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

function setupFileUpload(inputId, areaId, progressId) {
  const input = document.getElementById(inputId);
  const area = document.getElementById(areaId);
  const progress = document.getElementById(progressId);
  
  if (!input || !area) return;
  
  area.addEventListener('click', () => input.click());
  
  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('dragover');
  });
  
  area.addEventListener('dragleave', () => {
    area.classList.remove('dragover');
  });
  
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('dragover');
    handleFiles(e.dataTransfer.files, progress);
  });
  
  input.addEventListener('change', () => {
    handleFiles(input.files, progress);
  });
}

async function handleFiles(files, progressContainer) {
  if (!files.length) return;
  
  progressContainer.innerHTML = '';
  
  for (const file of files) {
    const item = document.createElement('div');
    item.className = 'upload-item';
    item.innerHTML = `
      <span class="file-name">${file.name}</span>
      <div class="progress-bar"><div class="progress" style="width: 0%"></div></div>
      <span class="status">در حال آپلود...</span>
    `;
    progressContainer.appendChild(item);
    
    try {
      await uploadFile(file, (percent) => {
        item.querySelector('.progress').style.width = `${percent}%`;
      });
      item.querySelector('.status').textContent = 'موفق';
      item.querySelector('.status').classList.add('success');
    } catch (error) {
      item.querySelector('.status').textContent = 'خطا';
      item.querySelector('.status').classList.add('error');
    }
  }
  
  // Reload media after upload
  setTimeout(() => {
    loadMedia();
    loadModalMedia();
  }, 500);
}

// ==================== CATEGORIES ====================

async function loadCategories() {
  try {
    const response = await api('/categories');
    
    const tbody = document.getElementById('categories-list');
    tbody.innerHTML = response.data.map(cat => `
      <tr>
        <td><strong>${cat.name}</strong></td>
        <td>${cat.description || '—'}</td>
        <td>${cat.slug}</td>
        <td>${cat.count || 0}</td>
        <td>
          <a href="#" onclick="deleteCategory(${cat.id}); return false;">حذف</a>
        </td>
      </tr>
    `).join('');
    
    // Update parent select
    const parentSelect = document.getElementById('cat-parent');
    parentSelect.innerHTML = '<option value="">— بدون والد —</option>' + 
      response.data.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

async function handleCategorySubmit(e) {
  e.preventDefault();
  
  const data = {
    name: document.getElementById('cat-name').value,
    slug: document.getElementById('cat-slug').value,
    description: document.getElementById('cat-description').value,
    parent_id: document.getElementById('cat-parent').value || null
  };
  
  try {
    await api('/categories', 'POST', data);
    document.getElementById('category-form').reset();
    showNotification('دسته‌بندی اضافه شد', 'success');
    loadCategories();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟')) return;
  
  try {
    await api(`/categories/${id}`, 'DELETE');
    showNotification('دسته‌بندی حذف شد', 'success');
    loadCategories();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// ==================== TAGS ====================

async function loadTags() {
  try {
    const response = await api('/tags');
    
    const tbody = document.getElementById('tags-list');
    tbody.innerHTML = response.data.map(tag => `
      <tr>
        <td><strong>${tag.name}</strong></td>
        <td>${tag.description || '—'}</td>
        <td>${tag.slug}</td>
        <td>${tag.count || 0}</td>
        <td>
          <a href="#" onclick="deleteTag(${tag.id}); return false;">حذف</a>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading tags:', error);
  }
}

async function handleTagSubmit(e) {
  e.preventDefault();
  
  const data = {
    name: document.getElementById('tag-name').value,
    slug: document.getElementById('tag-slug').value,
    description: document.getElementById('tag-description').value
  };
  
  try {
    await api('/tags', 'POST', data);
    document.getElementById('tag-form').reset();
    showNotification('برچسب اضافه شد', 'success');
    loadTags();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function deleteTag(id) {
  if (!confirm('آیا از حذف این برچسب اطمینان دارید؟')) return;
  
  try {
    await api(`/tags/${id}`, 'DELETE');
    showNotification('برچسب حذف شد', 'success');
    loadTags();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// ==================== COMMENTS ====================

async function loadComments(page = 1, status = '') {
  try {
    let url = `/comments?page=${page}&per_page=20`;
    if (status) url += `&status=${status}`;
    
    const response = await api(url);
    
    const container = document.getElementById('comments-list');
    if (response.data.length === 0) {
      container.innerHTML = '<p class="loading">هیچ دیدگاهی یافت نشد</p>';
    } else {
      container.innerHTML = response.data.map(comment => `
        <div class="comment-item">
          <div class="comment-avatar">${comment.author_name.charAt(0)}</div>
          <div class="comment-content">
            <div class="comment-meta">
              <span class="comment-author">${comment.author_name}</span>
              <span class="comment-date">${formatDate(comment.created_at)}</span>
              <span class="status-badge status-${comment.status}">${getCommentStatusLabel(comment.status)}</span>
            </div>
            <p class="comment-text">${comment.content}</p>
            <div class="comment-actions">
              ${comment.status !== 'approved' ? `<a href="#" class="approve" onclick="moderateComment(${comment.id}, 'approved'); return false;">تأیید</a>` : ''}
              ${comment.status !== 'pending' ? `<a href="#" onclick="moderateComment(${comment.id}, 'pending'); return false;">در انتظار</a>` : ''}
              <a href="#" class="spam" onclick="moderateComment(${comment.id}, 'spam'); return false;">هرزنامه</a>
              <a href="#" class="delete" onclick="deleteComment(${comment.id}); return false;">حذف</a>
            </div>
          </div>
        </div>
      `).join('');
    }
    
    renderPagination('comments-pagination', response.pagination, (p) => loadComments(p, status));
  } catch (error) {
    console.error('Error loading comments:', error);
  }
}

async function moderateComment(id, status) {
  try {
    await api(`/comments/${id}`, 'PUT', { status });
    showNotification('وضعیت دیدگاه تغییر کرد', 'success');
    loadComments();
    loadDashboardData();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function deleteComment(id) {
  if (!confirm('آیا از حذف این دیدگاه اطمینان دارید؟')) return;
  
  try {
    await api(`/comments/${id}`, 'DELETE');
    showNotification('دیدگاه حذف شد', 'success');
    loadComments();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// ==================== PAGES ====================

async function loadPages() {
  try {
    const response = await api('/pages');
    
    const tbody = document.getElementById('pages-list');
    if (response.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading">هیچ برگه‌ای یافت نشد</td></tr>';
    } else {
      tbody.innerHTML = response.data.map(page => `
        <tr>
          <td><input type="checkbox"></td>
          <td>
            <strong>${page.title}</strong>
            <span class="status-badge status-${page.status}">${getStatusLabel(page.status)}</span>
            <div class="row-actions">
              <a href="#">ویرایش</a>
              <a href="#" class="delete">زباله‌دان</a>
              <a href="/page/${page.slug}" target="_blank">مشاهده</a>
            </div>
          </td>
          <td>${currentUser?.display_name || '—'}</td>
          <td>${formatDate(page.created_at)}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading pages:', error);
  }
}

// ==================== USERS ====================

async function loadUsers() {
  try {
    const response = await api('/users');
    
    const tbody = document.getElementById('users-list');
    tbody.innerHTML = response.data.map(user => `
      <tr>
        <td><strong>${user.username}</strong></td>
        <td>${user.display_name}</td>
        <td>${user.email}</td>
        <td>${getRoleLabel(user.role)}</td>
        <td>${user.post_count || 0}</td>
        <td>
          <a href="#">ویرایش</a>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// ==================== SETTINGS ====================

async function loadSettings() {
  try {
    const response = await api('/options');
    const options = response.data;
    
    document.getElementById('opt-site-title').value = options.site_title || '';
    document.getElementById('opt-tagline').value = options.site_tagline || '';
    document.getElementById('opt-posts-per-page').value = options.posts_per_page || 10;
    document.getElementById('opt-comments-allowed').checked = options.comments_allowed === '1';
    document.getElementById('opt-comment-moderation').checked = options.comment_moderation === '1';
    
    // Load categories for default category select
    const catsResponse = await api('/categories');
    const select = document.getElementById('opt-default-category');
    select.innerHTML = catsResponse.data.map(cat => 
      `<option value="${cat.id}" ${cat.id == options.default_category ? 'selected' : ''}>${cat.name}</option>`
    ).join('');
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  
  const data = {
    site_title: document.getElementById('opt-site-title').value,
    site_tagline: document.getElementById('opt-tagline').value,
    posts_per_page: document.getElementById('opt-posts-per-page').value,
    default_category: document.getElementById('opt-default-category').value,
    comments_allowed: document.getElementById('opt-comments-allowed').checked ? '1' : '0',
    comment_moderation: document.getElementById('opt-comment-moderation').checked ? '1' : '0'
  };
  
  try {
    await api('/options', 'PUT', data);
    showNotification('تنظیمات ذخیره شد', 'success');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// ==================== UTILITIES ====================

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type} show`;
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

function getStatusLabel(status) {
  const labels = {
    'published': 'منتشر شده',
    'draft': 'پیش‌نویس',
    'pending': 'در انتظار',
    'trash': 'زباله‌دان',
    'auto-draft': 'پیش‌نویس خودکار'
  };
  return labels[status] || status;
}

function getCommentStatusLabel(status) {
  const labels = {
    'approved': 'تأیید شده',
    'pending': 'در انتظار',
    'spam': 'هرزنامه'
  };
  return labels[status] || status;
}

function getRoleLabel(role) {
  const labels = {
    'administrator': 'مدیرکل',
    'editor': 'ویراستار',
    'author': 'نویسنده',
    'contributor': 'مشارکت‌کننده',
    'subscriber': 'عضو'
  };
  return labels[role] || role;
}

function getFileIcon(mimeType) {
  if (!mimeType) return 'fa-file';
  if (mimeType.startsWith('image/')) return 'fa-file-image';
  if (mimeType.startsWith('video/')) return 'fa-file-video';
  if (mimeType.startsWith('audio/')) return 'fa-file-audio';
  if (mimeType.includes('pdf')) return 'fa-file-pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'fa-file-excel';
  return 'fa-file';
}

function renderPagination(containerId, pagination, callback) {
  const container = document.getElementById(containerId);
  if (!container || !pagination || pagination.total_pages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }
  
  const { current_page, total_pages } = pagination;
  let html = '';
  
  // Previous button
  html += `<button ${current_page === 1 ? 'disabled' : ''} onclick="window.${callback.name}(${current_page - 1})">قبلی</button>`;
  
  // Page numbers
  for (let i = 1; i <= total_pages; i++) {
    if (i === 1 || i === total_pages || (i >= current_page - 2 && i <= current_page + 2)) {
      html += `<button class="${i === current_page ? 'active' : ''}" onclick="window.${callback.name}(${i})">${i}</button>`;
    } else if (i === current_page - 3 || i === current_page + 3) {
      html += '<span>...</span>';
    }
  }
  
  // Next button
  html += `<button ${current_page === total_pages ? 'disabled' : ''} onclick="window.${callback.name}(${current_page + 1})">بعدی</button>`;
  
  container.innerHTML = html;
}

function toggleSelectAllPosts(e) {
  document.querySelectorAll('.post-checkbox').forEach(cb => {
    cb.checked = e.target.checked;
  });
}

// Make functions globally accessible
window.navigateTo = navigateTo;
window.editPost = editPost;
window.deletePost = deletePost;
window.savePost = savePost;
window.addNewCategory = addNewCategory;
window.toggleNewCategory = toggleNewCategory;
window.addTag = addTag;
window.addTagFromPopular = addTagFromPopular;
window.removeTag = removeTag;
window.openMediaLibrary = openMediaLibrary;
window.selectMedia = selectMedia;
window.closeModal = closeModal;
window.switchMediaTab = switchMediaTab;
window.toggleMediaSelection = toggleMediaSelection;
window.openUploadModal = openUploadModal;
window.removeFeaturedImage = removeFeaturedImage;
window.filterPosts = filterPosts;
window.debounceSearch = debounceSearch;
window.loadPosts = loadPosts;
window.loadMedia = loadMedia;
window.filterMedia = filterMedia;
window.debounceSearchMedia = debounceSearchMedia;
window.setMediaView = setMediaView;
window.debounceModalMediaSearch = debounceModalMediaSearch;
window.deleteCategory = deleteCategory;
window.deleteTag = deleteTag;
window.loadComments = loadComments;
window.moderateComment = moderateComment;
window.deleteComment = deleteComment;
window.execCmd = execCmd;
window.execCmdWithArg = execCmdWithArg;
window.insertLink = insertLink;
window.insertVideo = insertVideo;
window.toggleEditorMode = toggleEditorMode;
window.toggleFullscreen = toggleFullscreen;
