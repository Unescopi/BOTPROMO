/**
 * App.js - Arquivo principal que inicializa a aplicação
 * Versão Webhook 2.0
 */

// Objeto principal da aplicação
const App = {
  // Inicialização da aplicação
  init() {
    // Inicializa a interface do usuário
    if (window.appUI) {
      console.log('UI já inicializada');
    } else {
      window.appUI = new UI();
    }
    
    // Carrega os dados iniciais
    this.loadDashboardData();
    
    // Configura atualizações periódicas
    this.setupPeriodicUpdates();
    
    console.log('Cafeteria Promo Bot inicializado com sucesso!');
  },

  // Carrega os dados para o dashboard
  async loadDashboardData() {
    try {
      // Obter estatísticas gerais
      const stats = await this.fetchStats();
      
      // Atualiza as estatísticas no dashboard
      this.updateDashboardStats(stats);
      
      // Carrega promoções recentes e próximas
      this.loadRecentPromotions();
      this.loadUpcomingPromotions();
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      this.showToast('Erro ao carregar dados do dashboard. Verifique a conexão com o servidor.', 'danger');
    }
  },

  // Busca estatísticas da API
  async fetchStats() {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error('Falha ao obter estatísticas');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
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
      
      const response = await fetch('/api/promotions/recent');
      if (!response.ok) {
        throw new Error('Falha ao obter promoções recentes');
      }
      
      const promotions = await response.json();
      
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
      if (document.getElementById('recent-promos')) {
        document.getElementById('recent-promos').innerHTML = `
          <div class="list-group-item text-center py-3">
            <i class="fas fa-exclamation-triangle text-warning me-2"></i>
            Erro ao carregar promoções
          </div>
        `;
      }
    }
  },

  // Carrega as próximas promoções agendadas
  async loadUpcomingPromotions() {
    try {
      const upcomingPromosContainer = document.getElementById('upcoming-promos');
      if (!upcomingPromosContainer) return;
      
      // Em produção, você buscaria isso da API
      // Por enquanto, usamos dados de exemplo (ou poderia buscar de uma rota específica)
      const upcomingPromos = [];
      
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
      const response = await fetch(`/api/promotions/${promoId}/cancel`, {
        method: 'POST'
      });
      
      if (response.ok) {
        this.showToast('Promoção cancelada com sucesso', 'success');
        this.loadUpcomingPromotions();
      } else {
        throw new Error('Falha ao cancelar promoção');
      }
    } catch (error) {
      console.error('Erro ao cancelar promoção:', error);
      this.showToast('Erro ao cancelar promoção', 'danger');
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
  }
};

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
