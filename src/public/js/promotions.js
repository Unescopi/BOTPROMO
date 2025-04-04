/**
 * promotions.js - Gerenciamento de promoções
 */

const PromotionsManager = {
  init() {
    console.log('Inicializando gerenciamento de promoções...');
    
    // Verificar se o usuário está autenticado
    if (!Auth.isAuthenticated()) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
    this.setupEventListeners();
    this.loadPromotions();
  },

  setupEventListeners() {
    console.log('Configurando event listeners para promoções...');
    
    // Adicione logs para verificar se os botões estão sendo encontrados
    const savePromoBtn = document.getElementById('save-promo-btn');
    console.log('Botão salvar promoção:', savePromoBtn);
    
    if (savePromoBtn) {
      savePromoBtn.addEventListener('click', (e) => {
        console.log('Botão salvar promoção clicado');
        this.savePromotion();
      });
    }
    
    // Botão de salvar rascunho
    const saveDraftBtn = document.getElementById('save-draft-btn');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => this.saveAsDraft());
    }
    
    // Botão de enviar teste
    const sendTestBtn = document.getElementById('send-test-btn');
    if (sendTestBtn) {
      sendTestBtn.addEventListener('click', () => this.sendTestPromotion());
    }
    
    // Botão de editar promoção
    const editPromoBtn = document.getElementById('edit-promo-btn');
    if (editPromoBtn) {
      editPromoBtn.addEventListener('click', () => this.editPromotion());
    }
    
    // Botão de enviar promoção agora
    const sendPromoNowBtn = document.getElementById('send-promo-now-btn');
    if (sendPromoNowBtn) {
      sendPromoNowBtn.addEventListener('click', () => this.sendPromotionNow());
    }
    
    // Botões para abrir o modal de nova promoção
    const newPromoBtn = document.getElementById('new-promo-btn');
    if (newPromoBtn) {
      newPromoBtn.addEventListener('click', () => this.resetPromoForm());
    }
    
    // Mudança no tipo de segmentação
    const targetingTypeRadios = document.querySelectorAll('input[name="targeting-type"]');
    if (targetingTypeRadios.length > 0) {
      targetingTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => this.toggleTargetingOptions());
      });
    }
    
    // Mudança no tipo de agendamento
    const scheduleType = document.getElementById('schedule-type');
    if (scheduleType) {
      scheduleType.addEventListener('change', () => this.toggleScheduleOptions());
    }
  },
  
  async loadPromotions() {
    const promotionsContainer = document.getElementById('promotions-list');
    if (!promotionsContainer) return;
    
    try {
      // Mostrar o indicador de carregamento
      promotionsContainer.innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Carregando...</span>
          </div>
        </div>
      `;
      
      // Obter filtros
      const searchTerm = document.getElementById('promotion-search')?.value || '';
      const startDate = document.getElementById('start-date')?.value || '';
      const endDate = document.getElementById('end-date')?.value || '';
      const statusFilter = document.getElementById('status-filter')?.value || '';
      
      // Construir URL com parâmetros de filtro
      let endpoint = '/promotions';
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('start', startDate);
      if (endDate) params.append('end', endDate);
      if (statusFilter) params.append('status', statusFilter);
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      let promotions = [];
      let fetchSuccess = false;
      
      try {
        console.log('Buscando promoções da API:', endpoint);
        promotions = await API.get(endpoint);
        console.log('Promoções recebidas:', promotions);
        fetchSuccess = true;
      } catch (apiError) {
        console.error('Erro ao buscar promoções:', apiError);
        
        // Verificar se é um erro de autenticação
        if (apiError?.message?.includes('Sessão expirada')) {
          Auth.logout();
          return;
        }
        
        // Mostrar toast de erro, mas continuar com dados de exemplo
        this.showToast(`Erro ao carregar promoções: ${apiError.message || 'Falha na comunicação com o servidor'}`, 'warning');
      }
      
      // Verificar se temos dados para mostrar
      if (!promotions || !Array.isArray(promotions) || promotions.length === 0) {
        console.warn('Nenhuma promoção retornada da API ou erro na solicitação. Usando dados de exemplo.');
        
        // Criar promoções de exemplo para demonstração
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        
        promotions = [
          {
            _id: 'promo-demo-1',
            title: 'Happy Hour - Café com Desconto',
            description: 'De segunda a sexta, das 16h às 18h, todos os cafés com 15% de desconto!',
            schedule: {
              startDate: tomorrow.toISOString(),
              sendTime: '16:00'
            },
            status: 'scheduled',
            message: {
              text: 'Aproveite nosso Happy Hour de hoje! 15% de desconto em todos os cafés das 16h às 18h. Esperamos você!',
              media: null
            },
            createdAt: now.toISOString(),
            targetAudience: {
              filters: { tags: ['cliente-vip'] },
              count: 25
            }
          },
          {
            _id: 'promo-demo-2',
            title: 'Feriado Especial',
            description: 'Promoção especial para o feriado, com descontos em toda a loja',
            schedule: {
              startDate: nextWeek.toISOString(),
              sendTime: '09:00'
            },
            status: 'scheduled',
            message: {
              text: 'Promoção especial de feriado! Venha aproveitar descontos de até 30% em toda a loja. Válido apenas hoje!',
              media: 'https://exemplo.com/imagens/promo-feriado.jpg'
            },
            createdAt: now.toISOString(),
            targetAudience: {
              filters: { tags: [] },
              count: 150
            }
          },
          {
            _id: 'promo-demo-3',
            title: 'Lançamento do Café Premium',
            description: 'Anúncio de lançamento do novo café premium da casa',
            schedule: {
              startDate: yesterday.toISOString(),
              sendTime: '10:30'
            },
            status: 'sent',
            message: {
              text: 'Apresentamos nosso novo Café Premium! Grãos selecionados com notas de chocolate e frutas vermelhas. Venha experimentar!',
              media: null
            },
            stats: {
              sent: 120,
              delivered: 115,
              read: 98,
              failed: 5
            },
            createdAt: new Date(yesterday.getTime() - 48 * 3600000).toISOString(),
            targetAudience: {
              filters: { tags: ['apreciador-cafe'] },
              count: 120
            }
          }
        ];
        
        // Se houve falha na solicitação, mostrar banner informativo
        if (!fetchSuccess) {
          // Criar banner informativo acima da lista de promoções
          const infoAlert = document.createElement('div');
          infoAlert.className = 'alert alert-warning alert-dismissible fade show mb-4';
          infoAlert.innerHTML = `
            <strong><i class="fas fa-info-circle me-2"></i>Modo de demonstração</strong>
            <p class="mb-0">Exibindo promoções de exemplo. A conexão com o servidor falhou.</p>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
          `;
          
          // Inserir antes da lista de promoções
          promotionsContainer.parentNode.insertBefore(infoAlert, promotionsContainer);
        }
      }
      
      // Renderizar promoções - reais ou de exemplo
      if (promotions.length === 0) {
        promotionsContainer.innerHTML = `
          <div class="alert alert-info text-center">
            <i class="fas fa-info-circle me-2"></i>Nenhuma promoção encontrada
          </div>
        `;
        return;
      }
      
      // Atualizar os contadores
      const activeCount = promotions.filter(p => p.status === 'scheduled').length;
      const sentCount = promotions.filter(p => p.status === 'sent').length;
      const totalCount = promotions.length;
      
      document.getElementById('active-promotions-count')?.innerText = activeCount;
      document.getElementById('sent-promotions-count')?.innerText = sentCount;
      document.getElementById('total-promotions-count')?.innerText = totalCount;
      
      // Renderizar a lista de promoções
      promotionsContainer.innerHTML = promotions.map(promotion => `
        <div class="card mb-3 promotion-card" data-id="${promotion._id}">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <span class="badge ${this.getStatusBadgeClass(promotion.status)} me-2">${this.getStatusLabel(promotion.status)}</span>
              <strong>${promotion.title}</strong>
            </div>
            <small class="text-muted">
              ${promotion.status === 'scheduled' ? 
                `Agendada para ${this.formatDate(promotion.schedule.startDate)} às ${promotion.schedule.sendTime}` : 
                `Enviada em ${this.formatDate(promotion.schedule.startDate)}`}
            </small>
          </div>
          <div class="card-body">
            <p class="card-text">${promotion.description}</p>
            <div class="mt-2">
              <strong>Mensagem:</strong>
              <p class="message-preview">${promotion.message.text}</p>
              ${promotion.message.media ? `
                <div class="media-attachment mt-2">
                  <i class="fas fa-paperclip me-1"></i>
                  <a href="${promotion.message.media}" target="_blank">Anexo</a>
                </div>
              ` : ''}
            </div>
            <div class="audience-info mt-3">
              <i class="fas fa-users me-1"></i>
              <strong>Público-alvo:</strong> ${promotion.targetAudience.count} contatos
              ${promotion.targetAudience.filters.tags && promotion.targetAudience.filters.tags.length > 0 ? 
                ` <span class="ms-2"><i class="fas fa-tags me-1"></i>Tags: ${promotion.targetAudience.filters.tags.join(', ')}</span>` : 
                ''
              }
            </div>
            ${promotion.status === 'sent' && promotion.stats ? `
              <div class="stats-container mt-3">
                <h6>Estatísticas</h6>
                <div class="d-flex stats-row">
                  <div class="stat-item">
                    <i class="fas fa-paper-plane text-primary"></i>
                    <span class="stat-value">${promotion.stats.sent}</span>
                    <span class="stat-label">Enviadas</span>
                  </div>
                  <div class="stat-item">
                    <i class="fas fa-check text-success"></i>
                    <span class="stat-value">${promotion.stats.delivered}</span>
                    <span class="stat-label">Entregues</span>
                  </div>
                  <div class="stat-item">
                    <i class="fas fa-eye text-info"></i>
                    <span class="stat-value">${promotion.stats.read}</span>
                    <span class="stat-label">Lidas</span>
                  </div>
                  <div class="stat-item">
                    <i class="fas fa-times text-danger"></i>
                    <span class="stat-value">${promotion.stats.failed}</span>
                    <span class="stat-label">Falhas</span>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
          <div class="card-footer">
            <div class="d-flex justify-content-between">
              <div>
                <small class="text-muted">Criada em ${this.formatDateTime(promotion.createdAt)}</small>
              </div>
              <div>
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="PromotionsManager.viewPromotion('${promotion._id}')">
                  <i class="fas fa-eye"></i>
                </button>
                ${promotion.status === 'scheduled' ? `
                  <button class="btn btn-sm btn-outline-primary me-1" onclick="PromotionsManager.editPromotion('${promotion._id}')">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-warning me-1" onclick="PromotionsManager.cancelPromotion('${promotion._id}')">
                    <i class="fas fa-ban"></i>
                  </button>
                ` : ''}
                <button class="btn btn-sm btn-outline-danger" onclick="PromotionsManager.deletePromotion('${promotion._id}')">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Erro ao processar promoções:', error);
      
      // Exibir mensagem de erro
      promotionsContainer.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Erro ao processar promoções: ${error.message || 'Erro desconhecido'}
          <button class="btn btn-sm btn-outline-primary mt-2" onclick="PromotionsManager.loadPromotions()">
            <i class="fas fa-sync me-1"></i>Tentar novamente
          </button>
        </div>
      `;
    }
  },
  
  async savePromotion() {
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Obter dados do formulário
      const promoId = document.getElementById('promo-id')?.value;
      const name = document.getElementById('promo-name')?.value;
      const description = document.getElementById('promo-description')?.value;
      const message = document.getElementById('message-text')?.value;
      
      // Validar campos obrigatórios
      if (!name || !message) {
        this.showToast('Nome e mensagem são obrigatórios', 'warning');
        return;
      }
      
      // Obter opções de segmentação
      const targetingType = document.querySelector('input[name="targeting-type"]:checked')?.value || 'all';
      let targetingOptions = {};
      
      if (targetingType === 'tag') {
        targetingOptions.tag = document.getElementById('target-tag')?.value;
        if (!targetingOptions.tag) {
          this.showToast('Selecione uma tag para segmentação', 'warning');
          return;
        }
      } else if (targetingType === 'custom') {
        targetingOptions.clientIds = document.getElementById('target-clients')?.value.split(',').map(id => id.trim());
        if (!targetingOptions.clientIds || targetingOptions.clientIds.length === 0) {
          this.showToast('Selecione pelo menos um cliente para segmentação personalizada', 'warning');
          return;
        }
      }
      
      // Obter opções de agendamento
      const scheduleType = document.getElementById('schedule-type')?.value || 'now';
      let scheduleOptions = {};
      
      if (scheduleType === 'scheduled') {
        const scheduleDate = document.getElementById('schedule-date')?.value;
        const scheduleTime = document.getElementById('schedule-time')?.value;
        
        if (!scheduleDate || !scheduleTime) {
          this.showToast('Data e hora de agendamento são obrigatórios', 'warning');
          return;
        }
        
        // Combinar data e hora
        scheduleOptions.scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
      }
      
      // Preparar dados da promoção
      const promotionData = {
        name,
        description,
        message,
        targeting: {
          type: targetingType,
          ...targetingOptions
        },
        scheduling: {
          type: scheduleType,
          ...scheduleOptions
        },
        status: scheduleType === 'now' ? 'sending' : 'scheduled'
      };
      
      // Desabilitar o botão de salvar para evitar cliques duplos
      const saveButton = document.getElementById('save-promo-btn');
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';
      }
      
      // Usar o módulo API centralizado
      let result;
      if (promoId) {
        result = await API.promotions.update(promoId, promotionData);
      } else {
        result = await API.promotions.create(promotionData);
      }
      
      // Fechar o modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('newPromoModal'));
      if (modal) {
        modal.hide();
      }
      
      // Recarregar a lista de promoções
      this.loadPromotions();
      
      // Mostrar mensagem de sucesso
      this.showToast(`Promoção ${promoId ? 'atualizada' : 'criada'} com sucesso`, 'success');
      
    } catch (error) {
      console.error('Erro ao salvar promoção:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao salvar promoção: ${error.message || 'Erro desconhecido'}`, 'danger');
    } finally {
      // Restaurar o botão de salvar
      const saveButton = document.getElementById('save-promo-btn');
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = 'Salvar e Enviar';
      }
    }
  },
  
  async saveAsDraft() {
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Obter dados do formulário
      const promoId = document.getElementById('promo-id')?.value;
      const name = document.getElementById('promo-name')?.value || 'Rascunho sem título';
      const description = document.getElementById('promo-description')?.value || '';
      const message = document.getElementById('message-text')?.value || '';
      
      // Obter opções de segmentação
      const targetingType = document.querySelector('input[name="targeting-type"]:checked')?.value || 'all';
      let targetingOptions = {};
      
      if (targetingType === 'tag') {
        targetingOptions.tag = document.getElementById('target-tag')?.value;
      } else if (targetingType === 'custom') {
        targetingOptions.clientIds = document.getElementById('target-clients')?.value.split(',').map(id => id.trim());
      }
      
      // Obter opções de agendamento
      const scheduleType = document.getElementById('schedule-type')?.value || 'now';
      let scheduleOptions = {};
      
      if (scheduleType === 'scheduled') {
        const scheduleDate = document.getElementById('schedule-date')?.value;
        const scheduleTime = document.getElementById('schedule-time')?.value;
        
        if (scheduleDate && scheduleTime) {
          scheduleOptions.scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
        }
      }
      
      // Preparar dados da promoção
      const promotionData = {
        name,
        description,
        message,
        targeting: {
          type: targetingType,
          ...targetingOptions
        },
        scheduling: {
          type: scheduleType,
          ...scheduleOptions
        },
        status: 'draft'
      };
      
      // Desabilitar o botão de salvar para evitar cliques duplos
      const saveDraftButton = document.getElementById('save-draft-btn');
      if (saveDraftButton) {
        saveDraftButton.disabled = true;
        saveDraftButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';
      }
      
      // Usar o módulo API centralizado
      let result;
      if (promoId) {
        result = await API.promotions.update(promoId, promotionData);
      } else {
        result = await API.promotions.create(promotionData);
      }
      
      // Fechar o modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('newPromoModal'));
      if (modal) {
        modal.hide();
      }
      
      // Recarregar a lista de promoções
      this.loadPromotions();
      
      // Mostrar mensagem de sucesso
      this.showToast('Rascunho salvo com sucesso', 'success');
      
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao salvar rascunho: ${error.message || 'Erro desconhecido'}`, 'danger');
    } finally {
      // Restaurar o botão de salvar
      const saveDraftButton = document.getElementById('save-draft-btn');
      if (saveDraftButton) {
        saveDraftButton.disabled = false;
        saveDraftButton.innerHTML = 'Salvar Rascunho';
      }
    }
  },

  async viewPromotion(promoId) {
    if (!promoId) {
      this.showToast('ID da promoção não fornecido', 'warning');
      return;
    }
    
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Obter dados da promoção
      const promotion = await API.promotions.get(promoId);
      
      // Preencher o modal de visualização
      document.getElementById('view-promo-name').textContent = promotion.name;
      document.getElementById('view-promo-description').textContent = promotion.description || 'Sem descrição';
      document.getElementById('view-promo-message').textContent = promotion.message;
      document.getElementById('view-promo-status').innerHTML = `<span class="badge ${this.getStatusBadgeClass(promotion.status)}">${this.getStatusLabel(promotion.status)}</span>`;
      document.getElementById('view-promo-created').textContent = this.formatDateTime(promotion.createdAt);
      document.getElementById('view-promo-scheduled').textContent = promotion.scheduledFor ? this.formatDateTime(promotion.scheduledFor) : 'Não agendado';
      document.getElementById('view-promo-sent').textContent = promotion.sentCount || 0;
      
      // Abrir o modal
      const modal = new bootstrap.Modal(document.getElementById('viewPromoModal'));
      modal.show();
      
    } catch (error) {
      console.error('Erro ao visualizar promoção:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao carregar dados da promoção: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },
  
  async editPromotion(promoId) {
    if (!promoId) {
      this.showToast('ID da promoção não fornecido', 'warning');
      return;
    }
    
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Obter dados da promoção
      const promotion = await API.promotions.get(promoId);
      
      // Verificar se a promoção está em estado editável
      if (promotion.status !== 'draft') {
        this.showToast('Apenas promoções em rascunho podem ser editadas', 'warning');
        return;
      }
      
      // Preencher o formulário
      document.getElementById('promo-id').value = promotion._id;
      document.getElementById('promo-name').value = promotion.name;
      document.getElementById('promo-description').value = promotion.description || '';
      document.getElementById('message-text').value = promotion.message;
      
      // Configurar opções de segmentação
      if (promotion.targeting) {
        const targetingType = promotion.targeting.type || 'all';
        document.querySelector(`input[name="targeting-type"][value="${targetingType}"]`).checked = true;
        
        if (targetingType === 'tag' && promotion.targeting.tag) {
          document.getElementById('target-tag').value = promotion.targeting.tag;
        } else if (targetingType === 'custom' && promotion.targeting.clientIds) {
          document.getElementById('target-clients').value = promotion.targeting.clientIds.join(', ');
        }
        
        this.toggleTargetingOptions();
      }
      
      // Configurar opções de agendamento
      if (promotion.scheduling) {
        const scheduleType = promotion.scheduling.type || 'now';
        document.getElementById('schedule-type').value = scheduleType;
        
        if (scheduleType === 'scheduled' && promotion.scheduling.scheduledFor) {
          const scheduledDate = new Date(promotion.scheduling.scheduledFor);
          document.getElementById('schedule-date').value = scheduledDate.toISOString().split('T')[0];
          document.getElementById('schedule-time').value = scheduledDate.toTimeString().slice(0, 5);
        }
        
        this.toggleScheduleOptions();
      }
      
      // Atualizar o título do modal
      document.getElementById('promo-modal-title').innerHTML = '<i class="fas fa-edit me-2"></i>Editar Promoção';
      
      // Abrir o modal
      const modal = new bootstrap.Modal(document.getElementById('newPromoModal'));
      modal.show();
      
    } catch (error) {
      console.error('Erro ao editar promoção:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao buscar dados da promoção: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },
  
  async cancelPromotion(promoId) {
    if (!promoId) {
      this.showToast('ID da promoção não fornecido', 'warning');
      return;
    }
    
    if (!confirm('Tem certeza que deseja cancelar esta promoção?')) {
      return;
    }
    
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Usar o módulo API centralizado
      await API.promotions.cancel(promoId);
      
      // Recarregar a lista de promoções
      this.loadPromotions();
      
      // Mostrar mensagem de sucesso
      this.showToast('Promoção cancelada com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao cancelar promoção:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao cancelar promoção: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },
  
  async deletePromotion(id) {
    if (!id) {
      this.showToast('ID da promoção não fornecido', 'warning');
      return;
    }
    
    if (!confirm('Tem certeza que deseja excluir esta promoção?')) {
      return;
    }
    
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Usar o módulo API centralizado
      await API.promotions.delete(id);
      
      // Recarregar a lista de promoções
      this.loadPromotions();
      
      // Mostrar mensagem de sucesso
      this.showToast('Promoção excluída com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao excluir promoção:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao excluir promoção: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },

  async sendTestPromotion() {
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Obter dados do formulário
      const message = document.getElementById('message-text')?.value;
      
      if (!message) {
        this.showToast('É necessário preencher a mensagem para enviar um teste', 'warning');
        return;
      }
      
      // Solicitar número para teste
      const testPhone = prompt('Digite o número de telefone para enviar o teste (com DDD):');
      if (!testPhone) return;
      
      // Validar formato do telefone
      if (!/^\d{10,11}$/.test(testPhone.replace(/\D/g, ''))) {
        this.showToast('Número de telefone inválido. Use o formato com DDD (ex: 11999999999)', 'warning');
        return;
      }
      
      // Desabilitar o botão
      const testButton = document.getElementById('send-test-btn');
      if (testButton) {
        testButton.disabled = true;
        testButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
      }
      
      // Enviar mensagem de teste
      await API.promotions.sendTest({
        phone: testPhone.replace(/\D/g, ''),
        message
      });
      
      // Mostrar mensagem de sucesso
      this.showToast('Mensagem de teste enviada com sucesso', 'success');
      
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao enviar teste: ${error.message || 'Erro desconhecido'}`, 'danger');
    } finally {
      // Restaurar o botão
      const testButton = document.getElementById('send-test-btn');
      if (testButton) {
        testButton.disabled = false;
        testButton.innerHTML = 'Enviar Teste';
      }
    }
  },
  
  async sendPromotionNow() {
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      const promoId = document.getElementById('promo-id')?.value;
      if (!promoId) {
        // Se não tiver ID, salvar primeiro como nova promoção
        await this.savePromotion();
        return;
      }
      
      if (!confirm('Tem certeza que deseja enviar esta promoção agora para todos os destinatários?')) {
        return;
      }
      
      // Desabilitar o botão
      const sendButton = document.getElementById('send-promo-now-btn');
      if (sendButton) {
        sendButton.disabled = true;
        sendButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
      }
      
      // Enviar promoção imediatamente
      await API.promotions.sendNow(promoId);
      
      // Fechar o modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('newPromoModal'));
      if (modal) {
        modal.hide();
      }
      
      // Recarregar a lista de promoções
      this.loadPromotions();
      
      // Mostrar mensagem de sucesso
      this.showToast('Promoção enviada com sucesso', 'success');
      
    } catch (error) {
      console.error('Erro ao enviar promoção:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao enviar promoção: ${error.message || 'Erro desconhecido'}`, 'danger');
    } finally {
      // Restaurar o botão
      const sendButton = document.getElementById('send-promo-now-btn');
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.innerHTML = 'Enviar Agora';
      }
    }
  },

  toggleTargetingOptions() {
    const targetingType = document.querySelector('input[name="targeting-type"]:checked').value;
    const targetingOptions = document.getElementById('targeting-options');
    
    if (targetingType === 'specific') {
      targetingOptions.classList.remove('d-none');
    } else {
      targetingOptions.classList.add('d-none');
    }
  },
  
  toggleScheduleOptions() {
    const scheduleType = document.getElementById('schedule-type').value;
    const endDateGroup = document.getElementById('end-date-group');
    const sendTimeGroup = document.getElementById('send-time-group');
    const cronExpressionGroup = document.getElementById('cron-expression-group');
    
    // Esconder/mostrar campos baseado no tipo de agendamento
    if (scheduleType === 'once') {
      endDateGroup.classList.add('d-none');
      sendTimeGroup.classList.remove('d-none');
      cronExpressionGroup.classList.add('d-none');
    } else if (scheduleType === 'custom') {
      endDateGroup.classList.remove('d-none');
      sendTimeGroup.classList.add('d-none');
      cronExpressionGroup.classList.remove('d-none');
    } else {
      // Para agendamentos recorrentes (diário, semanal, mensal)
      endDateGroup.classList.remove('d-none');
      sendTimeGroup.classList.remove('d-none');
      cronExpressionGroup.classList.add('d-none');
    }
  },
  
  getStatusBadgeClass(status) {
    switch (status) {
      case 'draft':
        return 'bg-secondary';
      case 'scheduled':
        return 'bg-primary';
      case 'sending':
        return 'bg-info';
      case 'sent':
        return 'bg-success';
      case 'canceled':
        return 'bg-warning';
      case 'failed':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  },
  
  getStatusLabel(status) {
    switch (status) {
      case 'draft':
        return 'Rascunho';
      case 'scheduled':
        return 'Agendada';
      case 'sending':
        return 'Enviando';
      case 'sent':
        return 'Enviada';
      case 'canceled':
        return 'Cancelada';
      case 'failed':
        return 'Falha';
      default:
        return status;
    }
  },
  
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  },
  
  formatDateTime(dateString) {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`;
  },
  
  showToast(message, type = 'info') {
    // Se o App.showToast estiver disponível, use-o
    if (window.App && window.App.showToast) {
      window.App.showToast(message, type);
      return;
    }
    
    // Caso contrário, use uma implementação simples
    alert(message);
  },
  
  resetPromoForm() {
    // Resetar o formulário de promoção
    const newPromoForm = document.getElementById('new-promo-form');
    if (newPromoForm) {
      newPromoForm.reset();
    }
  }
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM carregado para gerenciamento de promoções');
  if (document.querySelector('.promotions-table')) {
    PromotionsManager.init();
  }
});

// Expõe o gerenciador globalmente para que os eventos onclick funcionem
window.PromotionsManager = PromotionsManager;
