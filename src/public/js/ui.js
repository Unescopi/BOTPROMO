/**
 * UI.js - Funções para manipulação da interface do usuário
 */

const UI = {
  // Inicialização da UI
  init() {
    this.setupNavigation();
    this.setupFormHandlers();
    this.initCharts();
  },

  // Configuração da navegação entre páginas
  setupNavigation() {
    // Manipuladores para navegação entre abas
    document.querySelectorAll('[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = link.getAttribute('data-page');
        console.log(`Navegando para página: ${targetPage}`);
        this.showPage(targetPage);
      });
    });
    
    // Inicializa com a página do dashboard
    const currentPage = window.location.hash.substring(1) || 'dashboard';
    console.log(`Página inicial: ${currentPage}`);
    this.showPage(currentPage);
  },

  // Mostrar página específica
  showPage(pageId) {
    console.log(`Tentando mostrar página: ${pageId}`);
    
    // Esconde todas as páginas
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    
    // Desativa todos os links de navegação
    document.querySelectorAll('[data-page]').forEach(link => {
      link.classList.remove('active');
    });
    
    // Ativa a página solicitada
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
      console.log(`Página encontrada: ${pageId}-page`);
      targetPage.classList.add('active');
      
      // Ativa o link de navegação correspondente
      const navLink = document.querySelector(`[data-page="${pageId}"]`);
      if (navLink) {
        navLink.classList.add('active');
        console.log(`Link de navegação ativado para: ${pageId}`);
      } else {
        console.warn(`Link de navegação não encontrado para: ${pageId}`);
      }
      
      // Carrega o conteúdo da página se ainda não foi carregado
      if (targetPage.getAttribute('data-loaded') !== 'true') {
        console.log(`Carregando conteúdo para: ${pageId}`);
        this.loadPageContent(pageId);
      } else {
        console.log(`Conteúdo já carregado para: ${pageId}`);
      }
    } else {
      console.error(`Página não encontrada: ${pageId}-page`);
      // Se a página alvo não existir, volta para o dashboard
      if (pageId !== 'dashboard') {
        console.log('Redirecionando para dashboard');
        this.showPage('dashboard');
      }
    }
    
    // Atualiza a URL com o hash
    window.location.hash = pageId;
  },

  // Carrega o conteúdo de uma página específica
  async loadPageContent(pageId) {
    const targetPage = document.getElementById(`${pageId}-page`);
    
    // Mostra indicador de carregamento
    targetPage.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>';
    
    try {
      // Carrega o conteúdo da página via AJAX
      console.log(`Tentando carregar página de: /pages/${pageId}.html`);
      const response = await fetch(`/pages/${pageId}.html`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const html = await response.text();
      targetPage.innerHTML = html;
      
      // Marca a página como carregada
      targetPage.setAttribute('data-loaded', 'true');
      
      // Inicializa os componentes específicos da página
      this.initPageComponents(pageId);
      
      console.log(`Página ${pageId} carregada com sucesso`);
      
    } catch (error) {
      console.error(`Erro ao carregar a página ${pageId}:`, error);
      targetPage.innerHTML = `<div class="alert alert-danger m-3">Erro ao carregar o conteúdo: ${error.message}</div>`;
    }
  },

  // Inicializa componentes específicos de cada página
  initPageComponents(pageId) {
    switch (pageId) {
      case 'dashboard':
        this.initCharts();
        this.loadDashboardStats();
        break;
      
      case 'clients':
        this.loadClients();
        break;
        
      case 'promotions':
        this.initPromotionForm();
        break;
        
      case 'messages':
        this.loadMessages();
        break;
        
      case 'settings':
        this.loadSettings();
        break;
    }
  },
  
  // Carrega estatísticas para o dashboard
  async loadDashboardStats() {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const stats = await response.json();
      
      // Atualiza contadores
      document.getElementById('clients-count').textContent = stats.totalClients || '0';
      document.getElementById('messages-count').textContent = stats.weeklyMessages || '0';
      document.getElementById('promotions-count').textContent = stats.activePromotions || '0';
      document.getElementById('delivery-rate').textContent = `${stats.deliveryRate || '0'}%`;
      
      // Atualiza tabela de promoções recentes
      const recentPromotionsTable = document.getElementById('recent-promotions');
      if (recentPromotionsTable && stats.recentPromotions && stats.recentPromotions.length > 0) {
        const tbody = recentPromotionsTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        stats.recentPromotions.forEach(promo => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${promo.name}</td>
            <td>${new Date(promo.sentAt).toLocaleDateString()}</td>
            <td>${promo.recipients}</td>
            <td><span class="badge bg-${promo.status === 'completed' ? 'success' : 'warning'}">${promo.status}</span></td>
            <td>${promo.openRate}%</td>
          `;
          tbody.appendChild(row);
        });
      }
      
      // Atualiza status de conexão
      const statusContainer = document.getElementById('connection-status');
      if (statusContainer) {
        statusContainer.innerHTML = `
          <div class="d-flex align-items-center">
            <div class="bg-success rounded-circle me-2" style="width: 12px; height: 12px;"></div>
            <span class="fw-bold">Conectado via Evolution API</span>
          </div>
          <div class="mt-2 small text-muted">
            Bot configurado e pronto para enviar mensagens promocionais
          </div>
        `;
      }
      
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      this.showToast('Erro ao carregar estatísticas do dashboard', 'danger');
    }
  },
  
  // Carrega lista de clientes
  async loadClients() {
    const clientsList = document.getElementById('clients-list');
    if (!clientsList) return;
    
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const clients = await response.json();
      
      if (clients.length === 0) {
        clientsList.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum cliente cadastrado</td></tr>';
        return;
      }
      
      clientsList.innerHTML = '';
      clients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${client.name || 'Sem nome'}</td>
          <td>${client.phone}</td>
          <td>${new Date(client.registrationDate).toLocaleDateString()}</td>
          <td>${client.tags?.join(', ') || '-'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editClient('${client._id}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteClient('${client._id}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        `;
        clientsList.appendChild(row);
      });
      
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      clientsList.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar clientes: ${error.message}</td></tr>`;
    }
  },
  
  // Carrega mensagens
  async loadMessages() {
    const messagesList = document.getElementById('messages-list');
    if (!messagesList) return;
    
    try {
      const response = await fetch('/api/messages');
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const messages = await response.json();
      
      if (messages.length === 0) {
        messagesList.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma mensagem registrada</td></tr>';
        return;
      }
      
      messagesList.innerHTML = '';
      messages.forEach(msg => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${msg.direction === 'sent' ? 'Enviada' : 'Recebida'}</td>
          <td>${msg.sender === 'system' ? 'Sistema' : msg.sender}</td>
          <td>${msg.recipient || '-'}</td>
          <td>${msg.body.substring(0, 50)}${msg.body.length > 50 ? '...' : ''}</td>
          <td>${new Date(msg.timestamp).toLocaleString()}</td>
          <td><span class="badge bg-${this.getStatusColor(msg.status)}">${msg.status}</span></td>
        `;
        messagesList.appendChild(row);
      });
      
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      messagesList.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar mensagens: ${error.message}</td></tr>`;
    }
  },
  
  // Retorna a cor para o status da mensagem
  getStatusColor(status) {
    switch (status) {
      case 'sent': return 'primary';
      case 'delivered': return 'info';
      case 'read': return 'success';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  },
  
  // Inicializa o formulário de promoções
  initPromotionForm() {
    const promotionForm = document.getElementById('promotion-form');
    if (!promotionForm) return;
    
    // Manipulador de envio do formulário
    promotionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(promotionForm);
      const promotionData = {
        name: formData.get('name'),
        message: formData.get('message'),
        targetAudience: formData.get('target'),
        mediaUrl: formData.get('media-url') || null,
        scheduleType: document.querySelector('input[name="schedule-type"]:checked').value,
        sendDate: formData.get('send-date') || null,
        sendTime: formData.get('send-time') || null,
      };
      
      try {
        const response = await fetch('/api/promotions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(promotionData)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao salvar promoção');
        }
        
        this.showToast('Promoção salva com sucesso!', 'success');
        promotionForm.reset();
        
      } catch (error) {
        console.error('Erro ao salvar promoção:', error);
        this.showToast(`Erro ao salvar promoção: ${error.message}`, 'danger');
      }
    });
    
    // Evento para mostrar/esconder campos de agendamento
    document.querySelectorAll('input[name="schedule-type"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const scheduleType = radio.value;
        const dateTimeGroup = document.getElementById('date-time-group');
        
        if (scheduleType === 'scheduled') {
          dateTimeGroup.classList.remove('d-none');
        } else {
          dateTimeGroup.classList.add('d-none');
        }
      });
    });
  },
  
  // Carrega configurações
  async loadSettings() {
    const settingsForm = document.getElementById('settings-form');
    if (!settingsForm) return;
    
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const settings = await response.json();
      
      // Preenche formulário com configurações atuais
      for (const [key, value] of Object.entries(settings)) {
        const input = settingsForm.querySelector(`[name="${key}"]`);
        if (input) {
          input.value = value;
        }
      }
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      this.showToast('Erro ao carregar configurações', 'danger');
    }
    
    // Manipulador de envio do formulário
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(settingsForm);
      const settingsData = Object.fromEntries(formData.entries());
      
      try {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settingsData)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao salvar configurações');
        }
        
        this.showToast('Configurações salvas com sucesso!', 'success');
        
      } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        this.showToast(`Erro ao salvar configurações: ${error.message}`, 'danger');
      }
    });
  },

  // Inicializa os gráficos do dashboard
  initCharts() {
    // Gráfico de desempenho de campanhas
    const campaignCtx = document.getElementById('messagesChart')?.getContext('2d');
    if (campaignCtx) {
      this.campaignChart = new Chart(campaignCtx, {
        type: 'line',
        data: {
          labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
          datasets: [{
            label: 'Mensagens Enviadas',
            data: [65, 59, 80, 81, 56, 55, 40],
            borderColor: '#3a86ff',
            backgroundColor: 'rgba(58, 134, 255, 0.1)',
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
    
    // Gráfico de engajamento
    const engagementCtx = document.getElementById('engagementChart')?.getContext('2d');
    if (engagementCtx) {
      this.engagementChart = new Chart(engagementCtx, {
        type: 'doughnut',
        data: {
          labels: ['Entregues', 'Lidas', 'Respondidas', 'Não entregues'],
          datasets: [{
            data: [65, 20, 10, 5],
            backgroundColor: [
              '#38b000',
              '#3a86ff',
              '#8338ec',
              '#ff006e'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
            }
          },
          cutout: '70%'
        }
      });
    }
  },

  // Exibe uma notificação toast
  showToast(message, type = 'info') {
    // Verifica se o container de toasts existe, senão cria
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(toastContainer);
    }
    
    // Cria o elemento toast
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    // Conteúdo do toast
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
      </div>
    `;
    
    // Adiciona ao container
    toastContainer.appendChild(toastEl);
    
    // Inicializa e exibe o toast
    const toast = new bootstrap.Toast(toastEl, {
      autohide: true,
      delay: 5000
    });
    toast.show();
    
    // Remove o toast do DOM após ser escondido
    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }
};

// Exporta o objeto UI para uso em outros arquivos
window.UI = UI;
