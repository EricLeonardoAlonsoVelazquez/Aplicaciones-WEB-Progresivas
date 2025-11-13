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
                await this.initializeDashboard();
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
        
        const cookieToken = this.getTokenFromCookies();
        const localStorageToken = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        
        console.log('🍪 Token en cookies:', cookieToken ? 'Encontrado' : 'No encontrado');
        console.log('💾 Token en localStorage:', localStorageToken ? 'Encontrado' : 'No encontrado');
        console.log('👤 Usuario en localStorage:', user ? 'Encontrado' : 'No encontrado');

        const token = cookieToken || localStorageToken;
        
        if (!token) {
            console.log('❌ No se encontró ningún token de autenticación');
            return false;
        }

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
                this.clearInvalidTokens();
                return false;
            }
        } catch (error) {
            console.error('🚨 Error en verificación con servidor:', error);
            
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
        const timestamp = new Date().getTime();
        window.location.href = `/login?redirect=${timestamp}&attempt=${this.redirectCount}`;
    }

    showAuthError() {
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

    async initializeDashboard() {
        if (this.isInitialized) {
            console.log('⚠️  Dashboard ya estaba inicializado');
            return;
        }

        console.log('🏁 Inicializando dashboard...');
        this.initEventListeners();
        this.initUI();
        this.updateUIWithUserInfo();
        
        await this.loadSensorData();
        
        this.isInitialized = true;
        console.log('✅ Dashboard inicializado completamente');
    }

    async loadSensorData() {
        try {
            console.log('📡 Cargando datos de sensores...');
            
            const token = this.getTokenFromCookies() || localStorage.getItem('authToken');
            
            const statsResponse = await fetch('/api/readings/my-stats', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                console.log('📊 Estadísticas cargadas:', statsData);
                
                if (statsData.success) {
                    this.updateStatsUI(statsData.data);
                }
            } else {
                console.error('❌ Error obteniendo estadísticas:', statsResponse.status);
            }

            const latestResponse = await fetch('/api/readings/latest-reading', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (latestResponse.ok) {
                const latestData = await latestResponse.json();
                console.log('🕒 Última lectura:', latestData);
                
                if (latestData.success && latestData.data) {
                    this.updateLatestReadingUI(latestData.data);
                }
            } else {
                console.error('❌ Error obteniendo última lectura:', latestResponse.status);
            }

        } catch (error) {
            console.error('💥 Error cargando datos de sensores:', error);
            this.showSensorDataError();
        }
    }

    updateStatsUI(stats) {
        const treeCountElement = document.querySelector('.stat-card:nth-child(1) .stat-number');
        const sensorCountElement = document.querySelector('.stat-card:nth-child(2) .stat-number');
        const statusElement = document.querySelector('.stat-card:nth-child(3) .stat-number');

        if (treeCountElement) {
            treeCountElement.textContent = stats.totalReadings || '0';
            this.animateValue(treeCountElement, 0, stats.totalReadings || 0, 1000);
        }

        if (sensorCountElement) {
            sensorCountElement.textContent = stats.sensorCount || '0';
            this.animateValue(sensorCountElement, 0, stats.sensorCount || 0, 1000);
        }

        if (statusElement) {
            statusElement.textContent = stats.latestStatus || 'Sin datos';
            
            if (stats.latestStatus === 'Crítico') {
                statusElement.style.color = '#dc3545';
            } else if (stats.latestStatus === 'Advertencia') {
                statusElement.style.color = '#ffc107';
            } else {
                statusElement.style.color = '#28a745';
            }
        }
    }

    animateValue(element, start, end, duration) {
        if (start === end) return;
        
        const range = end - start;
        const startTime = performance.now();
        
        function updateValue(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (range * progress));
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(updateValue);
            } else {
                element.textContent = end;
            }
        }
        
        requestAnimationFrame(updateValue);
    }

    updateLatestReadingUI(latestReading) {
        this.createLatestReadingSection(latestReading);
    }

    createLatestReadingSection(reading) {
        let readingSection = document.getElementById('latest-reading-section');
        
        if (!readingSection) {
            const statsGrid = document.querySelector('.stats-grid');
            readingSection = document.createElement('div');
            readingSection.id = 'latest-reading-section';
            readingSection.className = 'latest-reading-section';
            statsGrid.parentNode.insertBefore(readingSection, statsGrid.nextSibling);
        }

        const statusClass = reading.status === 'Crítico' ? 'critical' : 
                           reading.status === 'Advertencia' ? 'warning' : 'stable';

        readingSection.innerHTML = `
            <h2 class="section-title">Última Lectura del Sensor</h2>
            <div class="reading-card ${statusClass}">
                <div class="reading-header">
                    <h3><i class="fas fa-sensor"></i> Datos en Tiempo Real</h3>
                    <span class="reading-status">${reading.status}</span>
                </div>
                <div class="reading-content">
                    <div class="reading-item">
                        <div class="reading-icon">
                            <i class="fas fa-thermometer-half"></i>
                        </div>
                        <div class="reading-info">
                            <label>Temperatura</label>
                            <span class="reading-value">${reading.temperatura}°C</span>
                        </div>
                    </div>
                    <div class="reading-item">
                        <div class="reading-icon">
                            <i class="fas fa-tint"></i>
                        </div>
                        <div class="reading-info">
                            <label>Humedad del Aire</label>
                            <span class="reading-value">${reading.humedadAire}%</span>
                        </div>
                    </div>
                    <div class="reading-item">
                        <div class="reading-icon">
                            <i class="fas fa-mountain"></i>
                        </div>
                        <div class="reading-info">
                            <label>Humedad del Suelo</label>
                            <span class="reading-value">${reading.humedadSuelo}%</span>
                        </div>
                    </div>
                </div>
                <div class="reading-footer">
                    <span class="reading-time">
                        <i class="fas fa-clock"></i> ${reading.formattedDate}
                    </span>
                </div>
            </div>
        `;
    }

    showSensorDataError() {
        const dashboardHeader = document.querySelector('.dashboard-header');
        if (dashboardHeader) {
            const errorHtml = `
                <div class="sensor-error" style="
                    padding: 1.5rem;
                    text-align: center;
                    background: rgba(255, 193, 7, 0.1);
                    border: 1px solid #ffc107;
                    border-radius: 8px;
                    margin: 1rem 0;
                    color: #856404;
                ">
                    <h4 style="color: #856404; margin-bottom: 0.5rem;">
                        <i class="fas fa-exclamation-triangle"></i> Datos Temporales No Disponibles
                    </h4>
                    <p style="margin-bottom: 0;">Los datos de sensores se cargarán cuando estén disponibles.</p>
                </div>
            `;
            dashboardHeader.insertAdjacentHTML('afterend', errorHtml);
        }
    }

    initEventListeners() {
        const userMenuTrigger = document.getElementById('userMenuTrigger');
        const userDropdown = document.getElementById('userDropdown');

        if (userMenuTrigger && userDropdown) {
            userMenuTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('active');
            });

            document.addEventListener('click', () => {
                userDropdown.classList.remove('active');
            });

            userDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

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
    }

    updateUIWithUserInfo() {
        try {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            
            if (user) {
                console.log('👤 Actualizando UI con información de usuario:', user.name);
                
                const userNameElement = document.getElementById('userName');
                if (userNameElement && user.name) {
                    userNameElement.textContent = user.name;
                }
                
                const dropdownUserName = document.getElementById('dropdownUserName');
                const dropdownUserEmail = document.getElementById('dropdownUserEmail');
                
                if (dropdownUserName && user.name) {
                    dropdownUserName.textContent = user.name;
                }
                
                if (dropdownUserEmail && user.email) {
                    dropdownUserEmail.textContent = user.email;
                }
            } else {
                console.log('❌ No se pudo obtener información del usuario para la UI');
            }
        } catch (error) {
            console.error('💥 Error actualizando UI con información de usuario:', error);
        }
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
                window.location.href = 'index.html';
            }
        }
    }

    updateFooterYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }
}

// Inicializar dashboard
console.log('🔧 Iniciando aplicación dashboard...');

try {
    new DashboardApp();
} catch (error) {
    console.error('💥 Error crítico inicializando dashboard:', error);
    setTimeout(() => {
        window.location.href = '/login?error=init_failed';
    }, 3000);
}