const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const path = require('path');
const fs = require('fs'); // Añade esto
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

// 🔥 CORRECCIÓN: Rutas estáticas - usa rutas absolutas dentro del contenedor
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/screenshots', express.static(path.join(__dirname, 'frontend/screenshots')));

// 🔥 DEBUG: Verificar estructura de archivos al iniciar
console.log('📍 Directorio actual:', __dirname);
console.log('📂 Contenido del directorio:', fs.readdirSync(__dirname));

const frontendPath = path.join(__dirname, 'frontend');
if (fs.existsSync(frontendPath)) {
  console.log('✅ Directorio frontend encontrado:', frontendPath);
  console.log('📁 Contenido de frontend:', fs.readdirSync(frontendPath));
} else {
  console.log('❌ Directorio frontend NO existe:', frontendPath);
}

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

// Función para servir archivos de forma segura
const serveFileSafe = (res, filePath, fallbackPath = null) => {
  try {
    if (fs.existsSync(filePath)) {
      console.log('✅ Sirviendo archivo:', filePath);
      return res.sendFile(filePath);
    } else if (fallbackPath && fs.existsSync(fallbackPath)) {
      console.log('🔄 Usando fallback:', fallbackPath);
      return res.sendFile(fallbackPath);
    } else {
      console.log('❌ Archivo no encontrado:', filePath);
      return res.status(404).send('Archivo no encontrado');
    }
  } catch (error) {
    console.log('💥 Error sirviendo archivo:', error.message);
    return res.status(500).send('Error interno del servidor');
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
    '/favicon.ico',
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
    const indexPath = path.join(__dirname, 'frontend', 'index.html');
    return serveFileSafe(res, indexPath);
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

// 🔥 CORRECCIÓN: Rutas para servir archivos HTML
app.get('/dashboard', (req, res) => {
  console.log('📊 Sirviendo dashboard para usuario:', req.user.email);
  const dashboardPath = path.join(__dirname, 'frontend', 'dashboard.html');
  serveFileSafe(res, dashboardPath);
});

app.get('/dashboard.html', (req, res) => {
  console.log('📊 Sirviendo dashboard via dashboard.html para usuario:', req.user.email);
  res.redirect('/dashboard');
});

app.get('/login', (req, res) => {
  console.log('🌐 Sirviendo página de login');
  const loginPath = path.join(__dirname, 'frontend', 'login.html');
  serveFileSafe(res, loginPath);
});

app.get('/index', (req, res) => {
  console.log('🏠 Sirviendo página principal (index)');
  const indexPath = path.join(__dirname, 'frontend', 'index.html');
  serveFileSafe(res, indexPath);
});

app.get('/index.html', (req, res) => {
  console.log('🏠 Sirviendo página principal via index.html');
  res.redirect('/index');
});

// Ruta para favicon.ico
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'frontend', 'favicon.ico');
  serveFileSafe(res, faviconPath, path.join(__dirname, 'frontend', 'icons', 'favicon.ico'));
});

app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  console.log('❌ Ruta no encontrada:', req.originalUrl);
  
  // Intentar servir como archivo estático primero
  const filePath = path.join(__dirname, 'frontend', req.path);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  
  // Si no existe, redirigir al index (SPA)
  const indexPath = path.join(__dirname, 'frontend', 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  
  res.status(404).send('Página no encontrada');
});

app.use((error, req, res, next) => {
  console.error('💥 Error no manejado:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor' 
  });
});

app.listen(config.port, '0.0.0.0', () => { // 🔥 Añade '0.0.0.0' para Render
  console.log(`🚀 Servidor ejecutándose en http://localhost:${config.port}`);
  console.log(`🏠 Página principal: http://localhost:${config.port}/ (PÚBLICA)`);
  console.log(`🔑 Login: http://localhost:${config.port}/login (PÚBLICA)`);
  console.log(`📊 Dashboard: http://localhost:${config.port}/dashboard (PROTEGIDA)`);
  console.log('🛡️ SISTEMA DE RUTAS CONFIGURADO CORRECTAMENTE');
});
