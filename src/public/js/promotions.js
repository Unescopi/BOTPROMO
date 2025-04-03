/**
 * promotions.js - Gerenciamento de promoções
 */

const PromotionsManager = {
  init() {
    console.log('Inicializando gerenciamento de promoções...');
    this.setupEventListeners();
    this.loadPromotions();
  },

  setupEventListeners() {
    // Formulário de nova promoção
    const newPromoForm = document.getElementById('new-promo-form');
    if (newPromoForm) {
      newPromoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.savePromotion();
      });
    }
    
    // Botão de salvar rascunho
    const saveDraftBtn = document.getElementById('save-draft-btn');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => this.saveAsDraft());
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
    const promotionsTable = document.querySelector('.promotions-table tbody');
    if (!promotionsTable) return;
    
    try {
      // Mostrar o indicador de carregamento
      promotionsTable.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Carregando...</span>
            </div>
          </td>
        </tr>
      `;
      
      const response = await fetch('/api/promotions');
      const promotions = await response.json();
      
      if (promotions.length === 0) {
        promotionsTable.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4">
              <i class="fas fa-info-circle me-2"></i>Nenhuma promoção encontrada
            </td>
          </tr>
        `;
        return;
      }
      
      // Renderizar a lista de promoções
      promotionsTable.innerHTML = promotions.map(promotion => `
        <tr>
          <td>${promotion.name}</td>
          <td>${this.formatDate(promotion.createdAt)}</td>
          <td>
            <span class="badge ${this.getStatusBadgeClass(promotion.status)}">${this.getStatusLabel(promotion.status)}</span>
          </td>
          <td>${promotion.scheduledFor ? this.formatDateTime(promotion.scheduledFor) : '-'}</td>
          <td>${promotion.sentCount || 0}</td>
          <td>
            <div class="btn-group" role="group">
              <button class="btn btn-sm btn-outline-primary" onclick="PromotionsManager.viewPromotion('${promotion._id}')">
                <i class="fas fa-eye"></i>
              </button>
              ${promotion.status === 'draft' || promotion.status === 'scheduled' ? `
                <button class="btn btn-sm btn-outline-secondary" onclick="PromotionsManager.editPromotion('${promotion._id}')">
                  <i class="fas fa-edit"></i>
                </button>
              ` : ''}
              ${promotion.status === 'scheduled' ? `
                <button class="btn btn-sm btn-outline-warning" onclick="PromotionsManager.cancelPromotion('${promotion._id}')">
                  <i class="fas fa-ban"></i>
                </button>
              ` : ''}
              <button class="btn btn-sm btn-outline-danger" onclick="PromotionsManager.deletePromotion('${promotion._id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
      
    } catch (error) {
      console.error('Erro ao carregar promoções:', error);
      promotionsTable.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-danger py-4">
            <i class="fas fa-exclamation-circle me-2"></i>Erro ao carregar promoções
          </td>
        </tr>
      `;
    }
  },
  
  savePromotion() {
    // Obter dados do formulário
    const promoName = document.getElementById('promo-name').value;
    const promoDescription = document.getElementById('promo-description').value;
    const promoType = document.getElementById('promo-type').value;
    const messageText = document.getElementById('message-text').value;
    
    // Validação básica
    if (!promoName || !promoDescription || !messageText) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    
    // Obter dados de segmentação
    const targetingType = document.querySelector('input[name="targeting-type"]:checked').value;
    
    // Dados de agendamento
    const scheduleType = document.getElementById('schedule-type').value;
    const startDate = document.getElementById('start-date').value;
    const sendTime = document.getElementById('send-time').value;
    
    if (!startDate) {
      alert('Por favor, selecione uma data de início');
      return;
    }
    
    // Montar objeto de promoção
    const promotionData = {
      name: promoName,
      description: promoDescription,
      type: promoType,
      message: messageText,
      targeting: {
        type: targetingType
      },
      schedule: {
        type: scheduleType,
        startDate: startDate,
        sendTime: sendTime || '12:00'
      },
      status: 'scheduled'
    };
    
    // Se a segmentação for específica, adicionar configurações de segmentação
    if (targetingType === 'specific') {
      const includeTags = Array.from(document.getElementById('include-tags').selectedOptions).map(option => option.value);
      const excludeTags = Array.from(document.getElementById('exclude-tags').selectedOptions).map(option => option.value);
      const frequencyMin = document.getElementById('frequency-min').value;
      const frequencyMax = document.getElementById('frequency-max').value;
      const lastVisitDays = document.getElementById('last-visit-days').value;
      
      promotionData.targeting.includeTags = includeTags;
      promotionData.targeting.excludeTags = excludeTags;
      
      if (frequencyMin) promotionData.targeting.frequencyMin = parseInt(frequencyMin);
      if (frequencyMax) promotionData.targeting.frequencyMax = parseInt(frequencyMax);
      if (lastVisitDays) promotionData.targeting.lastVisitDays = parseInt(lastVisitDays);
    }
    
    // Se o agendamento for recorrente, adicionar configurações adicionais
    if (scheduleType !== 'once') {
      const endDate = document.getElementById('end-date').value;
      if (endDate) promotionData.schedule.endDate = endDate;
      
      if (scheduleType === 'custom') {
        const cronExpression = document.getElementById('cron-expression').value;
        if (!cronExpression) {
          alert('Por favor, insira uma expressão cron para o agendamento personalizado');
          return;
        }
        promotionData.schedule.cronExpression = cronExpression;
      }
    }
    
    // Enviar para a API
    fetch('/api/promotions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promotionData)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao salvar promoção');
        }
        return response.json();
      })
      .then(data => {
        // Fechar o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('newPromoModal'));
        modal.hide();
        
        // Recarregar a lista de promoções
        this.loadPromotions();
        
        // Mostrar mensagem de sucesso
        this.showToast('Promoção agendada com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao salvar promoção:', error);
        this.showToast('Erro ao salvar promoção', 'danger');
      });
  },
  
  saveAsDraft() {
    // Similar à função savePromotion, mas salva como rascunho
    const promoName = document.getElementById('promo-name').value;
    
    if (!promoName) {
      alert('Por favor, informe pelo menos o nome da promoção');
      return;
    }
    
    // Obter outros dados disponíveis no formulário
    const promoDescription = document.getElementById('promo-description').value || '';
    const messageText = document.getElementById('message-text').value || '';
    
    const promotionData = {
      name: promoName,
      description: promoDescription,
      message: messageText,
      status: 'draft'
    };
    
    fetch('/api/promotions/draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promotionData)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao salvar rascunho');
        }
        return response.json();
      })
      .then(data => {
        // Fechar o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('newPromoModal'));
        modal.hide();
        
        // Recarregar a lista de promoções
        this.loadPromotions();
        
        // Mostrar mensagem de sucesso
        this.showToast('Rascunho salvo com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao salvar rascunho:', error);
        this.showToast('Erro ao salvar rascunho', 'danger');
      });
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
  
  viewPromotion(promoId) {
    // Redirecionar para página de detalhes da promoção ou abrir um modal
    fetch(`/api/promotions/${promoId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao buscar detalhes da promoção');
        }
        return response.json();
      })
      .then(promotion => {
        // Aqui você pode implementar a lógica para exibir os detalhes
        // Por exemplo, abrindo um modal com os detalhes da promoção
        alert(`Detalhes da promoção "${promotion.name}" serão exibidos aqui.`);
      })
      .catch(error => {
        console.error('Erro ao visualizar promoção:', error);
        this.showToast('Erro ao buscar detalhes da promoção', 'danger');
      });
  },
  
  editPromotion(promoId) {
    // Semelhante à função anterior, mas para edição
    fetch(`/api/promotions/${promoId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao buscar dados da promoção');
        }
        return response.json();
      })
      .then(promotion => {
        // Abre o modal de edição e preenche os campos
        // (Você precisaria ter um modal de edição separado ou ajustar o existente)
        
        // Exemplo básico:
        document.getElementById('promo-name').value = promotion.name;
        document.getElementById('promo-description').value = promotion.description;
        document.getElementById('message-text').value = promotion.message;
        
        // Abrir o modal
        const modal = new bootstrap.Modal(document.getElementById('newPromoModal'));
        modal.show();
      })
      .catch(error => {
        console.error('Erro ao editar promoção:', error);
        this.showToast('Erro ao buscar dados da promoção', 'danger');
      });
  },
  
  cancelPromotion(promoId) {
    if (!confirm('Tem certeza que deseja cancelar esta promoção?')) return;
    
    fetch(`/api/promotions/${promoId}/cancel`, {
      method: 'POST'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao cancelar promoção');
        }
        return response.json();
      })
      .then(data => {
        // Recarregar a lista de promoções
        this.loadPromotions();
        
        // Mostrar mensagem de sucesso
        this.showToast('Promoção cancelada com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao cancelar promoção:', error);
        this.showToast('Erro ao cancelar promoção', 'danger');
      });
  },
  
  deletePromotion(promoId) {
    if (!confirm('Tem certeza que deseja excluir esta promoção?')) return;
    
    fetch(`/api/promotions/${promoId}`, {
      method: 'DELETE'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao excluir promoção');
        }
        return response.json();
      })
      .then(data => {
        // Recarregar a lista de promoções
        this.loadPromotions();
        
        // Mostrar mensagem de sucesso
        this.showToast('Promoção excluída com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao excluir promoção:', error);
        this.showToast('Erro ao excluir promoção', 'danger');
      });
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
  }
};

// Quando a página de promoções for carregada, inicializar o gerenciador
document.addEventListener('DOMContentLoaded', () => {
  // Verifica se estamos na página de promoções
  if (document.querySelector('.promotions-table')) {
    PromotionsManager.init();
  }
});

// Expõe o gerenciador globalmente para que os eventos onclick funcionem
window.PromotionsManager = PromotionsManager;
