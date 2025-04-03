/**
 * UI.js - Funções para manipulação da interface do usuário
 */

const UI = {
  // Inicialização da UI
  init() {
    this.setupNavigation();
    this.setupWhatsAppConnection();
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
        this.showPage(targetPage);
      });
    });
  },

  // Mostrar página específica
  showPage(pageId) {
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
      targetPage.classList.add('active');
      
      // Ativa o link de navegação correspondente
      document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
      
      // Carrega o conteúdo da página se ainda não foi carregado
      if (targetPage.getAttribute('data-loaded') !== 'true') {
        this.loadPageContent(pageId);
      }
    }
  },

  // Carrega o conteúdo de uma página específica
  async loadPageContent(pageId) {
    const targetPage = document.getElementById(`${pageId}-page`);
    
    // Mostra indicador de carregamento
    targetPage.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>';
    
    try {
      // Carrega o conteúdo da página via AJAX
      const response = await fetch(`/pages/${pageId}.html`);
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      
      const html = await response.text();
      targetPage.innerHTML = html;
      
      // Marca a página como carregada
      targetPage.setAttribute('data-loaded', 'true');
      
      // Inicializa os componentes específicos da página
      this.initPageComponents(pageId);
      
    } catch (error) {
      console.error(`Erro ao carregar a página ${pageId}:`, error);
      targetPage.innerHTML = `<div class="alert alert-danger m-3">Erro ao carregar o conteúdo: ${error.message}</div>`;
    }
  },

  // Inicializa componentes específicos de cada página
  initPageComponents(pageId) {
    switch (pageId) {
      case 'clients':
        this.initClientsPage();
        break;
      case 'promotions':
        this.initPromotionsPage();
        break;
      case 'messages':
        this.initMessagesPage();
        break;
      case 'settings':
        this.initSettingsPage();
        break;
      default:
        // Nada a fazer para outras páginas
        break;
    }
  },

  // Configuração da conexão com WhatsApp
  setupWhatsAppConnection() {
    // Botão para conectar WhatsApp
    document.getElementById('connect-whatsapp')?.addEventListener('click', () => {
      this.showQRCodeModal();
    });
    
    // Botão para atualizar QR Code
    document.getElementById('refresh-qrcode')?.addEventListener('click', () => {
      this.refreshQRCode();
    });
    
    // Verifica o status da conexão ao iniciar
    this.checkWhatsAppStatus();
  },

  // Verifica o status da conexão com WhatsApp
  async checkWhatsAppStatus() {
    try {
      const statusData = await API.whatsapp.getStatus();
      this.updateWhatsAppStatus(statusData.connected);
    } catch (error) {
      console.error('Erro ao verificar status do WhatsApp:', error);
      this.updateWhatsAppStatus(false);
    }
  },

  // Atualiza a UI com o status da conexão
  updateWhatsAppStatus(isConnected) {
    const statusIcon = document.querySelector('.status-icon');
    const statusText = document.querySelector('.status-text');
    const whatsappAlert = document.getElementById('whatsapp-alert');
    
    if (isConnected) {
      statusIcon.classList.remove('offline', 'connecting');
      statusIcon.classList.add('online');
      statusText.textContent = 'Conectado';
      
      // Esconde o alerta
      whatsappAlert.classList.add('d-none');
    } else {
      statusIcon.classList.remove('online', 'connecting');
      statusIcon.classList.add('offline');
      statusText.textContent = 'Desconectado';
      
      // Mostra o alerta
      whatsappAlert.classList.remove('d-none');
    }
  },

  // Exibe o modal com QR Code para conexão
  async showQRCodeModal() {
    const modal = new bootstrap.Modal(document.getElementById('qrCodeModal'));
    modal.show();
    
    // Limpa o container do QR Code
    const qrContainer = document.getElementById('qrcode-container');
    qrContainer.innerHTML = '<div class="spinner-border text-success" role="status"><span class="visually-hidden">Carregando...</span></div>';
    
    try {
      // Obtém o QR Code
      const qrData = await API.whatsapp.getQRCode();
      
      if (qrData && qrData.qrcode) {
        // Exibe o QR Code
        qrContainer.innerHTML = `<img id="qrcode-img" src="${qrData.qrcode}" alt="QR Code WhatsApp">`;
        
        // Inicia verificação periódica do status
        this.startStatusCheck();
      } else {
        qrContainer.innerHTML = '<div class="alert alert-danger">Erro ao gerar QR Code</div>';
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      qrContainer.innerHTML = `<div class="alert alert-danger">Erro: ${error.message}</div>`;
    }
  },

  // Atualiza o QR Code
  async refreshQRCode() {
    const qrContainer = document.getElementById('qrcode-container');
    qrContainer.innerHTML = '<div class="spinner-border text-success" role="status"><span class="visually-hidden">Carregando...</span></div>';
    
    try {
      const qrData = await API.whatsapp.getQRCode();
      
      if (qrData && qrData.qrcode) {
        qrContainer.innerHTML = `<img id="qrcode-img" src="${qrData.qrcode}" alt="QR Code WhatsApp">`;
      } else {
        qrContainer.innerHTML = '<div class="alert alert-danger">Erro ao gerar QR Code</div>';
      }
    } catch (error) {
      console.error('Erro ao atualizar QR Code:', error);
      qrContainer.innerHTML = `<div class="alert alert-danger">Erro: ${error.message}</div>`;
    }
  },

  // Inicia verificação periódica do status da conexão
  startStatusCheck() {
    // Verifica a cada 5 segundos
    const statusCheckInterval = setInterval(async () => {
      try {
        const statusData = await API.whatsapp.getStatus();
        
        if (statusData.connected) {
          // Se conectado, atualiza UI e fecha o modal
          this.updateWhatsAppStatus(true);
          clearInterval(statusCheckInterval);
          
          // Fecha o modal de QR Code
          const qrModal = bootstrap.Modal.getInstance(document.getElementById('qrCodeModal'));
          if (qrModal) qrModal.hide();
          
          // Exibe notificação de sucesso
          this.showToast('Conectado com sucesso ao WhatsApp!', 'success');
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 5000);
    
    // Armazena o ID do intervalo para poder cancelá-lo depois
    this.statusCheckInterval = statusCheckInterval;
  },

  // Configuração dos manipuladores de formulários
  setupFormHandlers() {
    // Formulário de nova promoção
    const newPromoForm = document.getElementById('new-promo-form');
    if (newPromoForm) {
      newPromoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleNewPromotion();
      });
      
      // Botão de salvar como rascunho
      document.getElementById('save-draft-btn')?.addEventListener('click', () => {
        this.savePromotionAsDraft();
      });
      
      // Checkbox para todos os clientes
      document.getElementById('all-clients')?.addEventListener('change', (e) => {
        const targetingOptions = document.getElementById('targeting-options');
        if (targetingOptions) {
          if (e.target.checked) {
            targetingOptions.classList.add('d-none');
          } else {
            targetingOptions.classList.remove('d-none');
          }
        }
      });
      
      // Tipo de agendamento
      document.getElementById('schedule-type')?.addEventListener('change', (e) => {
        const cronGroup = document.getElementById('cron-expression-group');
        const endDateGroup = document.getElementById('end-date-group');
        const sendTimeGroup = document.getElementById('send-time-group');
        
        if (e.target.value === 'custom') {
          cronGroup.classList.remove('d-none');
          endDateGroup.classList.remove('d-none');
          sendTimeGroup.classList.add('d-none');
        } else if (e.target.value === 'once') {
          cronGroup.classList.add('d-none');
          endDateGroup.classList.add('d-none');
          sendTimeGroup.classList.remove('d-none');
        } else {
          cronGroup.classList.add('d-none');
          endDateGroup.classList.remove('d-none');
          sendTimeGroup.classList.remove('d-none');
        }
      });
      
      // Upload de mídia
      document.getElementById('upload-media-btn')?.addEventListener('click', () => {
        this.handleMediaUpload();
      });
      
      // Remover mídia
      document.getElementById('remove-media-btn')?.addEventListener('click', () => {
        this.removeMedia();
      });
    }
  },

  // Inicializa os gráficos do dashboard
  initCharts() {
    // Gráfico de desempenho de campanhas
    const campaignCtx = document.getElementById('campaignChart')?.getContext('2d');
    if (campaignCtx) {
      this.campaignChart = new Chart(campaignCtx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
          datasets: [{
            label: 'Taxa de Entrega',
            data: [95, 93, 97, 94, 96, 98],
            borderColor: '#3a86ff',
            backgroundColor: 'rgba(58, 134, 255, 0.1)',
            tension: 0.3,
            fill: true
          }, {
            label: 'Taxa de Leitura',
            data: [75, 70, 82, 78, 85, 88],
            borderColor: '#8338ec',
            backgroundColor: 'rgba(131, 56, 236, 0.1)',
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
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return value + '%';
                }
              }
            }
          }
        }
      });
    }
    
    // Gráfico de status das mensagens
    const messageStatusCtx = document.getElementById('messageStatusChart')?.getContext('2d');
    if (messageStatusCtx) {
      this.messageStatusChart = new Chart(messageStatusCtx, {
        type: 'doughnut',
        data: {
          labels: ['Enviadas', 'Entregues', 'Lidas', 'Falhas'],
          datasets: [{
            data: [15, 65, 20, 5],
            backgroundColor: [
              '#3a86ff',
              '#38b000',
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
