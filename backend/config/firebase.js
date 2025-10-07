const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Ruta al archivo de configuración de Firebase
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

// Verificar si el archivo existe
if (!fs.existsSync(serviceAccountPath)) {
  console.error('ERROR: Archivo serviceAccountKey.json no encontrado');
  console.log('Por favor, descarga el archivo desde Firebase Console:');
  console.log('1. Ve a Firebase Console > Configuración del proyecto > Cuentas de servicio');
  console.log('2. Haz clic en "Generar nueva clave privada"');
  console.log('3. Guarda el archivo como serviceAccountKey.json en la carpeta backend/config/');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
  console.log('Firebase inicializado correctamente');
} catch (error) {
  console.error('Error inicializando Firebase:', error.message);
  process.exit(1);
}

const db = admin.firestore();
module.exports = { admin, db };