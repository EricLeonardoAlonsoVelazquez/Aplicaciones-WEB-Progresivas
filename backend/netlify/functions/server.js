const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Configuración CORS
app.use(cors({
  origin: [
    'http://localhost', 
    'http://localhost:80', 
    'http://frontend',
    'https://arbolred1.netlify.app',
    'https://*.netlify.app'
  ],
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

// Cargar módulos de manera segura
let config, authRoutes, extractToken;

try {
  console.log('🔧 Cargando módulos...');
  
  // Rutas absolutas desde la raíz del proyecto
  const projectRoot = path.join(__dirname, '..', '..');
  
  // Cargar configuración
  const configPath = path.join(projectRoot, 'config', 'config');
  config = require(configPath);
  console.log('✅ Configuración cargada');
  
  // Cargar middleware de auth
  const authMiddlewarePath = path.join(projectRoot, 'middleware', 'auth');
  const authMiddleware = require(authMiddlewarePath);
  extractToken = authMiddleware.extractToken;
  console.log('✅ Middleware de auth cargado');
  
  // Cargar rutas de auth
  const authRoutesPath = path.join(projectRoot, 'routes', 'auth');
  authRoutes = require(authRoutesPath);
  console.log('✅ Rutas de auth cargadas');
  
} catch (error) {
  console.error('❌ Error cargando módulos:', error.message);
  
  // Configuración de fallback
  config = {
    jwt: {
      secret: process.env.JWT_SECRET || 'netlify-fallback-secret'
    }
  };
  
  extractToken = (req) => {
    return req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');
  };
  
  // Rutas básicas de auth como fallback
  authRoutes = require('express').Router();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ Servidor funcionando en Netlify',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Test Firebase
app.get('/test-firebase', async (req, res) => {
  try {
    console.log('🔥 Probando Firebase...');
    
    // Cargar Firebase dinámicamente
    const projectRoot = path.join(__dirname, '..', '..');
    const firebasePath = path.join(projectRoot, 'config', 'firebase');
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
    console.error('❌ Error en Firebase:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Error en Firebase: ' + error.message 
    });
  }
});

// LOGIN
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
    
    // Cargar Firebase
    const projectRoot = path.join(__dirname, '..', '..');
    const firebasePath = path.join(projectRoot, 'config', 'firebase');
    const { admin } = require(firebasePath);
    const auth = admin.auth();
    
    // Verificar usuario en Firebase Auth
    const user = await auth.getUserByEmail(email);
    console.log('✅ Usuario encontrado:', user.email);
    
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      message: '✅ Login exitoso',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || ''
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
      error: 'Error en el servidor: ' + error.message
    });
  }
});

// REGISTER
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
    
    // Cargar Firebase
    const projectRoot = path.join(__dirname, '..', '..');
    const firebasePath = path.join(projectRoot, 'config', 'firebase');
    const { admin, db } = require(firebasePath);
    const auth = admin.auth();
    
    // Crear usuario en Firebase Auth
    const user = await auth.createUser({
      email: email,
      password: password,
      displayName: displayName || '',
      emailVerified: false
    });
    
    console.log('✅ Usuario creado en Auth:', user.uid);
    
    // Crear documento en Firestore
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      displayName: displayName || '',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Usuario creado en Firestore:', user.uid);
    
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      message: '✅ Usuario registrado exitosamente',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || ''
      },
      token: token
    });
    
  } catch (error) {
    console.error('❌ Register error:', error.message);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }
    
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({
        success: false,
        error: 'La contraseña es demasiado débil'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error en el registro: ' + error.message
    });
  }
});

// LOGOUT
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({
    success: true,
    message: '✅ Logout exitoso'
  });
});

// GET CURRENT USER
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
    
    // Cargar Firebase
    const projectRoot = path.join(__dirname, '..', '..');
    const firebasePath = path.join(projectRoot, 'config', 'firebase');
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
    console.error('❌ Error en /me:', error.message);
    res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
});

// Usar rutas de auth si se cargaron correctamente
if (authRoutes) {
  app.use('/api/auth', authRoutes);
}

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ Ruta no encontrada:', req.method, req.path);
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /health',
      'GET /test-firebase',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'POST /api/auth/logout',
      'GET /api/auth/me'
    ]
  });
});

// Error handler global
app.use((error, req, res, next) => {
  console.error('💥 Error global:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  });
});

module.exports.handler = serverless(app);
