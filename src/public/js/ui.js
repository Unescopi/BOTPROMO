/**
 * UI.js - Gerencia a interface de usuário do Bot de Promoções
 * 
 * Este arquivo controla as interações de UI, navegação e exibição de elementos
 * na interface do Bot de Cafeteria, seguindo uma arquitetura modular.
 * 
 * Versão: 2.0
 */

class UI {
  constructor() {
    this.currentPage = null;
    this.sidebarLoaded = false;
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
    
    this.loadSidebar();
    this.setupPageEvents();
    this.setupNavigation();
    
    // Determina a página atual baseada na URL
    const targetPage = this.getTargetPageFromUrl();
    this.showPage(targetPage);
    
    // Inicializa componentes específicos da página
    this.initPageComponents(targetPage);
    
    this.appInitialized = true;
    console.log('UI inicializada com sucesso!');
  }

  /**
   * Carrega a barra lateral
   */
  async loadSidebar() {
    if (this.sidebarLoaded) return;
    
    try {
      const response = await fetch('/pages/components/sidebar.html');
      if (!response.ok) throw new Error('Falha ao carregar a barra lateral');
      
      const content = await response.text();
      document.getElementById('sidebar-container').innerHTML = content;
      
      this.sidebarLoaded = true;
      console.log('Barra lateral carregada com sucesso');
    } catch (error) {
      console.error('Erro ao carregar a barra lateral:', error);
    }
  }

  /**
   * Configura a navegação entre páginas
   */
  setupNavigation() {
    // Delega evento para links de navegação
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('[data-nav]');
      if (navLink) {
        e.preventDefault();
        const targetPage = navLink.getAttribute('data-nav');
        
        // Atualiza a URL com o nome da página
        window.history.pushState({}, '', `/${targetPage}`);
        
        // Carrega a página
        this.showPage(targetPage);
        this.initPageComponents(targetPage);
      }
    });

    // Manipula botão de voltar no navegador
    window.addEventListener('popstate', () => {
      const targetPage = this.getTargetPageFromUrl();
      this.showPage(targetPage);
      this.initPageComponents(targetPage);
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
      const mainContent = document.querySelector('main');
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
        // Tenta carregar a página pelo nome
        const response = await fetch(`/pages/${pageName}.html`);
        if (!response.ok) throw new Error(`Página "${pageName}" não encontrada`);
        
        const content = await response.text();
        mainContent.innerHTML = content;
        
        this.currentPage = pageName;
        console.log(`Página "${pageName}" carregada com sucesso`);
      } catch (error) {
        console.error(`Erro ao carregar página "${pageName}":`, error);
        
        // Fallback para dashboard em caso de erro
        if (pageName !== 'dashboard') {
          this.showPage('dashboard');
        } else {
          mainContent.innerHTML = '<div class="alert alert-danger m-5">Erro ao carregar a página. Por favor, tente novamente.</div>';
        }
      }
    } catch (error) {
      console.error('Erro ao alternar páginas:', error);
    }
  }

  /**
   * Atualiza links ativos na barra lateral
   */
  updateActiveNav(pageName) {
    document.querySelectorAll('[data-nav]').forEach(link => {
      const target = link.getAttribute('data-nav');
      if (target === pageName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /**
   * Inicializa componentes específicos para cada página
   */
  initPageComponents(pageName) {
    console.log(`Inicializando componentes da página: ${pageName}`);
    
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
  async initDashboard() {
    console.log('Inicializando Dashboard...');
    
    // Obtém informações do webhook
    this.updateWebhookInfo();
    
    // Atualiza estatísticas
    this.updateDashboardStats();
    
    // Inicializa os gráficos se existirem
    if (document.getElementById('messagesChart')) {
      this.initCharts();
    }
    
    // Carrega promoções recentes
    this.loadRecentPromotions();
  }

  /**
   * Copia a URL do webhook para o clipboard
   */
  copyWebhookUrl() {
    const webhookUrl = document.getElementById('webhook-url').textContent;
    navigator.clipboard.writeText(webhookUrl)
      .then(() => {
        // Mostra feedback de copiado
        const btn = document.getElementById('copy-webhook-url');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check"></i> Copiado!';
        
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      })
      .catch(err => {
        console.error('Erro ao copiar URL:', err);
      });
  }

  /**
   * Atualiza as informações do webhook
   */
  async updateWebhookInfo() {
    try {
      const response = await fetch(`${this.API_BASE}/webhook-info`);
      if (!response.ok) throw new Error('Erro ao obter informações do webhook');
      
      const data = await response.json();
      
      // Atualiza a URL do webhook no dashboard
      const webhookUrlElement = document.getElementById('webhook-url');
      if (webhookUrlElement) {
        webhookUrlElement.textContent = data.webhookUrl;
      }
      
    } catch (error) {
      console.error('Erro ao atualizar informações do webhook:', error);
    }
  }

  /**
   * Atualiza estatísticas do dashboard
   */
  async updateDashboardStats() {
    try {
      // Faz chamada à API para obter estatísticas
      const response = await fetch(`${this.API_BASE}/stats`);
      
      if (!response.ok) {
        throw new Error('Falha ao obter estatísticas');
      }
      
      const stats = await response.json();
      
      // Atualiza os contadores
      document.getElementById('clients-count').textContent = stats.clientsCount || 0;
      document.getElementById('messages-count').textContent = stats.messagesCount || 0;
      document.getElementById('promotions-count').textContent = stats.promotionsCount || 0;
      document.getElementById('delivery-rate').textContent = `${stats.deliveryRate || 0}%`;
      
      console.log('Estatísticas atualizadas com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar estatísticas:', error);
      
      // Em caso de erro, mostra valores placeholder
      document.getElementById('clients-count').textContent = '0';
      document.getElementById('messages-count').textContent = '0';
      document.getElementById('promotions-count').textContent = '0';
      document.getElementById('delivery-rate').textContent = '0%';
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
      
      // Exemplo de dados de promoções (em produção, viria da API)
      const promotions = [
        {
          name: 'Café da Manhã - 20% OFF',
          date: '2025-03-28',
          recipients: 120,
          status: 'Enviada',
          openRate: '45%'
        },
        {
          name: 'Happy Hour - 2 por 1',
          date: '2025-03-25',
          recipients: 85,
          status: 'Enviada',
          openRate: '62%'
        },
        {
          name: 'Doce do Dia',
          date: '2025-03-22',
          recipients: 150,
          status: 'Enviada',
          openRate: '38%'
        }
      ];
      
      // Limpa a tabela
      tbody.innerHTML = '';
      
      // Adiciona as promoções
      promotions.forEach(promo => {
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
  }

  /**
   * Inicializa a página de promoções
   */
  initPromotionsPage() {
    console.log('Página de promoções inicializada');
  }

  /**
   * Inicializa a página de mensagens
   */
  initMessagesPage() {
    console.log('Página de mensagens inicializada');
  }

  /**
   * Inicializa a página de configurações
   */
  initSettingsPage() {
    console.log('Página de configurações inicializada');
  }
}

// Inicializa a UI quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  window.appUI = new UI();
});
