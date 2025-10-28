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

// 🔥 CORRECCIÓN: Servir TODOS los archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// 🔥 CORRECCIÓN ESPECÍFICA para screenshots (si están en frontend/screenshots/)
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

app.use(async (req, res, next) => {
  const requestedPath = req.path;
  
  console.log('🔍 Ruta solicitada:', requestedPath);

  const publicRoutes = [
    '/login', 
    '/health', 
    '/manifest.json',
    '/service-worker.js',
    '/api/auth/login',
    '/api/auth/register'
  ];
  
  // 🔥 CORRECCIÓN: Agregar screenshots a rutas públicas
  const publicStaticPaths = ['/css/', '/js/', '/icons/', '/img/', '/screenshots/'];
  
  const isPublicRoute = publicRoutes.includes(requestedPath) || 
                       publicStaticPaths.some(publicPath => requestedPath.startsWith(publicPath)) ||
                       requestedPath.startsWith('/api/auth/');
  
  if (requestedPath === '/') {
    console.log('🏠 Ruta raíz solicitada');
    const token = extractToken(req);
    const authResult = await verifyAuthentication(token);
    
    if (authResult.authenticated) {
      console.log('✅ Usuario autenticado, redirigiendo a index');
      return res.redirect('/index');
    } else {
      console.log('❌ Usuario no autenticado, redirigiendo a login');
      return res.redirect('/login');
    }
  }
  
  if (isPublicRoute) {
    console.log('🌐 Ruta pública, acceso permitido');
    
    if (requestedPath === '/login' && req.method === 'GET') {
      const token = extractToken(req);
      const authResult = await verifyAuthentication(token);
      if (authResult.authenticated) {
        console.log('🔄 Usuario ya autenticado, redirigiendo a index');
        return res.redirect('/index');
      }
    }
    
    return next();
  }

  console.log('🛡️ Ruta requiere autenticación:', requestedPath);
  const token = extractToken(req);
  
  if (!token) {
    console.log('❌ No autenticado, redirigiendo a login');
    return res.redirect('/login');
  }

  const authResult = await verifyAuthentication(token);
  if (!authResult.authenticated) {
    console.log('❌ Token inválido o expirado, redirigiendo a login');
    res.clearCookie('authToken');
    return res.redirect('/login');
  }

  console.log('✅ Usuario autenticado correctamente:', authResult.user.email);
  req.user = authResult.user;
  next();
});

// 🔥 CORRECCIÓN: Ya no necesitas este static adicional
// app.use(express.static(path.join(__dirname, '../frontend'), {
//   index: false
// }));

app.get('/login', (req, res) => {
  console.log('🌐 Sirviendo página de login');
  res.sendFile(path.join(__dirname, '../frontend', 'login.html'));
});

app.get('/index', (req, res) => {
  console.log('📊 Sirviendo dashboard para usuario:', req.user.email);
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.get('/index.html', (req, res) => {
  console.log('📊 Sirviendo dashboard via index.html para usuario:', req.user.email);
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
  
  if (!req.originalUrl.includes('.') || req.originalUrl.endsWith('.html')) {
    const token = extractToken(req);
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        jwt.verify(token, config.jwt.secret);
        return res.redirect('/index');
      } catch (error) {
      }
    }
    return res.redirect('/login');
  }
  
  res.status(404).json({ 
    success: false, 
    message: 'Ruta no encontrada' 
  });
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
  console.log(`📱 Entorno: ${config.nodeEnv}`);
  console.log(`🏠 Ruta principal: http://localhost:${config.port}/ (redirige a index o login)`);
  console.log(`🔑 Login: http://localhost:${config.port}/login`);
  console.log(`📊 Dashboard: http://localhost:${config.port}/index (PROTEGIDO)`);
  console.log(`❤️  Health check: http://localhost:${config.port}/health`);
  console.log('🛡️  PROTECCIÓN COMPLETA ACTIVADA');
  console.log('📁 Archivos estáticos servidos desde: ../frontend/');
});
