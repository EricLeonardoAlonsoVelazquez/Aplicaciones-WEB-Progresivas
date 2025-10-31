const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const path = require('path');
const config = require('./config/config');
const { extractToken } = require('./middleware/auth');

const app = express();

app.use(cors({
  origin: ['http://localhost', 'http://localhost:80', 'http://frontend'],
  credentials: true
}));
app.use(cookieParser()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/screenshots', express.static(path.join(__dirname, '../frontend/screenshots')));

const verifyAuthentication = async (token) => {
  if (!token) return { authenticated: false, user: null };
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const userService = require('./services/userService');
    const user = await userService.findById(decoded.userId);
    
    return { authenticated: !!user, user: user ? user.toJSON() : null };
  } catch (error) {
    console.log('❌ Error verificando token:', error.message);
    return { authenticated: false, user: null };
  }
};

// 🔥 CORRECCIÓN: Definir rutas públicas y protegidas
app.use(async (req, res, next) => {
  const requestedPath = req.path;
  
  console.log('🔍 Ruta solicitada:', requestedPath);

  // Rutas públicas (acceso sin autenticación)
  const publicRoutes = [
    '/', 
    '/login', 
    '/health', 
    '/manifest.json',
    '/service-worker.js',
    '/api/auth/login',
    '/api/auth/register',
    '/index.html'
  ];
  
  const publicStaticPaths = ['/css/', '/js/', '/icons/', '/img/', '/screenshots/'];
  
  const isPublicRoute = publicRoutes.includes(requestedPath) || 
                       publicStaticPaths.some(publicPath => requestedPath.startsWith(publicPath)) ||
                       requestedPath.startsWith('/api/auth/');
  
  // RUTA RAÍZ: Siempre pública, muestra index.html
  if (requestedPath === '/') {
    console.log('🏠 Ruta raíz solicitada - PÚBLICA');
    return res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  }
  
  // RUTA LOGIN: Pública, pero si ya está autenticado redirige a dashboard
  if (requestedPath === '/login' && req.method === 'GET') {
    const token = extractToken(req);
    const authResult = await verifyAuthentication(token);
    if (authResult.authenticated) {
      console.log('🔄 Usuario ya autenticado, redirigiendo a dashboard');
      return res.redirect('/dashboard');
    }
  }
  
  // RUTAS PÚBLICAS: Acceso libre
  if (isPublicRoute) {
    console.log('🌐 Ruta pública, acceso permitido');
    return next();
  }

  // 🔐 RUTAS PROTEGIDAS: Requieren autenticación
  console.log('🛡️ Ruta protegida:', requestedPath);
  
  // DASHBOARD: Protegida
  if (requestedPath === '/dashboard' || requestedPath === '/dashboard.html') {
    const token = extractToken(req);
    const authResult = await verifyAuthentication(token);
    
    if (!authResult.authenticated) {
      console.log('❌ No autenticado, redirigiendo a login');
      return res.redirect('/login');
    }
    
    console.log('✅ Usuario autenticado para dashboard:', authResult.user.email);
    req.user = authResult.user;
    return next();
  }

  // Otras rutas protegidas
  const token = extractToken(req);
  const authResult = await verifyAuthentication(token);
  if (!authResult.authenticated) {
    console.log('❌ No autenticado, redirigiendo a login');
    return res.redirect('/login');
  }

  console.log('✅ Usuario autenticado correctamente:', authResult.user.email);
  req.user = authResult.user;
  next();
});

// 🔥 NUEVA RUTA: Dashboard protegido
app.get('/dashboard', (req, res) => {
  console.log('📊 Sirviendo dashboard para usuario:', req.user.email);
  res.sendFile(path.join(__dirname, '../frontend', 'dashboard.html'));
});

app.get('/dashboard.html', (req, res) => {
  console.log('📊 Sirviendo dashboard via dashboard.html para usuario:', req.user.email);
  res.redirect('/dashboard');
});

// Rutas existentes
app.get('/login', (req, res) => {
  console.log('🌐 Sirviendo página de login');
  res.sendFile(path.join(__dirname, '../frontend', 'login.html'));
});

app.get('/index', (req, res) => {
  console.log('🏠 Sirviendo página principal (index)');
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.get('/index.html', (req, res) => {
  console.log('🏠 Sirviendo página principal via index.html');
  res.redirect('/index');
});

app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);

app.use('*', (req, res) => {
  console.log('❌ Ruta no encontrada:', req.originalUrl);
  res.redirect('/');
});

app.use((error, req, res, next) => {
  console.error('💥 Error no manejado:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor' 
  });
});

app.listen(config.port, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${config.port}`);
  console.log(`🏠 Página principal: http://localhost:${config.port}/ (PÚBLICA)`);
  console.log(`🔑 Login: http://localhost:${config.port}/login (PÚBLICA)`);
  console.log(`📊 Dashboard: http://localhost:${config.port}/dashboard (PROTEGIDA)`);
  console.log('🛡️ SISTEMA DE RUTAS CONFIGURADO CORRECTAMENTE');
});