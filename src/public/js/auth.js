/**
 * auth.js - Gerenciamento de autenticação no frontend
 */

const Auth = {
  /**
   * Verifica se o usuário está autenticado
   * @returns {boolean} True se o usuário estiver autenticado
   */
  isAuthenticated() {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    // Verificar se o token está expirado
    try {
      const userInfo = this.getUserInfo();
      if (!userInfo) return false;
      
      // Verificar se o token expirou
      const currentTime = Math.floor(Date.now() / 1000);
      if (userInfo.exp && userInfo.exp < currentTime) {
        // Token expirado, limpar e retornar falso
        this.logout(false);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      return false;
    }
  },

  /**
   * Obtém o token de autenticação
   * @returns {string|null} Token de autenticação ou null se não estiver autenticado
   */
  getToken() {
    return localStorage.getItem('authToken');
  },

  /**
   * Obtém informações do usuário decodificadas do token JWT
   * @returns {Object|null} Informações do usuário ou null se não estiver autenticado
   */
  getUserInfo() {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      // Decodificar o payload do token JWT (segunda parte)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      localStorage.removeItem('authToken'); // Remover token inválido
      return null;
    }
  },

  /**
   * Salva o token de autenticação
   * @param {string} token Token JWT
   */
  setToken(token) {
    localStorage.setItem('authToken', token);
  },

  /**
   * Realiza o login do usuário
   * @param {string} email Email do usuário
   * @param {string} password Senha do usuário
   * @returns {Promise<Object>} Resultado da operação de login
   */
  async login(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao realizar login');
      }
      
      const data = await response.json();
      
      // Salvar o token no localStorage
      this.setToken(data.token);
      
      // Atualizar a interface com as informações do usuário
      this.updateUserInterface();
      
      // Verificar se há um redirecionamento pendente
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        window.location.href = '/';
      }
      
      return data;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  },

  /**
   * Realiza o logout do usuário
   * @param {boolean} redirect Se verdadeiro, redireciona para a página de login
   */
  logout(redirect = true) {
    localStorage.removeItem('authToken');
    if (redirect) {
      window.location.href = '/login';
    }
  },

  /**
   * Verifica se o usuário tem permissão para acessar uma página
   * @param {string} requiredRole Papel necessário para acessar a página
   * @returns {boolean} True se o usuário tiver permissão
   */
  hasPermission(requiredRole) {
    const userInfo = this.getUserInfo();
    if (!userInfo) return false;
    
    const { role } = userInfo;
    
    // Administradores têm acesso a tudo
    if (role === 'admin') return true;
    
    // Operadores têm acesso a tudo, exceto páginas de admin
    if (role === 'operator' && requiredRole !== 'admin') return true;
    
    // Visualizadores têm acesso apenas a páginas de visualização
    if (role === 'viewer' && requiredRole === 'viewer') return true;
    
    return false;
  },

  /**
   * Protege uma página, redirecionando para o login se o usuário não estiver autenticado
   * @param {string} requiredRole Papel necessário para acessar a página (opcional)
   */
  protectPage(requiredRole = null) {
    if (!this.isAuthenticated()) {
      // Redirecionar para o login com a URL atual como parâmetro de redirecionamento
      const currentPath = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?redirect=${currentPath}`;
      return;
    }
    
    // Se um papel específico for necessário, verificar permissão
    if (requiredRole && !this.hasPermission(requiredRole)) {
      this.showAccessDenied();
    }
  },

  /**
   * Mostra uma mensagem de acesso negado e redireciona para a página inicial
   */
  showAccessDenied() {
    // Criar um elemento de mensagem de acesso negado
    const accessDeniedDiv = document.createElement('div');
    accessDeniedDiv.className = 'access-denied-overlay';
    accessDeniedDiv.innerHTML = `
      <div class="access-denied-content">
        <div class="access-denied-icon">
          <i class="fas fa-lock"></i>
        </div>
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página.</p>
        <p>Entre em contato com o administrador para obter acesso.</p>
        <button id="access-denied-back" class="btn btn-primary">
          <i class="fas fa-arrow-left"></i> Voltar para a página inicial
        </button>
      </div>
    `;
    
    // Adicionar estilos
    const style = document.createElement('style');
    style.textContent = `
      .access-denied-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.9);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .access-denied-content {
        text-align: center;
        padding: 2rem;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 500px;
      }
      .access-denied-icon {
        font-size: 4rem;
        color: #dc3545;
        margin-bottom: 1rem;
      }
    `;
    
    // Adicionar ao DOM
    document.head.appendChild(style);
    document.body.appendChild(accessDeniedDiv);
    
    // Adicionar evento ao botão
    document.getElementById('access-denied-back').addEventListener('click', () => {
      window.location.href = '/';
    });
  },

  /**
   * Inicializa a verificação de autenticação
   */
  init() {
    // Verificar se o usuário está na página de login ou redefinição de senha
    const isLoginPage = window.location.pathname === '/login' || 
                        window.location.pathname.includes('reset-password');
    
    // Se o usuário estiver autenticado e estiver na página de login, redirecionar para a página inicial
    if (this.isAuthenticated() && isLoginPage) {
      window.location.href = '/';
      return;
    }
    
    // Se o usuário não estiver na página de login, proteger a página
    if (!isLoginPage) {
      this.protectPage();
    }
    
    // Adicionar evento de logout aos botões de logout
    document.querySelectorAll('.logout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    });
    
    // Configurar interceptor para verificar tokens expirados em todas as respostas
    this.setupResponseInterceptor();
    
    // Atualizar a interface com informações do usuário
    this.updateUserInterface();
  },
  
  /**
   * Configura um interceptor para verificar tokens expirados em todas as respostas
   */
  setupResponseInterceptor() {
    // Sobrescrever o método fetch original
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        // Adicionar cabeçalho de autorização se o usuário estiver autenticado
        if (this.isAuthenticated() && args[0] && args[1] && !args[1].headers?.Authorization) {
          const token = this.getToken();
          if (!args[1].headers) {
            args[1].headers = {};
          }
          args[1].headers = {
            ...args[1].headers,
            'Authorization': `Bearer ${token}`
          };
        }
        
        // Adicionar credentials: 'same-origin' para garantir que os cookies sejam enviados
        if (args[1] && !args[1].credentials) {
          args[1].credentials = 'same-origin';
        }
        
        const response = await originalFetch(...args);
        
        // Verificar se é uma resposta JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          // Clonar a resposta para não consumir o corpo
          const clonedResponse = response.clone();
          
          // Tentar ler o corpo como JSON
          try {
            const data = await clonedResponse.json();
            
            // Verificar se há erro de autenticação
            if (data.error && (
                data.error.includes('token expirado') || 
                data.error.includes('não autenticado') || 
                data.error.includes('sessão expirada')
            )) {
              console.warn('Token expirado ou sessão inválida detectada');
              this.logout();
            }
          } catch (e) {
            // Ignorar erros ao tentar ler o corpo
          }
        }
        
        // Verificar o status da resposta
        if (response.status === 401) {
          console.warn('Resposta 401 Unauthorized detectada');
          this.logout();
        }
        
        return response;
      } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
      }
    };
  },

  /**
   * Atualiza a interface com informações do usuário
   */
  updateUserInterface() {
    if (!this.isAuthenticated()) return;
    
    const userInfo = this.getUserInfo();
    if (!userInfo) return;
    
    // Atualizar nome do usuário na interface
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
      el.textContent = userInfo.name || userInfo.email || 'Usuário';
    });
    
    // Atualizar avatar do usuário
    const userAvatarElements = document.querySelectorAll('.user-avatar');
    userAvatarElements.forEach(el => {
      if (userInfo.avatar) {
        el.src = userInfo.avatar;
      } else {
        // Usar iniciais como avatar
        const initials = (userInfo.name || userInfo.email || 'U').charAt(0).toUpperCase();
        el.style.backgroundColor = this.getAvatarColor(userInfo.email || '');
        el.textContent = initials;
      }
    });
    
    // Mostrar/ocultar elementos baseados no papel do usuário
    const adminElements = document.querySelectorAll('.admin-only');
    const operatorElements = document.querySelectorAll('.operator-only');
    
    adminElements.forEach(el => {
      el.style.display = userInfo.role === 'admin' ? '' : 'none';
    });
    
    operatorElements.forEach(el => {
      el.style.display = ['admin', 'operator'].includes(userInfo.role) ? '' : 'none';
    });
  },

  /**
   * Gera uma cor para o avatar baseada no email do usuário
   * @param {string} email Email do usuário
   * @returns {string} Cor em formato hexadecimal
   */
  getAvatarColor(email) {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  }
};

// Inicializar autenticação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});

// Expor o objeto Auth globalmente
window.Auth = Auth;
