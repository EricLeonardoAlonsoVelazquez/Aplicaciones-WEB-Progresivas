const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const config = require('../config/config');

const extractToken = (req) => {
  console.log('🍪 Cookies en middleware:', req.cookies);
  console.log('📨 Authorization header:', req.headers.authorization);
  
  if (req.cookies && req.cookies.authToken) {
    console.log('✅ Token encontrado en cookies');
    return req.cookies.authToken;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('✅ Token encontrado en headers');
    return authHeader.substring(7);
  }
  
  console.log('❌ No se encontró token');
  return null;
};

const authenticateToken = async (req, res, next) => {
  const token = extractToken(req);

  console.log('🔐 Verificando token para API:', req.path);

  if (!token) {
    console.log('❌ Token no proporcionado');
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido',
      code: 'TOKEN_REQUIRED'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    console.log('✅ Token válido para usuario:', decoded.userId);
    
    const user = await userService.findById(decoded.userId);
    
    if (!user) {
      console.log('❌ Usuario no encontrado para token válido');
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    req.user = user.toJSON();
    next();
  } catch (error) {
    console.error('❌ Error verificando token:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Token inválido',
      code: 'TOKEN_INVALID'
    });
  }
};

const generateToken = (userId) => {
  return jwt.sign(
    { 
      userId: userId,
      iat: Math.floor(Date.now() / 1000) 
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

const setAuthCookie = (res, token) => {
  console.log('🍪 Estableciendo cookie authToken');
  res.cookie('authToken', token, {
    httpOnly: false, 
    secure: false, 
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, 
    path: '/' 
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie('authToken');
};

module.exports = {
  authenticateToken,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  extractToken
};