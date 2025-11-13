class Reading {
  constructor(readingData = {}) {
    this.id = readingData.id || '';
    this.email = readingData.email || '';
    this.fecha = readingData.fecha || new Date();
    this.humedadAire = readingData.humedadAire || 0;
    this.humedadSuelo = readingData.humedadSuelo || 0;
    this.temperatura = readingData.temperatura || 0;
  }

  validate() {
    const errors = [];

    if (!this.email || !this.validateEmail(this.email)) {
      errors.push('El email no es válido');
    }

    if (this.humedadAire < 0 || this.humedadAire > 100) {
      errors.push('La humedad del aire debe estar entre 0 y 100');
    }

    if (this.humedadSuelo < 0 || this.humedadSuelo > 100) {
      errors.push('La humedad del suelo debe estar entre 0 y 100');
    }

    if (this.temperatura < -50 || this.temperatura > 60) {
      errors.push('La temperatura debe estar entre -50 y 60°C');
    }

    return errors;
  }

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      fecha: this.fecha,
      humedadAire: this.humedadAire,
      humedadSuelo: this.humedadSuelo,
      temperatura: this.temperatura
    };
  }

  getFormattedDate() {
    return new Date(this.fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatus() {
    if (this.humedadSuelo < 20 || this.temperatura > 35) {
      return 'Crítico';
    } else if (this.humedadSuelo < 40 || this.temperatura > 30) {
      return 'Advertencia';
    } else {
      return 'Estable';
    }
  }
}

module.exports = Reading;