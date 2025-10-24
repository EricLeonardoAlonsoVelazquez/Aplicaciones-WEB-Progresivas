const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const cookieParser = require('cookie-parser');

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

// SIMULACIÓN DE BASE DE DATOS EN MEMORIA (para testing)
const users = [
  {
    id: '1',
    email: 'admin@example.com',
    password: '12345678', // En producción esto debería estar hasheado
    name: 'Administrador',
    displayName: 'Admin'
  }
];

// LOGIN SIMULADO (pero funcional)
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
    
    // Buscar usuario en la "base de datos"
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    console.log('✅ Usuario encontrado:', user.email);
    
    // Generar token JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        name: user.name
      }, 
      process.env.JWT_SECRET || 'bdadbf29ff462ca7e0844818d628d547f019ba1590a87ddf167e4e053802815c2e19f982f68c07faaa902eda08dc301b4e6e57bfdf30f3b9d672c804d95d082e',
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
        uid: user.id,
        email: user.email,
        name: user.name,
        displayName: user.displayName
      },
      token: token
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Error en el servidor: ' + error.message
    });
  }
});

// REGISTER SIMULADO
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
    
    // Verificar si el usuario ya existe
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }
    
    // Crear nuevo usuario
    const newUser = {
      id: 'user-' + Date.now(),
      email: email,
      password: password, // En producción: hash this!
      name: name || 'Nuevo Usuario',
      displayName: name || 'Usuario Nuevo'
    };
    
    users.push(newUser);
    console.log('✅ Usuario creado:', newUser.email);
    
    // Generar token JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name
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
        uid: newUser.id,
        email: newUser.email,
        name: newUser.name,
        displayName: newUser.displayName
      },
      token: token
    });
    
  } catch (error) {
    console.error('❌ Register error:', error);
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
    
    // Buscar usuario
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      user: {
        uid: user.id,
        email: user.email,
        name: user.name,
        displayName: user.displayName
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
