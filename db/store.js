// Data-access layer for the blog.
//
// Backend priority:
//   1. better-sqlite3 (native module) — best perf, but may fail to build on some Windows setups
//   2. node:sqlite (built into modern Node) — no native build required
//   3. JSON-file-backed store in db/data.json — universal fallback
//
// Whichever backend is chosen, this module exports the exact same interface,
// so the rest of the app never needs to know which one is active.

const path = require('path');
const fs = require('fs');

const DB_DIR = __dirname;
const SQLITE_FILE = path.join(DB_DIR, 'blog.sqlite');
const JSON_FILE = path.join(DB_DIR, 'data.json');

let backendName = null;
let impl = null;

function trySqlite(moduleName) {
  const Database = require(moduleName);
  const DatabaseCtor = moduleName === 'node:sqlite' ? Database.DatabaseSync : Database;
  const db = new DatabaseCtor(SQLITE_FILE);

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      excerpt TEXT,
      body TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pages (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
  `);

  try {
    db.exec('ALTER TABLE posts ADD COLUMN featured INTEGER NOT NULL DEFAULT 0');
  } catch (e) {
    // column already exists — fine
  }

  return {
    name: moduleName,
    getAllCategories() {
      return db.prepare('SELECT name FROM categories ORDER BY id ASC').all().map((r) => r.name);
    },
    seedCategoriesIfEmpty(names) {
      const row = db.prepare('SELECT COUNT(*) AS c FROM categories').get();
      if (row.c === 0) {
        const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
        for (const name of names) stmt.run(name);
      }
    },
    createCategory(name) {
      const trimmed = (name || '').toString().trim();
      if (!trimmed) return { success: false, error: 'Category name is required.' };
      const existing = db.prepare('SELECT name FROM categories WHERE LOWER(name) = LOWER(?)').get(trimmed);
      if (existing) return { success: false, error: `Category "${trimmed}" already exists.` };
      db.prepare('INSERT INTO categories (name) VALUES (?)').run(trimmed);
      return { success: true };
    },
    renameCategory(oldName, newName) {
      const trimmed = (newName || '').toString().trim();
      if (!trimmed) return { success: false, error: 'New category name is required.' };
      const existing = db.prepare('SELECT name FROM categories WHERE name = ?').get(oldName);
      if (!existing) return { success: false, error: `Category "${oldName}" not found.` };
      const clash = db.prepare('SELECT name FROM categories WHERE LOWER(name) = LOWER(?) AND name != ?').get(trimmed, oldName);
      if (clash) return { success: false, error: `Category "${trimmed}" already exists.` };
      db.exec('BEGIN');
      try {
        db.prepare('UPDATE categories SET name = ? WHERE name = ?').run(trimmed, oldName);
        db.prepare('UPDATE posts SET category = ? WHERE category = ?').run(trimmed, oldName);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return { success: true };
    },
    deleteCategory(name) {
      const count = db.prepare('SELECT COUNT(*) AS c FROM posts WHERE category = ?').get(name).c;
      if (count > 0) {
        return { success: false, error: `Cannot delete — ${count} post${count === 1 ? '' : 's'} use this category. Reassign them first.` };
      }
      db.prepare('DELETE FROM categories WHERE name = ?').run(name);
      return { success: true };
    },
    getCategoryCounts() {
      return this.getAllCategories().map((name) => ({
        name,
        count: db.prepare('SELECT COUNT(*) AS c FROM posts WHERE category = ?').get(name).c,
      }));
    },
    getAllPosts({ publishedOnly = false } = {}) {
      const sql = publishedOnly
        ? 'SELECT * FROM posts WHERE published = 1 ORDER BY date DESC, id DESC'
        : 'SELECT * FROM posts ORDER BY date DESC, id DESC';
      return db.prepare(sql).all().map(normalizeRow);
    },
    getPostBySlug(slug) {
      const row = db.prepare('SELECT * FROM posts WHERE slug = ?').get(slug);
      return row ? normalizeRow(row) : null;
    },
    getPostById(id) {
      const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(Number(id));
      return row ? normalizeRow(row) : null;
    },
    createPost(post) {
      const stmt = db.prepare(
        `INSERT INTO posts (slug, title, category, excerpt, body, published, featured, date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const info = stmt.run(
        post.slug, post.title, post.category, post.excerpt, post.body,
        post.published ? 1 : 0, post.featured ? 1 : 0, post.date
      );
      const id = info.lastInsertRowid !== undefined ? info.lastInsertRowid : info.lastInsertRowId;
      return this.getPostById(id);
    },
    updatePost(id, post) {
      db.prepare(
        `UPDATE posts SET slug=?, title=?, category=?, excerpt=?, body=?, published=?, featured=?, date=? WHERE id=?`
      ).run(post.slug, post.title, post.category, post.excerpt, post.body, post.published ? 1 : 0, post.featured ? 1 : 0, post.date, Number(id));
      return this.getPostById(id);
    },
    deletePost(id) {
      db.prepare('DELETE FROM posts WHERE id = ?').run(Number(id));
    },
    countPosts() {
      const row = db.prepare('SELECT COUNT(*) AS c FROM posts').get();
      return row.c;
    },
    getPage(slug) {
      const row = db.prepare('SELECT * FROM pages WHERE slug = ?').get(slug);
      return row || null;
    },
    upsertPage(slug, title, body) {
      const existing = db.prepare('SELECT slug FROM pages WHERE slug = ?').get(slug);
      if (existing) {
        db.prepare('UPDATE pages SET title=?, body=? WHERE slug=?').run(title, body, slug);
      } else {
        db.prepare('INSERT INTO pages (slug, title, body) VALUES (?, ?, ?)').run(slug, title, body);
      }
    },
    getCommentsBySlug(slug) {
      return db.prepare('SELECT * FROM comments WHERE slug = ? ORDER BY id ASC').all(slug);
    },
    createComment(comment) {
      const stmt = db.prepare(
        'INSERT INTO comments (slug, name, message, created_at) VALUES (?, ?, ?, ?)'
      );
      const info = stmt.run(comment.slug, comment.name, comment.message, comment.created_at);
      const id = info.lastInsertRowid !== undefined ? info.lastInsertRowid : info.lastInsertRowId;
      return { id, ...comment };
    },
    getRecentComments(limit = 5) {
      return db.prepare('SELECT * FROM comments ORDER BY id DESC LIMIT ?').all(Number(limit));
    },
  };

  function normalizeRow(row) {
    return { ...row, published: !!row.published, featured: !!row.featured };
  }
}

