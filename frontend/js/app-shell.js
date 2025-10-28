// app-shell.js
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
            this.setupPWAInstall();
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('✅ App Shell inicializado correctamente');
            this.executeReadyCallbacks();
        } catch (error) {
            console.error('❌ Error inicializando App Shell:', error);
            this.isInitializing = false;
            this.executeReadyCallbacks(); // Ejecutar callbacks incluso con error
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js', {
                    scope: '/'
                });
                console.log('✅ Service Worker registrado:', registration.scope);
                
                // Verificar actualizaciones
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 Nuevo Service Worker encontrado:', newWorker);
                    
                    newWorker.addEventListener('statechange', () => {
                        console.log('📊 Estado del nuevo Service Worker:', newWorker.state);
                    });
                });
                
                return registration;
            } catch (error) {
                console.error('❌ Service Worker falló:', error);
                return null;
            }
        } else {
            console.log('⚠️ Service Worker no soportado en este navegador');
            return null;
        }
    }

    setupPWAInstall() {
        let deferredPrompt;
        const installButton = document.createElement('button');
        installButton.id = 'pwa-install-button';
        
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('📱 beforeinstallprompt event fired');
            e.preventDefault();
            deferredPrompt = e;
            
            this.showInstallButton(installButton, deferredPrompt);
        });

        window.addEventListener('appinstalled', (evt) => {
            console.log('🎉 ¡Aplicación instalada exitosamente!');
            installButton.style.display = 'none';
            deferredPrompt = null;
        });
    }

    showInstallButton(button, deferredPrompt) {
        button.innerHTML = '📱 Instalar App';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #8B0000 0%, #B22222 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-family: 'Poppins', sans-serif;
            font-weight: 500;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            transition: all 0.3s ease;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });
        
        button.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            
            deferredPrompt.prompt();
            
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            
            deferredPrompt = null;
            button.style.display = 'none';
        });
        
        document.body.appendChild(button);
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
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-logo">
                        <i class="fas fa-tree"></i>
                        <span>Arbored</span>
                    </div>
                    <div class="loading-text">Cargando aplicación...</div>
                    <div class="loading-progress">
                        <div class="progress-bar"></div>
                    </div>
                </div>
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
                    background: linear-gradient(135deg, #2d5016 0%, #4a7c1f 50%, #6ba32a 100%);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    transition: opacity 0.5s ease;
                }
                
                .loading-content {
                    text-align: center;
                    color: white;
                }
                
                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 3px solid rgba(255,255,255,0.3);
                    border-top: 3px solid white;
                    border-radius: 50%;
                    animation: appShellSpin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                
                .loading-logo {
                    font-size: 24px;
                    font-weight: 600;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                
                .loading-logo i {
                    font-size: 28px;
                }
                
                .loading-text {
                    font-family: 'Poppins', sans-serif;
                    font-size: 16px;
                    font-weight: 300;
                    margin-bottom: 15px;
                    opacity: 0.9;
                }
                
                .loading-progress {
                    width: 200px;
                    height: 4px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 2px;
                    overflow: hidden;
                    margin: 0 auto;
                }
                
                .progress-bar {
                    height: 100%;
                    background: white;
                    width: 0%;
                    animation: loadingProgress 2s ease-in-out infinite;
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
                
                @keyframes loadingProgress {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', criticalCSS);
    }

    handleAppLoad(resolve) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    this.showAppContent();
                    resolve();
                }, 1000);
            });
        } else {
            setTimeout(() => {
                this.showAppContent();
                resolve();
            }, 1000);
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
        }, 1000);
    }

    emitAppReady() {
        console.log('🎉 App Shell completamente cargado - emitiendo evento');
        const event = new CustomEvent('appReady', {
            detail: { 
                timestamp: new Date(),
                appShell: this,
                pwa: true
            }
        });
        window.dispatchEvent(event);
    }

    executeReadyCallbacks() {
        console.log('📞 Ejecutando callbacks listos:', this.readyCallbacks.length);
        while (this.readyCallbacks.length > 0) {
            const callback = this.readyCallbacks.shift();
            try {
                setTimeout(callback, 100);
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

// Verificar si ya existe una instancia
if (!window.AppShell) {
    window.AppShell = new AppShell();
} else {
    console.log('⚠️ App Shell ya estaba instanciado');
}

// Fallback garantizado para onAppReady
if (typeof window.AppShell.onAppReady !== 'function') {
    console.warn('🔄 Usando fallback para onAppReady');
    window.AppShell.onAppReady = (callback) => {
        if (document.readyState === 'complete') {
            setTimeout(callback, 100);
        } else {
            window.addEventListener('load', () => setTimeout(callback, 100));
        }
    };
}

console.log('🔍 Estado final - window.AppShell:', window.AppShell);
console.log('🔍 onAppReady disponible:', typeof window.AppShell.onAppReady === 'function');

// Año actual en el footer
document.addEventListener('DOMContentLoaded', function() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});
