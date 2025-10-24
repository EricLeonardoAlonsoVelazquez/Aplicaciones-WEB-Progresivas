const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Configuración CORS para Netlify
app.use(cors({
  origin: [
    'http://localhost', 
    'http://localhost:80', 
    'http://frontend',
    'https://tu-sitio.netlify.app', // Tu dominio de Netlify
    'https://*.netlify.app' // Para todos los subdominios de Netlify
  ],
  credentials: true
}));

app.use(cookieParser()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cargar configuración y módulos
const configPath = path.join(__dirname, '..', '..', 'config', 'config');
const config = require(configPath);

const authMiddlewarePath = path.join(__dirname, '..', '..', 'middleware', 'auth');
const { extractToken } = require(authMiddlewarePath);

const authRoutesPath = path.join(__dirname, '..', '..', 'routes', 'auth');
const authRoutes = require(authRoutesPath);

const verifyAuthentication = async (token) => {
  if (!token) return { authenticated: false, user: null };
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const userServicePath = path.join(__dirname, '..', '..', 'services', 'userService');
    const userService = require(userServicePath);
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
  
  console.log('🔍 Ruta solicitada en Netlify:', requestedPath);

  const publicRoutes = [
    '/.netlify/functions/server/login', 
    '/.netlify/functions/server/health', 
    '/.netlify/functions/server/manifest.json',
    '/.netlify/functions/server/service-worker.js',
    '/.netlify/functions/server/api/auth/login',
    '/.netlify/functions/server/api/auth/register'
  ];
  
  const publicStaticPaths = ['/css/', '/js/', '/icons/', '/img/'];
  
  const isPublicRoute = publicRoutes.includes(requestedPath) || 
                       publicStaticPaths.some(publicPath => requestedPath.startsWith(publicPath)) ||
                       requestedPath.startsWith('/.netlify/functions/server/api/auth/');
  
  if (requestedPath === '/.netlify/functions/server') {
    console.log('🏠 Ruta raíz de función solicitada');
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
    
    if (requestedPath === '/.netlify/functions/server/login' && req.method === 'GET') {
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
app.use(express.static(path.join(__dirname, '..', '..', '..', 'frontend'), {
  index: false
}));

// Rutas para servir páginas HTML
app.get('/.netlify/functions/server/login', (req, res) => {
  console.log('🌐 Sirviendo página de login desde Netlify');
  res.sendFile(path.join(__dirname, '..', '..', '..', 'frontend', 'login.html'));
});

app.get('/.netlify/functions/server/index', (req, res) => {
  console.log('📊 Sirviendo dashboard para usuario:', req.user.email);
  res.sendFile(path.join(__dirname, '..', '..', '..', 'frontend', 'index.html'));
});

app.get('/.netlify/functions/server/index.html', (req, res) => {
  console.log('📊 Sirviendo dashboard via index.html para usuario:', req.user.email);
  res.redirect('/.netlify/functions/server/index');
});

app.get('/.netlify/functions/server/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando correctamente en Netlify',
    timestamp: new Date().toISOString()
  });
});

// Rutas API
app.use('/.netlify/functions/server/api/auth', authRoutes);

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  console.log('❌ Ruta no encontrada en Netlify:', req.originalUrl);
  
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
  console.error('💥 Error no manejado en Netlify:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor' 
  });
});

module.exports.handler = serverless(app);

// Para desarrollo local con Netlify Dev
if (process.env.NETLIFY_DEV) {
  const PORT = process.env.PORT || 8888;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT} (Netlify Dev)`);
    console.log(`🏠 Ruta principal: http://localhost:${PORT}/.netlify/functions/server`);
    console.log(`🔑 Login: http://localhost:${PORT}/.netlify/functions/server/login`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/.netlify/functions/server/index`);
    console.log(`❤️  Health: http://localhost:${PORT}/.netlify/functions/server/health`);
  });
}
