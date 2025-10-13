const indexController = {
  init() {
    this.initEventListeners();
    this.initUI();
    this.initSmoothScroll();
    this.updateUIWithUserInfo();
  },

  initEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleLogout();
      });
    }

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
  },

  initUI() {
    this.updateFooterYear();
    
    this.initScrollAnimations();
  },

  updateUIWithUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user) {
      console.log('✅ Mostrando información de usuario:', user.name);
      
      const loginLink = document.querySelector('nav a[href="login.html"]');
      if (loginLink) {
        loginLink.textContent = user.name;
        loginLink.href = '#';
        loginLink.style.fontWeight = '500';
        
        this.createUserDropdown(loginLink, user);
      }
    }
  },

  createUserDropdown(loginLink, user) {
    loginLink.addEventListener('click', (e) => e.preventDefault());
    
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

  handleLogout() {
  if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include' 
    })
    .then(response => {
      window.location.href = 'login.html';
    })
    .catch(error => {
      console.error('Error al cerrar sesión:', error);
      window.location.href = 'login.html';
    });
  }
},

  initSmoothScroll() {
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

  updateFooterYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear();
    }
  }
};

document.addEventListener('DOMContentLoaded', function() {
  indexController.init();
});

window.addEventListener('scroll', function() {
  const header = document.querySelector('header');
  if (window.scrollY > 100) {
    header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
    header.style.background = 'rgba(255, 255, 255, 0.95)';
  } else {
    header.style.boxShadow = 'none';
    header.style.background = 'rgba(255, 255, 255, 0.9)';
  }
});