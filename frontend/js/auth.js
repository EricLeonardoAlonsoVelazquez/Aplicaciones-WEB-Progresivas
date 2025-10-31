// auth.js
const API_BASE_URL = '/api/auth';

class AuthController {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.messageContainer = document.getElementById('messageContainer');
        this.messageText = document.getElementById('messageText');
        this.init();
    }

    init() {
        console.log('🔐 Inicializando controlador de autenticación...');
        
        // Verificar primero si ya está autenticado (sincronizado)
        this.checkIfAlreadyAuthenticated();
        
        // Luego inicializar event listeners
        this.initEventListeners();
    }

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
    }

    async checkIfAlreadyAuthenticated() {
        console.log('🔍 Verificando autenticación previa...');
        
        // Verificar tanto localStorage como servidor
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        
        console.log('📊 Estado LOCAL - Token:', !!token, 'Usuario:', !!user);
        
        if (token && user) {
            console.log('🔄 Credenciales locales encontradas, verificando con servidor...');
            const isValid = await this.verifyTokenWithServer(token);
            if (isValid) {
                console.log('✅ Token válido, redirigiendo a dashboard...');
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 500);
                return;
            }
        }
        
        // Si no hay credenciales locales o son inválidas, verificar con servidor
        console.log('🔄 Verificando autenticación con servidor...');
        const serverAuth = await this.verifyServerAuthentication();
        if (serverAuth) {
            console.log('✅ Servidor reporta autenticado, redirigiendo a dashboard...');
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 500);
        }
    }

    async verifyServerAuthentication() {
        try {
            const response = await fetch(`${API_BASE_URL}/verify`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.user && result.token) {
                    console.log('✅ Servidor reporta usuario autenticado');
                    this.syncAuthData(result.token, result.user);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error verificando autenticación con servidor:', error);
            return false;
        }
    }

    async verifyTokenWithServer(token) {
        try {
            const response = await fetch(`${API_BASE_URL}/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            return response.ok;
        } catch (error) {
            console.error('Error verificando token:', error);
            return false;
        }
    }

    syncAuthData(token, user) {
        try {
            console.log('🔄 Sincronizando datos de autenticación...');
            
            if (token) {
                localStorage.setItem('authToken', token);
                console.log('✅ Token guardado en localStorage');
            }
            
            if (user) {
                const userToSave = {
                    id: user.id || user._id,
                    name: user.name || 'Usuario',
                    email: user.email || '',
                    lastAccess: new Date().toISOString()
                };
                
                localStorage.setItem('user', JSON.stringify(userToSave));
                console.log('✅ Usuario guardado en localStorage:', userToSave);
            }
        } catch (error) {
            console.error('❌ Error sincronizando datos:', error);
        }
    }

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
            const result = await this.login(email, password);
            
            if (result.success) {
                this.showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 1000);
            } else {
                this.showMessage(result.message || 'Error en el login', 'error');
                this.setButtonLoading(loginBtn, false, 'Iniciar Sesión');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error de conexión. Intenta nuevamente.', 'error');
            this.setButtonLoading(loginBtn, false, 'Iniciar Sesión');
        }
    }

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
            const result = await this.register(name, email, password);
            
            if (result.success) {
                this.showMessage('¡Registro exitoso! Redirigiendo...', 'success');
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 1000);
            } else {
                this.showMessage(result.message || 'Error en el registro', 'error');
                this.setButtonLoading(registerBtn, false, 'Registrarse');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error de conexión. Intenta nuevamente.', 'error');
            this.setButtonLoading(registerBtn, false, 'Registrarse');
        }
    }

    async login(email, password) {
        try {
            console.log('🔐 Enviando solicitud de login...', email);
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
            console.log('📊 Respuesta completa:', result);
            
            if (result.success) {
                // Sincronizar datos con localStorage
                this.syncAuthData(result.token, result.user);
            }
            
            return result;
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'Error de conexión con el servidor'
            };
        }
    }

    async register(name, email, password) {
        try {
            console.log('📝 Enviando solicitud de registro...', email);
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
            console.log('📊 Respuesta completa:', result);
            
            if (result.success) {
                // Sincronizar datos con localStorage
                this.syncAuthData(result.token, result.user);
            }
            
            return result;
        } catch (error) {
            console.error('Register error:', error);
            return {
                success: false,
                message: 'Error de conexión con el servidor'
            };
        }
    }

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
    }

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
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
        }
    }
    
    hideError(elementId) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = '';
        }
    }
    
    showMessage(message, type) {
        if (this.messageText && this.messageContainer) {
            this.messageText.textContent = message;
            this.messageContainer.className = 'message-container';
            this.messageContainer.classList.add(type);
            this.messageContainer.classList.remove('hidden');
        }
    }
    
    hideMessage() {
        if (this.messageContainer) {
            this.messageContainer.classList.add('hidden');
        }
    }

    setButtonLoading(button, loading, text) {
        if (button) {
            const btnText = button.querySelector('.btn-text');
            const btnIcon = button.querySelector('.btn-icon');
            
            button.disabled = loading;
            
            if (btnText) {
                btnText.textContent = text;
            }
            
            if (btnIcon) {
                btnIcon.style.display = loading ? 'none' : 'inline-block';
            }
        }
    }

    switchToLogin() {
        const loginContainer = document.querySelector('.login-container');
        const registerContainer = document.querySelector('.register-container');
        if (loginContainer && registerContainer) {
            registerContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
        }
    }

    switchToRegister() {
        const loginContainer = document.querySelector('.login-container');
        const registerContainer = document.querySelector('.register-container');
        if (loginContainer && registerContainer) {
            loginContainer.classList.add('hidden');
            registerContainer.classList.remove('hidden');
        }
    }
}

// Inicialización mejorada
console.log('🔧 Inicializando sistema de autenticación...');

if (window.AppShell && typeof window.AppShell.onAppReady === 'function') {
    window.AppShell.onAppReady(() => {
        console.log('✅ AppShell listo, inicializando auth...');
        new AuthController();
    });
} else {
    console.log('⚠️ AppShell no disponible, usando inicialización directa');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new AuthController();
        });
    } else {
        new AuthController();
    }
}