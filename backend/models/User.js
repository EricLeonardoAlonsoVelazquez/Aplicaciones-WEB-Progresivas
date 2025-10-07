// models/User.js
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.creationDate = data.creationDate || new Date();
    this.lastAccess = data.lastAccess || null;
  }

  async hashPassword() {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  async verifyPassword(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      creationDate: this.creationDate,
      lastAccess: this.lastAccess
    };
  }

  // Validaciones de datos del modelo
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('El nombre es requerido');
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push('El email no es válido');
    }

    if (!this.password || this.password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    return errors;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = User;