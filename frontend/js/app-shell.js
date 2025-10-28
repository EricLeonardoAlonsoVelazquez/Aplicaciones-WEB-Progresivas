console.log('🔧 Cargando App Shell...');

class AppShell {
    constructor() {
        this.isInitialized = false;
        this.isInitializing = false;
        this.readyCallbacks = [];
        console.log('🏗️ Constructor App Shell llamado');
        this.init();
    }

    async init() {
        if (this.isInitialized || this.isInitializing) return;
        
        this.isInitializing = true;
        console.log('🚀 Inicializando App Shell...');
        
        try {
            await this.setupAppShell();
            await this.registerServiceWorker();
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('✅ App Shell inicializado correctamente');
            this.executeReadyCallbacks();
        } catch (error) {
            console.error('❌ Error inicializando App Shell:', error);
            this.isInitializing = false;
            // Fallback: ejecutar callbacks incluso si hay error
            this.executeReadyCallbacks();
        }
    }

    async registerServiceWorker() {
    // CORRECCIÓN: navigator.serviceWorker (no navigatorServiceWorker)
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('✅ Service Worker registrado:', registration.scope);
            return registration;
        } catch (error) {
            console.log('❌ Service Worker falló:', error);
            return null;
        }
    } else {
        console.log('⚠️ Service Worker no soportado en este navegador');
        return null;
    }
}

    setupAppShell() {
        return new Promise((resolve) => {
            this.createLoadingScreen();
            this.handleAppLoad(resolve);
        });
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
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', criticalCSS);
    }

    handleAppLoad(resolve) {
        const checkReady = () => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.showAppContent();
                    resolve();
                });
            } else {
                this.showAppContent();
                resolve();
            }
        };

        // Pequeño delay para asegurar que el DOM esté listo
        setTimeout(checkReady, 100);
    }

    showAppContent() {
        const appLoading = document.getElementById('appLoading');
        const mainContent = document.querySelector('main') || document.body;
        
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
                appShell: this
            }
        });
        window.dispatchEvent(event);
    }

    executeReadyCallbacks() {
        console.log('📞 Ejecutando callbacks listos:', this.readyCallbacks.length);
        while (this.readyCallbacks.length > 0) {
            const callback = this.readyCallbacks.shift();
            try {
                callback();
            } catch (error) {
                console.error('Error en callback appReady:', error);
            }
        }
    }

    onAppReady(callback) {
        console.log('📞 onAppReady llamado, estado:', {
            initialized: this.isInitialized,
            initializing: this.isInitializing
        });
        
        if (this.isInitialized) {
            console.log('✅ App ya inicializado, ejecutando callback inmediatamente');
            setTimeout(callback, 100);
        } else {
            console.log('⏳ Agregando callback a la cola');
            this.readyCallbacks.push(callback);
        }
    }
}

// Inicialización GARANTIZADA del App Shell
console.log('🔨 Instanciando App Shell...');
try {
    // Verificar si ya existe una instancia
    if (!window.AppShell) {
        window.AppShell = new AppShell();
    }
    console.log('✅ App Shell asignado a window.AppShell:', !!window.AppShell);
    console.log('✅ onAppReady disponible:', typeof window.AppShell.onAppReady === 'function');
} catch (error) {
    console.error('❌ Error instanciando App Shell:', error);
    // Fallback garantizado
    window.AppShell = {
        isInitialized: true,
        onAppReady: (callback) => {
            console.log('🔄 Usando fallback onAppReady');
            if (document.readyState === 'complete') {
                setTimeout(callback, 100);
            } else {
                window.addEventListener('load', () => setTimeout(callback, 100));
            }
        }
    };
}

console.log('🔍 Estado final - window.AppShell:', window.AppShell);
console.log('🔍 onAppReady disponible:', typeof window.AppShell.onAppReady === 'function');
