// app-shell.js - Gestión simplificada del App Shell
console.log('🔧 Cargando App Shell...');

class AppShell {
    constructor() {
        this.isInitialized = false;
        console.log('🏗️ Constructor App Shell llamado');
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('🚀 Inicializando App Shell...');
        this.setupAppShell();
        await this.registerServiceWorker();
        this.isInitialized = true;
        
        console.log('✅ App Shell inicializado correctamente');
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('✅ Service Worker registrado:', registration.scope);
                return registration;
            } catch (error) {
                console.log('❌ Service Worker falló:', error);
            }
        }
        return null;
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
            detail: { timestamp: new Date() }
        });
        window.dispatchEvent(event);
    }

    onAppReady(callback) {
        console.log('📞 onAppReady llamado');
        if (this.isInitialized && document.readyState === 'complete') {
            console.log('✅ App ya inicializado, ejecutando callback inmediatamente');
            setTimeout(callback, 100);
        } else {
            console.log('⏳ Esperando evento appReady...');
            window.addEventListener('appReady', callback);
        }
    }
}

// Inicialización GARANTIZADA del App Shell
console.log('🔨 Instanciando App Shell...');
try {
    const appShell = new AppShell();
    window.AppShell = appShell;
    console.log('✅ App Shell asignado a window.AppShell:', !!window.AppShell);
    console.log('✅ onAppReady disponible:', typeof window.AppShell.onAppReady === 'function');
} catch (error) {
    console.error('❌ Error instanciando App Shell:', error);
    // Fallback garantizado
    window.AppShell = {
        onAppReady: (callback) => {
            console.log('🔄 Usando fallback onAppReady');
            if (document.readyState === 'complete') {
                callback();
            } else {
                window.addEventListener('load', callback);
            }
        }
    };
}

console.log('🔍 Estado final - window.AppShell:', window.AppShell);
console.log('🔍 onAppReady disponible:', typeof window.AppShell.onAppReady === 'function');