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
          // Atualiza a URL com o nome da página
          window.history.pushState({}, '', `/${targetPage}`);
          
          // Carrega a página
          this.showPage(targetPage);
        }
      }
    });

    // Manipula botão de voltar no navegador
    window.addEventListener('popstate', () => {
      const targetPage = this.getTargetPageFromUrl();
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
        // Tenta carregar a página pelo nome
        const response = await fetch(`/pages/${pageName}.html`);
        if (!response.ok) throw new Error(`Página "${pageName}" não encontrada`);
        
        const content = await response.text();
        mainContent.innerHTML = content;
        
        // Atualiza a página atual
        this.currentPage = pageName;
        
        // Inicializa componentes específicos da página
        this.initPageComponents(pageName);
        
        console.log(`Página "${pageName}" carregada com sucesso`);
      } catch (error) {
        console.error(`Erro ao carregar página "${pageName}":`, error);
        mainContent.innerHTML = `<div class="alert alert-danger">Erro ao carregar página: ${error.message}</div>`;
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
}

// Inicializa a UI quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  window.appUI = new UI();
});
