require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'community.json');
fs.mkdirSync(dataDir, { recursive: true });

const initial = { users: [], messages: [], announcements: [] };
function readDB() {
  try { return { ...initial, ...JSON.parse(fs.readFileSync(dbFile, 'utf8')) }; }
  catch { return structuredClone(initial); }
}
let db = readDB();
function saveDB() { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }
const adminPhones = [process.env.ADMIN_PHONE, ...(process.env.ADMIN_PHONES || '').split(',')]
  .filter(Boolean).map(v => v.trim());

const sessionMiddleware = session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: dataDir }),
  secret: process.env.SESSION_SECRET || 'development-only-change-this-secret',
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 }
});
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

function publicUser(user) { return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, bio: user.bio || '', createdAt: user.createdAt }; }
function requireAuth(req, res, next) { if (!req.session.userId) return res.status(401).json({ error: 'Please sign in first.' }); next(); }
function requireAdmin(req, res, next) {
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' });
  req.user = user; next();
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password || password.length < 12) {
    console.warn('Admin not seeded. Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in .env.');
    return;
  }
  let user = db.users.find(u => u.email === email);
  if (!user) {
    user = { id: 'u_' + Date.now(), name: process.env.ADMIN_NAME || 'Community Admin', email,
      phone: process.env.ADMIN_PHONE || '', passwordHash: await bcrypt.hash(password, 12),
      role: 'admin', bio: 'Community administrator', createdAt: new Date().toISOString() };
    db.users.push(user); saveDB();
  } else if (user.role !== 'admin') { user.role = 'admin'; saveDB(); }
}

app.get('/api/config', (req, res) => res.json({ appName: 'MEET UR CRUSH', whatsappEnabled: process.env.WHATSAPP_ENABLED === 'true' }));
app.get('/api/me', (req, res) => {
  const user = db.users.find(u => u.id === req.session.userId);
  res.json({ user: user ? publicUser(user) : null });
});
app.post('/api/register', async (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password || String(password).length < 8) return res.status(400).json({ error: 'Enter your name, email and a password of at least 8 characters.' });
  const normalized = String(email).trim().toLowerCase();
  if (db.users.some(u => u.email === normalized)) return res.status(409).json({ error: 'That email is already registered.' });
  const user = { id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,7), name: String(name).trim().slice(0,50), email: normalized,
    phone: String(phone || '').trim().slice(0,25), passwordHash: await bcrypt.hash(String(password), 12), role: 'member', bio: '', createdAt: new Date().toISOString() };
  db.users.push(user); saveDB(); req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});
app.post('/api/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const user = db.users.find(u => u.email === email);
  if (!user || !await bcrypt.compare(String(req.body?.password || ''), user.passwordHash)) return res.status(401).json({ error: 'Incorrect email or password.' });
  req.session.userId = user.id; res.json({ user: publicUser(user) });
});
app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/members', requireAuth, (req, res) => res.json({ members: db.users.map(publicUser) }));
app.get('/api/messages', requireAuth, (req, res) => res.json({ messages: db.messages.slice(-150) }));
app.get('/api/announcements', requireAuth, (req, res) => res.json({ announcements: db.announcements.slice(-30).reverse() }));
app.post('/api/announcements', requireAuth, requireAdmin, (req, res) => {
  const body = String(req.body?.body || '').trim().slice(0,1000);
  if (!body) return res.status(400).json({ error: 'Announcement cannot be empty.' });
  const item = { id: 'a_' + Date.now(), body, author: req.user.name, createdAt: new Date().toISOString() };
  db.announcements.push(item); saveDB(); io.emit('announcement:new', item); res.json({ announcement: item });
});
app.post('/api/admin/role', requireAuth, requireAdmin, (req, res) => {
  const { userId, role } = req.body || {};
  if (!['admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  const target = db.users.find(u => u.id === userId);
  if (!target) return res.status(404).json({ error: 'Member not found.' });
  if (target.id === req.user.id && role !== 'admin') return res.status(400).json({ error: 'You cannot remove your own administrator role.' });
  target.role = role; saveDB(); res.json({ user: publicUser(target) });
});

io.engine.use(sessionMiddleware);
const online = new Map();
io.use((socket, next) => {
  const userId = socket.request.session?.userId;
  const user = db.users.find(u => u.id === userId);
  if (!user) return next(new Error('Sign in required'));
  socket.user = user; next();
});
io.on('connection', socket => {
  const user = socket.user;
  online.set(user.id, { name: user.name, sockets: (online.get(user.id)?.sockets || 0) + 1 });
  const broadcastPresence = () => io.emit('presence:update', [...online.entries()].map(([id, v]) => ({ id, name: v.name })));
  broadcastPresence();
  socket.on('chat:send', payload => {
    const body = String(payload?.body || '').trim().slice(0,2000);
    if (!body) return;
    const message = { id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2,6), body, userId: user.id, sender: user.name, createdAt: new Date().toISOString() };
    db.messages.push(message); if (db.messages.length > 1000) db.messages = db.messages.slice(-1000); saveDB(); io.emit('chat:new', message);
  });
  socket.on('typing', isTyping => socket.broadcast.emit('typing:update', { userId: user.id, name: user.name, typing: !!isTyping }));
  socket.on('disconnect', () => {
    const entry = online.get(user.id);
    if (entry && entry.sockets > 1) entry.sockets--;
    else online.delete(user.id);
    broadcastPresence();
  });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
seedAdmin().then(() => server.listen(PORT, () => console.log(`MEET UR CRUSH running at http://localhost:${PORT}`)));
