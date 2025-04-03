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
        body: JSON.stringify({ email, password })
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
    
    // Operadores têm acesso a tudo exceto configurações avançadas
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
    // Verificar se o usuário está autenticado
    if (!this.isAuthenticated()) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
    // Se um papel específico for necessário, verificar permissões
    if (requiredRole && !this.hasPermission(requiredRole)) {
      // Mostrar mensagem de acesso negado
      this.showAccessDenied();
      return;
    }
  },
  
  /**
   * Mostra uma mensagem de acesso negado e redireciona para a página inicial
   */
  showAccessDenied() {
    // Criar e mostrar um modal de acesso negado
    const modalHtml = `
      <div class="modal fade" id="accessDeniedModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title">
                <i class="fas fa-exclamation-triangle me-2"></i>Acesso Negado
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
              <p>Você não tem permissão para acessar esta página.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" id="redirectHomeBtn">Ir para Página Inicial</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Adicionar o modal ao corpo da página
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Mostrar o modal
    const modal = new bootstrap.Modal(document.getElementById('accessDeniedModal'));
    modal.show();
    
    // Adicionar evento ao botão de redirecionamento
    document.getElementById('redirectHomeBtn').addEventListener('click', () => {
      window.location.href = '/';
    });
  },

  /**
   * Inicializa a verificação de autenticação
   */
  init() {
    // Verificar se estamos em uma página que não precisa de autenticação
    const publicPages = ['/login', '/reset-password', '/register'];
    const isPublicPage = publicPages.some(page => window.location.pathname.includes(page));
    
    if (!isPublicPage) {
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
