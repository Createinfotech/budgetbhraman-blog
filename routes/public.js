const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { toHtml } = require('../lib/markdown');
const { getCategoryMeta } = require('../lib/categoryMeta');

function excerptOf(post) {
  return post.excerpt && post.excerpt.trim().length > 0
    ? post.excerpt
    : post.body.replace(/[#*|-]/g, '').slice(0, 160).trim() + '...';
}

function categoryCountsFor(allPublished) {
  return store.getAllCategories().map((name) => ({
    name,
    count: allPublished.filter((p) => p.category === name).length,
  }));
}

router.get('/', (req, res) => {
  const category = req.query.category;
  const q = (req.query.q || '').toString().trim().toLowerCase();
  const allPublished = store.getAllPosts({ publishedOnly: true });
  let posts = allPublished;
  if (category && store.getAllCategories().includes(category)) {
    posts = posts.filter((p) => p.category === category);
  }
  if (q) {
    posts = posts.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q) ||
      (p.excerpt || '').toLowerCase().includes(q)
    );
  }
  posts = posts.map((p) => ({ ...p, excerpt: excerptOf(p) }));

  const isDefaultView = !category && !q;
  let categorySections = [];
  let recentComments = [];
  if (isDefaultView) {
    categorySections = store.getAllCategories().map((name) => {
      const catPosts = allPublished.filter((p) => p.category === name).slice(0, 5);
      return { name, color: getCategoryMeta(name).color, posts: catPosts };
    }).filter((section) => section.posts.length > 0);

    recentComments = store.getRecentComments(6).map((c) => {
      const post = store.getPostBySlug(c.slug);
      return {
        ...c,
        postTitle: post ? post.title : 'a post',
        postSlug: c.slug,
      };
    });
  }

  const manuallyFeatured = allPublished.filter((p) => p.featured);
  const featuredPosts = manuallyFeatured.length > 0
    ? manuallyFeatured.slice(0, 5)
    : allPublished.slice(0, 5);

  res.render('home', {
    title: 'BudgetBhraman — Budget Travel in India',
    posts,
    categoryCounts: categoryCountsFor(allPublished),
    recentPosts: allPublished.slice(0, 5),
    // "Popular" is a placeholder ordering (no real view-count tracking) — reverse
    // of recent so it differs visibly from the Recent tab.
    popularPosts: allPublished.slice(0, 5).slice().reverse(),
    recentComments,
    categorySections,
    featuredPosts,
    activeCategory: category || null,
    searchQuery: q || null,
  });
});

router.get('/post/:slug', (req, res) => {
  const post = store.getPostBySlug(req.params.slug);
  if (!post || !post.published) {
    return res.status(404).render('404', { title: 'Post Not Found' });
  }
  const bodyHtml = toHtml(post.body);
  const comments = store.getCommentsBySlug(post.slug);
  const allPublished = store.getAllPosts({ publishedOnly: true });

  res.render('post', {
    title: post.title,
    post,
    bodyHtml,
    comments,
    categoryCounts: categoryCountsFor(allPublished),
    recentPosts: allPublished.filter((p) => p.slug !== post.slug).slice(0, 5),
    activeCategory: null,
  });
});

router.post('/post/:slug/comment', (req, res) => {
  const post = store.getPostBySlug(req.params.slug);
  if (!post || !post.published) {
    return res.status(404).render('404', { title: 'Post Not Found' });
  }
  const name = (req.body.name || '').toString().trim().slice(0, 80) || 'Anonymous';
  const message = (req.body.message || '').toString().trim().slice(0, 2000);
  if (message) {
    store.createComment({
      slug: post.slug,
      name,
      message,
      created_at: new Date().toISOString(),
    });
  }
  res.redirect(`/post/${post.slug}#comments`);
});

function staticPage(slug, title) {
  return (req, res) => {
    const page = store.getPage(slug);
    if (!page) return res.status(404).render('404', { title: 'Page Not Found' });
    res.render('page', { title, page, bodyHtml: toHtml(page.body) });
  };
}

router.get('/about', staticPage('about', 'About Us'));
router.get('/contact', staticPage('contact', 'Contact Us'));
router.get('/privacy-policy', staticPage('privacy-policy', 'Privacy Policy'));

module.exports = router;
