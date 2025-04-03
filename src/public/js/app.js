/**
 * App.js - Arquivo principal que inicializa a aplicação
 */

// Objeto principal da aplicação
const App = {
  // Inicialização da aplicação
  init() {
    // Inicializa a interface do usuário
    UI.init();
    
    // Carrega os dados iniciais
    this.loadDashboardData();
    
    // Configura atualizações periódicas
    this.setupPeriodicUpdates();
    
    console.log('Cafeteria Promo Bot inicializado com sucesso!');
  },

  // Carrega os dados para o dashboard
  async loadDashboardData() {
    try {
      // Carrega estatísticas de clientes
      const clientStats = await API.clients.getStats();
      this.updateClientStats(clientStats);
      
      // Carrega estatísticas de promoções
      const promoStats = await API.promotions.getStats();
      this.updatePromoStats(promoStats);
      
      // Carrega estatísticas de mensagens
      const messageStats = await API.messages.getStats();
      this.updateMessageStats(messageStats);
      
      // Carrega promoções recentes e próximas
      this.loadRecentPromotions();
      this.loadUpcomingPromotions();
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      UI.showToast('Erro ao carregar dados do dashboard. Verifique a conexão com o servidor.', 'danger');
    }
  },

  // Atualiza as estatísticas de clientes no dashboard
  updateClientStats(stats) {
    if (!stats) return;
    
    document.querySelector('.client-count').textContent = stats.total || 0;
    document.querySelector('.new-clients').textContent = stats.newThisMonth || 0;
  },

  // Atualiza as estatísticas de promoções no dashboard
  updatePromoStats(stats) {
    if (!stats) return;
    
    document.querySelector('.active-promos').textContent = stats.active || 0;
    document.querySelector('.scheduled-promos').textContent = stats.scheduled || 0;
  },

  // Atualiza as estatísticas de mensagens no dashboard
  updateMessageStats(stats) {
    if (!stats) return;
    
    document.querySelector('.messages-sent').textContent = stats.sent || 0;
    document.querySelector('.delivery-rate').textContent = stats.deliveryRate || 0;
    document.querySelector('.read-rate').textContent = `${stats.readRate || 0}%`;
    document.querySelector('.response-count').textContent = stats.responses || 0;
    
    // Atualiza o gráfico de status de mensagens se disponível
    if (UI.messageStatusChart && stats.statusBreakdown) {
      UI.messageStatusChart.data.datasets[0].data = [
        stats.statusBreakdown.sent || 0,
        stats.statusBreakdown.delivered || 0,
        stats.statusBreakdown.read || 0,
        stats.statusBreakdown.failed || 0
      ];
      UI.messageStatusChart.update();
    }
  },

  // Carrega as promoções recentes
  async loadRecentPromotions() {
    try {
      const promotions = await API.promotions.getAll();
      const recentPromosContainer = document.getElementById('recent-promos');
      
      if (!recentPromosContainer) return;
      
      // Filtra as promoções recentes (últimas 5)
      const recentPromos = promotions
        .filter(promo => promo.status === 'completed' || promo.status === 'active')
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5);
      
      if (recentPromos.length === 0) {
        recentPromosContainer.innerHTML = `
          <div class="list-group-item text-center py-5">
            <i class="fas fa-info-circle me-2"></i>Nenhuma promoção recente
          </div>
        `;
        return;
      }
      
      // Renderiza as promoções recentes
      recentPromosContainer.innerHTML = recentPromos.map(promo => `
        <div class="list-group-item promo-item ${promo.status}">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${promo.name}</h6>
            <small class="text-muted">${this.formatDate(promo.updatedAt)}</small>
          </div>
          <p class="mb-1 text-truncate-2">${promo.description}</p>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">
              <i class="fas fa-paper-plane me-1"></i>${promo.stats?.sent || 0} mensagens enviadas
            </small>
            <span class="badge bg-${promo.status === 'active' ? 'success' : 'secondary'} rounded-pill">
              ${promo.status === 'active' ? 'Ativa' : 'Concluída'}
            </span>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Erro ao carregar promoções recentes:', error);
    }
  },

  // Carrega as próximas promoções agendadas
  async loadUpcomingPromotions() {
    try {
      const promotions = await API.promotions.getAll();
      const upcomingPromosContainer = document.getElementById('upcoming-promos');
      
      if (!upcomingPromosContainer) return;
      
      // Filtra as promoções agendadas (próximas 5)
      const upcomingPromos = promotions
        .filter(promo => promo.status === 'scheduled')
        .sort((a, b) => new Date(a.schedule.startDate) - new Date(b.schedule.startDate))
        .slice(0, 5);
      
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
            <small class="text-muted">${this.formatDate(promo.schedule.startDate)}</small>
          </div>
          <p class="mb-1 text-truncate-2">${promo.description}</p>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">
              <i class="fas fa-clock me-1"></i>${this.formatTime(promo.schedule.startDate)}
            </small>
            <div>
              <button class="btn btn-sm btn-outline-secondary me-1" data-promo-id="${promo._id}" data-action="edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" data-promo-id="${promo._id}" data-action="cancel">
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
    // Verifica o status do WhatsApp a cada 30 segundos
    setInterval(() => {
      UI.checkWhatsAppStatus();
    }, 30000);
    
    // Atualiza os dados do dashboard a cada 5 minutos
    setInterval(() => {
      this.loadDashboardData();
    }, 300000);
  },

  // Edita uma promoção existente
  async editPromotion(promoId) {
    try {
      // Redireciona para a página de promoções com o ID da promoção
      UI.showPage('promotions');
      
      // Aqui você adicionaria código para carregar o formulário de edição
      // com os dados da promoção específica
      
    } catch (error) {
      console.error('Erro ao editar promoção:', error);
      UI.showToast('Erro ao editar promoção', 'danger');
    }
  },

  // Cancela uma promoção agendada
  async cancelPromotion(promoId) {
    if (!confirm('Tem certeza que deseja cancelar esta promoção?')) return;
    
    try {
      await API.promotions.cancel(promoId);
      UI.showToast('Promoção cancelada com sucesso', 'success');
      
      // Recarrega os dados
      this.loadUpcomingPromotions();
      
    } catch (error) {
      console.error('Erro ao cancelar promoção:', error);
      UI.showToast('Erro ao cancelar promoção', 'danger');
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
