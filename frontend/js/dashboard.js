// dashboard.js
class DashboardApp {
    constructor() {
        this.isInitialized = false;
        this.redirectCount = 0;
        this.maxRedirects = 3;
        this.init();
    }

    init() {
        console.log('🚀 Inicializando Dashboard...');
        
        if (window.AppShell && typeof window.AppShell.onAppReady === 'function') {
            window.AppShell.onAppReady(() => {
                this.verifyAndInitialize();
            });
        } else {
            this.initializeWithFallback();
        }
    }

    initializeWithFallback() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.verifyAndInitialize();
            });
        } else {
            this.verifyAndInitialize();
        }
    }

    async verifyAndInitialize() {
        console.log('🔐 Verificando autenticación para dashboard...');
        
        try {
            const isAuthenticated = await this.verifyAuthentication();
            
            if (isAuthenticated) {
                console.log('✅ Usuario autenticado, inicializando dashboard...');
                this.initializeDashboard();
            } else {
                console.log('❌ Usuario no autenticado, redirigiendo a login...');
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('💥 Error en verificación:', error);
            this.redirectToLogin();
        }
    }

    async verifyAuthentication() {
        console.log('🔍 Buscando token de autenticación...');
        
        // Método 1: Buscar en cookies (para compatibilidad con el servidor)
        const cookieToken = this.getTokenFromCookies();
        
        // Método 2: Buscar en localStorage
        const localStorageToken = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        
        console.log('🍪 Token en cookies:', cookieToken ? 'Encontrado' : 'No encontrado');
        console.log('💾 Token en localStorage:', localStorageToken ? 'Encontrado' : 'No encontrado');
        console.log('👤 Usuario en localStorage:', user ? 'Encontrado' : 'No encontrado');

        // Usar el token de cookies como prioridad, si no existe usar localStorage
        const token = cookieToken || localStorageToken;
        
        if (!token) {
            console.log('❌ No se encontró ningún token de autenticación');
            return false;
        }

        // Si tenemos token pero no user data, intentar obtenerla del servidor
        if (token && !user) {
            console.log('🔄 Token encontrado pero sin datos de usuario, obteniendo información...');
            const userData = await this.getUserData(token);
            if (userData) {
                localStorage.setItem('user', JSON.stringify(userData));
            }
        }

        try {
            console.log('🔐 Verificando token con el servidor...');
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                console.log('✅ Token verificado correctamente por el servidor');
                return true;
            } else {
                console.log('❌ Token inválido según el servidor');
                // Limpiar tokens inválidos
                this.clearInvalidTokens();
                return false;
            }
        } catch (error) {
            console.error('🚨 Error en verificación con servidor:', error);
            
            // Si hay error de red pero tenemos token y user, permitir acceso
            // (modo offline/fallback)
            if (token && user) {
                console.log('⚠️  Error de conexión, usando autenticación local como fallback');
                return true;
            }
            
            this.clearInvalidTokens();
            return false;
        }
    }

    getTokenFromCookies() {
        try {
            const cookies = document.cookie.split(';');
            const tokenCookie = cookies.find(cookie => 
                cookie.trim().startsWith('authToken=')
            );
            
            if (tokenCookie) {
                const token = tokenCookie.split('=')[1];
                console.log('✅ Token encontrado en cookies');
                return token;
            }
            
            console.log('❌ Token no encontrado en cookies');
            return null;
        } catch (error) {
            console.error('🚨 Error leyendo cookies:', error);
            return null;
        }
    }

    async getUserData(token) {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const userData = await response.json();
                console.log('✅ Datos de usuario obtenidos:', userData);
                return userData;
            }
        } catch (error) {
            console.error('Error obteniendo datos de usuario:', error);
        }
        return null;
    }

    clearInvalidTokens() {
        console.log('🧹 Limpiando tokens inválidos...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // También limpiar cookie si es posible
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }

    redirectToLogin() {
        this.redirectCount++;
        
        if (this.redirectCount >= this.maxRedirects) {
            console.error('🔄 Bucle de redirección detectado! Deteniendo...');
            this.showAuthError();
            return;
        }
        
        console.log(`🔄 Redirección a login (intento ${this.redirectCount}/${this.maxRedirects})`);
        
        // Agregar parámetro para evitar caché
        const timestamp = new Date().getTime();
        window.location.href = `/login?redirect=${timestamp}&attempt=${this.redirectCount}`;
    }

    showAuthError() {
        // Mostrar mensaje de error al usuario
        const mainContent = document.querySelector('main') || document.body;
        const errorHtml = `
            <div class="auth-error" style="
                padding: 2rem;
                text-align: center;
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                margin: 2rem;
                color: #856404;
            ">
                <h2 style="color: #856404; margin-bottom: 1rem;">⚠️ Error de Autenticación</h2>
                <p style="margin-bottom: 1.5rem;">Ha ocurrido un problema al verificar tu sesión.</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button onclick="location.reload()" style="
                        padding: 0.5rem 1rem;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">
                        Reintentar
                    </button>
                    <button onclick="window.location.href='/login'" style="
                        padding: 0.5rem 1rem;
                        background: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">
                        Ir al Login
                    </button>
                </div>
            </div>
        `;
        
        mainContent.innerHTML = errorHtml;
    }

    initializeDashboard() {
        if (this.isInitialized) {
            console.log('⚠️  Dashboard ya estaba inicializado');
            return;
        }

        console.log('🏁 Inicializando dashboard...');
        this.initEventListeners();
        this.initUI();
        this.updateUIWithUserInfo();
        
        this.isInitialized = true;
        console.log('✅ Dashboard inicializado completamente');
    }

    initEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'logoutBtn' || e.target.id === 'userLogoutBtn' || 
                e.target.closest('#logoutBtn') || e.target.closest('#userLogoutBtn')) {
                e.preventDefault();
                this.handleLogout();
            }
        });

        // Debug específico para Chrome
        this.chromeDebug();
    }

    chromeDebug() {
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        if (isChrome) {
            console.log('🌐 Ejecutando en Chrome - Aplicando fixes específicos');
            console.log('🔍 Estado de cookies:', document.cookie);
            console.log('🔍 Estado de localStorage:', {
                authToken: localStorage.getItem('authToken') ? 'Presente' : 'Ausente',
                user: localStorage.getItem('user') ? 'Presente' : 'Ausente'
            });
        }
    }

    initUI() {
        this.updateFooterYear();
        this.initStatsAnimations();
    }

    updateUIWithUserInfo() {
        try {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            const loginLink = document.getElementById('userMenuLink');
            
            if (user && user.name && loginLink) {
                console.log('👤 Actualizando UI con información de usuario:', user.name);
                loginLink.textContent = user.name;
                loginLink.href = '#';
                loginLink.style.fontWeight = '500';
                this.createUserDropdown(loginLink, user);
            } else {
                console.log('❌ No se pudo obtener información del usuario para la UI');
            }
        } catch (error) {
            console.error('💥 Error actualizando UI con información de usuario:', error);
        }
    }

    createUserDropdown(loginLink, user) {
        const existingDropdown = document.querySelector('.user-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'user-dropdown';
        dropdownContainer.innerHTML = `
            <div class="user-menu">
                <span class="user-greeting">Hola, ${user.name}</span>
                <a href="/" class="dashboard-link">
                    <i class="fas fa-home"></i> Inicio
                </a>
                <button id="userLogoutBtn" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </button>
            </div>
        `;
        
        loginLink.parentNode.appendChild(dropdownContainer);
        
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            dropdownContainer.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target) && e.target !== loginLink) {
                dropdownContainer.classList.remove('active');
            }
        });
    }

    async handleLogout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
            } finally {
                this.clearInvalidTokens();
                window.location.href = '/';
            }
        }
    }

    initStatsAnimations() {
        // Animación simple para los números de estadísticas
        const statNumbers = document.querySelectorAll('.stat-number');
        statNumbers.forEach(stat => {
            const finalNumber = parseInt(stat.textContent);
            let current = 0;
            const increment = finalNumber / 50;
            const timer = setInterval(() => {
                current += increment;
                if (current >= finalNumber) {
                    stat.textContent = finalNumber;
                    clearInterval(timer);
                } else {
                    stat.textContent = Math.floor(current);
                }
            }, 30);
        });
    }

    updateFooterYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }
}

// Inicializar dashboard con manejo de errores
console.log('🔧 Iniciando aplicación dashboard...');

try {
    new DashboardApp();
} catch (error) {
    console.error('💥 Error crítico inicializando dashboard:', error);
    
    // Fallback: redirigir a login después de 3 segundos si hay error
    setTimeout(() => {
        window.location.href = '/login?error=init_failed';
    }, 3000);
}