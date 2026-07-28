const express = require('express');
const cors = require('cors');
require('dotenv').config();

const corsMiddleware = require('./cors');
const { db, auth } = require('../utils/firebase');
const { callOpenRouter } = require('../utils/openrouter');
const { validateAuthData } = require('./script');

const app = express();
app.use(express.json());
app.use(corsMiddleware);

// ---- SERVICES ----
app.get('/api/services', async (req, res) => {
  try {
    const snap = await db.collection('services').orderBy('order', 'asc').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// ---- TESTIMONIALS ----
app.get('/api/testimonials', async (req, res) => {
  try {
    const snap = await db.collection('testimonials').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

// ---- FAQS ----
app.get('/api/faqs', async (req, res) => {
  try {
    const snap = await db.collection('faqs').orderBy('order').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch FAQs" });
  }
});

// ---- SHOWCASES ----
app.get('/api/showcases', async (req, res) => {
  try {
    const snap = await db.collection('showcases').orderBy('order', 'asc').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch showcases" });
  }
});

// ---- PORTFOLIOS ----
app.get('/api/portfolios', async (req, res) => {
  try {
    const snap = await db.collection('portfolios').orderBy('timestamp', 'desc').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolios" });
  }
});

// ---- TEAM ----
app.get('/api/team', async (req, res) => {
  try {
    const snap = await db.collection('team').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

// ---- CAROUSEL ----
app.get('/api/carousel', async (req, res) => {
  try {
    const snap = await db.collection('carousel').orderBy('order', 'asc').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch carousel images" });
  }
});

// ---- CONTENT ----
app.get('/api/content', async (req, res) => {
  try {
    const doc = await db.collection('content').doc('main').get();
    if (doc.exists) {
      res.status(200).json(doc.data());
    } else {
      res.status(200).json({ whatIDo: [], whatIUse: [] });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch content" });
  }
});

// ---- STATS ----
app.get('/api/stats', async (req, res) => {
  try {
    const doc = await db.collection('siteStats').doc('main').get();
    if (doc.exists) {
      res.status(200).json(doc.data());
    } else {
      res.status(200).json({ yearsExperience: 0, projectsEdited: 0, happyClients: 0 });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ---- AI CHAT ----
app.post('/api/chat/ai', async (req, res) => {
  const { messages } = req.body;
  try {
    const reply = await callOpenRouter(messages);
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: "AI communication failed" });
  }
});

// ---- AUTH SIGNUP ----
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  const validation = validateAuthData(email, password);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    await db.collection('users').doc(cred.user.uid).set({ name, email });
    res.status(200).json({ user: { uid: cred.user.uid, email, displayName: name } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- AUTH LOGIN ----
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const validation = validateAuthData(email, password);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    res.status(200).json({ user: { uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- CHAT MESSAGES (GET) ----
app.get('/api/chat/messages', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId query" });

  try {
    const chatId = `chat_${userId}_admin`;
    const snap = await db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp', 'asc').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch support messages" });
  }
});

// ---- CHAT ALL ADMIN CHATS ----
app.get('/api/chat/all-admin-chats', async (req, res) => {
  try {
    const messagesSnapshot = await db.collectionGroup('messages').get();
    const userIds = new Set();
    messagesSnapshot.forEach(doc => {
      if (doc.data().senderId && doc.data().senderId !== 'admin') {
        userIds.add(doc.data().senderId);
      }
    });
    const groupData = await Promise.all([...userIds].map(async userId => {
      const userDoc = await db.collection('users').doc(userId).get();
      const msgSnap = await db.collection('chats').doc(`chat_${userId}_admin`).collection('messages').orderBy('timestamp', 'asc').get();
      return {
        userId,
        userName: userDoc.exists ? userDoc.data().name : userId.slice(0, 6),
        messages: msgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      };
    }));
    res.status(200).json(groupData);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin chats" });
  }
});

// ---- CHAT SEND ----
app.post('/api/chat/send', async (req, res) => {
  const { userId, text, userName } = req.body;
  if (!userId || !text) return res.status(400).json({ error: "Missing required fields" });

  try {
    const chatId = `chat_${userId}_admin`;
    const docRef = await db.collection('chats').doc(chatId).collection('messages').add({
      text,
      senderId: userId,
      senderName: userName || 'Client',
      timestamp: new Date(),
      type: 'user'
    });
    res.status(200).json({ id: docRef.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ---- CHAT REPLY (ADMIN) ----
app.post('/api/chat/reply', async (req, res) => {
  const { targetUserId, text } = req.body;
  if (!targetUserId || !text) return res.status(400).json({ error: "Missing required fields" });

  try {
    const chatId = `chat_${targetUserId}_admin`;
    const docRef = await db.collection('chats').doc(chatId).collection('messages').add({
      text,
      senderId: 'admin',
      senderName: 'Admin Support',
      timestamp: new Date(),
      type: 'admin'
    });
    res.status(200).json({ id: docRef.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to send reply" });
  }
});

module.exports = app;