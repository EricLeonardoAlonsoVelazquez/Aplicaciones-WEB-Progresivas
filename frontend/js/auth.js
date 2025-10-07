const API_BASE_URL = 'http://localhost:3000/api/auth';


// Servicio de autenticación
const authService = {
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    return await response.json();
  },

  async register(name, email, password) {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password })
    });
    
    return await response.json();
  },

  saveUserToLocalStorage(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUserFromLocalStorage() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  logout() {
    localStorage.removeItem('user');
  }
};

// Controlador de autenticación
const authController = {
  init() {
    this.loginForm = document.getElementById('loginForm');
    this.registerForm = document.getElementById('registerForm');
    this.messageContainer = document.getElementById('messageContainer');
    this.messageText = document.getElementById('messageText');
    
    // Verificar si ya está autenticado
    this.checkAuthentication();
    this.initEventListeners();
  },

  checkAuthentication() {
    const user = authService.getUserFromLocalStorage();
    if (user && window.location.pathname.includes('login')) {
      window.location.href = '/index';
    }
  },

  initEventListeners() {
    // Event listeners para los formularios
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    
    if (this.registerForm) {
      this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Event listeners para cambiar entre login y registro
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');

    if (showRegisterLink) {
      showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchToRegister();
        this.hideMessage();
      });
    }

    if (showLoginLink) {
      showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchToLogin();
        this.hideMessage();
      });
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    this.hideMessage();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!this.validateLoginForm(email, password)) {
      return;
    }
    
    const loginBtn = document.getElementById('loginBtn');
    this.setButtonLoading(loginBtn, true, 'Iniciando sesión...');
    
    try {
      const result = await authService.login(email, password);
      
      if (result.success) {
        this.showMessage('Login exitoso. Redirigiendo...', 'success');
        authService.saveUserToLocalStorage(result.user);
        
        setTimeout(() => {
          window.location.href = "/index";
        }, 1500);
      } else {
        this.showMessage(result.message || 'Error en el login', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showMessage('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
      this.setButtonLoading(loginBtn, false, 'Iniciar Sesión');
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    this.hideMessage();
    
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (!this.validateRegisterForm(name, email, password, confirmPassword)) {
      return;
    }
    
    const registerBtn = document.getElementById('registerBtn');
    this.setButtonLoading(registerBtn, true, 'Registrando...');
    
    try {
      const result = await authService.register(name, email, password);
      
      if (result.success) {
        this.showMessage('Cuenta creada exitosamente. Ya puedes iniciar sesión.', 'success');
        this.registerForm.reset();
        
        setTimeout(() => {
          this.switchToLogin();
        }, 2000);
      } else {
        this.showMessage(result.message || 'Error en el registro', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showMessage('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
      this.setButtonLoading(registerBtn, false, 'Registrarse');
    }
  },

  validateLoginForm(email, password) {
    let isValid = true;
    
    if (!this.validateEmail(email)) {
      this.showError('emailError', 'Por favor ingresa un correo válido');
      isValid = false;
    } else {
      this.hideError('emailError');
    }
    
    if (password.length < 6) {
      this.showError('passwordError', 'La contraseña debe tener al menos 6 caracteres');
      isValid = false;
    } else {
      this.hideError('passwordError');
    }
    
    return isValid;
  },

  validateRegisterForm(name, email, password, confirmPassword) {
    let isValid = true;
    
    if (name.length < 3) {
      this.showError('nameError', 'El nombre debe tener al menos 3 caracteres');
      isValid = false;
    } else {
      this.hideError('nameError');
    }
    
    if (!this.validateEmail(email)) {
      this.showError('regEmailError', 'Por favor ingresa un correo válido');
      isValid = false;
    } else {
      this.hideError('regEmailError');
    }
    
    if (password.length < 6) {
      this.showError('regPasswordError', 'La contraseña debe tener al menos 6 caracteres');
      isValid = false;
    } else {
      this.hideError('regPasswordError');
    }
    
    if (password !== confirmPassword) {
      this.showError('confirmPasswordError', 'Las contraseñas no coinciden');
      isValid = false;
    } else {
      this.hideError('confirmPasswordError');
    }
    
    return isValid;
  },

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
    }
  },
  
  hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = '';
    }
  },
  
  showMessage(message, type) {
    if (this.messageText && this.messageContainer) {
      this.messageText.textContent = message;
      this.messageContainer.className = 'message-container';
      this.messageContainer.classList.add(type);
      this.messageContainer.classList.remove('hidden');
    }
  },
  
  hideMessage() {
    if (this.messageContainer) {
      this.messageContainer.classList.add('hidden');
    }
  },

  setButtonLoading(button, loading, loadingText) {
    if (button) {
      button.disabled = loading;
      button.textContent = loadingText;
    }
  },

  switchToLogin() {
    const loginContainer = document.querySelector('.login-container');
    const registerContainer = document.querySelector('.register-container');
    if (loginContainer && registerContainer) {
      registerContainer.classList.add('hidden');
      loginContainer.classList.remove('hidden');
    }
  },

  switchToRegister() {
    const loginContainer = document.querySelector('.login-container');
    const registerContainer = document.querySelector('.register-container');
    if (loginContainer && registerContainer) {
      loginContainer.classList.add('hidden');
      registerContainer.classList.remove('hidden');
    }
  }
};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  authController.init();
});