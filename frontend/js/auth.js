const API_BASE_URL = 'http://localhost:3000/api/auth';

const authService = {
  async login(email, password) {
    try {
      console.log('🔐 Enviando solicitud de login...');
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      
      console.log('📨 Respuesta recibida, status:', response.status);
      
      const result = await response.json();
      
      if (result.success) {
        this.saveToken(result.token);
        this.saveUserToLocalStorage(result.user);
        console.log('✅ Login exitoso, redirigiendo a index...');
        
        setTimeout(() => {
          window.location.href = "/index";
        }, 500);
      } else {
        console.log('❌ Error en login:', result.message);
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Error de conexión con el servidor'
      };
    }
  },

  async register(name, email, password) {
    try {
      console.log('📝 Enviando solicitud de registro...');
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include' 
      });
      
      console.log('📨 Respuesta recibida, status:', response.status);
      
      const result = await response.json();
      
      if (result.success) {
        this.saveToken(result.token);
        this.saveUserToLocalStorage(result.user);
        console.log('✅ Registro exitoso, redirigiendo a index...');
        
        setTimeout(() => {
          window.location.href = "/index";
        }, 500);
      } else {
        console.log('❌ Error en registro:', result.message);
      }
      
      return result;
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: 'Error de conexión con el servidor'
      };
    }
  },

  async logout() {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.removeToken();
      window.location.href = '/';
    }
  },

  saveToken(token) {
    localStorage.setItem('authToken', token);
    console.log('✅ Token guardado en localStorage');
  },

  getToken() {
    return localStorage.getItem('authToken');
  },

  removeToken() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    console.log('🗑️ Token removido de localStorage');
  },

  saveUserToLocalStorage(user) {
    localStorage.setItem('user', JSON.stringify(user));
    console.log('✅ Usuario guardado en localStorage:', user.name);
  },

  getUserFromLocalStorage() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

const authController = {
  init() {
    this.loginForm = document.getElementById('loginForm');
    this.registerForm = document.getElementById('registerForm');
    this.messageContainer = document.getElementById('messageContainer');
    this.messageText = document.getElementById('messageText');
    
    this.initEventListeners();
    
    console.log('🔐 Controlador de autenticación inicializado');
  },

  initEventListeners() {
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    
    if (this.registerForm) {
      this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

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
      
      if (!result.success) {
        this.showMessage(result.message || 'Error en el login', 'error');
        this.setButtonLoading(loginBtn, false, 'Iniciar Sesión');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showMessage('Error de conexión. Intenta nuevamente.', 'error');
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
      
      if (!result.success) {
        this.showMessage(result.message || 'Error en el registro', 'error');
        this.setButtonLoading(registerBtn, false, 'Registrarse');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showMessage('Error de conexión. Intenta nuevamente.', 'error');
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

  setButtonLoading(button, loading, text) {
    if (button) {
      const btnText = button.querySelector('.btn-text');
      const btnIcon = button.querySelector('.btn-icon');
      
      button.disabled = loading;
      
      if (btnText) {
        btnText.textContent = text;
      } else {
        button.textContent = text;
      }
      
      if (btnIcon) {
        btnIcon.style.display = loading ? 'none' : 'inline-block';
      }
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

document.addEventListener('DOMContentLoaded', function() {
  authController.init();
});