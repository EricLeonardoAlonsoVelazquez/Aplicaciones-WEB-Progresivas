const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('../routes/auth');
const path = require('path');
const config = require('../config/config');
const { extractToken } = require('../middleware/auth');

const app = express();

// Configuración CORS para producción
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como mobile apps o server requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost',
      'http://localhost:80', 
      'http://frontend',
      'https://tu-sitio.netlify.app', // Reemplaza con tu dominio de Netlify
      'https://tu-sitio-prueba.netlify.app' // Si tienes deploy previews
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('.netlify.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(cookieParser()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const verifyAuthentication = async (token) => {
  if (!token) return { authenticated: false, user: null };
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const userService = require('../services/userService');
    const user = await userService.findById(decoded.userId);
    
    return { authenticated: !!user, user: user ? user.toJSON() : null };
  } catch (error) {
    console.log('❌ Error verificando token:', error.message);
    return { authenticated: false, user: null };
  }
};

// Middleware de autenticación (igual que tu código original)
app.use(async (req, res, next) => {
  const requestedPath = req.path;
  
  console.log('🔍 Ruta solicitada:', requestedPath);

  const publicRoutes = [
    '/login', 
    '/health', 
    '/manifest.json',
    '/service-worker.js',
    '/api/auth/login',
    '/api/auth/register',
    '/.netlify/functions/server/login', // Ruta completa en Netlify
    '/.netlify/functions/server/health'
  ];
  
  const publicStaticPaths = ['/css/', '/js/', '/icons/', '/img/'];
  
  const isPublicRoute = publicRoutes.includes(requestedPath) || 
                       publicStaticPaths.some(publicPath => requestedPath.startsWith(publicPath)) ||
                       requestedPath.startsWith('/api/auth/') ||
                       requestedPath.startsWith('/.netlify/functions/server/api/auth/');
  
  if (requestedPath === '/' || requestedPath === '/.netlify/functions/server') {
    console.log('🏠 Ruta raíz solicitada');
    const token = extractToken(req);
    const authResult = await verifyAuthentication(token);
    
    if (authResult.authenticated) {
      console.log('✅ Usuario autenticado, redirigiendo a index');
      return res.redirect('/.netlify/functions/server/index');
    } else {
      console.log('❌ Usuario no autenticado, redirigiendo a login');
      return res.redirect('/.netlify/functions/server/login');
    }
  }
  
  if (isPublicRoute) {
    console.log('🌐 Ruta pública, acceso permitido');
    
    if ((requestedPath === '/login' || requestedPath === '/.netlify/functions/server/login') && req.method === 'GET') {
      const token = extractToken(req);
      const authResult = await verifyAuthentication(token);
      if (authResult.authenticated) {
        console.log('🔄 Usuario ya autenticado, redirigiendo a index');
        return res.redirect('/.netlify/functions/server/index');
      }
    }
    
    return next();
  }

  console.log('🛡️ Ruta requiere autenticación:', requestedPath);
  const token = extractToken(req);
  
  if (!token) {
    console.log('❌ No autenticado, redirigiendo a login');
    return res.redirect('/.netlify/functions/server/login');
  }

  const authResult = await verifyAuthentication(token);
  if (!authResult.authenticated) {
    console.log('❌ Token inválido o expirado, redirigiendo a login');
    res.clearCookie('authToken');
    return res.redirect('/.netlify/functions/server/login');
  }

  console.log('✅ Usuario autenticado correctamente:', authResult.user.email);
  req.user = authResult.user;
  next();
});

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../../frontend'), {
  index: false
}));

// Rutas (actualizadas para Netlify)
app.get('/.netlify/functions/server/login', (req, res) => {
  console.log('🌐 Sirviendo página de login desde Netlify');
  res.sendFile(path.join(__dirname, '../../frontend', 'login.html'));
});

app.get('/.netlify/functions/server/index', (req, res) => {
  console.log('📊 Sirviendo dashboard para usuario:', req.user.email);
  res.sendFile(path.join(__dirname, '../../frontend', 'index.html'));
});

app.get('/login', (req, res) => {
  res.redirect('/.netlify/functions/server/login');
});

app.get('/index', (req, res) => {
  res.redirect('/.netlify/functions/server/index');
});

app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando correctamente en Netlify',
    timestamp: new Date().toISOString(),
    environment: 'netlify'
  });
});

app.use('/api/auth', authRoutes);
app.use('/.netlify/functions/server/api/auth', authRoutes);

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  console.log('❌ Ruta no encontrada:', req.originalUrl);
  
  if (!req.originalUrl.includes('.') || req.originalUrl.endsWith('.html')) {
    const token = extractToken(req);
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        jwt.verify(token, config.jwt.secret);
        return res.redirect('/.netlify/functions/server/index');
      } catch (error) {
        // Token inválido
      }
    }
    return res.redirect('/.netlify/functions/server/login');
  }
  
  res.status(404).json({ 
    success: false, 
    message: 'Ruta no encontrada' 
  });
});

// Manejo de errores
app.use((error, req, res, next) => {
  console.error('💥 Error no manejado:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor' 
  });
});

// Exportar para Netlify Functions
module.exports.handler = serverless(app);

// Solo para desarrollo local
if (process.env.NETLIFY_DEV) {
  const PORT = process.env.PORT || 8888;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT} (Netlify Dev)`);
    console.log(`🔑 Login: http://localhost:${PORT}/login`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/index`);
  });
}