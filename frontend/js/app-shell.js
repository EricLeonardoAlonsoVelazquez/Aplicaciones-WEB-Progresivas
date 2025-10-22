console.log('🔧 Cargando App Shell...');

class AppShell {
    constructor() {
        this.isInitialized = false;
        this.isAuthenticated = null; 
        console.log('🏗️ Constructor App Shell llamado');
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('🚀 Inicializando App Shell...');
        this.setupAppShell();
        await this.registerServiceWorker();
        await this.checkAuthentication(); 
        this.isInitialized = true;
        
        console.log('✅ App Shell inicializado correctamente');
    }

    async checkAuthentication() {
        try {
            console.log('🔐 Verificando estado de autenticación...');

            const token = localStorage.getItem('authToken');
            
            if (!token) {
                console.log('❌ No hay token encontrado');
                this.isAuthenticated = false;
                return false;
            }

            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                console.log('✅ Usuario autenticado');
                this.isAuthenticated = true;
                return true;
            } else {
                console.log('❌ Token inválido o expirado');
                localStorage.removeItem('authToken');
                this.isAuthenticated = false;
                return false;
            }
        } catch (error) {
            console.log('⚠️ Error verificando autenticación:', error);
            this.isAuthenticated = false;
            return false;
        }
    }

    async handleRouteRedirection() {
        const currentPath = window.location.pathname;
        console.log('📍 Ruta actual:', currentPath);
        
        if (currentPath === '/' || currentPath === '/index.html') {
            console.log('🔄 Procesando redirección desde raíz...');
            
            if (this.isAuthenticated) {
                console.log('✅ Autenticado - redirigiendo a /index');
                window.location.href = '/index';
            } else {
                console.log('❌ No autenticado - redirigiendo a /login');
                window.location.href = '/login';
            }
            return true;
        }
        
        return false; 
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('✅ Service Worker registrado:', registration.scope);
                
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data && event.data.type === 'AUTH_CHECK') {
                        this.handleAuthMessage(event.data);
                    }
                });
                
                return registration;
            } catch (error) {
                console.log('❌ Service Worker falló:', error);
            }
        }
        return null;
    }

    handleAuthMessage(data) {
        console.log('📨 Mensaje de auth recibido:', data);
        if (data.action === 'redirect' && data.path) {
            window.location.href = data.path;
        }
    }

    setupAppShell() {
        this.createLoadingScreen();
        this.handleAppLoad();
    }

    createLoadingScreen() {
        if (document.getElementById('appLoading')) return;

        const loadingHTML = `
            <div class="app-loading" id="appLoading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Cargando Arbored...</div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', loadingHTML);
        this.injectCriticalCSS();
    }

    injectCriticalCSS() {
        if (document.getElementById('app-shell-css')) return;

        const criticalCSS = `
            <style id="app-shell-css">
                .app-loading {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #8B0000 0%, #B22222 50%, #DC143C 100%);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    transition: opacity 0.5s ease;
                }
                
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255,255,255,0.3);
                    border-top: 3px solid white;
                    border-radius: 50%;
                    animation: appShellSpin 1s linear infinite;
                    margin-bottom: 15px;
                }
                
                .loading-text {
                    color: white;
                    font-family: 'Poppins', sans-serif;
                    font-size: 16px;
                    font-weight: 300;
                }
                
                .app-content {
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .app-content.loaded {
                    opacity: 1;
                }
                
                @keyframes appShellSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* Estilos para redirección */
                .redirect-message {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                    z-index: 10000;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', criticalCSS);
    }

    handleAppLoad() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.showAppContent();
            });
        } else {
            this.showAppContent();
        }
    }

    async showAppContent() {
        const appLoading = document.getElementById('appLoading');
        const mainContent = document.querySelector('main') || document.body;
        
        const redirected = await this.handleRouteRedirection();
        if (redirected) {
            console.log('🔄 Redirección en proceso, manteniendo loading screen');
            
            if (appLoading) {
                const redirectText = this.isAuthenticated ? 
                    'Redirigiendo al dashboard...' : 
                    'Redirigiendo al login...';
                
                const loadingText = appLoading.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = redirectText;
                }
            }
            return;
        }
        
        if (mainContent && !mainContent.classList.contains('app-content')) {
            mainContent.classList.add('app-content');
        }
        
        setTimeout(() => {
            if (appLoading) {
                appLoading.style.opacity = '0';
                setTimeout(() => {
                    appLoading.remove();
                    if (mainContent) {
                        mainContent.classList.add('loaded');
                    }
                    this.emitAppReady();
                }, 500);
            } else {
                this.emitAppReady();
            }
        }, 800);
    }

    emitAppReady() {
        console.log('🎉 App Shell completamente cargado - emitiendo evento');
        const event = new CustomEvent('appReady', {
            detail: { 
                timestamp: new Date(),
                authenticated: this.isAuthenticated
            }
        });
        window.dispatchEvent(event);
    }

    onAppReady(callback) {
        console.log('📞 onAppReady llamado');
        if (this.isInitialized && document.readyState === 'complete') {
            console.log('✅ App ya inicializado, ejecutando callback inmediatamente');
            setTimeout(() => callback({ detail: { authenticated: this.isAuthenticated } }), 100);
        } else {
            console.log('⏳ Esperando evento appReady...');
            window.addEventListener('appReady', callback);
        }
    }

    async verifyAuth() {
        return await this.checkAuthentication();
    }

    async redirectBasedOnAuth() {
        return await this.handleRouteRedirection();
    }
}

console.log('🔨 Instanciando App Shell...');
try {
    const appShell = new AppShell();
    window.AppShell = appShell;
    console.log('✅ App Shell asignado a window.AppShell:', !!window.AppShell);
    console.log('✅ onAppReady disponible:', typeof window.AppShell.onAppReady === 'function');
} catch (error) {
    console.error('❌ Error instanciando App Shell:', error);
    window.AppShell = {
        onAppReady: (callback) => {
            console.log('🔄 Usando fallback onAppReady');
            if (document.readyState === 'complete') {
                callback();
            } else {
                window.addEventListener('load', callback);
            }
        },
        verifyAuth: async () => false,
        redirectBasedOnAuth: async () => {
            if (window.location.pathname === '/') {
                window.location.href = '/login';
                return true;
            }
            return false;
        }
    };
}

console.log('🔍 Estado final - window.AppShell:', window.AppShell);
console.log('🔍 onAppReady disponible:', typeof window.AppShell.onAppReady === 'function');

document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    console.log('🔍 Ruta detectada en DOMContentLoaded:', currentPath);
    
    if (currentPath === '/' || currentPath === '/index.html') {
        console.log('🚨 Ruta raíz detectada, iniciando verificación rápida...');
        
        const token = localStorage.getItem('authToken');
        if (token) {
            console.log('🔑 Token encontrado, redirigiendo a /index');
            window.location.href = '/index';
        } else {
            console.log('🔒 No hay token, redirigiendo a /login');
            window.location.href = '/login';
        }
    }
});