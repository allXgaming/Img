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

app.get('/api/services', async (req, res) => {
  try {
    const snap = await db.collection('services').orderBy('order', 'asc').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

app.get('/api/testimonials', async (req, res) => {
  try {
    const snap = await db.collection('testimonials').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

app.get('/api/faqs', async (req, res) => {
  try {
    const snap = await db.collection('faqs').orderBy('order').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch FAQs" });
  }
});

app.get('/api/showcases', async (req, res) => {
  try {
    const snap = await db.collection('showcases').orderBy('order', 'asc').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch showcases" });
  }
});

app.get('/api/portfolios', async (req, res) => {
  try {
    const snap = await db.collection('portfolios').orderBy('timestamp', 'desc').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolios" });
  }
});

app.get('/api/team', async (req, res) => {
  try {
    const snap = await db.collection('team').get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

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

app.post('/api/chat/ai', async (req, res) => {
  const { history } = req.body;
  try {
    const reply = await callOpenRouter(history);
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: "AI communication failed" });
  }
});

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

app.get('/api/chat/messages', async (req, res) => {
  const { uid, role } = req.query;
  if (!uid) return res.status(400).json({ error: "Missing uid query" });

  try {
    if (role === 'admin') {
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
    } else {
      const chatId = `chat_${uid}_admin`;
      const snap = await db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp', 'asc').get();
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.status(200).json(data);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch support messages" });
  }
});

app.post('/api/chat/messages', async (req, res) => {
  const { uid, text, senderId, senderName, type } = req.body;
  if (!uid || !text) return res.status(400).json({ error: "Missing required fields" });

  try {
    const chatId = `chat_${uid}_admin`;
    const docRef = await db.collection('chats').doc(chatId).collection('messages').add({
      text,
      senderId,
      senderName,
      timestamp: new Date(),
      type
    });
    res.status(200).json({ id: docRef.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = app;