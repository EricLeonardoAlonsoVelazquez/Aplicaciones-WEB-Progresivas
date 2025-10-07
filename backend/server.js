const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas de API
app.use('/api/auth', authRoutes);

// Ruta para el dashboard
app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Ruta principal - redirigir al login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Ruta para login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'login.html'));
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Ruta no encontrada' 
  });
});

app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor' 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`Login: http://localhost:${PORT}/login`);
  console.log(`Dashboard: http://localhost:${PORT}/index`);
});