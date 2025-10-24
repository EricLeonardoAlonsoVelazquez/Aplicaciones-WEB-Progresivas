const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Configuración CORS para Netlify
app.use(cors({
  origin: function (origin, callback) {
    // Permitir todos los orígenes en Netlify para testing
    // Luego puedes restringirlo a tu dominio específico
    const allowedOrigins = [
      'http://localhost',
      'http://localhost:3000',
      'http://localhost:8080',
      'https://arbolred1.netlify.app', // Cambia por tu dominio
      'https://*.netlify.app'
    ];
    
    if (!origin || allowedOrigins.includes(origin) || origin.includes('.netlify.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para log de requests
app.use((req, res, next) => {
  console.log('🌐 Request recibida:', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body ? '...' : 'empty'
  });
  next();
});

// Health check endpoint
app.get('/.netlify/functions/server/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando en Netlify',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Test Firebase connection
app.get('/.netlify/functions/server/test-firebase', async (req, res) => {
  try {
    console.log('🔥 Probando conexión Firebase...');
    
    // Importar Firebase dentro de la función para evitar errores de carga
    const firebasePath = path.join(__dirname, '..', 'config', 'firebase');
    const { db } = require(firebasePath);
    
    const testRef = db.collection('_netlify_test');
    await testRef.doc('connection-test').set({
      timestamp: new Date(),
      message: 'Firebase funcionando en Netlify Functions!',
      environment: 'netlify-production'
    });
    
    console.log('✅ Firebase conectado correctamente');
    
    res.json({ 
      success: true, 
      message: 'Firebase conectado correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en Firebase:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

// Simple echo endpoint para testing
app.post('/.netlify/functions/server/echo', (req, res) => {
  res.json({
    success: true,
    message: 'Echo funcionando',
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.post('/.netlify/functions/server/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Intentando login para:', email);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos'
      });
    }
    
    // Importar Firebase auth
    const firebasePath = path.join(__dirname, '..', 'config', 'firebase');
    const { admin } = require(firebasePath);
    const auth = admin.auth();
    
    // Aquí deberías tener tu lógica de verificación de contraseña
    // Por ahora, solo verificamos que el usuario exista en Firebase Auth
    const user = await auth.getUserByEmail(email);
    
    console.log('✅ Usuario encontrado:', user.email);
    
    // En una implementación real, verificarías la contraseña aquí
    // Esto es solo para demostración
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: user.uid, 
        email: user.email 
      }, 
      process.env.JWT_SECRET || 'fallback-secret-for-netlify',
      { expiresIn: '24h' }
    );
    
    // Configurar cookie segura
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });
    
    res.json({
      success: true,
      message: 'Login exitoso',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || ''
      },
      token: token
    });
    
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error en el servidor durante el login'
    });
  }
});

// Register endpoint
app.post('/.netlify/functions/server/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    console.log('📝 Intentando registro para:', email);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos'
      });
    }
    
    const firebasePath = path.join(__dirname, '..', 'config', 'firebase');
    const { admin } = require(firebasePath);
    const auth = admin.auth();
    
    // Crear usuario en Firebase Auth
    const user = await auth.createUser({
      email: email,
      password: password,
      displayName: displayName || '',
      emailVerified: false
    });
    
    console.log('✅ Usuario creado:', user.uid);
    
    // Crear documento en Firestore
    const { db } = require(firebasePath);
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      displayName: displayName || '',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Generar JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: user.uid, 
        email: user.email 
      }, 
      process.env.JWT_SECRET || 'fallback-secret-for-netlify',
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
      message: 'Usuario registrado exitosamente',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || ''
      },
      token: token
    });
    
  } catch (error) {
    console.error('❌ Error en registro:', error.message);
    
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
      error: 'Error en el servidor durante el registro'
    });
  }
});

// Logout endpoint
app.post('/.netlify/functions/server/api/auth/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({
    success: true,
    message: 'Logout exitoso'
  });
});

// Get current user profile
app.get('/.netlify/functions/server/api/auth/me', async (req, res) => {
  try {
    const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-for-netlify');
    
    const firebasePath = path.join(__dirname, '..', 'config', 'firebase');
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
    console.error('❌ Error obteniendo perfil:', error.message);
    res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
});

// Protected route example
app.get('/.netlify/functions/server/api/protected', async (req, res) => {
  try {
    const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Acceso no autorizado'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-for-netlify');
    
    res.json({
      success: true,
      message: 'Acceso a ruta protegida exitoso',
      user: decoded,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  console.log('❌ Ruta no encontrada:', req.originalUrl);
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('💥 Error no manejado:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  });
});

// Export para Netlify Functions
module.exports.handler = serverless(app);

// Para desarrollo local con Netlify Dev
if (process.env.NETLIFY_DEV) {
  const PORT = process.env.PORT || 8888;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT} (Netlify Dev)`);
    console.log(`❤️  Health: http://localhost:${PORT}/.netlify/functions/server/health`);
    console.log(`🔥 Firebase Test: http://localhost:${PORT}/.netlify/functions/server/test-firebase`);
  });
}

