/**
 * messages.js - Gerenciamento de mensagens
 */

const MessagesManager = {
  init() {
    console.log('Inicializando gerenciamento de mensagens...');
    this.setupEventListeners();
    this.loadMessages();
  },

  setupEventListeners() {
    // Formulário de nova mensagem
    const newMessageForm = document.getElementById('new-message-form');
    if (newMessageForm) {
      newMessageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }
    
    // Botão de enviar mensagem no modal
    const sendMessageBtn = document.getElementById('send-message-btn');
    if (sendMessageBtn) {
      sendMessageBtn.addEventListener('click', () => {
        this.sendMessage();
      });
    }
    
    // Botão de reenviar mensagem
    const resendMessageBtn = document.getElementById('resend-message-btn');
    if (resendMessageBtn) {
      resendMessageBtn.addEventListener('click', () => {
        this.resendMessage();
      });
    }
    
    // Botão de upload de mídia
    const uploadMediaBtn = document.getElementById('upload-message-media-btn');
    if (uploadMediaBtn) {
      uploadMediaBtn.addEventListener('click', () => {
        this.uploadMedia();
      });
    }
    
    // Botão de remover mídia
    const removeMediaBtn = document.getElementById('remove-message-media-btn');
    if (removeMediaBtn) {
      removeMediaBtn.addEventListener('click', () => {
        this.removeMedia();
      });
    }
    
    // Evento para limpar o formulário quando o modal de envio for aberto
    const newMessageModal = document.getElementById('newMessageModal');
    if (newMessageModal) {
      newMessageModal.addEventListener('show.bs.modal', () => {
        this.resetMessageForm();
      });
    }
    
    // Filtro de pesquisa
    const searchInput = document.getElementById('message-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.filterMessages();
      });
    }
    
    // Filtros de data
    const dateFilterForm = document.getElementById('date-filter-form');
    if (dateFilterForm) {
      dateFilterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.filterMessages();
      });
    }
    
    // Reset de filtros
    const resetFiltersBtn = document.getElementById('reset-filters');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }
  },
  
  async loadMessages() {
    const messagesContainer = document.getElementById('messages-list');
    if (!messagesContainer) return;
    
    try {
      // Mostrar o indicador de carregamento
      messagesContainer.innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Carregando...</span>
          </div>
        </div>
      `;
      
      const response = await fetch('/api/messages');
      const messages = await response.json();
      
      if (messages.length === 0) {
        messagesContainer.innerHTML = `
          <div class="alert alert-info text-center">
            <i class="fas fa-info-circle me-2"></i>Nenhuma mensagem encontrada
          </div>
        `;
        return;
      }
      
      // Renderizar a lista de mensagens
      messagesContainer.innerHTML = messages.map(message => `
        <div class="card mb-3 message-card" data-id="${message._id}">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <span class="badge ${this.getStatusBadgeClass(message.status)} me-2">${this.getStatusLabel(message.status)}</span>
              <strong>${message.to || 'Destinatário'}</strong>
            </div>
            <small class="text-muted">${this.formatDateTime(message.createdAt)}</small>
          </div>
          <div class="card-body">
            <p class="card-text">${message.text}</p>
            ${message.media ? `
              <div class="media-attachment mt-2">
                <i class="fas fa-paperclip me-1"></i>
                <a href="${message.media}" target="_blank">${this.getMediaTypeLabel(message.media)}</a>
              </div>
            ` : ''}
          </div>
          <div class="card-footer d-flex justify-content-between">
            <div>
              <small class="text-muted">
                ${message.readAt ? `<i class="fas fa-check-double text-primary me-1"></i>Lida em ${this.formatDateTime(message.readAt)}` : 
                 message.deliveredAt ? `<i class="fas fa-check me-1"></i>Entregue em ${this.formatDateTime(message.deliveredAt)}` : 
                 `<i class="fas fa-paper-plane me-1"></i>Enviada`}
              </small>
            </div>
            <div>
              <button class="btn btn-sm btn-outline-secondary me-1" onclick="MessagesManager.resendMessage('${message._id}')">
                <i class="fas fa-sync-alt"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="MessagesManager.deleteMessage('${message._id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      messagesContainer.innerHTML = `
        <div class="alert alert-danger text-center">
          <i class="fas fa-exclamation-circle me-2"></i>Erro ao carregar mensagens
        </div>
      `;
    }
  },
  
  sendMessage() {
    const recipient = document.getElementById('message-recipient').value;
    const text = document.getElementById('message-text').value;
    const mediaFile = document.getElementById('message-media').files[0];
    
    if (!recipient || !text) {
      alert('Por favor, informe o destinatário e o texto da mensagem');
      return;
    }
    
    // Criar FormData para envio de arquivos
    const formData = new FormData();
    formData.append('to', recipient);
    formData.append('text', text);
    
    if (mediaFile) {
      formData.append('media', mediaFile);
    }
    
    fetch('/api/messages', {
      method: 'POST',
      body: formData
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao enviar mensagem');
        }
        return response.json();
      })
      .then(data => {
        // Limpar o formulário
        document.getElementById('new-message-form').reset();
        
        // Fechar o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('newMessageModal'));
        modal.hide();
        
        // Recarregar a lista de mensagens
        this.loadMessages();
        
        // Mostrar mensagem de sucesso
        this.showToast('Mensagem enviada com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao enviar mensagem:', error);
        this.showToast('Erro ao enviar mensagem', 'danger');
      });
  },
  
  resendMessage(messageId) {
    if (!confirm('Deseja reenviar esta mensagem?')) return;
    
    fetch(`/api/messages/${messageId}/resend`, {
      method: 'POST'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao reenviar mensagem');
        }
        return response.json();
      })
      .then(data => {
        // Recarregar a lista de mensagens
        this.loadMessages();
        
        // Mostrar mensagem de sucesso
        this.showToast('Mensagem reenviada com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao reenviar mensagem:', error);
        this.showToast('Erro ao reenviar mensagem', 'danger');
      });
  },
  
  deleteMessage(messageId) {
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) return;
    
    fetch(`/api/messages/${messageId}`, {
      method: 'DELETE'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao excluir mensagem');
        }
        return response.json();
      })
      .then(data => {
        // Recarregar a lista de mensagens
        this.loadMessages();
        
        // Mostrar mensagem de sucesso
        this.showToast('Mensagem excluída com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao excluir mensagem:', error);
        this.showToast('Erro ao excluir mensagem', 'danger');
      });
  },
  
  filterMessages() {
    const searchTerm = document.getElementById('message-search')?.value.toLowerCase() || '';
    const startDate = document.getElementById('start-date')?.value || '';
    const endDate = document.getElementById('end-date')?.value || '';
    
    const messageCards = document.querySelectorAll('.message-card');
    
    messageCards.forEach(card => {
      const cardText = card.textContent.toLowerCase();
      const cardDate = card.querySelector('.text-muted')?.textContent || '';
      
      const matchesSearch = cardText.includes(searchTerm);
      const matchesDate = this.dateInRange(cardDate, startDate, endDate);
      
      card.style.display = (matchesSearch && matchesDate) ? '' : 'none';
    });
  },
  
  dateInRange(dateText, startDate, endDate) {
    if (!startDate && !endDate) return true;
    
    const cardDate = this.parseBrazilianDate(dateText);
    if (!cardDate) return true;
    
    if (startDate && !endDate) {
      return cardDate >= new Date(startDate);
    }
    
    if (!startDate && endDate) {
      return cardDate <= new Date(endDate);
    }
    
    return cardDate >= new Date(startDate) && cardDate <= new Date(endDate);
  },
  
  parseBrazilianDate(dateText) {
    // Tentar extrair uma data no formato dd/mm/yyyy de um texto
    const match = dateText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) return null;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // Meses em JS são 0-indexed
    const year = parseInt(match[3], 10);
    
    return new Date(year, month, day);
  },
  
  resetFilters() {
    if (document.getElementById('message-search')) {
      document.getElementById('message-search').value = '';
    }
    
    if (document.getElementById('start-date')) {
      document.getElementById('start-date').value = '';
    }
    
    if (document.getElementById('end-date')) {
      document.getElementById('end-date').value = '';
    }
    
    this.filterMessages();
  },
  
  getStatusBadgeClass(status) {
    switch (status) {
      case 'sent':
        return 'bg-info';
      case 'delivered':
        return 'bg-primary';
      case 'read':
        return 'bg-success';
      case 'failed':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  },
  
  getStatusLabel(status) {
    switch (status) {
      case 'sent':
        return 'Enviada';
      case 'delivered':
        return 'Entregue';
      case 'read':
        return 'Lida';
      case 'failed':
        return 'Falha';
      default:
        return status;
    }
  },
  
  getMediaTypeLabel(mediaUrl) {
    if (!mediaUrl) return 'Anexo';
    
    const extension = mediaUrl.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
      return 'Imagem';
    } else if (['mp4', 'avi', 'mov'].includes(extension)) {
      return 'Vídeo';
    } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
      return 'Áudio';
    } else if (['pdf'].includes(extension)) {
      return 'PDF';
    } else {
      return 'Arquivo';
    }
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
  
  uploadMedia() {
    // Implementação para upload de mídia
  },
  
  removeMedia() {
    // Implementação para remover mídia
  },
  
  resetMessageForm() {
    document.getElementById('new-message-form').reset();
  }
};

// Quando a página de mensagens for carregada, inicializar o gerenciador
document.addEventListener('DOMContentLoaded', () => {
  // Verifica se estamos na página de mensagens
  if (document.querySelector('#messages-list')) {
    MessagesManager.init();
  }
});

// Expõe o gerenciador globalmente para que os eventos onclick funcionem
window.MessagesManager = MessagesManager;