function makeJsonStore() {
  function load() {
    if (!fs.existsSync(JSON_FILE)) {
      return { posts: [], pages: [], comments: [], nextId: 1, nextCommentId: 1 };
    }
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    if (!Array.isArray(data.comments)) data.comments = [];
    if (!data.nextCommentId) data.nextCommentId = 1;
    if (!Array.isArray(data.categories)) data.categories = [];
    return data;
  }
  function save(data) {
    fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2), 'utf8');
  }

  return {
    name: 'json-file',
    getAllPosts({ publishedOnly = false } = {}) {
      const data = load();
      let posts = data.posts;
      if (publishedOnly) posts = posts.filter((p) => p.published);
      return posts.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
    },
    getPostBySlug(slug) {
      const data = load();
      return data.posts.find((p) => p.slug === slug) || null;
    },
    getPostById(id) {
      const data = load();
      return data.posts.find((p) => p.id === Number(id)) || null;
    },
    createPost(post) {
      const data = load();
      const id = data.nextId++;
      const row = { id, ...post, published: !!post.published, featured: !!post.featured };
      data.posts.push(row);
      save(data);
      return row;
    },
    updatePost(id, post) {
      const data = load();
      const idx = data.posts.findIndex((p) => p.id === Number(id));
      if (idx === -1) return null;
      data.posts[idx] = { ...data.posts[idx], ...post, id: Number(id), published: !!post.published, featured: !!post.featured };
      save(data);
      return data.posts[idx];
    },
    deletePost(id) {
      const data = load();
      data.posts = data.posts.filter((p) => p.id !== Number(id));
      save(data);
    },
    countPosts() {
      return load().posts.length;
    },
    getPage(slug) {
      const data = load();
      return data.pages.find((p) => p.slug === slug) || null;
    },
    upsertPage(slug, title, body) {
      const data = load();
      const idx = data.pages.findIndex((p) => p.slug === slug);
      if (idx === -1) data.pages.push({ slug, title, body });
      else data.pages[idx] = { slug, title, body };
      save(data);
    },
    getCommentsBySlug(slug) {
      const data = load();
      return data.comments
        .filter((c) => c.slug === slug)
        .sort((a, b) => a.id - b.id);
    },
    createComment(comment) {
      const data = load();
      const id = data.nextCommentId++;
      const row = { id, ...comment };
      data.comments.push(row);
      save(data);
      return row;
    },
    getRecentComments(limit = 5) {
      const data = load();
      return data.comments
        .slice()
        .sort((a, b) => b.id - a.id)
        .slice(0, limit);
    },
    getAllCategories() {
      return load().categories.slice();
    },
    seedCategoriesIfEmpty(names) {
      const data = load();
      if (data.categories.length === 0) {
        data.categories = names.slice();
        save(data);
      }
    },
    createCategory(name) {
      const trimmed = (name || '').toString().trim();
      if (!trimmed) return { success: false, error: 'Category name is required.' };
      const data = load();
      const existing = data.categories.find((c) => c.toLowerCase() === trimmed.toLowerCase());
      if (existing) return { success: false, error: `Category "${trimmed}" already exists.` };
      data.categories.push(trimmed);
      save(data);
      return { success: true };
    },
    renameCategory(oldName, newName) {
      const trimmed = (newName || '').toString().trim();
      if (!trimmed) return { success: false, error: 'New category name is required.' };
      const data = load();
      const idx = data.categories.findIndex((c) => c === oldName);
      if (idx === -1) return { success: false, error: `Category "${oldName}" not found.` };
      const clash = data.categories.find((c) => c.toLowerCase() === trimmed.toLowerCase() && c !== oldName);
      if (clash) return { success: false, error: `Category "${trimmed}" already exists.` };
      data.categories[idx] = trimmed;
      data.posts.forEach((p) => {
        if (p.category === oldName) p.category = trimmed;
      });
      save(data);
      return { success: true };
    },
    deleteCategory(name) {
      const data = load();
      const count = data.posts.filter((p) => p.category === name).length;
      if (count > 0) {
        return { success: false, error: `Cannot delete — ${count} post${count === 1 ? '' : 's'} use this category. Reassign them first.` };
      }
      data.categories = data.categories.filter((c) => c !== name);
      save(data);
      return { success: true };
    },
    getCategoryCounts() {
      const data = load();
      return data.categories.map((name) => ({
        name,
        count: data.posts.filter((p) => p.category === name).length,
      }));
    },
  };
}

try {
  impl = trySqlite('better-sqlite3');
  backendName = impl.name;
} catch (e1) {
  try {
    impl = trySqlite('node:sqlite');
    backendName = impl.name;
  } catch (e2) {
    impl = makeJsonStore();
    backendName = impl.name;
  }
}

console.log(`[db] using backend: ${backendName}`);

module.exports = impl;
