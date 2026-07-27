require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');

const store = require('./db/store');
const { seedIfEmpty } = require('./db/seed');
const { getCategoryMeta } = require('./lib/categoryMeta');
const { getHeroImage } = require('./lib/heroImages');

seedIfEmpty(store);

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 4 },
  })
);

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.isAdmin = !!(req.session && req.session.isAdmin);
  res.locals.getCategoryMeta = getCategoryMeta;
  res.locals.getHeroImage = getHeroImage;

  const allFooterPosts = store.getAllPosts({ publishedOnly: true });
  res.locals.footerRecentPosts = allFooterPosts.slice(0, 5);
  res.locals.footerCategoryCounts = store.getAllCategories().map((name) => ({
    name,
    count: allFooterPosts.filter((p) => p.category === name).length,
  }));

  next();
});

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

app.listen(PORT, () => {
  console.log(`BudgetBhraman blog running at http://localhost:${PORT}`);
});
