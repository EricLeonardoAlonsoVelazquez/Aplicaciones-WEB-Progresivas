const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Configuración CORS
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para log
app.use((req, res, next) => {
  console.log('📨 Request:', req.method, req.path);
  next();
});

// Health check - RUTA CORREGIDA
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ Servidor funcionando en Netlify',
    timestamp: new Date().toISOString()
  });
});

// Test Firebase - RUTA CORREGIDA
app.get('/test-firebase', async (req, res) => {
  try {
    console.log('🔥 Probando Firebase...');
    
    // RUTA CORREGIDA - sube un nivel desde functions
    const firebasePath = path.join(__dirname, '..', '..', 'config', 'firebase');
    console.log('📁 Buscando Firebase en:', firebasePath);
    
    const { db } = require(firebasePath);
    
    const testRef = db.collection('_netlify_test');
    await testRef.doc('connection-test').set({
      timestamp: new Date(),
      message: 'Firebase funcionando en Netlify!',
      environment: 'netlify'
    });
    
    res.json({ 
      success: true, 
      message: '✅ Firebase conectado correctamente' 
    });
    
  } catch (error) {
    console.error('❌ Error Firebase:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Echo endpoint - RUTA CORREGIDA
app.post('/echo', (req, res) => {
  res.json({
    success: true,
    message: '✅ Echo funcionando',
    received: req.body
  });
});

// LOGIN - RUTAS CORREGIDAS
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt:', email);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña requeridos'
      });
    }
    
    // RUTA CORREGIDA para Firebase
    const firebasePath = path.join(__dirname, '..', '..', 'config', 'firebase');
    const { admin } = require(firebasePath);
    const auth = admin.auth();
    
    // Verificar usuario en Firebase Auth
    const user = await auth.getUserByEmail(email);
    
    // Generar token JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: user.uid, 
        email: user.email 
      }, 
      process.env.JWT_SECRET || 'netlify-fallback-secret',
      { expiresIn: '24h' }
    );
    
    // Cookie segura
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      message: '✅ Login exitoso',
      user: {
        uid: user.uid,
        email: user.email
      },
      token: token
    });
    
  } catch (error) {
    console.error('❌ Login error:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error en el servidor'
    });
  }
});

// REGISTER - RUTA CORREGIDA
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    console.log('📝 Register attempt:', email);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña requeridos'
      });
    }
    
    // RUTA CORREGIDA
    const firebasePath = path.join(__dirname, '..', '..', 'config', 'firebase');
    const { admin, db } = require(firebasePath);
    const auth = admin.auth();
    
    // Crear usuario
    const user = await auth.createUser({
      email: email,
      password: password,
      displayName: displayName || ''
    });
    
    // Crear documento en Firestore
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      displayName: displayName || '',
      createdAt: new Date()
    });
    
    // JWT Token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: user.uid, 
        email: user.email 
      }, 
      process.env.JWT_SECRET || 'netlify-fallback-secret',
      { expiresIn: '24h' }
    );
    
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      message: '✅ Usuario registrado',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || ''
      }
    });
    
  } catch (error) {
    console.error('❌ Register error:', error.message);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error en el registro'
    });
  }
});

// LOGOUT - RUTA CORREGIDA
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({
    success: true,
    message: '✅ Logout exitoso'
  });
});

// ME - RUTA CORREGIDA
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'netlify-fallback-secret');
    
    // RUTA CORREGIDA
    const firebasePath = path.join(__dirname, '..', '..', 'config', 'firebase');
    const { db } = require(firebasePath);
    
    const userDoc = await db.collection('users').doc(decoded.userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      user: {
        uid: decoded.userId,
        ...userDoc.data()
      }
    });
    
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ Ruta no encontrada:', req.path);
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada: ' + req.path
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('💥 Error:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

module.exports.handler = serverless(app);
