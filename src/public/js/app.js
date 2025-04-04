/**
 * App.js - Arquivo principal que inicializa a aplicação
 * Versão Webhook 2.0
 */

// Objeto principal da aplicação
const App = {
  // Inicialização da aplicação
  init() {
    console.log('Inicializando aplicação...');
    
    // Verificar se estamos em modo de desenvolvimento
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      // MODO DE EMERGÊNCIA: Ignorar testes de conexão e ir direto para o dashboard
      console.log('MODO DE EMERGÊNCIA: Carregando dashboard diretamente');
      this.setupEventListeners();
      this.setupGlobalEventDelegation();
      
      // Carregar dashboard com dados de exemplo forçados
      setTimeout(() => {
        this.loadDashboard(true);
      }, 1000);
      return;
    }
    
    // Código real de inicialização
    // Adicionar timeout para permitir acesso forçado
    let connectionTimedOut = false;
    const timeoutId = setTimeout(() => {
      connectionTimedOut = true;
      console.log('TIMEOUT: Permitindo acesso forçado após 10 segundos');
      
      // Verificar se ainda estamos na tela de carregamento
      const pageContainer = document.getElementById('page-container');
      if (pageContainer && pageContainer.innerText.includes('Verificando conexão')) {
        this.setupEventListeners();
        this.setupGlobalEventDelegation();
        
        // Mostrar interface com aviso de modo offline
        this.showOfflineMode();
      }
    }, 10000);
    
    this.testApiConnection()
      .then(connectionOk => {
        // Cancelar o timeout se a conexão foi testada antes dele
        clearTimeout(timeoutId);
        
        // Se já entrou pelo timeout, não fazer nada
        if (connectionTimedOut) return;
        
        if (connectionOk) {
          this.setupEventListeners();
          this.setupGlobalEventDelegation();
          this.loadDashboard();
        } else {
          // Exibir mensagem de erro de conexão
          this.showConnectionError();
        }
      })
      .catch(err => {
        // Cancelar o timeout se a conexão foi testada antes dele
        clearTimeout(timeoutId);
        
        // Se já entrou pelo timeout, não fazer nada
        if (connectionTimedOut) return;
        
        console.error('Erro na inicialização:', err);
        this.showConnectionError();
      });
  },
  
  // Testar conexão com a API antes de carregar os dados
  async testApiConnection() {
    try {
      console.log('Testando conexão com a API...');
      
      // Mostrar indicação de carregamento no container
      const pageContainer = document.getElementById('page-container');
      if (pageContainer) {
        pageContainer.innerHTML = `
          <div class="d-flex flex-column align-items-center justify-content-center my-5">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Testando conexão...</span>
            </div>
            <h5>Verificando conexão com o servidor...</h5>
            <p class="text-muted">Isto pode levar alguns instantes</p>
          </div>
        `;
      }
      
      const result = await API.testConnection();
      console.log('Resultado do teste de conexão:', result);
      
      // Verificar se a conexão foi bem-sucedida
      if (result.success) {
        console.log('Conexão com API estabelecida com sucesso');
        return true;
      } else {
        console.error('Falha ao conectar com a API:', result.status);
        return false;
      }
    } catch (error) {
      console.error('Erro fatal ao testar conexão com API:', error);
      return false;
    }
  },
  
  // Exibir mensagem de erro de conexão
  showConnectionError() {
    console.log('Exibindo mensagem de erro de conexão');
    
    // Criar elemento de erro
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger text-center mt-5 mx-auto';
    errorDiv.style.maxWidth = '80%';
    errorDiv.innerHTML = `
      <h4><i class="fas fa-exclamation-triangle me-2"></i>Erro de Conexão</h4>
      <p>Não foi possível conectar-se ao servidor. Isto pode ocorrer pelos seguintes motivos:</p>
      <ul class="text-start">
        <li>O servidor API não está respondendo</li>
        <li>Problemas com CORS (Cross-Origin Resource Sharing)</li>
        <li>O endpoint de API solicitado não existe</li>
        <li>Problemas com autenticação ou token JWT</li>
      </ul>
      <p>Verifique o console do navegador (F12) para mais detalhes sobre o erro.</p>
      <div class="mt-3">
        <button class="btn btn-outline-danger me-2" id="retryConnection">
          <i class="fas fa-sync me-2"></i>Tentar Novamente
        </button>
        <button class="btn btn-outline-primary" id="showDiagnosticInfo">
          <i class="fas fa-search me-2"></i>Mostrar Diagnóstico
        </button>
      </div>
    `;
    
    // Encontrar o conteúdo principal e inserir o erro
    const pageContainer = document.getElementById('page-container');
    if (pageContainer) {
      console.log('Inserindo mensagem de erro no page-container');
      pageContainer.innerHTML = '';
      pageContainer.appendChild(errorDiv);
    } else {
      console.log('page-container não encontrado, inserindo no body');
      document.body.appendChild(errorDiv);
    }
    
    // Adicionar evento para o botão de retry
    document.getElementById('retryConnection').addEventListener('click', () => {
      window.location.reload();
    });
    
    // Adicionar evento para o botão de diagnóstico
    document.getElementById('showDiagnosticInfo').addEventListener('click', () => {
      this.showDiagnosticInfo();
    });
  },
  
  // Mostrar informações de diagnóstico
  showDiagnosticInfo() {
    console.log('Mostrando informações de diagnóstico');
    
    // Informações coletadas do navegador
    const diagnosticInfo = {
      userAgent: navigator.userAgent,
      url: window.location.href,
      baseUrl: window.location.origin,
      localStorage: localStorage.getItem('authToken') ? 'Token presente' : 'Token ausente',
      corsMode: 'Same Origin',
      apiUrl: API.baseUrl,
      currentTime: new Date().toISOString()
    };
    
    // Criar e mostrar modal de diagnóstico
    const modalHTML = `
      <div class="modal fade" id="diagnosticModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fas fa-stethoscope me-2"></i>Diagnóstico de Conexão
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <h6>Informações do Cliente:</h6>
              <pre class="bg-light p-3 rounded">${JSON.stringify(diagnosticInfo, null, 2)}</pre>
              
              <h6 class="mt-3">Tentando conexão com API:</h6>
              <div id="api-test-result" class="bg-light p-3 rounded">
                <div class="d-flex justify-content-center">
                  <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Testando...</span>
                  </div>
                </div>
              </div>
              
              <div class="mt-3">
                <button class="btn btn-sm btn-outline-primary" id="test-api-connection">
                  <i class="fas fa-plug me-1"></i>Testar API
                </button>
                <button class="btn btn-sm btn-outline-secondary ms-2" id="copy-diagnostic">
                  <i class="fas fa-copy me-1"></i>Copiar Diagnóstico
                </button>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Adicionar modal ao DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Mostrar o modal
    const diagnosticModal = new bootstrap.Modal(document.getElementById('diagnosticModal'));
    diagnosticModal.show();
    
    // Adicionar evento para o botão de teste
    document.getElementById('test-api-connection').addEventListener('click', async () => {
      const resultDiv = document.getElementById('api-test-result');
      resultDiv.innerHTML = `
        <div class="d-flex justify-content-center">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Testando...</span>
          </div>
        </div>
      `;
      
      try {
        // Testar vários endpoints para diagnóstico
        let testResults = '';
        
        // Testar status
        try {
          const response = await fetch(`${API.baseUrl}/status`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
          });
          const data = await response.text();
          testResults += `GET /status: ${response.status} ${response.statusText}\n`;
          testResults += `Resposta: ${data}\n\n`;
        } catch (e) {
          testResults += `GET /status: ERRO - ${e.message}\n\n`;
        }
        
        // Testar stats
        try {
          const response = await fetch(`${API.baseUrl}/stats`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
          });
          const data = await response.text();
          testResults += `GET /stats: ${response.status} ${response.statusText}\n`;
          testResults += `Resposta: ${data}\n\n`;
        } catch (e) {
          testResults += `GET /stats: ERRO - ${e.message}\n\n`;
        }
        
        resultDiv.innerHTML = `<pre>${testResults}</pre>`;
      } catch (error) {
        resultDiv.innerHTML = `<div class="alert alert-danger">Erro ao testar: ${error.message}</div>`;
      }
    });
    
    // Adicionar evento para o botão de cópia
    document.getElementById('copy-diagnostic').addEventListener('click', () => {
      const diagnosticText = JSON.stringify(diagnosticInfo, null, 2);
      navigator.clipboard.writeText(diagnosticText)
        .then(() => alert('Informações de diagnóstico copiadas para a área de transferência'))
        .catch(err => console.error('Erro ao copiar:', err));
    });
  },

  // Configuração dos listeners de eventos
  setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Adicione um log para verificar se os botões estão sendo encontrados
    document.querySelectorAll('button').forEach(button => {
      console.log('Botão encontrado:', button.id || button.textContent.trim());
    });
    
    // Delegação de eventos para o documento inteiro
    document.addEventListener('click', (e) => {
      // Log para verificar os cliques
      console.log('Clique detectado em:', e.target.tagName, e.target.id || e.target.className);
      
      // Implementar delegação de eventos aqui
    });
  },

  // Atualiza informações do usuário na interface
  updateUserInfo() {
    const userInfo = Auth.getUserInfo();
    if (!userInfo) return;
    
    // Atualiza o nome do usuário no dropdown
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
      userDropdown.innerHTML = `
        <i class="fas fa-user-circle me-1"></i>${userInfo.name || userInfo.email || 'Usuário'}
      `;
    }
    
    // Atualiza permissões baseadas no papel do usuário
    this.updatePermissions(userInfo.role);
  },
  
  // Atualiza elementos da interface baseados no papel do usuário
  updatePermissions(role) {
    // Elementos que só administradores podem ver
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
      el.style.display = role === 'admin' ? '' : 'none';
    });
    
    // Elementos que operadores e administradores podem ver
    const operatorElements = document.querySelectorAll('.operator-only');
    operatorElements.forEach(el => {
      el.style.display = ['admin', 'operator'].includes(role) ? '' : 'none';
    });
  },
  
  // Configura manipuladores de eventos
  setupEventHandlers() {
    // Manipulador para o botão de logout
    document.querySelectorAll('.logout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    });
  },

  // Carrega os dados para o dashboard
  async loadDashboard(forceOffline = false) {
    console.log('=== INÍCIO: loadDashboard ===');
    
    try {
      // Mostrar indicadores de carregamento
      document.querySelectorAll('.client-count, .active-promos, .messages-sent, .delivery-rate')
        .forEach(el => {
          el.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        });
      
      let stats;
      
      // Se modo forçado, usar dados de exemplo
      if (forceOffline) {
        console.log('Usando dados de exemplo no modo offline forçado');
        stats = {
          success: true,
          clients: 253,
          messages: 1573,
          promotions: 12,
          deliveryRate: '95%',
          timestamp: new Date().toISOString()
        };
      } else {
        try {
          // Buscar estatísticas com timeout para evitar espera infinita
          console.log('Carregando estatísticas do servidor...');
          stats = await Promise.race([
            API.get('/stats'),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout ao carregar estatísticas')), 10000)
            )
          ]);
        } catch (apiError) {
          console.error('Erro ao buscar dados da API:', apiError);
          if (!forceOffline) {
            // Se falha na API, mostrar alerta e usar dados de exemplo
            this.showToast('Erro ao conectar com o servidor. Exibindo dados de exemplo.', 'warning');
            stats = {
              success: true,
              clients: 253,
              messages: 1573,
              promotions: 12,
              deliveryRate: '95%',
              timestamp: new Date().toISOString(),
              isExample: true
            };
          }
        }
      }
      
      console.log('Estatísticas recebidas ou geradas:', stats);
      
      // Verificar se temos dados válidos
      if (!stats) {
        throw new Error('Não foi possível obter dados do servidor');
      }
      
      // Se estamos usando dados de exemplo, mostrar aviso
      if (stats.isExample || forceOffline) {
        const pageContainer = document.getElementById('page-container');
        if (pageContainer) {
          const warningBanner = document.createElement('div');
          warningBanner.className = 'alert alert-warning alert-dismissible fade show mb-4';
          warningBanner.innerHTML = `
            <strong><i class="fas fa-exclamation-triangle me-2"></i>Modo de Demonstração</strong>
            <p class="mb-0">Exibindo dados de exemplo. O servidor está indisponível.</p>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
          `;
          
          // Inserir no início do container
          const firstChild = pageContainer.firstChild;
          if (firstChild) {
            pageContainer.insertBefore(warningBanner, firstChild);
          } else {
            pageContainer.appendChild(warningBanner);
          }
        }
      }
      
      // Exibir dados brutos no elemento debug se existir
      const rawDataElement = document.getElementById('api-raw-data');
      if (rawDataElement) {
        rawDataElement.textContent = JSON.stringify(stats, null, 2);
      }
      
      // Atualizar painel diagnóstico se existir
      if (typeof updateDiagnosticPanel === 'function') {
        updateDiagnosticPanel(stats);
      }
      
      // Extrair dados das estatísticas - adaptado para diferentes formatos possíveis
      const clientCount = stats.clients || stats.totalClients || (stats.total ? stats.total.clients : 0) || 0;
      const promotionsCount = stats.promotions || stats.activePromotions || (stats.total ? stats.total.promotions : 0) || 0;
      const messagesCount = stats.messages || stats.totalMessages || (stats.total ? stats.total.messages : 0) || 0;
      const deliveryRateValue = stats.deliveryRate || stats.messageStats?.deliveryRate || '0%';
      
      console.log('Dados extraídos:', {
        clients: clientCount,
        promotions: promotionsCount,
        messages: messagesCount,
        deliveryRate: deliveryRateValue
      });
      
      // Atualizar elementos na interface
      const clientCountEl = document.querySelector('.client-count');
      if (clientCountEl) {
        clientCountEl.textContent = clientCount;
      }
      
      const activePromosEl = document.querySelector('.active-promos');
      if (activePromosEl) {
        activePromosEl.textContent = promotionsCount;
      }
      
      const messagesSentEl = document.querySelector('.messages-sent');
      if (messagesSentEl) {
        messagesSentEl.textContent = messagesCount;
      }
      
      const deliveryRateEl = document.querySelector('.delivery-rate');
      if (deliveryRateEl) {
        // Remover símbolo % se existir
        const rateValue = typeof deliveryRateValue === 'string' ? 
          deliveryRateValue.replace('%', '') : deliveryRateValue;
        
        deliveryRateEl.textContent = rateValue;
      }
      
      // Carregar dados de promoções recentes com dados de exemplo
      if (forceOffline || stats.isExample) {
        this.loadExampleRecentPromotions();
        this.loadExampleUpcomingPromotions();
      } else {
        // Tentar carregar dados reais se disponíveis
        this.loadRecentPromotions().catch(() => this.loadExampleRecentPromotions());
        this.loadUpcomingPromotions().catch(() => this.loadExampleUpcomingPromotions());
      }
      
      console.log('=== FIM: loadDashboard - Sucesso ===');
    } catch (error) {
      console.error('=== ERRO: loadDashboard ===', error);
      
      // Mostrar erro na interface
      document.querySelectorAll('.client-count, .active-promos, .messages-sent, .delivery-rate')
        .forEach(el => {
          el.innerHTML = '<span class="text-danger">Erro</span>';
        });
      
      // Mostrar mensagem de erro
      this.showToast(`Erro ao carregar dados: ${error.message}`, 'danger');
      
      // Mostrar erro no painel diagnóstico se existir
      const rawDataElement = document.getElementById('api-raw-data');
      if (rawDataElement) {
        rawDataElement.textContent = `ERRO: ${error.message}`;
        rawDataElement.classList.add('text-danger');
      }
    }
  },

  // Carregar promoções recentes de exemplo
  loadExampleRecentPromotions() {
    const recentPromosContainer = document.getElementById('recent-promos');
    if (!recentPromosContainer) return;
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const examplePromos = [
      {
        name: 'Café Especial do Dia',
        date: yesterday.toISOString(),
        description: 'Descontos especiais em cafés Arábica selecionados',
        recipients: 128,
        status: 'Enviada'
      },
      {
        name: 'Fidelidade Premium',
        date: twoDaysAgo.toISOString(),
        description: 'Ofertas exclusivas para clientes que compraram mais de 10 cafés no mês',
        recipients: 57,
        status: 'Enviada'
      },
      {
        name: 'Lançamento Grãos Orgânicos',
        date: twoDaysAgo.toISOString(),
        description: 'Novos grãos orgânicos certificados disponíveis',
        recipients: 203,
        status: 'Enviada'
      }
    ];
    
    recentPromosContainer.innerHTML = examplePromos.map(promo => `
      <div class="list-group-item promo-item ${promo.status === 'Enviada' ? 'completed' : 'active'}">
        <div class="d-flex w-100 justify-content-between">
          <h6 class="mb-1">${promo.name}</h6>
          <small class="text-muted">${this.formatDate(promo.date)}</small>
        </div>
        <p class="mb-1 text-truncate-2">${promo.description || 'Promoção especial'}</p>
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">
            <i class="fas fa-users me-1"></i>${promo.recipients} destinatários
          </small>
          <span class="badge bg-${promo.status === 'Enviada' ? 'success' : 'primary'}">
            ${promo.status}
          </span>
        </div>
      </div>
    `).join('');
  },
  
  // Carregar próximas promoções agendadas de exemplo
  loadExampleUpcomingPromotions() {
    const upcomingPromosContainer = document.getElementById('upcoming-promos');
    if (!upcomingPromosContainer) return;
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const examplePromos = [
      {
        id: 'example-1',
        name: 'Happy Hour Sexta-feira',
        scheduleDate: tomorrow.toISOString(),
        description: 'Descontos especiais das 16h às 19h',
        status: 'Agendada'
      },
      {
        id: 'example-2',
        name: 'Café da Manhã Especial',
        scheduleDate: nextWeek.toISOString(),
        description: 'Promoção para cafés da manhã com 20% de desconto',
        status: 'Agendada'
      }
    ];
    
    upcomingPromosContainer.innerHTML = examplePromos.map(promo => `
      <div class="list-group-item promo-item scheduled">
        <div class="d-flex w-100 justify-content-between">
          <h6 class="mb-1">${promo.name}</h6>
          <small class="text-muted">${this.formatDate(promo.scheduleDate)}</small>
        </div>
        <p class="mb-1 text-truncate-2">${promo.description || 'Promoção agendada'}</p>
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">
            <i class="fas fa-clock me-1"></i>${this.formatTime(promo.scheduleDate)}
          </small>
          <div>
            <button class="btn btn-sm btn-outline-secondary me-1" data-promo-id="${promo.id}" data-action="edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" data-promo-id="${promo.id}" data-action="cancel">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
    // Adicionar manipuladores de eventos para os botões
    upcomingPromosContainer.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => this.editPromotion(btn.getAttribute('data-promo-id')));
    });
    
    upcomingPromosContainer.querySelectorAll('[data-action="cancel"]').forEach(btn => {
      btn.addEventListener('click', () => this.cancelPromotion(btn.getAttribute('data-promo-id')));
    });
  },

  // Adiciona um painel de depuração ao dashboard
  addDebugPanel(data) {
    // Verificar se já existe um painel de debug
    let debugPanel = document.getElementById('debug-panel');
    
    if (!debugPanel) {
      console.log('Criando painel de depuração...');
      // Criar o painel de debug
      debugPanel = document.createElement('div');
      debugPanel.id = 'debug-panel';
      debugPanel.className = 'card mt-4';
      debugPanel.innerHTML = `
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
          <h5 class="mb-0">Painel de Depuração</h5>
          <button class="btn btn-sm btn-outline-secondary" id="toggle-debug">Mostrar/Ocultar</button>
        </div>
        <div class="card-body">
          <pre id="debug-output" style="max-height: 200px; overflow: auto;"></pre>
        </div>
      `;
      
      // Adicionar ao final da página de dashboard
      const dashboardPage = document.getElementById('dashboard-page');
      if (dashboardPage) {
        dashboardPage.appendChild(debugPanel);
        
        // Adicionar evento para mostrar/ocultar conteúdo
        document.getElementById('toggle-debug').addEventListener('click', () => {
          const output = document.getElementById('debug-output');
          output.style.display = output.style.display === 'none' ? 'block' : 'none';
        });
      }
    }
    
    // Atualizar o conteúdo de debug
    const debugOutput = document.getElementById('debug-output');
    if (debugOutput) {
      try {
        debugOutput.textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        debugOutput.textContent = 'Erro ao serializar dados: ' + e.message;
      }
    }
  },

  // Busca estatísticas da API
  async fetchStats() {
    try {
      const response = await API.get('/stats');
      return response;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      
      // Se o erro for de autenticação, redireciona para o login
      if (error.message.includes('Sessão expirada')) {
        Auth.logout();
      }
      
      return null;
    }
  },

  // Atualiza todas as estatísticas no dashboard
  updateDashboardStats(stats) {
    if (!stats) return;
    
    // Atualiza estatísticas de clientes
    const clientCount = document.querySelector('.client-count');
    if (clientCount) clientCount.textContent = stats.clients || 0;
    
    const newClients = document.querySelector('.new-clients');
    if (newClients) newClients.textContent = stats.newClients || 0;
    
    // Atualiza estatísticas de promoções
    const activePromos = document.querySelector('.active-promos');
    if (activePromos) activePromos.textContent = stats.promotions || 0;
    
    const scheduledPromos = document.querySelector('.scheduled-promos');
    if (scheduledPromos) scheduledPromos.textContent = stats.scheduledPromotions || 0;
    
    // Atualiza estatísticas de mensagens
    const messagesSent = document.querySelector('.messages-sent');
    if (messagesSent) messagesSent.textContent = stats.messages || 0;
    
    const deliveryRate = document.querySelector('.delivery-rate');
    if (deliveryRate) deliveryRate.textContent = stats.deliveryRate?.replace('%', '') || 0;
    
    const readRate = document.querySelector('.read-rate');
    if (readRate) readRate.textContent = stats.readRate || '0%';
    
    const responseCount = document.querySelector('.response-count');
    if (responseCount) responseCount.textContent = stats.responses || 0;
  },

  // Carrega as promoções recentes
  async loadRecentPromotions() {
    try {
      const recentPromosContainer = document.getElementById('recent-promos');
      if (!recentPromosContainer) return;
      
      const promotions = await API.get('/promotions/recent');
      
      if (promotions.length === 0) {
        recentPromosContainer.innerHTML = `
          <div class="list-group-item text-center py-5">
            <i class="fas fa-info-circle me-2"></i>Nenhuma promoção recente
          </div>
        `;
        return;
      }
      
      // Renderiza as promoções recentes
      recentPromosContainer.innerHTML = promotions.map(promo => `
        <div class="list-group-item promo-item ${promo.status === 'Enviada' ? 'completed' : 'active'}">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${promo.name}</h6>
            <small class="text-muted">${this.formatDate(promo.date)}</small>
          </div>
          <p class="mb-1 text-truncate-2">${promo.description || 'Promoção especial'}</p>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">
              <i class="fas fa-users me-1"></i>${promo.recipients} destinatários
            </small>
            <span class="badge bg-${promo.status === 'Enviada' ? 'success' : 'primary'}">
              ${promo.status}
            </span>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Erro ao carregar promoções recentes:', error);
      
      // Se o erro for de autenticação, redireciona para o login
      if (error.message.includes('Sessão expirada')) {
        Auth.logout();
      }
    }
  },

  // Carrega as próximas promoções agendadas
  async loadUpcomingPromotions() {
    try {
      const upcomingPromosContainer = document.getElementById('upcoming-promos');
      if (!upcomingPromosContainer) return;
      
      const upcomingPromos = await API.get('/promotions/upcoming');
      
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
            <small class="text-muted">${this.formatDate(promo.scheduleDate)}</small>
          </div>
          <p class="mb-1 text-truncate-2">${promo.description || 'Promoção agendada'}</p>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">
              <i class="fas fa-clock me-1"></i>${this.formatTime(promo.scheduleDate)}
            </small>
            <div>
              <button class="btn btn-sm btn-outline-secondary me-1" data-promo-id="${promo.id}" data-action="edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" data-promo-id="${promo.id}" data-action="cancel">
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
      
      // Se o erro for de autenticação, redireciona para o login
      if (error.message.includes('Sessão expirada')) {
        Auth.logout();
      }
    }
  },

  // Configura atualizações periódicas
  setupPeriodicUpdates() {
    // Atualiza os dados do dashboard a cada 5 minutos
    setInterval(() => {
      this.loadDashboardData();
    }, 300000);
  },

  // Exibe um toast de notificação
  showToast(message, type = 'info') {
    // Implementação simplificada - em produção, você poderia usar um componente de toast
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Alternativa: alert(message);
  },

  // Edita uma promoção existente
  async editPromotion(promoId) {
    try {
      // Redireciona para a página de promoções com o ID da promoção
      if (window.appUI) {
        window.appUI.showPage('promotions');
      }
      
      // Aqui você adicionaria código para carregar o formulário de edição
      
    } catch (error) {
      console.error('Erro ao editar promoção:', error);
      this.showToast('Erro ao editar promoção', 'danger');
    }
  },

  // Cancela uma promoção agendada
  async cancelPromotion(promoId) {
    if (!confirm('Tem certeza que deseja cancelar esta promoção?')) return;
    
    try {
      await API.post(`/promotions/${promoId}/cancel`);
      this.showToast('Promoção cancelada com sucesso', 'success');
      this.loadUpcomingPromotions();
    } catch (error) {
      console.error('Erro ao cancelar promoção:', error);
      this.showToast('Erro ao cancelar promoção', 'danger');
      
      // Se o erro for de autenticação, redireciona para o login
      if (error.message.includes('Sessão expirada')) {
        Auth.logout();
      }
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
  },

  // Adicione esta função ao objeto App
  setupGlobalEventDelegation() {
    console.log('Configurando delegação de eventos global...');
    
    // Delegação de eventos para o documento inteiro
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Log para depuração
      console.log('Clique detectado em:', target.tagName, target.id || target.className);
      
      // Botões de salvar
      if (target.matches('#save-client-btn') || target.closest('#save-client-btn')) {
        console.log('Botão salvar cliente clicado via delegação');
        if (window.ClientsManager && typeof window.ClientsManager.saveClient === 'function') {
          window.ClientsManager.saveClient();
        }
      }
      
      if (target.matches('#save-promo-btn') || target.closest('#save-promo-btn')) {
        console.log('Botão salvar promoção clicado via delegação');
        if (window.PromotionsManager && typeof window.PromotionsManager.savePromotion === 'function') {
          window.PromotionsManager.savePromotion();
        }
      }
      
      if (target.matches('#save-message-btn') || target.closest('#save-message-btn')) {
        console.log('Botão salvar mensagem clicado via delegação');
        if (window.MessagesManager && typeof window.MessagesManager.saveMessage === 'function') {
          window.MessagesManager.saveMessage();
        }
      }
      
      if (target.matches('#save-settings-btn') || target.closest('#save-settings-btn')) {
        console.log('Botão salvar configurações clicado via delegação');
        if (window.SettingsManager && typeof window.SettingsManager.saveSettings === 'function') {
          window.SettingsManager.saveSettings();
        }
      }
      
      // Botões de envio
      if (target.matches('#send-message-btn') || target.closest('#send-message-btn')) {
        console.log('Botão enviar mensagem clicado via delegação');
        if (window.MessagesManager && typeof window.MessagesManager.sendMessage === 'function') {
          window.MessagesManager.sendMessage();
        }
      }
      
      // Botões de exclusão
      if (target.matches('.delete-client-btn') || target.closest('.delete-client-btn')) {
        const clientId = target.closest('tr').dataset.id || target.dataset.id;
        console.log('Botão excluir cliente clicado via delegação, ID:', clientId);
        if (window.ClientsManager && typeof window.ClientsManager.deleteClient === 'function') {
          window.ClientsManager.deleteClient(clientId);
        }
      }
      
      if (target.matches('.delete-promo-btn') || target.closest('.delete-promo-btn')) {
        const promoId = target.closest('tr').dataset.id || target.dataset.id;
        console.log('Botão excluir promoção clicado via delegação, ID:', promoId);
        if (window.PromotionsManager && typeof window.PromotionsManager.deletePromotion === 'function') {
          window.PromotionsManager.deletePromotion(promoId);
        }
      }
      
      if (target.matches('.delete-message-btn') || target.closest('.delete-message-btn')) {
        const messageId = target.closest('tr').dataset.id || target.dataset.id;
        console.log('Botão excluir mensagem clicado via delegação, ID:', messageId);
        if (window.MessagesManager && typeof window.MessagesManager.deleteMessage === 'function') {
          window.MessagesManager.deleteMessage(messageId);
        }
      }
      
      // Botões de edição
      if (target.matches('.edit-client-btn') || target.closest('.edit-client-btn')) {
        const clientId = target.closest('tr').dataset.id || target.dataset.id;
        console.log('Botão editar cliente clicado via delegação, ID:', clientId);
        if (window.ClientsManager && typeof window.ClientsManager.editClient === 'function') {
          window.ClientsManager.editClient(clientId);
        }
      }
      
      if (target.matches('.edit-promo-btn') || target.closest('.edit-promo-btn')) {
        const promoId = target.closest('tr').dataset.id || target.dataset.id;
        console.log('Botão editar promoção clicado via delegação, ID:', promoId);
        if (window.PromotionsManager && typeof window.PromotionsManager.editPromotion === 'function') {
          window.PromotionsManager.editPromotion(promoId);
        }
      }
      
      // Adicione mais handlers conforme necessário
    });
  },

  setupActionDelegation() {
    console.log('Configurando delegação de ações...');
    
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      
      const action = target.dataset.action;
      const module = target.dataset.module;
      const id = target.dataset.id;
      
      console.log(`Ação detectada: ${action}, Módulo: ${module}, ID: ${id}`);
      
      // Executa a ação no módulo correspondente
      if (module && window[module] && typeof window[module][action] === 'function') {
        if (id) {
          window[module][action](id);
        } else {
          window[module][action]();
        }
      }
    });
  },

  // Carregar página no container
  async loadPage(pageName) {
    console.log(`=== INÍCIO: Carregando página '${pageName}' ===`);
    
    // Obter elemento que contém as páginas
    const pageContainer = document.getElementById('page-container');
    if (!pageContainer) {
      console.error('Container de páginas não encontrado!');
      return;
    }
    
    // Verificar se a página existe
    const validPages = [
      'dashboard', 'clients', 'promotions', 'messages', 'settings'
    ];
    
    // Se não especificou página ou página inválida, carrega dashboard
    if (!pageName || !validPages.includes(pageName)) {
      console.log(`Página '${pageName}' inválida, redirecionando para dashboard`);
      pageName = 'dashboard';
    }
    
    // Atualizar a navegação
    this.updateNavigation(pageName);
    
    try {
      // Mostrar loader
      pageContainer.innerHTML = `
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Carregando...</span>
          </div>
          <p class="mt-3">Carregando ${this.getPageTitle(pageName)}...</p>
        </div>
      `;
      
      // Carregar a página do servidor
      const timestamp = new Date().getTime(); // Cache busting
      const pageUrl = `/pages/${pageName}.html?t=${timestamp}`;
      console.log(`Buscando conteúdo da página em: ${pageUrl}`);
      
      const response = await fetch(pageUrl);
      
      console.log(`Status da resposta: ${response.status}`);
      if (!response.ok) {
        throw new Error(`Erro ao carregar página: ${response.status} ${response.statusText}`);
      }
      
      const htmlContent = await response.text();
      console.log(`Conteúdo recebido: ${htmlContent.substring(0, 100)}...`);
      
      // Inserir o HTML no container
      pageContainer.innerHTML = htmlContent;
      
      // Executar scripts se houver
      const scripts = pageContainer.querySelectorAll('script');
      console.log(`Encontrados ${scripts.length} scripts na página`);
      
      scripts.forEach(oldScript => {
        // Criar novo script para garantir que seja executado
        const newScript = document.createElement('script');
        if (oldScript.src) {
          console.log(`Carregando script externo: ${oldScript.src}`);
          newScript.src = oldScript.src;
        } else {
          console.log(`Executando script inline: ${oldScript.textContent.substring(0, 50)}...`);
          newScript.textContent = oldScript.textContent;
        }
        
        // Substituir o script antigo pelo novo para que seja executado
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });
      
      // Atualizar URL no histórico
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('page') !== pageName) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('page', pageName);
        window.history.pushState({page: pageName}, '', newUrl.toString());
      }
      
      // Verificar se a página foi carregada
      const pageContent = pageContainer.innerHTML;
      if (pageContent.trim().length < 50) {
        console.error('A página carregada parece estar em branco ou vazia!');
        console.error('Conteúdo atual:', pageContent);
      }
      
      this.currentPage = pageName;
      console.log(`=== FIM: Página '${pageName}' carregada com sucesso ===`);
      
      // Verificar se a página inicializou corretamente
      setTimeout(() => {
        if (pageName === 'clients' && document.getElementById('clients-table-body')) {
          if (window.ClientsManager && typeof window.ClientsManager.init === 'function') {
            console.log('Detectada página de clientes, verificando status de inicialização...');
            // Verificar se há dados na tabela
            const tableBody = document.getElementById('clients-table-body');
            if (tableBody && tableBody.children.length <= 1) {
              console.log('Tabela de clientes parece vazia, tentando inicializar novamente...');
              window.ClientsManager.init();
            }
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error(`Erro ao carregar página '${pageName}':`, error);
      pageContainer.innerHTML = `
        <div class="alert alert-danger m-4">
          <h4 class="alert-heading">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Erro ao carregar página
          </h4>
          <p>Não foi possível carregar a página solicitada.</p>
          <hr>
          <p class="mb-0">Erro: ${error.message}</p>
          <div class="mt-3">
            <button class="btn btn-outline-danger" onclick="App.loadPage('${pageName}')">
              <i class="fas fa-sync-alt me-1"></i>Tentar novamente
            </button>
            <button class="btn btn-outline-secondary ms-2" onclick="App.loadPage('dashboard')">
              <i class="fas fa-home me-1"></i>Ir para Dashboard
            </button>
          </div>
        </div>
      `;
    }
  },

  // Atualiza a navegação
  updateNavigation(pageName) {
    // Implemente a lógica para atualizar a navegação com base no nome da página
    console.log(`Atualizando navegação para página: ${pageName}`);
  },

  // Obtém o título da página
  getPageTitle(pageName) {
    // Implemente a lógica para obter o título da página com base no nome
    console.log(`Obtendo título da página: ${pageName}`);
    return pageName.charAt(0).toUpperCase() + pageName.slice(1);
  },

  // Mostrar interface com aviso de modo offline
  showOfflineMode() {
    console.log('Mostrando interface de modo offline');
    
    // Criar elemento de aviso
    const offlineDiv = document.createElement('div');
    offlineDiv.className = 'alert alert-warning text-center mt-5 mx-auto';
    offlineDiv.style.maxWidth = '80%';
    offlineDiv.innerHTML = `
      <h4><i class="fas fa-wifi-slash me-2"></i>Servidor Indisponível</h4>
      <p>O servidor está demorando para responder ou está offline.</p>
      <div class="mt-3">
        <button class="btn btn-outline-warning me-2" id="retryConnection">
          <i class="fas fa-sync me-2"></i>Tentar Novamente
        </button>
        <button class="btn btn-outline-primary" id="forceAccess">
          <i class="fas fa-user-shield me-2"></i>Forçar Acesso (Modo Offline)
        </button>
      </div>
    `;
    
    // Encontrar o conteúdo principal e inserir o aviso
    const pageContainer = document.getElementById('page-container');
    if (pageContainer) {
      console.log('Inserindo aviso de modo offline no page-container');
      pageContainer.innerHTML = '';
      pageContainer.appendChild(offlineDiv);
    } else {
      console.log('page-container não encontrado, inserindo no body');
      document.body.appendChild(offlineDiv);
    }
    
    // Adicionar evento para o botão de retry
    document.getElementById('retryConnection').addEventListener('click', () => {
      window.location.reload();
    });
    
    // Adicionar evento para o botão de forçar acesso offline
    document.getElementById('forceAccess').addEventListener('click', () => {
      UI.initNavigation();
      this.loadDashboard(true);
    });
  }
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM carregado, verificando autenticação...');
  if (Auth.isAuthenticated()) {
    App.init();
  } else {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
  }
});
