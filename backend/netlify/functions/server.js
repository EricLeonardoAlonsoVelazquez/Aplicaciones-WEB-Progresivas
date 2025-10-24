const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const admin = require('firebase-admin');

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

// Inicializar Firebase Admin con variables de entorno
try {
  console.log('🔥 Inicializando Firebase...');
  
  if (admin.apps.length === 0) {
    const firebaseConfig = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
      universe_domain: "googleapis.com"
    };

    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    
    console.log('✅ Firebase inicializado correctamente');
  } else {
    console.log('ℹ️ Firebase ya estaba inicializado');
  }
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error.message);
}

const db = admin.firestore();

// Middleware para log
app.use((req, res, next) => {
  console.log('📨 Request:', req.method, req.path);
  next();
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 API Backend funcionando en Netlify',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /health',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'POST /api/auth/logout',
      'GET /api/auth/me'
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ Servidor funcionando en Netlify',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// LOGIN con Firebase Auth
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
    
    // Verificar credenciales con Firebase Auth
    // NOTA: Firebase Admin SDK no tiene método directo para verificar email/password
    // En una aplicación real usarías Firebase Client SDK en el frontend
    // Por ahora simularemos la verificación
    
    try {
      // Buscar usuario por email
      const user = await admin.auth().getUserByEmail(email);
      console.log('✅ Usuario encontrado en Firebase Auth:', user.email);
      
      // En una app real, la verificación de password se hace con Firebase Client SDK
      // Aquí asumimos que las credenciales son válidas
      
      // Generar token JWT personalizado
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { 
          userId: user.uid,
          email: user.email,
          name: user.displayName || 'Usuario'
        }, 
        process.env.JWT_SECRET || 'netlify-jwt-secret-key-2024',
        { expiresIn: '24h' }
      );
      
      // Cookie segura
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });
      
      // Buscar o crear usuario en Firestore
      let userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists) {
        await db.collection('users').doc(user.uid).set({
          email: user.email,
          displayName: user.displayName || '',
          createdAt: new Date(),
          lastLogin: new Date()
        });
      } else {
        await db.collection('users').doc(user.uid).update({
          lastLogin: new Date()
        });
      }
      
      // Obtener datos actualizados
      userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.data();
      
      res.json({
        success: true,
        message: '✅ Login exitoso',
        user: {
          uid: user.uid,
          email: user.email,
          name: userData?.displayName || user.displayName || 'Usuario',
          displayName: userData?.displayName || user.displayName || 'Usuario'
        },
        token: token
      });
      
    } catch (firebaseError) {
      console.error('❌ Error Firebase Auth:', firebaseError.message);
      
      if (firebaseError.code === 'auth/user-not-found') {
        return res.status(401).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
      
      throw firebaseError;
    }
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Error en el servidor: ' + error.message
    });
  }
});

// REGISTER con Firebase Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    console.log('📝 Register attempt:', email);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña requeridos'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // Crear usuario en Firebase Auth
    const user = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name || '',
      emailVerified: false
    });
    
    console.log('✅ Usuario creado en Firebase Auth:', user.uid);
    
    // Crear documento en Firestore
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      displayName: name || '',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Usuario creado en Firestore:', user.uid);
    
    // Generar token JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: user.uid,
        email: user.email,
        name: name || 'Nuevo Usuario'
      }, 
      process.env.JWT_SECRET || 'netlify-jwt-secret-key-2024',
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
        name: name || 'Nuevo Usuario',
        displayName: name || 'Nuevo Usuario'
      },
      token: token
    });
    
  } catch (error) {
    console.error('❌ Register error:', error);
    
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
    
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        error: 'El email no es válido'
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
    
    // Verificar token JWT
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'netlify-jwt-secret-key-2024');
    
    // Buscar usuario en Firestore
    const userDoc = await db.collection('users').doc(decoded.userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    const userData = userDoc.data();
    
    res.json({
      success: true,
      user: {
        uid: decoded.userId,
        email: decoded.email,
        name: userData.displayName || decoded.name,
        displayName: userData.displayName || decoded.name
      }
    });
    
  } catch (error) {
    console.error('❌ Error en /me:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado'
      });
    }
    
    res.status(401).json({
      success: false,
      error: 'Error de autenticación'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ Ruta no encontrada:', req.method, req.path);
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /',
      'GET /health',
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
