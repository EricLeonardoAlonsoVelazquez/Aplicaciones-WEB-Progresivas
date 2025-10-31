// index.js
class ProtectedApp {
    constructor() {
        this.isInitialized = false;
        this.authChecked = false;
        this.redirecting = false;
        this.init();
    }

    init() {
        console.log('🚀 Inicializando aplicación protegida...');
        
        if (window.AppShell && typeof window.AppShell.onAppReady === 'function') {
            console.log('✅ Usando AppShell para inicialización');
            window.AppShell.onAppReady(() => {
                console.log('🎉 AppReady recibido - Verificando autenticación');
                this.verifyAndInitialize();
            });
        } else {
            console.log('⚠️ AppShell no disponible, usando inicialización directa');
            this.initializeWithFallback();
        }
    }

    initializeWithFallback() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('📄 DOMContentLoaded (fallback)');
                this.verifyAndInitialize();
            });
        } else {
            console.log('📄 DOM ya listo (fallback)');
            this.verifyAndInitialize();
        }
    }

    async verifyAndInitialize() {
        if (this.authChecked || this.redirecting) {
            console.log('🔁 Verificación ya en progreso, omitiendo...');
            return;
        }

        this.authChecked = true;
        console.log('🔐 Iniciando verificación de autenticación...');

        try {
            const isAuthenticated = await this.verifyAuthentication();
            
            if (isAuthenticated) {
                console.log('✅ Usuario autenticado, inicializando aplicación...');
                await this.initializeApp();
            } else {
                console.log('❌ Usuario no autenticado, mostrando página pública...');
                await this.initializePublicApp();
            }
        } catch (error) {
            console.error('💥 Error en verificación:', error);
            // En caso de error, mostrar página pública
            await this.initializePublicApp();
        }
    }

    async verifyAuthentication() {
        console.log('🔍 Verificando estado de autenticación...');
        
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        
        console.log('📊 Estado LOCAL - Token:', !!token, 'Usuario:', !!user);
        
        // PRIMERO: Verificación local rápida
        if (!token || !user) {
            console.log('❌ Faltan credenciales en localStorage');
            return false;
        }

        // SEGUNDO: Verificación local del token
        const localValid = this.verifyLocalAuthentication();
        if (!localValid) {
            console.log('❌ Token inválido localmente');
            return false;
        }

        // TERCERO: Intentar verificación con servidor (pero no bloquear si falla)
        try {
            const serverValid = await this.verifyTokenWithServer(token);
            return serverValid;
        } catch (error) {
            console.warn('⚠️ Error en verificación con servidor, usando verificación local:', error);
            // Si falla la verificación con servidor, confiar en la verificación local
            return true;
        }
    }

    verifyLocalAuthentication() {
        try {
            console.log('🔍 Realizando verificación local del token...');
            
            const token = localStorage.getItem('authToken');
            const user = localStorage.getItem('user');
            
            if (!token || !user) {
                return false;
            }
            
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
    }

    async verifyTokenWithServer(token) {
        console.log('🔍 Verificando token con servidor...');
        
        try {
            const response = await fetch(`/api/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            console.log('📨 Respuesta de verificación:', response.status, response.statusText);
            
            // Verificar si la respuesta es JSON válido
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('⚠️ Respuesta no es JSON, posible error 404:', await response.text());
                throw new Error('Endpoint no disponible');
            }
            
            if (response.status === 401 || response.status === 403) {
                console.log('❌ Token inválido o expirado en servidor');
                this.handleInvalidToken();
                return false;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📊 Resultado de verificación:', result);
            
            if (result.success) {
                console.log('✅ Token verificado correctamente con servidor');
                if (result.user) {
                    localStorage.setItem('user', JSON.stringify(result.user));
                }
                return true;
            } else {
                console.log('❌ Token inválido según servidor');
                this.handleInvalidToken();
                return false;
            }
        } catch (error) {
            console.error('❌ Error verificando token con servidor:', error);
            // Propagar el error para manejo en nivel superior
            throw error;
        }
    }

    handleInvalidToken() {
        console.log('🗑️ Limpiando datos de autenticación inválidos');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Intentar limpiar cookie del servidor (pero no bloquear si falla)
        fetch(`/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        }).catch(err => console.log('⚠️ Error al limpiar cookie del servidor:', err));
    }

    async initializeApp() {
        if (this.isInitialized) {
            console.log('🔁 Aplicación ya inicializada, omitiendo...');
            return;
        }

        console.log('🏁 Inicializando aplicación index para usuario autenticado...');
        
        try {
            this.initEventListeners();
            this.initUI();
            this.updateUIWithUserInfo();
            
            this.isInitialized = true;
            console.log('✅ Aplicación index inicializada completamente para usuario autenticado');
        } catch (error) {
            console.error('💥 Error inicializando aplicación:', error);
        }
    }

    async initializePublicApp() {
        if (this.isInitialized) {
            console.log('🔁 Aplicación pública ya inicializada, omitiendo...');
            return;
        }

        console.log('🏁 Inicializando aplicación index pública...');
        
        try {
            this.initEventListeners();
            this.initUI();
            this.updateUIWithUserInfo(); // También actualiza UI para usuarios no autenticados
            
            this.isInitialized = true;
            console.log('✅ Aplicación index pública inicializada completamente');
        } catch (error) {
            console.error('💥 Error inicializando aplicación pública:', error);
        }
    }

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
    }

    initUI() {
        console.log('🎨 Inicializando UI...');
        this.updateFooterYear();
        this.initScrollAnimations();
        this.setupScrollHeader();
    }

    updateUIWithUserInfo() {
        console.log('👤 Actualizando información de usuario...');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const loginLink = document.getElementById('userMenuLink');
        const dashboardBtn = document.getElementById('dashboardBtn');
        
        console.log('🔍 Usuario en localStorage:', user);
        
        if (user && user.name) {
            console.log('✅ Usuario autenticado:', user.name);
            
            // Actualizar enlace de usuario en el header
            if (loginLink) {
                loginLink.textContent = user.name;
                loginLink.href = '#';
                loginLink.style.fontWeight = '500';
                this.createUserDropdown(loginLink, user);
            }
            
            // Mostrar botón del dashboard
            if (dashboardBtn) {
                dashboardBtn.style.display = 'inline-block';
            }
            
        } else {
            console.log('ℹ️ No hay usuario autenticado');
            
            // Restaurar enlace de login
            if (loginLink) {
                loginLink.textContent = 'Iniciar Sesión';
                loginLink.href = '/login';
                loginLink.style.fontWeight = '400';
                
                const existingDropdown = document.querySelector('.user-dropdown');
                if (existingDropdown) {
                    existingDropdown.remove();
                }
            }
            
            // Ocultar botón del dashboard
            if (dashboardBtn) {
                dashboardBtn.style.display = 'none';
            }
        }
    }

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
                <a href="/dashboard" class="dashboard-link">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
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
            console.log('🚪 Cerrando sesión...');
            
            try {
                await fetch(`/api/auth/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Error al cerrar sesión en servidor:', error);
            } finally {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/';
            }
        }
    }

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
    }

    setupScrollHeader() {
        console.log('📏 Configurando header con scroll...');
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const header = document.querySelector('header');
                if (window.scrollY > 100) {
                    header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
                    header.style.background = 'rgba(255, 255, 255, 0.98)';
                } else {
                    header.style.boxShadow = '0 5px 20px rgba(139, 0, 0, 0.2)';
                    header.style.background = 'rgba(255, 255, 255, 0.95)';
                }
            }, 10);
        });
    }

    updateFooterYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }
}

// Inicialización de la aplicación protegida
console.log('🔧 Iniciando aplicación index...');

// Evitar múltiples inicializaciones
if (!window.protectedAppInitialized) {
    window.protectedAppInitialized = true;
    new ProtectedApp();
} else {
    console.log('🔁 Aplicación ya inicializada, omitiendo...');
}

console.log('✅ index.js cargado completamente');