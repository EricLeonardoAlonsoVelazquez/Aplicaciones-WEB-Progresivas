// services/userService.js
const User = require('../models/User');
const { db } = require('../config/firebase');

class UserService {
  async createUser(userData) {
    try {
      const user = new User(userData);
      
      // Validar datos del usuario
      const validationErrors = user.validate();
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      await user.hashPassword();
      
      const userRef = db.collection('users').doc();
      user.id = userRef.id;
      
      const userDataToSave = {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        creationDate: user.creationDate,
        lastAccess: user.lastAccess
      };
      
      await userRef.set(userDataToSave);
      return user.toJSON();
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Error creating user: ' + error.message);
    }
  }

  async findByEmail(email) {
    try {
      if (!email || email.trim().length === 0) {
        throw new Error('Email es requerido');
      }

      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('email', '==', email).get();
      
      if (snapshot.empty) {
        return null;
      }
      
      let userData;
      snapshot.forEach(doc => {
        userData = doc.data();
      });
      
      return new User(userData);
    } catch (error) {
      console.error('Error finding user by email:', error);
      
      if (error.code === 5 || error.message.includes('NOT_FOUND')) {
        return null;
      }
      
      throw new Error('Error finding user: ' + error.message);
    }
  }

  async findById(id) {
    try {
      if (!id || id.trim().length === 0) {
        throw new Error('ID es requerido');
      }

      const userRef = db.collection('users').doc(id);
      const doc = await userRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      return new User(doc.data());
    } catch (error) {
      console.error('Error finding user by ID:', error);
      
      if (error.code === 5 || error.message.includes('NOT_FOUND')) {
        return null;
      }
      
      throw new Error('Error finding user: ' + error.message);
    }
  }

  async updateLastAccess(userId) {
    try {
      if (!userId || userId.trim().length === 0) {
        throw new Error('User ID es requerido');
      }

      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        lastAccess: new Date()
      });
    } catch (error) {
      console.error('Error updating last access:', error);
      throw new Error('Error updating last access: ' + error.message);
    }
  }

  // Validaciones de negocio
  async validateUserRegistration(userData) {
    const errors = [];

    if (!userData.name || !userData.email || !userData.password) {
      errors.push('Todos los campos son requeridos');
    }

    if (userData.password && userData.password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    // Verificar si el usuario ya existe
    if (userData.email) {
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        errors.push('El usuario ya existe');
      }
    }

    return errors;
  }

  async validateLoginCredentials(email, password) {
    const errors = [];

    if (!email || !password) {
      errors.push('Email y contraseña son requeridos');
    }

    const user = await this.findByEmail(email);
    if (!user) {
      errors.push('Credenciales inválidas');
      return { errors, user: null };
    }

    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      errors.push('Credenciales inválidas');
    }

    return { errors, user };
  }
}

module.exports = new UserService();