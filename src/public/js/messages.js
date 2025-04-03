/**
 * messages.js - Gerenciamento de mensagens
 */

const MessagesManager = {
  init() {
    console.log('Inicializando gerenciamento de mensagens...');
    
    // Verificar se o usuário está autenticado
    if (!Auth.isAuthenticated()) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
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
      
      // Filtros
      const searchTerm = document.getElementById('message-search')?.value || '';
      const startDate = document.getElementById('start-date')?.value || '';
      const endDate = document.getElementById('end-date')?.value || '';
      const statusFilter = document.getElementById('status-filter')?.value || '';
      
      // Construir URL com parâmetros de filtro
      let endpoint = '/messages';
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('start', startDate);
      if (endDate) params.append('end', endDate);
      if (statusFilter) params.append('status', statusFilter);
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      const messages = await API.get(endpoint);
      
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
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      if (messagesContainer) {
        messagesContainer.innerHTML = `
          <div class="alert alert-danger text-center">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Erro ao carregar mensagens: ${error.message || 'Erro desconhecido'}
          </div>
        `;
      }
    }
  },
  
  async sendMessage() {
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Obter dados do formulário
      const messageText = document.getElementById('message-text').value.trim();
      const clientIds = Array.from(document.querySelectorAll('#client-selection option:checked')).map(option => option.value);
      const mediaUrl = document.getElementById('message-media-url').value.trim();
      
      if (!messageText && !mediaUrl) {
        this.showToast('Por favor, insira uma mensagem ou adicione uma mídia', 'warning');
        return;
      }
      
      if (clientIds.length === 0) {
        this.showToast('Selecione pelo menos um cliente para enviar a mensagem', 'warning');
        return;
      }
      
      // Desabilitar o botão de envio para evitar cliques duplos
      const sendButton = document.getElementById('send-message-btn');
      if (sendButton) {
        sendButton.disabled = true;
        sendButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
      }
      
      // Preparar dados para envio
      const messageData = {
        text: messageText,
        clientIds: clientIds,
        mediaUrl: mediaUrl || null
      };
      
      // Enviar mensagem usando a API centralizada
      const result = await API.messages.send(messageData);
      
      // Fechar o modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('newMessageModal'));
      if (modal) {
        modal.hide();
      }
      
      // Limpar o formulário
      this.resetMessageForm();
      
      // Mostrar notificação de sucesso
      this.showToast(`Mensagem enviada com sucesso para ${result.sentCount || clientIds.length} cliente(s)`, 'success');
      
      // Recarregar a lista de mensagens
      this.loadMessages();
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao enviar mensagem: ${error.message || 'Erro desconhecido'}`, 'danger');
    } finally {
      // Restaurar o botão de envio
      const sendButton = document.getElementById('send-message-btn');
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.innerHTML = 'Enviar';
      }
    }
  },
  
  async resendMessage(messageId) {
    if (!messageId) {
      this.showToast('ID da mensagem não fornecido', 'warning');
      return;
    }
    
    if (!confirm('Tem certeza que deseja reenviar esta mensagem?')) {
      return;
    }
    
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Reenviar mensagem usando a API centralizada
      await API.messages.resend(messageId);
      
      // Mostrar notificação de sucesso
      this.showToast('Mensagem reenviada com sucesso', 'success');
      
      // Recarregar a lista de mensagens
      this.loadMessages();
    } catch (error) {
      console.error('Erro ao reenviar mensagem:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao reenviar mensagem: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },
  
  async deleteMessage(messageId) {
    if (!messageId) {
      this.showToast('ID da mensagem não fornecido', 'warning');
      return;
    }
    
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) {
      return;
    }
    
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Excluir mensagem usando a API centralizada
      await API.messages.delete(messageId);
      
      // Mostrar notificação de sucesso
      this.showToast('Mensagem excluída com sucesso', 'success');
      
      // Recarregar a lista de mensagens
      this.loadMessages();
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao excluir mensagem: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
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
  
  async uploadMedia() {
    const fileInput = document.getElementById('message-media');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      this.showToast('Selecione um arquivo para enviar', 'warning');
      return;
    }
    
    // Verificar se o usuário está autenticado
    if (!Auth.isAuthenticated()) {
      Auth.logout();
      return;
    }
    
    const file = fileInput.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSize) {
      this.showToast('O arquivo é muito grande. Tamanho máximo: 10MB', 'warning');
      return;
    }
    
    // Verificar tipos de arquivo permitidos
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mp3', 'audio/ogg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      this.showToast('Tipo de arquivo não permitido. Use imagens, vídeos, áudios ou PDF.', 'warning');
      return;
    }
    
    try {
      // Mostrar indicador de carregamento
      const uploadBtn = document.getElementById('upload-message-media-btn');
      if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
      }
      
      // Criar FormData para upload
      const formData = new FormData();
      formData.append('media', file);
      
      // Usar o método específico da API centralizada
      const result = await API.messages.uploadMedia(formData);
      
      // Atualizar o campo de mídia no formulário
      if (result && result.url) {
        document.getElementById('message-media-url').value = result.url;
        
        // Mostrar prévia da mídia
        const previewContainer = document.getElementById('media-preview');
        if (previewContainer) {
          if (file.type.startsWith('image/')) {
            previewContainer.innerHTML = `
              <div class="card mt-2">
                <img src="${result.url}" class="card-img-top img-thumbnail" style="max-height: 200px; object-fit: contain;">
                <div class="card-body p-2">
                  <p class="card-text small">${file.name}</p>
                </div>
              </div>
            `;
          } else {
            previewContainer.innerHTML = `
              <div class="card mt-2">
                <div class="card-body p-2">
                  <i class="fas fa-file me-2"></i>${file.name}
                </div>
              </div>
            `;
          }
        }
        
        // Mostrar botão de remover mídia
        const removeBtn = document.getElementById('remove-message-media-btn');
        if (removeBtn) {
          removeBtn.classList.remove('d-none');
        }
        
        this.showToast('Mídia enviada com sucesso', 'success');
      }
    } catch (error) {
      console.error('Erro ao enviar mídia:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao enviar mídia: ${error.message || 'Erro desconhecido'}`, 'danger');
    } finally {
      // Restaurar o botão
      const uploadBtn = document.getElementById('upload-message-media-btn');
      if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = 'Enviar Mídia';
      }
    }
  },
  
  removeMedia() {
    // Limpar o campo de URL da mídia
    document.getElementById('message-media-url').value = '';
    
    // Limpar o input de arquivo
    const fileInput = document.getElementById('message-media');
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Limpar a prévia da mídia
    const previewContainer = document.getElementById('media-preview');
    if (previewContainer) {
      previewContainer.innerHTML = '';
    }
    
    // Esconder o botão de remover mídia
    const removeBtn = document.getElementById('remove-message-media-btn');
    if (removeBtn) {
      removeBtn.classList.add('d-none');
    }
    
    this.showToast('Mídia removida', 'info');
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
