const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const store = require('../db/store');

function constantTimeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin/login');
}

function normalizeGalleryInput(raw) {
  return (raw || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', { title: 'Admin Login', error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const validUser = constantTimeEqual(username || '', process.env.ADMIN_USER || '');
  const validPass = constantTimeEqual(password || '', process.env.ADMIN_PASS || '');
  if (validUser && validPass) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.status(401).render('admin/login', { title: 'Admin Login', error: 'Invalid username or password.' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

router.get('/', requireAuth, (req, res) => {
  const posts = store.getAllPosts();
  res.render('admin/dashboard', { title: 'Admin Dashboard', posts });
});

router.get('/posts/new', requireAuth, (req, res) => {
  const categories = store.getAllCategories();
  res.render('admin/form', {
    title: 'New Post',
    post: { title: '', slug: '', category: categories[0] || '', excerpt: '', body: '', published: true, featured: false, image_url: '', gallery_images: '', date: new Date().toISOString().slice(0, 10) },
    categories,
    formAction: '/admin/posts/new',
    isEdit: false,
  });
});

router.post('/posts/new', requireAuth, (req, res) => {
  const { title, slug, category, excerpt, body, published, featured, image_url, gallery_images, date } = req.body;
  const finalSlug = (slug && slug.trim()) ? slugify(slug) : slugify(title);
  store.createPost({
    title: title.trim(),
    slug: finalSlug,
    category,
    excerpt: (excerpt || '').trim(),
    body,
    published: !!published,
    featured: !!featured,
    image_url: (image_url || '').trim(),
    gallery_images: normalizeGalleryInput(gallery_images),
    date: date || new Date().toISOString().slice(0, 10),
  });
  res.redirect('/admin');
});

router.get('/posts/:id/edit', requireAuth, (req, res) => {
  const post = store.getPostById(req.params.id);
  if (!post) return res.redirect('/admin');
  res.render('admin/form', {
    title: 'Edit Post',
    post,
    categories: store.getAllCategories(),
    formAction: `/admin/posts/${post.id}/edit`,
    isEdit: true,
  });
});

router.post('/posts/:id/edit', requireAuth, (req, res) => {
  const { title, slug, category, excerpt, body, published, featured, image_url, gallery_images, date } = req.body;
  const finalSlug = (slug && slug.trim()) ? slugify(slug) : slugify(title);
  store.updatePost(req.params.id, {
    title: title.trim(),
    slug: finalSlug,
    category,
    excerpt: (excerpt || '').trim(),
    body,
    published: !!published,
    featured: !!featured,
    image_url: (image_url || '').trim(),
    gallery_images: normalizeGalleryInput(gallery_images),
    date: date || new Date().toISOString().slice(0, 10),
  });
  res.redirect('/admin');
});

router.post('/posts/:id/delete', requireAuth, (req, res) => {
  store.deletePost(req.params.id);
  res.redirect('/admin');
});

router.get('/categories', requireAuth, (req, res) => {
  res.render('admin/categories', {
    title: 'Categories',
    categoryCounts: store.getCategoryCounts(),
    error: req.query.error || null,
    success: req.query.success || null,
  });
});

router.post('/categories', requireAuth, (req, res) => {
  const result = store.createCategory(req.body.name);
  if (!result.success) {
    return res.redirect(`/admin/categories?error=${encodeURIComponent(result.error)}`);
  }
  res.redirect(`/admin/categories?success=${encodeURIComponent('Category created.')}`);
});

router.post('/categories/rename', requireAuth, (req, res) => {
  const { oldName, newName } = req.body;
  const result = store.renameCategory(oldName, newName);
  if (!result.success) {
    return res.redirect(`/admin/categories?error=${encodeURIComponent(result.error)}`);
  }
  res.redirect(`/admin/categories?success=${encodeURIComponent('Category renamed.')}`);
});

router.post('/categories/delete', requireAuth, (req, res) => {
  const result = store.deleteCategory(req.body.name);
  if (!result.success) {
    return res.redirect(`/admin/categories?error=${encodeURIComponent(result.error)}`);
  }
  res.redirect(`/admin/categories?success=${encodeURIComponent('Category deleted.')}`);
});

module.exports = router;
