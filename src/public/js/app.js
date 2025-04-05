/**
 * App.js - Arquivo principal que inicializa a aplicação
 * Versão Webhook 2.0
 */

// Objeto principal da aplicação
const App = {
  // Inicialização da aplicação
  init() {
    console.log('Inicializando aplicação...');
    this.setupEventListeners();
    this.setupGlobalEventDelegation();
    this.loadDashboard();
  },

  // Configuração dos listeners de eventos
  setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Adicione um log para verificar se os botões estão sendo encontrados
    document.querySelectorAll('button').forEach(button => {
      console.log('Botão encontrado:', button.id || button.textContent.trim());
    });
    
    // Delegação de eventos para o documento inteiro
    document.addEventListener('click', (e) => {
      // Log para verificar os cliques
      console.log('Clique detectado em:', e.target.tagName, e.target.id || e.target.className);
      
      // Implementar delegação de eventos aqui
    });
  },

  // Atualiza informações do usuário na interface
  updateUserInfo() {
    const userInfo = Auth.getUserInfo();
    if (!userInfo) return;
    
    // Atualiza o nome do usuário no dropdown
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
      userDropdown.innerHTML = `
        <i class="fas fa-user-circle me-1"></i>${userInfo.name || userInfo.email || 'Usuário'}
      `;
    }
    
    // Atualiza permissões baseadas no papel do usuário
    this.updatePermissions(userInfo.role);
  },
  
  // Atualiza elementos da interface baseados no papel do usuário
  updatePermissions(role) {
    // Elementos que só administradores podem ver
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
      el.style.display = role === 'admin' ? '' : 'none';
    });
    
    // Elementos que operadores e administradores podem ver
    const operatorElements = document.querySelectorAll('.operator-only');
    operatorElements.forEach(el => {
      el.style.display = ['admin', 'operator'].includes(role) ? '' : 'none';
    });
  },
  
  // Configura manipuladores de eventos
  setupEventHandlers() {
    // Manipulador para o botão de logout
    document.querySelectorAll('.logout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    });
  },

  // Carrega os dados para o dashboard
  async loadDashboard() {
    console.log('=== INÍCIO: loadDashboard ===');
    
    try {
      // Carregar estatísticas
      console.log('Carregando estatísticas...');
      const stats = await API.get('/stats');
      console.log('Estatísticas recebidas:', stats);
      
      // Atualizar contadores
      if (stats) {
        // Clientes
        const clientCount = document.querySelector('.client-count');
        if (clientCount) {
          clientCount.textContent = stats.clients?.total || 0;
          console.log('Contador de clientes atualizado:', stats.clients?.total || 0);
        }
        
        // Promoções ativas
        const activePromos = document.querySelector('.active-promos');
        if (activePromos) {
          activePromos.textContent = stats.promotions?.active || 0;
          console.log('Contador de promoções ativas atualizado:', stats.promotions?.active || 0);
        }
        
        // Mensagens enviadas
        const messagesSent = document.querySelector('.messages-sent');
        if (messagesSent) {
          messagesSent.textContent = stats.messages?.sent || 0;
          console.log('Contador de mensagens enviadas atualizado:', stats.messages?.sent || 0);
        }
      }
      
      // Carregar promoções recentes
      console.log('Carregando promoções recentes...');
      const recentPromos = await API.promotions.getRecent();
      console.log('Promoções recentes recebidas:', recentPromos);
      
      // Atualizar lista de promoções recentes
      const recentPromosList = document.getElementById('recent-promos');
      if (recentPromosList && recentPromos && recentPromos.length > 0) {
        recentPromosList.innerHTML = recentPromos.map(promo => `
          <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-center">
              <h6 class="mb-1">${promo.name}</h6>
              <span class="badge bg-${promo.status === 'Ativa' ? 'success' : 
                                      promo.status === 'Enviada' ? 'primary' : 
                                      'warning text-dark'}">${promo.status}</span>
            </div>
            <p class="mb-1 small text-muted">
              <i class="fas fa-calendar-alt me-1"></i>${new Date(promo.date).toLocaleDateString('pt-BR')}
              <i class="fas fa-users ms-2 me-1"></i>${promo.recipients} destinatários
            </p>
          </div>
        `).join('');
        console.log('Lista de promoções recentes atualizada');
      } else if (recentPromosList) {
        recentPromosList.innerHTML = `
          <div class="list-group-item text-center py-5">
            <i class="fas fa-info-circle me-2"></i>Nenhuma promoção recente
          </div>
        `;
        console.log('Nenhuma promoção recente encontrada');
      }
      
      console.log('=== FIM: loadDashboard ===');
    } catch (error) {
      console.error('=== ERRO: loadDashboard ===');
      console.error('Mensagem de erro:', error);
    }
  },

  // Busca estatísticas da API
  async fetchStats() {
    try {
      const response = await API.get('/stats');
      return response;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      
      // Se o erro for de autenticação, redireciona para o login
      if (error.message.includes('Sessão expirada')) {
        Auth.logout();
      }
      
      return null;
    }
  },

  // Atualiza todas as estatísticas no dashboard
  updateDashboardStats(stats) {
    if (!stats) return;
    
    // Atualiza estatísticas de clientes
    const clientCount = document.querySelector('.client-count');
    if (clientCount) clientCount.textContent = stats.clients || 0;
    
    const newClients = document.querySelector('.new-clients');
    if (newClients) newClients.textContent = stats.newClients || 0;
    
    // Atualiza estatísticas de promoções
    const activePromos = document.querySelector('.active-promos');
    if (activePromos) activePromos.textContent = stats.promotions || 0;
    
    const scheduledPromos = document.querySelector('.scheduled-promos');
    if (scheduledPromos) scheduledPromos.textContent = stats.scheduledPromotions || 0;
    
    // Atualiza estatísticas de mensagens
    const messagesSent = document.querySelector('.messages-sent');
    if (messagesSent) messagesSent.textContent = stats.messages || 0;
    
    const deliveryRate = document.querySelector('.delivery-rate');
    if (deliveryRate) deliveryRate.textContent = stats.deliveryRate?.replace('%', '') || 0;
    
    const readRate = document.querySelector('.read-rate');
    if (readRate) readRate.textContent = stats.readRate || '0%';
    
    const responseCount = document.querySelector('.response-count');
    if (responseCount) responseCount.textContent = stats.responses || 0;
  },

  // Carrega as promoções recentes
  async loadRecentPromotions() {
    try {
      const recentPromosContainer = document.getElementById('recent-promos');
      if (!recentPromosContainer) return;
      
      const promotions = await API.get('/promotions/recent');
      
      if (promotions.length === 0) {
        recentPromosContainer.innerHTML = `
          <div class="list-group-item text-center py-5">
            <i class="fas fa-info-circle me-2"></i>Nenhuma promoção recente
          </div>
        `;
        return;
      }
      
      // Renderiza as promoções recentes
      recentPromosContainer.innerHTML = promotions.map(promo => `
        <div class="list-group-item promo-item ${promo.status === 'Enviada' ? 'completed' : 'active'}">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${promo.name}</h6>
            <small class="text-muted">${this.formatDate(promo.date)}</small>
          </div>
          <p class="mb-1 text-truncate-2">${promo.description || 'Promoção especial'}</p>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">
              <i class="fas fa-users me-1"></i>${promo.recipients} destinatários
            </small>
            <span class="badge bg-${promo.status === 'Enviada' ? 'success' : 'primary'}">
              ${promo.status}
            </span>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Erro ao carregar promoções recentes:', error);
      
      // Se o erro for de autenticação, redireciona para o login
      if (error.message.includes('Sessão expirada')) {
        Auth.logout();
      }
    }
  },

  // Carrega as próximas promoções agendadas
  async loadUpcomingPromotions() {
    try {
      const upcomingPromosContainer = document.getElementById('upcoming-promos');
      if (!upcomingPromosContainer) return;
      
      const upcomingPromos = await API.get('/promotions/upcoming');
      
      if (upcomingPromos.length === 0) {
        upcomingPromosContainer.innerHTML = `
          <div class="list-group-item text-center py-5">
            <i class="fas fa-calendar-alt me-2"></i>Nenhum agendamento próximo
          </div>
        `;
        return;
      }
      
      // Renderiza as próximas promoções
      upcomingPromosContainer.innerHTML = upcomingPromos.map(promo => `
        <div class="list-group-item promo-item scheduled">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${promo.name}</h6>
            <small class="text-muted">${this.formatDate(promo.scheduleDate)}</small>
          </div>
          <p class="mb-1 text-truncate-2">${promo.description || 'Promoção agendada'}</p>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">
              <i class="fas fa-clock me-1"></i>${this.formatTime(promo.scheduleDate)}
            </small>
            <div>
              <button class="btn btn-sm btn-outline-secondary me-1" data-promo-id="${promo.id}" data-action="edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" data-promo-id="${promo.id}" data-action="cancel">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      `).join('');
      
      // Adiciona manipuladores de eventos para os botões
      upcomingPromosContainer.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => this.editPromotion(btn.getAttribute('data-promo-id')));
      });
      
      upcomingPromosContainer.querySelectorAll('[data-action="cancel"]').forEach(btn => {
        btn.addEventListener('click', () => this.cancelPromotion(btn.getAttribute('data-promo-id')));
      });
      
    } catch (error) {
      console.error('Erro ao carregar próximas promoções:', error);
      
      // Se o erro for de autenticação, redireciona para o login
      if (error.message.includes('Sessão expirada')) {
        Auth.logout();
      }
    }
  },

  // Configura atualizações periódicas
  setupPeriodicUpdates() {
    // Atualiza os dados do dashboard a cada 5 minutos
    setInterval(() => {
      this.loadDashboardData();
    }, 300000);
  },

  // Exibe um toast de notificação
  showToast(message, type = 'info') {
    // Implementação simplificada - em produção, você poderia usar um componente de toast
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Alternativa: alert(message);
  },

  // Edita uma promoção existente
  async editPromotion(promoId) {
    try {
      // Redireciona para a página de promoções com o ID da promoção
      if (window.appUI) {
        window.appUI.showPage('promotions');
      }
      
      // Aqui você adicionaria código para carregar o formulário de edição
      
    } catch (error) {
      console.error('Erro ao editar promoção:', error);
      this.showToast('Erro ao editar promoção', 'danger');
    }
  },

  // Cancela uma promoção agendada
  async cancelPromotion(promoId) {
    if (!confirm('Tem certeza que deseja cancelar esta promoção?')) return;
    
    try {
      await API.post(`/promotions/${promoId}/cancel`);
      this.showToast('Promoção cancelada com sucesso', 'success');
      this.loadUpcomingPromotions();
    } catch (error) {
      console.error('Erro ao cancelar promoção:', error);
      this.showToast('Erro ao cancelar promoção', 'danger');
      
      // Se o erro for de autenticação, redireciona para o login
      if (error.message.includes('Sessão expirada')) {
        Auth.logout();
      }
    }
  },

  // Formata uma data para exibição
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  // Formata uma hora para exibição
  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Adicione esta função ao objeto App
  setupGlobalEventDelegation() {
    console.log('Configurando delegação de eventos global...');
    
    // Delegação de eventos para o documento inteiro
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Log para depuração
      console.log('Clique detectado em:', target.tagName, target.id || target.className);
      
      // Botões de salvar
      if (target.matches('#save-client-btn') || target.closest('#save-client-btn')) {
        console.log('Botão salvar cliente clicado via delegação');
        if (window.ClientsManager && typeof window.ClientsManager.saveClient === 'function') {
          window.ClientsManager.saveClient();
        }
      }
      
      if (target.matches('#save-promo-btn') || target.closest('#save-promo-btn')) {
        console.log('Botão salvar promoção clicado via delegação');
        if (window.PromotionsManager && typeof window.PromotionsManager.savePromotion === 'function') {
          window.PromotionsManager.savePromotion();
        }
      }
      
      if (target.matches('#save-message-btn') || target.closest('#save-message-btn')) {
        console.log('Botão salvar mensagem clicado via delegação');
        if (window.MessagesManager && typeof window.MessagesManager.saveMessage === 'function') {
          window.MessagesManager.saveMessage();
        }
      }
      
      if (target.matches('#save-settings-btn') || target.closest('#save-settings-btn')) {
        console.log('Botão salvar configurações clicado via delegação');
        if (window.SettingsManager && typeof window.SettingsManager.saveSettings === 'function') {
          window.SettingsManager.saveSettings();
        }
      }
      
      // Botões de envio
      if (target.matches('#send-message-btn') || target.closest('#send-message-btn')) {
        console.log('Botão enviar mensagem clicado via delegação');
        if (window.MessagesManager && typeof window.MessagesManager.sendMessage === 'function') {
          window.MessagesManager.sendMessage();
        }
      }
      
      // Botões de exclusão
      if (target.matches('.delete-client-btn') || target.closest('.delete-client-btn')) {
        const clientId = target.closest('tr').dataset.id || target.dataset.id;
        console.log('Botão excluir cliente clicado via delegação, ID:', clientId);
        if (window.ClientsManager && typeof window.ClientsManager.deleteClient === 'function') {
          window.ClientsManager.deleteClient(clientId);
        }
      }
      
      if (target.matches('.delete-promo-btn') || target.closest('.delete-promo-btn')) {
        const promoId = target.closest('tr').dataset.id || target.dataset.id;
        console.log('Botão excluir promoção clicado via delegação, ID:', promoId);
        if (window.PromotionsManager && typeof window.PromotionsManager.deletePromotion === 'function') {
          window.PromotionsManager.deletePromotion(promoId);
        }
      }
      
      if (target.matches('.delete-message-btn') || target.closest('.delete-message-btn')) {
        const messageId = target.closest('tr').dataset.id || target.dataset.id;
        console.log('Botão excluir mensagem clicado via delegação, ID:', messageId);
        if (window.MessagesManager && typeof window.MessagesManager.deleteMessage === 'function') {
          window.MessagesManager.deleteMessage(messageId);
        }
      }
      
      // Botões de edição
      if (target.matches('.edit-client-btn') || target.closest('.edit-client-btn')) {
        const clientId = target.closest('tr').dataset.id || target.dataset.id;
        console.log('Botão editar cliente clicado via delegação, ID:', clientId);
        if (window.ClientsManager && typeof window.ClientsManager.editClient === 'function') {
          window.ClientsManager.editClient(clientId);
        }
      }
      
      if (target.matches('.edit-promo-btn') || target.closest('.edit-promo-btn')) {
        const promoId = target.closest('tr').dataset.id || target.dataset.id;
        console.log('Botão editar promoção clicado via delegação, ID:', promoId);
        if (window.PromotionsManager && typeof window.PromotionsManager.editPromotion === 'function') {
          window.PromotionsManager.editPromotion(promoId);
        }
      }
      
      // Adicione mais handlers conforme necessário
    });
  },

  setupActionDelegation() {
    console.log('Configurando delegação de ações...');
    
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      
      const action = target.dataset.action;
      const module = target.dataset.module;
      const id = target.dataset.id;
      
      console.log(`Ação detectada: ${action}, Módulo: ${module}, ID: ${id}`);
      
      // Executa a ação no módulo correspondente
      if (module && window[module] && typeof window[module][action] === 'function') {
        if (id) {
          window[module][action](id);
        } else {
          window[module][action]();
        }
      }
    });
  }
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM carregado, verificando autenticação...');
  if (Auth.isAuthenticated()) {
    App.init();
  } else {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
  }
});
