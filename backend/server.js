const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // <-- Agregar esto
const authRoutes = require('./routes/auth');
const path = require('path');
const config = require('./config/config');

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost', 'http://localhost:80', 'http://frontend'],
  credentials: true
}));
app.use(cookieParser()); // <-- Agregar esto
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas de API
app.use('/api/auth', authRoutes);

// Middleware para extraer token de cookies o headers
const extractToken = (req) => {
  console.log('🍪 Cookies recibidas:', req.cookies); // Debug
  console.log('📨 Headers authorization:', req.headers.authorization); // Debug
  
  // Primero buscar en cookies
  if (req.cookies && req.cookies.authToken) {
    console.log('✅ Token encontrado en cookies');
    return req.cookies.authToken;
  }
  // Luego buscar en headers
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('✅ Token encontrado en headers');
    return authHeader.substring(7);
  }
  
  console.log('❌ No se encontró token');
  return null;
};

// Middleware para verificar autenticación y servir la página correcta
const serveAppBasedOnAuth = (req, res, next) => {
  const token = extractToken(req);
  const requestedPath = req.path;
  
  console.log('🔍 Ruta solicitada:', requestedPath);
  console.log('🔑 Token presente:', !!token);

  // Verificar token si existe
  let isTokenValid = false;
  let userData = null;
  
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, config.jwt.secret);
      isTokenValid = true;
      userData = decoded;
      console.log('✅ Token válido para usuario:', decoded.userId);
    } catch (error) {
      console.log('❌ Token inválido:', error.message);
      isTokenValid = false;
      // Limpiar cookie inválida
      res.clearCookie('authToken');
    }
  }

  // Lógica de redirección
  if (requestedPath === '/' || requestedPath === '/login') {
    if (isTokenValid) {
      console.log('🔄 Usuario autenticado en login, redirigiendo a index');
      return res.redirect('/index');
    } else {
      console.log('🌐 Sirviendo página de login');
      return res.sendFile(path.join(__dirname, '../frontend', 'login.html'));
    }
  } else if (requestedPath === '/index') {
    if (!isTokenValid) {
      console.log('🔄 Usuario no autenticado en index, redirigiendo a login');
      return res.redirect('/');
    } else {
      console.log('📊 Sirviendo dashboard para usuario:', userData.userId);
      return res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
    }
  }

  // Para otras rutas, continuar
  next();
};

// Aplicar middleware de autenticación para rutas principales
app.use(serveAppBasedOnAuth);

// Ruta de verificación de salud
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  console.log('❌ Ruta no encontrada:', req.originalUrl);
  res.status(404).json({ 
    success: false, 
    message: 'Ruta no encontrada' 
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('💥 Error no manejado:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor' 
  });
});

// Iniciar servidor
app.listen(config.port, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${config.port}`);
  console.log(`📱 Entorno: ${config.nodeEnv}`);
  console.log(`🔑 Login: http://localhost:${config.port}/`);
  console.log(`📊 Dashboard: http://localhost:${config.port}/index`);
  console.log(`❤️  Health check: http://localhost:${config.port}/health`);
});