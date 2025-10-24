// Configuración de API - CORREGIDA para Render
const getApiBaseUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '/api/auth';
    } else {
        return '/api/auth';
    }
};

const API_BASE_URL = getApiBaseUrl();
console.log('🔧 API_BASE_URL configurado para:', API_BASE_URL);
console.log('📍 Hostname actual:', window.location.hostname);

const indexController = {
    init() {
        console.log('🚀 Inicializando indexController...');
        
        if (!this.verifyAuthentication()) {
            return;
        }
        
        if (window.AppShell && typeof window.AppShell.onAppReady === 'function') {
            console.log('✅ AppShell disponible, usando onAppReady');
            window.AppShell.onAppReady(() => {
                console.log('🎉 AppReady recibido - Inicializando aplicación');
                this.initializeApp();
            });
        } else {
            console.log('⚠️ AppShell no disponible, usando inicialización directa');
            this.initializeAppWithFallback();
        }
    },

    verifyAuthentication() {
        console.log('🔐 Verificando autenticación...');
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        
        console.log('🔍 Token en localStorage:', !!token);
        console.log('🔍 Usuario en localStorage:', !!user);
        
        // Si estamos en /index pero no hay token, verificar con servidor
        if (!token && window.location.pathname === '/index') {
            console.log('🔄 Verificando si hay sesión en el servidor...');
            return this.verifyServerSession();
        }
        
        if (!token || !user) {
            console.log('❌ No autenticado, redirigiendo a login...');
            this.redirectToLogin();
            return false;
        }
        
        return true;
    },

    async verifyServerSession() {
        try {
            console.log('🔍 Verificando sesión en servidor...');
            const response = await fetch(`${API_BASE_URL}/me`, {
                method: 'GET',
                credentials: 'include'
            });
            
            console.log('📨 Respuesta de verificación servidor:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.user) {
                    console.log('✅ Sesión encontrada en servidor, sincronizando...');
                    // El servidor tiene una sesión válida, sincronizar
                    this.syncWithServerSession(result);
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ Error verificando sesión servidor:', error);
        }
        
        // No hay sesión válida en el servidor
        console.log('❌ No hay sesión válida en servidor');
        this.redirectToLogin();
        return false;
    },

    syncWithServerSession(serverData) {
        console.log('🔄 Sincronizando con sesión del servidor...');
        // Guardar datos en localStorage para consistencia
        if (serverData.user) {
            localStorage.setItem('user', JSON.stringify(serverData.user));
        }
        if (serverData.token) {
            localStorage.setItem('authToken', serverData.token);
        } else {
            // Si no hay token en la respuesta, crear uno simbólico
            localStorage.setItem('authToken', 'session-active');
        }
        console.log('✅ Sincronización completada');
    },

    verifyLocalAuthentication() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        
        if (!token || !user) {
            this.handleInvalidToken();
            return false;
        }
        
        // Si el token es simbólico (de sincronización), considerar válido
        if (token === 'session-active') {
            console.log('✅ Sesión activa (sincronizada con servidor)');
            return true;
        }
        
        try {
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
                throw new Error('Formato de token inválido');
            }
            
            const payload = JSON.parse(atob(tokenParts[1]));
            const now = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < now) {
                console.log('❌ Token expirado localmente');
                this.handleInvalidToken();
                return false;
            }
            
            console.log('✅ Verificación local exitosa');
            return true;
        } catch (error) {
            console.error('❌ Error en verificación local:', error);
            this.handleInvalidToken();
            return false;
        }
    },

    handleInvalidToken() {
        console.log('🗑️ Limpiando datos de autenticación inválidos');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        }).catch(err => console.log('⚠️ Error al limpiar cookie del servidor:', err));
        
        this.redirectToLogin();
    },

    redirectToLogin() {
        console.log('🔄 Redirigiendo a login...');
        window.location.replace('/login');
    },

    initializeAppWithFallback() {
        console.log('🔄 Usando fallback de inicialización');
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('📄 DOMContentLoaded (fallback)');
                this.initializeApp();
            });
        } else {
            console.log('📄 DOM ya listo (fallback)');
            this.initializeApp();
        }
    },

    initializeApp() {
        console.log('🏁 Inicializando aplicación index...');
        
        if (!this.verifyLocalAuthentication()) {
            return;
        }
        
        this.initEventListeners();
        this.initUI();
        this.initSmoothScroll();
        this.updateUIWithUserInfo();
        this.setupScrollHeader();
        console.log('✅ Aplicación index inicializada completamente');
    },

    initEventListeners() {
        console.log('🔗 Configurando event listeners...');
        
        document.addEventListener('click', (e) => {
            if (e.target.id === 'logoutBtn' || e.target.id === 'userLogoutBtn' || 
                e.target.closest('#logoutBtn') || e.target.closest('#userLogoutBtn')) {
                e.preventDefault();
                this.handleLogout();
            }
        });

        const navLinks = document.querySelectorAll('nav a[href^="#"]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        const heroBtn = document.querySelector('.hero .btn-primary');
        if (heroBtn) {
            heroBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const proyectoSection = document.getElementById('proyecto');
                if (proyectoSection) {
                    proyectoSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        }

        const footerLinks = document.querySelectorAll('.footer-links a[href^="#"]');
        footerLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const headerHeight = document.querySelector('header').offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });

        window.addEventListener('beforeunload', () => {
            console.log('🔒 Cerrando aplicación protegida...');
        });
    },

    initUI() {
        console.log('🎨 Inicializando UI...');
        this.updateFooterYear();
        this.initScrollAnimations();
    },

    updateUIWithUserInfo() {
        console.log('👤 Actualizando información de usuario...');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const loginLink = document.getElementById('userMenuLink');
        
        console.log('🔍 Usuario en localStorage:', user);
        
        if (user && user.name && loginLink) {
            console.log('✅ Mostrando información de usuario:', user.name);
            
            loginLink.textContent = user.name;
            loginLink.href = '#';
            loginLink.style.fontWeight = '500';
            
            this.createUserDropdown(loginLink, user);
        } else if (loginLink) {
            console.log('ℹ️ No hay usuario, mostrando "Iniciar Sesión"');
            loginLink.textContent = 'Iniciar Sesión';
            loginLink.href = '/login';
            loginLink.style.fontWeight = '400';
            
            const existingDropdown = document.querySelector('.user-dropdown');
            if (existingDropdown) {
                existingDropdown.remove();
            }
        }
    },

    createUserDropdown(loginLink, user) {
        console.log('📋 Creando dropdown de usuario...');
        
        const existingDropdown = document.querySelector('.user-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'user-dropdown';
        dropdownContainer.innerHTML = `
            <div class="user-menu">
                <span class="user-greeting">Hola, ${user.name}</span>
                <button id="userLogoutBtn" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </button>
            </div>
        `;
        
        loginLink.parentNode.appendChild(dropdownContainer);
        
        const userLogoutBtn = document.getElementById('userLogoutBtn');
        if (userLogoutBtn) {
            userLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
        
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            dropdownContainer.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target) && e.target !== loginLink) {
                dropdownContainer.classList.remove('active');
            }
        });
    },

    async handleLogout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            console.log('🚪 Cerrando sesión...');
            
            try {
                const result = await fetch(`${API_BASE_URL}/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
                
                console.log('✅ Sesión cerrada en servidor');
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
                
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
    },

    initSmoothScroll() {
        console.log('🔄 Configurando scroll suave...');
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const headerHeight = document.querySelector('header').offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    },

    initScrollAnimations() {
        console.log('🎭 Configurando animaciones de scroll...');
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        document.querySelectorAll('.card, .benefit-item, .audience-item').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    },

    setupScrollHeader() {
        console.log('📏 Configurando header con scroll...');
        window.addEventListener('scroll', () => {
            const header = document.querySelector('header');
            if (window.scrollY > 100) {
                header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
                header.style.background = 'rgba(255, 255, 255, 0.98)';
            } else {
                header.style.boxShadow = '0 5px 20px rgba(139, 0, 0, 0.2)';
                header.style.background = 'rgba(255, 255, 255, 0.95)';
            }
        });
    },

    updateFooterYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }
};

// Inicialización de la aplicación protegida
console.log('🔧 Iniciando aplicación index protegida...');

function initializeProtectedApp() {
    console.log('📄 Inicializando aplicación protegida...');
    
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    console.log('🔍 Estado de autenticación - Token:', !!token, 'Usuario:', !!user);
    console.log('📍 Ruta actual:', window.location.pathname);
    
    // Si estamos en login pero tenemos token, redirigir a index
    if ((token && user) && window.location.pathname === '/login') {
        console.log('✅ Usuario autenticado en login, redirigiendo a index...');
        window.location.replace('/index');
        return;
    }
    
    // Si estamos en index pero no tenemos token, verificar autenticación
    if ((!token || !user) && window.location.pathname === '/index') {
        console.log('❌ No autenticado en index, verificando...');
        indexController.verifyAuthentication();
        return;
    }
    
    // Solo inicializar si estamos autenticados y en la ruta correcta
    if (token && user && window.location.pathname === '/index') {
        console.log('✅ Usuario autenticado, inicializando aplicación...');
        indexController.init();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeProtectedApp);
} else {
    initializeProtectedApp();
}

// Verificación de seguridad adicional
setTimeout(() => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if ((!token || !user) && window.location.pathname === '/index') {
        console.log('⏰ Timeout de seguridad - Redirigiendo a login');
        window.location.replace('/login');
    }
}, 3000);

window.addEventListener('load', () => {
    console.log('🛡️ Aplicación cargada - Verificación final');
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if ((!token || !user) && window.location.pathname === '/index') {
        console.log('🚫 Acceso no autorizado detectado después de carga');
        window.location.replace('/login');
    }
});

console.log('✅ index.js cargado completamente - VERSIÓN CORREGIDA SIN BUCLE');
