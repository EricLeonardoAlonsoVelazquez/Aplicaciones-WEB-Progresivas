const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ ERROR: Archivo serviceAccountKey.json no encontrado');
  console.log('📁 Ruta esperada:', serviceAccountPath);
  process.exit(1);
}

try {
  const serviceAccount = require(serviceAccountPath);
  
  if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
    console.error('❌ ERROR: Archivo serviceAccountKey.json inválido');
    console.log('⚠️  Asegúrate de que el archivo contenga project_id, private_key y client_email');
    process.exit(1);
  }

  console.log('✅ Archivo serviceAccountKey.json válido');
  console.log('📋 Project ID:', serviceAccount.project_id);
  console.log('📧 Client Email:', serviceAccount.client_email);

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
    console.log('🔥 Firebase inicializado correctamente');
  } else {
    console.log('ℹ️  Firebase ya estaba inicializado');
  }
  
} catch (error) {
  console.error('❌ Error cargando serviceAccountKey.json:', error.message);
  
  if (error.message.includes('Unexpected token')) {
    console.log('⚠️  El archivo JSON podría estar corrupto o mal formateado');
    console.log('📝 Verifica que el archivo sea un JSON válido');
  }
  
  process.exit(1);
}

const db = admin.firestore();

async function testFirestoreConnection() {
  try {
    console.log('🔍 Probando conexión a Firestore...');
    
    const testRef = db.collection('_test_connection');
    await testRef.doc('test').set({ 
      timestamp: new Date(),
      message: 'Conexión exitosa' 
    });
    
    await testRef.doc('test').delete();
    
    console.log('✅ Conexión a Firestore exitosa');
  } catch (error) {
    console.error('❌ Error conectando a Firestore:', error.message);
    console.log('🔧 Posibles soluciones:');
    console.log('   1. Verifica que Firestore esté habilitado en tu proyecto');
    console.log('   2. Verifica los permisos de la cuenta de servicio');
    console.log('   3. Verifica tu conexión a internet');
  }
}

testFirestoreConnection();

module.exports = { admin, db };