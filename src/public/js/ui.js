/**
 * UI.js - Gerencia a interface de usuário do Bot de Promoções
 * 
 * Este arquivo controla as interações de UI, navegação e exibição de elementos
 * na interface do Bot de Cafeteria, seguindo uma arquitetura modular.
 * 
 * Versão: 2.1 - Modo Webhook
 */

class UI {
  constructor() {
    this.currentPage = null;
    this.appInitialized = false;
    this.BASE_URL = window.location.origin;
    this.API_BASE = `${this.BASE_URL}/api`;
    
    // Inicialização
    this.init();
  }

  /**
   * Inicializa a UI e configura eventos
   */
  async init() {
    console.log('Inicializando UI...');
    
    this.setupPageEvents();
    this.setupNavigation();
    
    // Determina a página atual baseada na URL ou usa dashboard como padrão
    const targetPage = this.getTargetPageFromUrl() || 'dashboard';
    
    // Carrega a página inicial
    await this.showPage(targetPage);
    
    // Atualiza informações do webhook
    this.updateWebhookInfo();
    
    this.appInitialized = true;
    console.log('UI inicializada com sucesso!');
  }

  /**
   * Configura a navegação entre páginas
   */
  setupNavigation() {
    // Delega evento para links de navegação
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('.nav-link');
      if (navLink) {
        e.preventDefault();
        const targetPage = navLink.getAttribute('data-page');
        if (targetPage) {
          // Atualiza a URL com o nome da página, mas não navegamos para ela diretamente
          window.history.pushState({page: targetPage}, '', `/#${targetPage}`);
          
          // Carrega a página
          this.showPage(targetPage);
        }
      }
    });

    // Manipula botão de voltar no navegador
    window.addEventListener('popstate', (event) => {
      let targetPage = 'dashboard'; // Default
      
      if (event.state && event.state.page) {
        targetPage = event.state.page;
      } else {
        // Tenta obter da hash da URL
        const hash = window.location.hash.substring(1);
        if (hash) {
          targetPage = hash;
        }
      }
      
      this.showPage(targetPage);
    });
  }

  /**
   * Configura eventos específicos da página atual
   */
  setupPageEvents() {
    // Botão de atualizar estatísticas no dashboard
    document.addEventListener('click', (e) => {
      if (e.target.closest('#refresh-stats')) {
        this.updateDashboardStats();
      }
      
      if (e.target.closest('#copy-webhook-url')) {
        this.copyWebhookUrl();
      }
    });
  }

  /**
   * Obtém o nome da página da URL atual
   */
  getTargetPageFromUrl() {
    // Verifica primeiro o hash na URL (nova implementação)
    const hash = window.location.hash.substring(1);
    if (hash) return hash;
    
    // Se não tiver hash, tenta o caminho antigo
    const path = window.location.pathname;
    const pageName = path.split('/').filter(Boolean)[0];
    return pageName || 'dashboard';
  }

  /**
   * Mostra uma página específica
   */
  async showPage(pageName) {
    if (!pageName) pageName = 'dashboard';
    
    try {
      const mainContent = document.querySelector('#page-container');
      if (!mainContent) {
        console.error('Container de conteúdo principal não encontrado');
        return;
      }
      
      // Atualiza links ativos na navegação
      this.updateActiveNav(pageName);
      
      // Não recarregar a mesma página
      if (this.currentPage === pageName) return;
      
      // Se já inicializado e a página é diferente, mostrar loading
      if (this.appInitialized) {
        mainContent.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>';
      }
      
      try {
        // Adicionar timestamp para evitar cache
        const timestamp = Date.now();
        const pageUrl = `/pages/${pageName}.html?_t=${timestamp}`;
        console.log(`Carregando página: ${pageUrl}`);
        
        // Tenta carregar a página pelo nome
        const response = await fetch(pageUrl);
        if (!response.ok) throw new Error(`Página "${pageName}" não encontrada`);
        
        const content = await response.text();
        if (content.length < 50) {
          console.warn('Conteúdo da página parece muito pequeno:', content);
        }
        
        mainContent.innerHTML = content;
        
        // Atualiza a página atual
        this.currentPage = pageName;
        
        // Adicionar botão para forçar dados de exemplo no dashboard
        if (pageName === 'dashboard') {
          this.addDebugFeatures();
        }
        
        // Inicializa componentes específicos da página
        this.initPageComponents(pageName);
        
        console.log(`Página "${pageName}" carregada com sucesso`);
      } catch (error) {
        console.error(`Erro ao carregar página "${pageName}":`, error);
        mainContent.innerHTML = `
          <div class="alert alert-danger">
            <h4><i class="fas fa-exclamation-triangle me-2"></i>Erro ao carregar página</h4>
            <p>Erro: ${error.message}</p>
            <button class="btn btn-outline-danger mt-3" onclick="window.location.reload()">
              <i class="fas fa-sync me-2"></i>Tentar novamente
            </button>
          </div>
        `;
      }
    } catch (error) {
      console.error('Erro ao mostrar página:', error);
    }
  }

  /**
   * Atualiza links ativos na barra lateral
   */
  updateActiveNav(pageName) {
    // Remove classe ativa de todos os links
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // Adiciona classe ativa ao link da página atual
    document.querySelector(`.navbar-nav .nav-link[data-page="${pageName}"]`)?.classList.add('active');
  }

  /**
   * Inicializa componentes específicos para cada página
   */
  initPageComponents(pageName) {
    // Limpa quaisquer componentes de página anterior
    // (como modais, popovers, etc)
    
    // Inicializa componentes específicos da página
    switch (pageName) {
      case 'dashboard':
        this.initDashboard();
        break;
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
    }
  }

  /**
   * Inicializa o dashboard
   */
  initDashboard() {
    console.log('Inicializando dashboard...');
    
    // Atualiza estatísticas
    this.updateDashboardStats();
    
    // Inicializa gráficos se existirem
    if (document.getElementById('messagesChart') && document.getElementById('engagementChart')) {
      this.initCharts();
    }
    
    // Carrega promoções recentes
    this.loadRecentPromotions();
    
    // Exibe informações do webhook
    this.updateWebhookInfo();
    
    console.log('Dashboard inicializado com sucesso');
  }

  /**
   * Copia a URL do webhook para o clipboard
   */
  copyWebhookUrl() {
    try {
      const webhookUrl = document.getElementById('webhook-url').textContent;
      navigator.clipboard.writeText(webhookUrl)
        .then(() => {
          // Feedback visual
          const copyBtn = document.getElementById('copy-webhook-url');
          const originalText = copyBtn.innerHTML;
          copyBtn.innerHTML = '<i class="bi bi-check"></i> Copiado!';
          
          setTimeout(() => {
            copyBtn.innerHTML = originalText;
          }, 2000);
          
          console.log('URL do webhook copiada para o clipboard');
        })
        .catch(err => {
          console.error('Erro ao copiar URL:', err);
        });
    } catch (error) {
      console.error('Erro ao copiar URL do webhook:', error);
    }
  }

  /**
   * Atualiza as informações do webhook
   */
  async updateWebhookInfo() {
    try {
      const webhookUrl = document.getElementById('webhook-url');
      if (webhookUrl) {
        const response = await fetch(`${this.API_BASE}/webhook-info`);
        if (response.ok) {
          const data = await response.json();
          webhookUrl.textContent = data.url || `${window.location.origin}/api/webhook`;
          console.log('Informações do webhook atualizadas');
        } else {
          console.error('Erro ao obter informações do webhook');
          webhookUrl.textContent = `${window.location.origin}/api/webhook`;
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar informações do webhook:', error);
      if (document.getElementById('webhook-url')) {
        document.getElementById('webhook-url').textContent = `${window.location.origin}/api/webhook`;
      }
    }
  }

  /**
   * Atualiza estatísticas do dashboard
   */
  async updateDashboardStats() {
    try {
      const response = await fetch(`${this.API_BASE}/stats`);
      if (!response.ok) {
        throw new Error('Falha ao obter estatísticas');
      }
      
      const stats = await response.json();
      
      // Atualiza os contadores
      if (document.getElementById('clients-count')) {
        document.getElementById('clients-count').textContent = stats.clients || 0;
      }
      
      if (document.getElementById('messages-count')) {
        document.getElementById('messages-count').textContent = stats.messages || 0;
      }
      
      if (document.getElementById('promotions-count')) {
        document.getElementById('promotions-count').textContent = stats.promotions || 0;
      }
      
      if (document.getElementById('delivery-rate')) {
        document.getElementById('delivery-rate').textContent = stats.deliveryRate || '0%';
      }
      
      console.log('Estatísticas do dashboard atualizadas');
    } catch (error) {
      console.error('Erro ao atualizar estatísticas:', error);
    }
  }

  /**
   * Inicializa os gráficos do dashboard
   */
  initCharts() {
    try {
      // Gráfico de mensagens enviadas
      const messagesCtx = document.getElementById('messagesChart').getContext('2d');
      new Chart(messagesCtx, {
        type: 'bar',
        data: {
          labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
          datasets: [{
            label: 'Mensagens Enviadas',
            data: [12, 19, 3, 5, 2, 3, 7],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: false
            }
          }
        }
      });
      
      // Gráfico de engajamento
      const engagementCtx = document.getElementById('engagementChart').getContext('2d');
      new Chart(engagementCtx, {
        type: 'doughnut',
        data: {
          labels: ['Visualizadas', 'Respondidas', 'Ignoradas'],
          datasets: [{
            data: [65, 15, 20],
            backgroundColor: [
              'rgba(75, 192, 192, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 99, 132, 0.5)'
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            }
          }
        }
      });
      
      console.log('Gráficos inicializados com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar gráficos:', error);
    }
  }

  /**
   * Carrega promoções recentes
   */
  async loadRecentPromotions() {
    try {
      const promotionsTable = document.getElementById('recent-promotions');
      if (!promotionsTable) return;
      
      const tbody = promotionsTable.querySelector('tbody');
      
      // Tenta obter promoções da API
      try {
        const response = await fetch(`${this.API_BASE}/promotions/recent`);
        if (response.ok) {
          const data = await response.json();
          
          // Limpa a tabela
          tbody.innerHTML = '';
          
          if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma promoção recente</td></tr>';
            return;
          }
          
          // Adiciona as promoções
          data.forEach(promo => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${promo.name}</td>
              <td>${new Date(promo.date).toLocaleDateString()}</td>
              <td>${promo.recipients}</td>
              <td><span class="badge bg-${promo.status === 'Enviada' ? 'success' : 'warning'}">${promo.status}</span></td>
              <td>${promo.openRate}</td>
            `;
            tbody.appendChild(row);
          });
        } else {
          throw new Error('Falha ao carregar promoções');
        }
      } catch (error) {
        console.error('Erro na API:', error);
        
        // Mostra dados de exemplo em caso de falha
        tbody.innerHTML = '';
        const examples = [
          { name: 'Café da Manhã - 20% OFF', date: '2025-03-28', recipients: 120, status: 'Enviada', openRate: '45%' },
          { name: 'Happy Hour - 2 por 1', date: '2025-03-25', recipients: 85, status: 'Enviada', openRate: '62%' }
        ];
        
        examples.forEach(promo => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${promo.name}</td>
            <td>${new Date(promo.date).toLocaleDateString()}</td>
            <td>${promo.recipients}</td>
            <td><span class="badge bg-success">${promo.status}</span></td>
            <td>${promo.openRate}</td>
          `;
          tbody.appendChild(row);
        });
      }
      
      console.log('Promoções recentes carregadas');
    } catch (error) {
      console.error('Erro ao carregar promoções recentes:', error);
    }
  }

  /**
   * Inicializa a página de clientes
   */
  initClientsPage() {
    console.log('Página de clientes inicializada');
    // Adicione aqui a lógica para a página de clientes
  }

  /**
   * Inicializa a página de promoções
   */
  initPromotionsPage() {
    console.log('Página de promoções inicializada');
    // Adicione aqui a lógica para a página de promoções
  }

  /**
   * Inicializa a página de mensagens
   */
  initMessagesPage() {
    console.log('Página de mensagens inicializada');
    // Adicione aqui a lógica para a página de mensagens
  }

  /**
   * Inicializa a página de configurações
   */
  initSettingsPage() {
    console.log('Página de configurações inicializada');
    // Adicione aqui a lógica para a página de configurações
  }

  /**
   * Adiciona recursos de depuração extras
   */
  addDebugFeatures() {
    // Verificar se está na página dashboard e não adicionou ainda
    if (this.currentPage !== 'dashboard' || document.getElementById('force-demo-button')) return;
    
    // Ver se já existe o painel diagnóstico
    const diagnosticPanel = document.getElementById('diagnostic-panel');
    
    // Se não existir, criar um botão especial para forçar dados de exemplo
    if (!diagnosticPanel) {
      console.log('Adicionando botão de depuração ao dashboard');
      
      const debugButton = document.createElement('div');
      debugButton.className = 'position-fixed bottom-0 end-0 m-3';
      debugButton.innerHTML = `
        <button id="force-demo-button" class="btn btn-warning">
          <i class="fas fa-bug me-2"></i>Forçar Dados
        </button>
      `;
      
      document.body.appendChild(debugButton);
      
      // Adicionar evento ao botão
      document.getElementById('force-demo-button').addEventListener('click', () => {
        this.forceExampleData();
      });
    }
  }
  
  /**
   * Força o uso de dados de exemplo (para debug)
   */
  forceExampleData() {
    console.log('Forçando dados de exemplo...');
    
    // Criar dados de exemplo
    const demoData = {
      clients: 253,
      messages: 1573,
      promotions: 12,
      deliveryRate: '95%',
      newClients: 15,
      scheduledPromotions: 5,
      readRate: '75%',
      responses: 215
    };
    
    // Atualizar contadores
    document.querySelector('.client-count')?.textContent = demoData.clients;
    document.querySelector('.active-promos')?.textContent = demoData.promotions;
    document.querySelector('.messages-sent')?.textContent = demoData.messages;
    document.querySelector('.delivery-rate')?.textContent = demoData.deliveryRate.replace('%', '');
    
    // Atualizar dados secundários se existirem
    document.querySelector('.new-clients')?.textContent = demoData.newClients;
    document.querySelector('.scheduled-promos')?.textContent = demoData.scheduledPromotions;
    document.querySelector('.read-rate')?.textContent = demoData.readRate;
    document.querySelector('.response-count')?.textContent = demoData.responses;
    
    // Se houver painel de diagnóstico, atualizar
    const apiRawData = document.getElementById('api-raw-data');
    if (apiRawData) {
      apiRawData.textContent = JSON.stringify(demoData, null, 2);
    }
    
    // Mostrar notificação
    this.showNotification('Dados de exemplo aplicados com sucesso!', 'success');
  }
  
  /**
   * Mostra uma notificação
   * @param {string} message - Mensagem a ser exibida
   * @param {string} type - Tipo de notificação (success, warning, danger)
   */
  showNotification(message, type = 'info') {
    // Verificar se já existe container de notificações
    let container = document.querySelector('.notification-container');
    
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(container);
    }
    
    // Criar notificação
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.innerHTML = message;
    
    // Adicionar estilo
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    notification.style.transition = 'all 0.3s ease';
    
    // Adicionar ao container
    container.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Remover após 3 segundos
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
}

// Inicializa a UI quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  window.appUI = new UI();
});
