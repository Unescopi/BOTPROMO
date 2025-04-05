/**
 * settings.js - Gerenciamento de configurações do sistema
 */

const SettingsManager = {
  init() {
    console.log('Inicializando gerenciamento de configurações...');
    this.setupEventListeners();
    this.loadSettings();
    
    // Inicializar abas específicas
    this.initWebhookTab();
    this.initDiagnosticsTab();
    this.initExportTab();
    this.setupOfflineMode();
    
    // Verificar se há uma aba específica para abrir (via URL hash)
    const hash = window.location.hash;
    if (hash) {
      const tabId = hash.replace('#', '');
      const tab = document.querySelector(`.nav-link[data-bs-target="#${tabId}"]`);
      if (tab) {
        const bsTab = new bootstrap.Tab(tab);
        bsTab.show();
      }
    }
  },

  setupEventListeners() {
    // Formulário de configurações da API
    const apiSettingsForm = document.getElementById('api-settings-form');
    if (apiSettingsForm) {
      apiSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveApiSettings();
      });
    }
    
    // Formulário de configurações de mensagens
    const messageSettingsForm = document.getElementById('message-settings-form');
    if (messageSettingsForm) {
      messageSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveMessageSettings();
      });
    }
    
    // Formulário de gerenciamento de tags
    const tagManagementForm = document.getElementById('tag-management-form');
    if (tagManagementForm) {
      tagManagementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveTagSettings();
      });
    }
    
    // Botão de adição de nova tag
    const addTagBtn = document.getElementById('add-tag-btn');
    if (addTagBtn) {
      addTagBtn.addEventListener('click', () => this.showNewTagModal());
    }
    
    // Botão de salvar tag
    const saveTagBtn = document.getElementById('save-tag-btn');
    if (saveTagBtn) {
      saveTagBtn.addEventListener('click', () => this.saveTag());
    }
    
    // Botão de criar backup
    const createBackupBtn = document.getElementById('create-backup-btn');
    if (createBackupBtn) {
      createBackupBtn.addEventListener('click', () => this.createBackup());
    }
    
    // Botão de restaurar backup
    const restoreBackupBtn = document.getElementById('restore-backup-btn');
    if (restoreBackupBtn) {
      restoreBackupBtn.addEventListener('click', () => this.restoreBackup());
    }
    
    // Botão de limpar dados
    const clearDataBtn = document.getElementById('clear-data-btn');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => this.clearData());
    }
    
    // Botão de backup
    const backupBtn = document.getElementById('backup-btn');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => this.createBackup());
    }
    
    // Formulário de restauração
    const restoreForm = document.getElementById('restore-form');
    if (restoreForm) {
      restoreForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.restoreBackup();
      });
    }
    
    // Botão de teste de conexão com a API
    const testApiBtn = document.getElementById('test-api-btn');
    if (testApiBtn) {
      testApiBtn.addEventListener('click', () => this.testApiConnection());
    }
  },
  
  async loadSettings() {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Erro ao carregar configurações');
      }
      
      const settings = await response.json();
      this.populateSettings(settings);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      this.showToast('Erro ao carregar configurações', 'danger');
    }
  },
  
  populateSettings(settings) {
    // Configurações da API
    if (settings.api) {
      const apiForm = document.getElementById('api-settings-form');
      if (apiForm) {
        if (apiForm.elements['api-url']) apiForm.elements['api-url'].value = settings.api.url || '';
        if (apiForm.elements['api-key']) apiForm.elements['api-key'].value = settings.api.key || '';
        if (apiForm.elements['webhook-url']) apiForm.elements['webhook-url'].value = settings.api.webhook || '';
      }
    }
    
    // Configurações de mensagens
    if (settings.messages) {
      const msgForm = document.getElementById('message-settings-form');
      if (msgForm) {
        if (msgForm.elements['welcome-message']) msgForm.elements['welcome-message'].value = settings.messages.welcome || '';
        if (msgForm.elements['default-footer']) msgForm.elements['default-footer'].value = settings.messages.footer || '';
        if (msgForm.elements['max-daily-messages']) msgForm.elements['max-daily-messages'].value = settings.messages.maxDaily || 100;
      }
    }
    
    // Configurações de tags
    if (settings.tags && settings.tags.length > 0) {
      const tagsContainer = document.getElementById('tags-container');
      if (tagsContainer) {
        // Limpar campos existentes
        tagsContainer.innerHTML = '';
        
        // Adicionar campos para cada tag
        settings.tags.forEach(tag => {
          this.addTagField(tag.name, tag.color);
        });
      }
    }
    
    // Configurações de agendamento
    if (settings.schedule) {
      const scheduleForm = document.getElementById('schedule-settings-form');
      if (scheduleForm) {
        if (scheduleForm.elements['default-time']) scheduleForm.elements['default-time'].value = settings.schedule.defaultTime || '09:00';
        if (scheduleForm.elements['retry-attempts']) scheduleForm.elements['retry-attempts'].value = settings.schedule.retryAttempts || 3;
        if (scheduleForm.elements['retry-interval']) scheduleForm.elements['retry-interval'].value = settings.schedule.retryInterval || 5;
      }
    }
  },
  
  saveApiSettings() {
    const apiForm = document.getElementById('api-settings-form');
    if (!apiForm) return;
    
    const apiUrl = apiForm.elements['api-url']?.value || '';
    const apiKey = apiForm.elements['api-key']?.value || '';
    const webhookUrl = apiForm.elements['webhook-url']?.value || '';
    
    if (!apiUrl) {
      alert('Por favor, informe a URL da API');
      return;
    }
    
    const apiSettings = {
      url: apiUrl,
      key: apiKey,
      webhook: webhookUrl
    };
    
    this.saveSettings('api', apiSettings);
  },
  
  saveMessageSettings() {
    const msgForm = document.getElementById('message-settings-form');
    if (!msgForm) return;
    
    const welcomeMessage = msgForm.elements['welcome-message']?.value || '';
    const defaultFooter = msgForm.elements['default-footer']?.value || '';
    const maxDailyMessages = msgForm.elements['max-daily-messages']?.value || 100;
    
    const messageSettings = {
      welcome: welcomeMessage,
      footer: defaultFooter,
      maxDaily: parseInt(maxDailyMessages)
    };
    
    this.saveSettings('messages', messageSettings);
  },
  
  saveTagSettings() {
    const tagInputs = document.querySelectorAll('.tag-input-group');
    const tags = [];
    
    tagInputs.forEach(input => {
      const nameInput = input.querySelector('input[name="tag-name"]');
      const colorInput = input.querySelector('input[name="tag-color"]');
      
      if (nameInput && nameInput.value) {
        tags.push({
          name: nameInput.value,
          color: colorInput ? colorInput.value : '#0d6efd'
        });
      }
    });
    
    this.saveSettings('tags', tags);
  },
  
  saveSettings(type, data) {
    fetch(`/api/settings/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro ao salvar configurações de ${type}`);
        }
        return response.json();
      })
      .then(result => {
        this.showToast('Configurações salvas com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao salvar configurações:', error);
        this.showToast(`Erro ao salvar configurações: ${error.message}`, 'danger');
      });
  },
  
  addTagField(name = '', color = '#0d6efd') {
    const tagsContainer = document.getElementById('tags-container');
    if (!tagsContainer) return;
    
    const tagId = Date.now(); // ID único para cada campo
    
    const tagHtml = `
      <div class="input-group mb-2 tag-input-group">
        <input type="text" class="form-control" name="tag-name" value="${name}" placeholder="Nome da tag">
        <input type="color" class="form-control form-control-color" name="tag-color" value="${color}" title="Escolha a cor da tag">
        <button type="button" class="btn btn-outline-danger" onclick="SettingsManager.removeTagField(this)">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    tagsContainer.insertAdjacentHTML('beforeend', tagHtml);
  },
  
  removeTagField(button) {
    const tagGroup = button.closest('.tag-input-group');
    if (tagGroup) {
      tagGroup.remove();
    }
  },
  
  createBackup() {
    fetch('/api/settings/backup', {
      method: 'POST'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao criar backup');
        }
        return response.blob();
      })
      .then(blob => {
        // Criar um link para download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `backup-cafeteria-bot-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showToast('Backup criado com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao criar backup:', error);
        this.showToast('Erro ao criar backup', 'danger');
      });
  },
  
  restoreBackup() {
    const fileInput = document.getElementById('backup-file');
    if (!fileInput || !fileInput.files[0]) {
      alert('Selecione um arquivo de backup');
      return;
    }
    
    if (!confirm('ATENÇÃO: A restauração substituirá todos os dados atuais. Esta ação é irreversível. Deseja continuar?')) {
      return;
    }
    
    const formData = new FormData();
    formData.append('backup', fileInput.files[0]);
    
    fetch('/api/settings/restore', {
      method: 'POST',
      body: formData
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao restaurar backup');
        }
        return response.json();
      })
      .then(data => {
        this.showToast('Backup restaurado com sucesso. A página será recarregada.', 'success');
        
        // Recarregar a página após 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      })
      .catch(error => {
        console.error('Erro ao restaurar backup:', error);
        this.showToast('Erro ao restaurar backup', 'danger');
      });
  },
  
  testApiConnection() {
    const apiUrl = document.getElementById('api-settings-form')?.elements['api-url']?.value;
    const apiKey = document.getElementById('api-settings-form')?.elements['api-key']?.value;
    
    if (!apiUrl) {
      alert('Informe a URL da API antes de testar a conexão');
      return;
    }
    
    // Mostrar indicador de carregamento
    const testBtn = document.getElementById('test-api-btn');
    const originalText = testBtn.innerHTML;
    testBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Testando...';
    testBtn.disabled = true;
    
    // Teste direto usando fetch para evitar dependências
    fetch(`${apiUrl}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey ? `Bearer ${apiKey}` : ''
      },
      cache: 'no-store'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
        return response.text().then(text => {
          try {
            return JSON.parse(text);
          } catch (e) {
            // Se não for JSON, retornar o texto
            return { success: true, text: text };
          }
        });
      })
      .then(data => {
        console.log('Teste de API bem-sucedido:', data);
        this.showToast('Conexão estabelecida com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao testar conexão:', error);
        this.showToast(`Erro ao conectar com a API: ${error.message}`, 'danger');
      })
      .finally(() => {
        // Restaurar o botão
        testBtn.innerHTML = originalText;
        testBtn.disabled = false;
      });
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

  /**
   * Carrega eventos recentes de webhook
   */
  async loadWebhookEvents() {
    try {
      const eventsTable = document.getElementById('webhook-events-table');
      if (!eventsTable) return;
      
      eventsTable.innerHTML = '<tr><td colspan="4" class="text-center">Carregando eventos...</td></tr>';
      
      const response = await API.webhook.getRecentEvents(20);
      
      if (!response.data || response.data.length === 0) {
        eventsTable.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum evento recebido ainda</td></tr>';
        return;
      }
      
      eventsTable.innerHTML = '';
      
      response.data.forEach(event => {
        const row = document.createElement('tr');
        
        // Formatar data/hora
        const date = new Date(event.timestamp);
        const formattedDate = date.toLocaleDateString('pt-BR') + ' ' + 
                              date.toLocaleTimeString('pt-BR');
        
        // Criar células
        row.innerHTML = `
          <td>${formattedDate}</td>
          <td><span class="badge ${this.getEventTypeBadgeClass(event.eventType)}">${event.eventType}</span></td>
          <td>${event.ip}</td>
          <td>
            <button class="btn btn-sm btn-outline-info view-event-details-btn" 
                    data-event='${JSON.stringify(event)}'>
              <i class="fas fa-eye"></i>
            </button>
          </td>
        `;
        
        eventsTable.appendChild(row);
      });
      
      // Adicionar manipuladores de eventos para os botões de detalhes
      document.querySelectorAll('.view-event-details-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const eventData = JSON.parse(btn.dataset.event);
          this.showEventDetailsModal(eventData);
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar eventos de webhook:', error);
      const eventsTable = document.getElementById('webhook-events-table');
      if (eventsTable) {
        eventsTable.innerHTML = `<tr><td colspan="4" class="text-center text-danger">
          Erro ao carregar eventos: ${error.message || 'Erro desconhecido'}
        </td></tr>`;
      }
    }
  },

  /**
   * Carrega estatísticas de webhook
   */
  async loadWebhookStats() {
    try {
      const response = await API.webhook.getStats();
      
      if (!response.data) return;
      
      // Atualizar contadores
      document.getElementById('webhook-event-types-count').textContent = 
        response.data.totalEventTypes || 0;
      
      document.getElementById('webhook-message-formats-count').textContent = 
        response.data.messageFormats?.length || 0;
      
      document.getElementById('webhook-recent-events-count').textContent = 
        response.data.recentEventsCount || 0;
      
    } catch (error) {
      console.error('Erro ao carregar estatísticas de webhook:', error);
    }
  },

  /**
   * Carrega formatos de mensagem
   */
  async loadWebhookFormats() {
    try {
      const formatsContent = document.getElementById('webhook-formats-content');
      if (!formatsContent) return;
      
      formatsContent.innerHTML = `
        <div class="text-center">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Carregando...</span>
          </div>
        </div>
      `;
      
      const response = await API.webhook.getMessageFormats();
      
      if (!response.data || Object.keys(response.data).length === 0) {
        formatsContent.innerHTML = `
          <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            Nenhum formato de mensagem detectado ainda.
          </div>
        `;
        return;
      }
      
      let html = '';
      
      for (const [type, data] of Object.entries(response.data)) {
        html += `
          <div class="card mb-3">
            <div class="card-header bg-light">
              <h6 class="mb-0">Tipo: ${type} (${data.count} mensagens)</h6>
            </div>
            <div class="card-body">
              <h6>Campos detectados:</h6>
              <ul class="mb-3">
                ${Object.keys(data.fields).map(field => `<li>${field}</li>`).join('')}
              </ul>
              
              <h6>Exemplo:</h6>
              <pre class="bg-light p-2 rounded"><code>${JSON.stringify(data.example, null, 2)}</code></pre>
            </div>
          </div>
        `;
      }
      
      formatsContent.innerHTML = html;
      
    } catch (error) {
      console.error('Erro ao carregar formatos de mensagem:', error);
      const formatsContent = document.getElementById('webhook-formats-content');
      if (formatsContent) {
        formatsContent.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-circle me-2"></i>
            Erro ao carregar formatos: ${error.message || 'Erro desconhecido'}
          </div>
        `;
      }
    }
  },

  /**
   * Exibe modal com detalhes do evento
   */
  showEventDetailsModal(event) {
    // Criar modal dinamicamente
    const modalId = 'eventDetailsModal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
      const modalHtml = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Detalhes do Evento</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
              </div>
              <div class="modal-body">
                <div class="mb-3">
                  <h6>Informações Básicas</h6>
                  <table class="table table-sm">
                    <tr>
                      <th>Data/Hora:</th>
                      <td id="event-timestamp"></td>
                    </tr>
                    <tr>
                      <th>Tipo:</th>
                      <td id="event-type"></td>
                    </tr>
                    <tr>
                      <th>IP de Origem:</th>
                      <td id="event-ip"></td>
                    </tr>
                  </table>
                </div>
                
                <div>
                  <h6>Dados do Evento</h6>
                  <pre class="bg-light p-2 rounded"><code id="event-data"></code></pre>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      modal = document.getElementById(modalId);
    }
    
    // Preencher dados do evento
    const date = new Date(event.timestamp);
    const formattedDate = date.toLocaleDateString('pt-BR') + ' ' + 
                          date.toLocaleTimeString('pt-BR');
    
    document.getElementById('event-timestamp').textContent = formattedDate;
    document.getElementById('event-type').textContent = event.eventType;
    document.getElementById('event-ip').textContent = event.ip;
    document.getElementById('event-data').textContent = JSON.stringify(event.bodyPreview, null, 2);
    
    // Exibir modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  },

  /**
   * Retorna a classe de badge para o tipo de evento
   */
  getEventTypeBadgeClass(eventType) {
    if (eventType.includes('message_received')) {
      return 'bg-success';
    } else if (eventType.includes('message_sent')) {
      return 'bg-primary';
    } else if (eventType.includes('message_status_')) {
      if (eventType.includes('_delivered')) {
        return 'bg-info';
      } else if (eventType.includes('_read')) {
        return 'bg-success';
      } else if (eventType.includes('_failed')) {
        return 'bg-danger';
      } else {
        return 'bg-warning text-dark';
      }
    } else if (eventType.includes('connection')) {
      return 'bg-info';
    } else if (eventType.includes('qrcode')) {
      return 'bg-dark';
    } else if (eventType.includes('instance')) {
      return 'bg-secondary';
    } else {
      return 'bg-light text-dark';
    }
  },

  /**
   * Inicializa a aba de webhook
   */
  initWebhookTab() {
    // Carregar dados iniciais
    this.loadWebhookEvents();
    this.loadWebhookStats();
    
    // Configurar evento para o botão de atualizar
    document.getElementById('refresh-webhook-events-btn')?.addEventListener('click', () => {
      this.loadWebhookEvents();
      this.loadWebhookStats();
    });
    
    // Configurar evento para o accordion de formatos
    document.getElementById('webhook-formats-collapse')?.addEventListener('show.bs.collapse', () => {
      this.loadWebhookFormats();
    });
  },

  /**
   * Executa diagnóstico completo do sistema
   */
  async runDiagnostics() {
    try {
      // Mostrar indicador de carregamento
      this.showToast('Executando diagnóstico completo...', 'info');
      
      document.getElementById('run-diagnostics-btn').disabled = true;
      document.getElementById('run-diagnostics-btn').innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Executando...';
      
      // Executar diagnóstico
      const response = await API.diagnostics.run();
      
      if (!response.data) {
        this.showToast('Erro ao executar diagnóstico', 'danger');
        return;
      }
      
      // Atualizar status
      this.updateDiagnosticStatus(response.data);
      
      // Atualizar detalhes
      this.updateDiagnosticDetails(response.data);
      
      this.showToast('Diagnóstico concluído com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao executar diagnóstico:', error);
      this.showToast(`Erro ao executar diagnóstico: ${error.message || 'Erro desconhecido'}`, 'danger');
    } finally {
      document.getElementById('run-diagnostics-btn').disabled = false;
      document.getElementById('run-diagnostics-btn').innerHTML = '<i class="fas fa-stethoscope me-1"></i>Executar Diagnóstico';
    }
  },

  /**
   * Atualiza o status do diagnóstico
   */
  updateDiagnosticStatus(data) {
    // Banco de dados
    const dbStatus = data.database?.status || 'unknown';
    const dbBadge = document.getElementById('database-status-badge');
    
    dbBadge.textContent = this.getStatusLabel(dbStatus);
    dbBadge.className = `badge ${this.getStatusBadgeClass(dbStatus)}`;
    
    // WhatsApp
    const waStatus = data.whatsapp?.status || 'unknown';
    const waBadge = document.getElementById('whatsapp-status-badge');
    
    waBadge.textContent = this.getStatusLabel(waStatus);
    waBadge.className = `badge ${this.getStatusBadgeClass(waStatus)}`;
    
    // Sistema de arquivos
    const fsStatus = data.filesystem?.status || 'unknown';
    const fsBadge = document.getElementById('filesystem-status-badge');
    
    fsBadge.textContent = this.getStatusLabel(fsStatus);
    fsBadge.className = `badge ${this.getStatusBadgeClass(fsStatus)}`;
  },

  /**
   * Atualiza os detalhes do diagnóstico
   */
  updateDiagnosticDetails(data) {
    // Banco de dados
    const dbDetails = document.getElementById('database-details');
    
    if (data.database) {
      let dbHtml = '';
      
      if (data.database.status === 'online') {
        dbHtml += `
          <div class="alert alert-success">
            <i class="fas fa-check-circle me-2"></i>Banco de dados conectado
          </div>
          <table class="table table-sm">
            <tr>
              <th>URI:</th>
              <td>${data.database.uri || 'N/A'}</td>
            </tr>
            <tr>
              <th>Versão:</th>
              <td>${data.database.version || 'N/A'}</td>
            </tr>
            <tr>
              <th>Uptime:</th>
              <td>${data.database.uptime || 'N/A'}</td>
            </tr>
            <tr>
              <th>Conexões:</th>
              <td>${data.database.connections?.current || 0} / ${data.database.connections?.available || 0}</td>
            </tr>
          </table>
        `;
        
        if (data.database.collections) {
          dbHtml += `
            <h6 class="mt-3">Coleções</h6>
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Documentos</th>
                  <th>Tamanho</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          for (const collection of data.database.collections) {
            dbHtml += `
              <tr>
                <td>${collection.name}</td>
                <td>${collection.count}</td>
                <td>${collection.size}</td>
              </tr>
            `;
          }
          
          dbHtml += `
              </tbody>
            </table>
          `;
        }
      } else {
        dbHtml = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Erro na conexão com o banco de dados: ${data.database.error || 'Erro desconhecido'}
          </div>
        `;
      }
      
      dbDetails.innerHTML = dbHtml;
    }
    
    // WhatsApp
    const waDetails = document.getElementById('whatsapp-details');
    
    if (data.whatsapp) {
      let waHtml = '';
      
      if (data.whatsapp.status === 'online') {
        waHtml = `
          <div class="alert alert-success">
            <i class="fas fa-check-circle me-2"></i>WhatsApp conectado
          </div>
          <table class="table table-sm">
            <tr>
              <th>Instância:</th>
              <td>${data.whatsapp.instance || 'N/A'}</td>
            </tr>
            <tr>
              <th>Conectado:</th>
              <td>${data.whatsapp.connected ? 'Sim' : 'Não'}</td>
            </tr>
            <tr>
              <th>Versão:</th>
              <td>${data.whatsapp.version || 'N/A'}</td>
            </tr>
          </table>
        `;
      } else if (data.whatsapp.status === 'not_configured') {
        waHtml = `
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            WhatsApp não configurado: ${data.whatsapp.error || 'URL da Evolution API não configurada'}
          </div>
        `;
      } else {
        waHtml = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Erro na conexão com o WhatsApp: ${data.whatsapp.error || 'Erro desconhecido'}
          </div>
        `;
      }
      
      waDetails.innerHTML = waHtml;
    }
    
    // Sistema de arquivos
    const fsDetails = document.getElementById('filesystem-details');
    
    if (data.filesystem) {
      let fsHtml = '';
      
      if (data.filesystem.status === 'ok') {
        fsHtml = `
          <div class="alert alert-success">
            <i class="fas fa-check-circle me-2"></i>Sistema de arquivos OK
          </div>
          <table class="table table-sm">
            <tr>
              <th>Diretório raiz:</th>
              <td>${data.filesystem.rootDir || 'N/A'}</td>
            </tr>
            <tr>
              <th>Espaço total:</th>
              <td>${data.filesystem.totalSpace || 'N/A'}</td>
            </tr>
            <tr>
              <th>Espaço livre:</th>
              <td>${data.filesystem.freeSpace || 'N/A'}</td>
            </tr>
            <tr>
              <th>Uso:</th>
              <td>${data.filesystem.usagePercent || 'N/A'}</td>
            </tr>
          </table>
        `;
        
        if (data.filesystem.directories) {
          fsHtml += `
            <h6 class="mt-3">Diretórios</h6>
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Caminho</th>
                  <th>Tamanho</th>
                  <th>Gravável</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          for (const dir of data.filesystem.directories) {
            fsHtml += `
              <tr>
                <td>${dir.path}</td>
                <td>${dir.size || 'N/A'}</td>
                <td>
                  ${dir.writable 
                    ? '<span class="badge bg-success">Sim</span>' 
                    : '<span class="badge bg-danger">Não</span>'}
                </td>
              </tr>
            `;
          }
          
          fsHtml += `
              </tbody>
            </table>
          `;
        }
      } else {
        fsHtml = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Erro no sistema de arquivos: ${data.filesystem.error || 'Erro desconhecido'}
          </div>
        `;
      }
      
      fsDetails.innerHTML = fsHtml;
    }
    
    // Sistema
    const sysDetails = document.getElementById('system-details');
    
    if (data.system) {
      const sysHtml = `
        <table class="table table-sm">
          <tr>
            <th>Node.js:</th>
            <td>${data.system.nodeVersion || 'N/A'}</td>
          </tr>
          <tr>
            <th>Plataforma:</th>
            <td>${data.system.platform || 'N/A'}</td>
          </tr>
          <tr>
            <th>Memória total:</th>
            <td>${data.system.memory?.total || 'N/A'}</td>
          </tr>
          <tr>
            <th>Memória livre:</th>
            <td>${data.system.memory?.free || 'N/A'}</td>
          </tr>
          <tr>
            <th>Uso de memória:</th>
            <td>${data.system.memory?.usage || 'N/A'}</td>
          </tr>
          <tr>
            <th>Uptime:</th>
            <td>${data.system.uptime || 'N/A'}</td>
          </tr>
          <tr>
            <th>Ambiente:</th>
            <td>${data.system.env || 'N/A'}</td>
          </tr>
        </table>
      `;
      
      sysDetails.innerHTML = sysHtml;
    }
  },

  /**
   * Gera um relatório de diagnóstico
   */
  async generateReport() {
    try {
      // Mostrar indicador de carregamento
      this.showToast('Gerando relatório de diagnóstico...', 'info');
      
      document.getElementById('generate-report-btn').disabled = true;
      document.getElementById('generate-report-btn').innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Gerando...';
      
      // Gerar relatório
      const response = await API.diagnostics.generateReport();
      
      if (!response.data) {
        this.showToast('Erro ao gerar relatório', 'danger');
        return;
      }
      
      this.showToast('Relatório gerado com sucesso', 'success');
      
      // Mostrar modal com link para download
      this.showReportModal(response.data);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      this.showToast(`Erro ao gerar relatório: ${error.message || 'Erro desconhecido'}`, 'danger');
    } finally {
      document.getElementById('generate-report-btn').disabled = false;
      document.getElementById('generate-report-btn').innerHTML = '<i class="fas fa-file-medical-alt me-1"></i>Gerar Relatório';
    }
  },

  /**
   * Mostra modal com link para download do relatório
   */
  showReportModal(report) {
    // Criar modal se não existir
    let modal = document.getElementById('report-modal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'report-modal';
      modal.className = 'modal fade';
      modal.tabIndex = -1;
      modal.setAttribute('aria-hidden', 'true');
      
      modal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Relatório de Diagnóstico</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
              <p>O relatório de diagnóstico foi gerado com sucesso.</p>
              <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                <span>O relatório foi salvo no servidor em:</span>
                <code id="report-path" class="d-block mt-2"></code>
              </div>
              <p>Resumo do relatório:</p>
              <table class="table table-sm">
                <tr>
                  <th>Data/Hora:</th>
                  <td id="report-timestamp"></td>
                </tr>
                <tr>
                  <th>Duração:</th>
                  <td id="report-duration"></td>
                </tr>
                <tr>
                  <th>Banco de Dados:</th>
                  <td id="report-db-status"></td>
                </tr>
                <tr>
                  <th>WhatsApp:</th>
                  <td id="report-wa-status"></td>
                </tr>
                <tr>
                  <th>Sistema de Arquivos:</th>
                  <td id="report-fs-status"></td>
                </tr>
              </table>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
    }
    
    // Preencher dados do relatório
    document.getElementById('report-timestamp').textContent = new Date(report.timestamp).toLocaleString('pt-BR');
    document.getElementById('report-duration').textContent = `${report.duration} segundos`;
    document.getElementById('report-db-status').innerHTML = this.getStatusBadgeHtml(report.summary.database);
    document.getElementById('report-wa-status').innerHTML = this.getStatusBadgeHtml(report.summary.whatsapp);
    document.getElementById('report-fs-status').innerHTML = this.getStatusBadgeHtml(report.summary.filesystem);
    
    // Exibir modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  },

  /**
   * Retorna o rótulo para um status
   */
  getStatusLabel(status) {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Erro';
      case 'ok':
        return 'OK';
      case 'not_configured':
        return 'Não Configurado';
      default:
        return 'Desconhecido';
    }
  },

  /**
   * Retorna a classe de badge para um status
   */
  getStatusBadgeClass(status) {
    switch (status) {
      case 'online':
      case 'ok':
        return 'bg-success';
      case 'offline':
        return 'bg-warning text-dark';
      case 'error':
        return 'bg-danger';
      case 'not_configured':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  },

  /**
   * Retorna o HTML de um badge para um status
   */
  getStatusBadgeHtml(status) {
    return `<span class="badge ${this.getStatusBadgeClass(status)}">${this.getStatusLabel(status)}</span>`;
  },

  /**
   * Inicializa a aba de diagnóstico
   */
  initDiagnosticsTab() {
    // Configurar evento para o botão de diagnóstico
    document.getElementById('run-diagnostics-btn')?.addEventListener('click', () => {
      this.runDiagnostics();
    });
    
    // Configurar evento para o botão de relatório
    document.getElementById('generate-report-btn')?.addEventListener('click', () => {
      this.generateReport();
    });
    
    // Configurar eventos para os accordions
    document.getElementById('database-collapse')?.addEventListener('show.bs.collapse', () => {
      this.checkDatabaseDetails();
    });
    
    document.getElementById('whatsapp-collapse')?.addEventListener('show.bs.collapse', () => {
      this.checkWhatsAppDetails();
    });
    
    document.getElementById('filesystem-collapse')?.addEventListener('show.bs.collapse', () => {
      this.checkFileSystemDetails();
    });
  },

  /**
   * Exporta clientes para JSON
   */
  exportClientsToJson() {
    try {
      this.showToast('Exportando clientes para JSON...', 'info');
      API.export.clientsToJson();
    } catch (error) {
      console.error('Erro ao exportar clientes para JSON:', error);
      this.showToast(`Erro ao exportar clientes: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },

  /**
   * Exporta clientes para CSV
   */
  exportClientsToCsv() {
    try {
      this.showToast('Exportando clientes para CSV...', 'info');
      API.export.clientsToCsv();
    } catch (error) {
      console.error('Erro ao exportar clientes para CSV:', error);
      this.showToast(`Erro ao exportar clientes: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },

  /**
   * Exporta clientes para Excel
   */
  exportClientsToExcel() {
    try {
      this.showToast('Exportando clientes para Excel...', 'info');
      API.export.clientsToExcel();
    } catch (error) {
      console.error('Erro ao exportar clientes para Excel:', error);
      this.showToast(`Erro ao exportar clientes: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },

  /**
   * Exporta promoções para JSON
   */
  exportPromotionsToJson() {
    try {
      this.showToast('Exportando promoções para JSON...', 'info');
      API.export.promotionsToJson();
    } catch (error) {
      console.error('Erro ao exportar promoções para JSON:', error);
      this.showToast(`Erro ao exportar promoções: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },

  /**
   * Exporta mensagens para JSON
   */
  exportMessagesToJson() {
    try {
      this.showToast('Exportando mensagens para JSON...', 'info');
      API.export.messagesToJson();
    } catch (error) {
      console.error('Erro ao exportar mensagens para JSON:', error);
      this.showToast(`Erro ao exportar mensagens: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },

  /**
   * Cria um backup completo
   */
  async createBackup() {
    try {
      this.showToast('Criando backup completo...', 'info');
      
      document.getElementById('create-backup-btn').disabled = true;
      document.getElementById('create-backup-btn').innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Criando...';
      
      const response = await API.export.createBackup();
      
      if (!response.data) {
        this.showToast('Erro ao criar backup', 'danger');
        return;
      }
      
      this.showToast('Backup criado com sucesso', 'success');
      
      // Exibir modal com detalhes do backup
      this.showBackupDetails(response.data);
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      this.showToast(`Erro ao criar backup: ${error.message || 'Erro desconhecido'}`, 'danger');
    } finally {
      document.getElementById('create-backup-btn').disabled = false;
      document.getElementById('create-backup-btn').innerHTML = '<i class="fas fa-database me-1"></i>Criar Backup';
    }
  },

  /**
   * Exibe detalhes do backup
   */
  showBackupDetails(data) {
    const modal = document.getElementById('backup-details-modal');
    if (!modal) return;
    
    document.getElementById('backup-dir').textContent = data.backupDir;
    document.getElementById('backup-timestamp').textContent = new Date(data.metadata.timestamp).toLocaleString('pt-BR');
    document.getElementById('backup-clients-count').textContent = data.metadata.counts.clients;
    document.getElementById('backup-promotions-count').textContent = data.metadata.counts.promotions;
    document.getElementById('backup-messages-count').textContent = data.metadata.counts.messages;
    
    // Exibir modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  },

  /**
   * Inicializa a aba de exportação
   */
  initExportTab() {
    // Configurar eventos para os botões de exportação
    document.getElementById('export-clients-json-btn')?.addEventListener('click', () => {
      this.exportClientsToJson();
    });
    
    document.getElementById('export-clients-csv-btn')?.addEventListener('click', () => {
      this.exportClientsToCsv();
    });
    
    document.getElementById('export-clients-excel-btn')?.addEventListener('click', () => {
      this.exportClientsToExcel();
    });
    
    document.getElementById('export-promotions-json-btn')?.addEventListener('click', () => {
      this.exportPromotionsToJson();
    });
    
    document.getElementById('export-messages-json-btn')?.addEventListener('click', () => {
      this.exportMessagesToJson();
    });
    
    document.getElementById('create-backup-btn')?.addEventListener('click', () => {
      this.createBackup();
    });
  },

  // Configurar suporte a modo offline
  setupOfflineMode() {
    // Verificar status de conectividade
    this.checkConnectivity();
    
    // Adicionar listener para eventos de conectividade
    window.addEventListener('online', () => {
      console.log('Conexão com a internet restaurada!');
      this.checkConnectivity();
    });
    
    window.addEventListener('offline', () => {
      console.log('Conexão com a internet perdida!');
      this.showOfflineNotification(true);
    });
  },
  
  // Verificar conectividade com o servidor
  async checkConnectivity() {
    try {
      const statusContainer = document.getElementById('server-status');
      if (statusContainer) {
        statusContainer.innerHTML = `
          <div class="d-flex align-items-center text-warning">
            <div class="spinner-border spinner-border-sm me-2" role="status">
              <span class="visually-hidden">Verificando...</span>
            </div>
            <span>Verificando conexão com o servidor...</span>
          </div>
        `;
      }
      
      // Verificar conexão com o servidor
      const response = await fetch('/api/status', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Status do servidor:', data);
      
      // Atualizar indicador de status
      if (statusContainer) {
        if (data.online) {
          statusContainer.innerHTML = `
            <div class="d-flex align-items-center text-success">
              <i class="fas fa-check-circle me-2"></i>
              <span>Servidor online</span>
            </div>
          `;
          
          // Verificar status do banco de dados
          const dbStatusContainer = document.getElementById('db-status');
          if (dbStatusContainer && data.database) {
            if (data.database.connected) {
              dbStatusContainer.innerHTML = `
                <div class="d-flex align-items-center text-success">
                  <i class="fas fa-check-circle me-2"></i>
                  <span>Banco de dados conectado</span>
                </div>
              `;
            } else {
              dbStatusContainer.innerHTML = `
                <div class="d-flex align-items-center text-danger">
                  <i class="fas fa-times-circle me-2"></i>
                  <span>Banco de dados desconectado</span>
                </div>
              `;
            }
          }
          
          // Se estamos online, remover notificação offline
          this.showOfflineNotification(false);
        } else {
          statusContainer.innerHTML = `
            <div class="d-flex align-items-center text-danger">
              <i class="fas fa-times-circle me-2"></i>
              <span>Servidor offline</span>
            </div>
          `;
          this.showOfflineNotification(true);
        }
      }
      
      // Atualizar outras informações do sistema se disponíveis
      if (data.version) {
        const versionElement = document.getElementById('api-version');
        if (versionElement) {
          versionElement.textContent = data.version;
        }
      }
      
      if (data.uptime) {
        const uptimeElement = document.getElementById('server-uptime');
        if (uptimeElement) {
          const uptime = this.formatUptime(data.uptime);
          uptimeElement.textContent = uptime;
        }
      }
      
      if (data.memory) {
        const memoryElement = document.getElementById('memory-usage');
        if (memoryElement) {
          const memoryUsed = Math.round(data.memory.used / 1024 / 1024);
          const memoryTotal = Math.round(data.memory.total / 1024 / 1024);
          const memoryPercent = Math.round((data.memory.used / data.memory.total) * 100);
          
          memoryElement.innerHTML = `
            ${memoryUsed} MB / ${memoryTotal} MB (${memoryPercent}%)
            <div class="progress mt-1" style="height: 6px;">
              <div class="progress-bar ${memoryPercent > 80 ? 'bg-danger' : memoryPercent > 60 ? 'bg-warning' : 'bg-success'}" 
                   role="progressbar" 
                   style="width: ${memoryPercent}%" 
                   aria-valuenow="${memoryPercent}" 
                   aria-valuemin="0" 
                   aria-valuemax="100"></div>
            </div>
          `;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao verificar conectividade:', error);
      
      // Atualizar indicador de status
      const statusContainer = document.getElementById('server-status');
      if (statusContainer) {
        statusContainer.innerHTML = `
          <div class="d-flex align-items-center text-danger">
            <i class="fas fa-times-circle me-2"></i>
            <span>Servidor inacessível</span>
          </div>
        `;
      }
      
      // Mostrar notificação de modo offline
      this.showOfflineNotification(true);
      
      return false;
    }
  },
  
  // Formatar tempo de atividade do servidor
  formatUptime(seconds) {
    if (!seconds || isNaN(seconds)) return 'N/D';
    
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days} dia${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hora${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minuto${minutes > 1 ? 's' : ''}`);
    
    return parts.join(', ') || '< 1 minuto';
  },
  
  // Mostrar notificação de modo offline
  showOfflineNotification(show) {
    const offlineBanner = document.getElementById('offline-banner');
    
    if (show) {
      if (!offlineBanner) {
        // Criar banner de modo offline
        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.className = 'alert alert-warning alert-dismissible fade show mb-4';
        banner.innerHTML = `
          <div class="d-flex align-items-center">
            <i class="fas fa-wifi-slash me-3"></i>
            <div>
              <h5 class="alert-heading">Modo Offline</h5>
              <p class="mb-0">Não foi possível conectar ao servidor. Algumas funcionalidades estarão limitadas.</p>
            </div>
          </div>
          <hr>
          <p class="mb-0">
            <strong>O que você pode fazer:</strong>
          </p>
          <ul>
            <li>Verificar a conexão com a internet</li>
            <li>Confirmar se o servidor está em execução</li>
            <li>Verificar as configurações no arquivo .env</li>
          </ul>
          <button id="retry-connection-btn" class="btn btn-outline-primary btn-sm">
            <i class="fas fa-sync me-1"></i>Tentar reconectar
          </button>
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        `;
        
        // Adicionar banner no topo do container principal
        const mainContainer = document.querySelector('.container') || document.body;
        if (mainContainer.firstChild) {
          mainContainer.insertBefore(banner, mainContainer.firstChild);
        } else {
          mainContainer.appendChild(banner);
        }
        
        // Adicionar evento ao botão de reconexão
        document.getElementById('retry-connection-btn')?.addEventListener('click', () => {
          this.checkConnectivity();
        });
      }
    } else {
      // Remover banner se existir
      if (offlineBanner) {
        offlineBanner.remove();
      }
    }
  },
  
  // Executar diagnóstico detalhado do sistema
  async runDetailedDiagnostic() {
    const resultsContainer = document.getElementById('diagnostic-results');
    if (!resultsContainer) return;
    
    try {
      resultsContainer.innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Verificando...</span>
          </div>
          <p class="mt-2">Executando diagnóstico completo do sistema...</p>
        </div>
      `;
      
      // Executar diagnóstico
      const response = await fetch('/api/diagnostic/system', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const diagnostic = await response.json();
      console.log('Diagnóstico do sistema:', diagnostic);
      
      // Formatar e exibir resultados
      let html = `
        <div class="card mb-4">
          <div class="card-header bg-light">
            <h5 class="mb-0">Resultado do Diagnóstico</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <h6>Status do Sistema</h6>
                <ul class="list-group mb-3">
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    Servidor
                    ${this.getStatusBadgeHtml(diagnostic.server ? 'success' : 'danger')}
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    Banco de Dados
                    ${this.getStatusBadgeHtml(diagnostic.database ? 'success' : 'danger')}
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    API WhatsApp
                    ${this.getStatusBadgeHtml(diagnostic.whatsapp ? 'success' : 'danger')}
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    Sistema de Arquivos
                    ${this.getStatusBadgeHtml(diagnostic.filesystem ? 'success' : 'warning')}
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    Agendador
                    ${this.getStatusBadgeHtml(diagnostic.scheduler ? 'success' : 'warning')}
                  </li>
                </ul>
              </div>
              
              <div class="col-md-6">
                <h6>Detalhes da Configuração</h6>
                <ul class="list-group mb-3">
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    Modo Debug
                    <span class="badge ${diagnostic.debug ? 'bg-warning text-dark' : 'bg-success'}">${diagnostic.debug ? 'Ativado' : 'Desativado'}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    Versão da API
                    <span>${diagnostic.version || 'N/D'}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    Ambiente
                    <span class="badge ${diagnostic.environment === 'production' ? 'bg-success' : 'bg-info'}">${diagnostic.environment || 'development'}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    Porta
                    <span>${diagnostic.port || 'N/D'}</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div class="row mt-3">
              <div class="col-12">
                <h6>Estatísticas do Sistema</h6>
                <table class="table table-bordered table-sm">
                  <tbody>
                    <tr>
                      <th>CPU</th>
                      <td>${diagnostic.stats?.cpu ? diagnostic.stats.cpu + '%' : 'N/D'}</td>
                      <th>Memória</th>
                      <td>${diagnostic.stats?.memory ? diagnostic.stats.memory + ' MB' : 'N/D'}</td>
                    </tr>
                    <tr>
                      <th>Tempo de Atividade</th>
                      <td>${this.formatUptime(diagnostic.stats?.uptime)}</td>
                      <th>Disco</th>
                      <td>${diagnostic.stats?.disk ? diagnostic.stats.disk + '% utilizado' : 'N/D'}</td>
                    </tr>
                    <tr>
                      <th>Conexões Ativas</th>
                      <td>${diagnostic.stats?.connections || 'N/D'}</td>
                      <th>Tarefas Pendentes</th>
                      <td>${diagnostic.stats?.pendingTasks || 'N/D'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            ${diagnostic.errors && diagnostic.errors.length > 0 ? `
            <div class="alert alert-danger mt-3">
              <h6 class="alert-heading">Erros Encontrados</h6>
              <ul class="mb-0">
                ${diagnostic.errors.map(error => `<li>${error}</li>`).join('')}
              </ul>
            </div>
            ` : ''}
            
            ${diagnostic.warnings && diagnostic.warnings.length > 0 ? `
            <div class="alert alert-warning mt-3">
              <h6 class="alert-heading">Avisos</h6>
              <ul class="mb-0">
                ${diagnostic.warnings.map(warning => `<li>${warning}</li>`).join('')}
              </ul>
            </div>
            ` : ''}
            
            <div class="mt-3">
              <button id="retry-diagnostic-btn" class="btn btn-primary">
                <i class="fas fa-sync me-1"></i>Executar Novamente
              </button>
              <button id="export-diagnostic-btn" class="btn btn-outline-secondary ms-2">
                <i class="fas fa-file-export me-1"></i>Exportar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      `;
      
      resultsContainer.innerHTML = html;
      
      // Adicionar eventos aos botões
      document.getElementById('retry-diagnostic-btn')?.addEventListener('click', () => this.runDetailedDiagnostic());
      document.getElementById('export-diagnostic-btn')?.addEventListener('click', () => this.exportDiagnostic(diagnostic));
      
    } catch (error) {
      console.error('Erro ao executar diagnóstico:', error);
      
      // Mostrar mensagem de erro
      resultsContainer.innerHTML = `
        <div class="alert alert-danger">
          <h5 class="alert-heading">Erro ao executar diagnóstico</h5>
          <p>${error.message || 'Não foi possível conectar ao servidor'}</p>
          <hr>
          <p class="mb-0">Tentar diagnóstico offline:</p>
          <div class="mt-2">
            <button id="offline-diagnostic-btn" class="btn btn-warning">
              <i class="fas fa-tools me-1"></i>Diagnóstico Offline
            </button>
          </div>
        </div>
      `;
      
      // Adicionar evento ao botão de diagnóstico offline
      document.getElementById('offline-diagnostic-btn')?.addEventListener('click', () => this.runOfflineDiagnostic());
    }
  },
  
  // Executar diagnóstico offline (baseado em informações locais)
  runOfflineDiagnostic() {
    const resultsContainer = document.getElementById('diagnostic-results');
    if (!resultsContainer) return;
    
    // Criar diagnóstico baseado em informações disponíveis no navegador
    const diagnostic = {
      timestamp: new Date().toISOString(),
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        online: navigator.onLine,
        cookiesEnabled: navigator.cookieEnabled,
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined'
      },
      localStorage: {
        availableItems: Object.keys(localStorage).length,
        approximateSize: this.calculateLocalStorageSize()
      },
      connection: {
        type: navigator.connection ? navigator.connection.effectiveType : 'unknown',
        downlink: navigator.connection ? navigator.connection.downlink : 'unknown',
        rtt: navigator.connection ? navigator.connection.rtt : 'unknown'
      }
    };
    
    // Verificar objetos de API no armazenamento local
    const cachedData = {
      userProfile: localStorage.getItem('userProfile') ? true : false,
      dashboardStats: localStorage.getItem('dashboardStats') ? true : false,
      clientsData: localStorage.getItem('clientsData') ? true : false,
      promotionsData: localStorage.getItem('promotionsData') ? true : false,
      messagesData: localStorage.getItem('messagesData') ? true : false
    };
    
    // Tentar extrair versão do cache
    let cachedVersion = 'N/D';
    try {
      const dashboardStats = JSON.parse(localStorage.getItem('dashboardStats') || '{}');
      if (dashboardStats.version) {
        cachedVersion = dashboardStats.version;
      }
    } catch (e) {
      console.error('Erro ao extrair versão do cache:', e);
    }
    
    // Criar relatório HTML
    const html = `
      <div class="card mb-4">
        <div class="card-header bg-light">
          <h5 class="mb-0">Diagnóstico Offline</h5>
        </div>
        <div class="card-body">
          <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            Este diagnóstico é baseado apenas em informações disponíveis no navegador, já que não foi possível conectar ao servidor.
          </div>
          
          <div class="row">
            <div class="col-md-6">
              <h6>Informações do Navegador</h6>
              <ul class="list-group mb-3">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Status da Conexão
                  ${this.getStatusBadgeHtml(diagnostic.browser.online ? 'success' : 'danger')}
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Cookies Habilitados
                  ${this.getStatusBadgeHtml(diagnostic.browser.cookiesEnabled ? 'success' : 'warning')}
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  LocalStorage Disponível
                  ${this.getStatusBadgeHtml(diagnostic.browser.localStorage ? 'success' : 'danger')}
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Dados em Cache
                  ${Object.values(cachedData).some(v => v) ? 
                    `<span class="badge bg-success">Disponíveis</span>` : 
                    `<span class="badge bg-danger">Nenhum</span>`}
                </li>
              </ul>
            </div>
            
            <div class="col-md-6">
              <h6>Dados em Cache</h6>
              <ul class="list-group mb-3">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Perfil de Usuário
                  ${this.getStatusBadgeHtml(cachedData.userProfile ? 'success' : 'danger')}
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Estatísticas do Dashboard
                  ${this.getStatusBadgeHtml(cachedData.dashboardStats ? 'success' : 'danger')}
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Dados de Clientes
                  ${this.getStatusBadgeHtml(cachedData.clientsData ? 'success' : 'danger')}
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Dados de Promoções
                  ${this.getStatusBadgeHtml(cachedData.promotionsData ? 'success' : 'danger')}
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Dados de Mensagens
                  ${this.getStatusBadgeHtml(cachedData.messagesData ? 'success' : 'danger')}
                </li>
              </ul>
            </div>
          </div>
          
          <div class="row mt-3">
            <div class="col-12">
              <h6>Detalhes da Conexão</h6>
              <table class="table table-bordered table-sm">
                <tbody>
                  <tr>
                    <th>Tipo de Conexão</th>
                    <td>${diagnostic.connection.type}</td>
                    <th>Downlink</th>
                    <td>${diagnostic.connection.downlink} Mbps</td>
                  </tr>
                  <tr>
                    <th>Round Trip Time</th>
                    <td>${diagnostic.connection.rtt} ms</td>
                    <th>Versão em Cache</th>
                    <td>${cachedVersion}</td>
                  </tr>
                  <tr>
                    <th>Uso do LocalStorage</th>
                    <td>${diagnostic.localStorage.approximateSize} KB</td>
                    <th>Itens no LocalStorage</th>
                    <td>${diagnostic.localStorage.availableItems}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="alert alert-warning mt-3">
            <h6 class="alert-heading">Recomendações</h6>
            <ol class="mb-0">
              <li>Verifique sua conexão com a internet</li>
              <li>Confirme se o servidor está em execução</li>
              <li>Tente limpar o cache do navegador e recarregar a página</li>
              <li>Se necessário, exporte os dados em cache antes de limpar o navegador</li>
            </ol>
          </div>
          
          <div class="mt-3">
            <button id="retry-connection-btn" class="btn btn-primary">
              <i class="fas fa-sync me-1"></i>Tentar Reconectar
            </button>
            <button id="export-cache-btn" class="btn btn-outline-secondary ms-2">
              <i class="fas fa-file-export me-1"></i>Exportar Dados em Cache
            </button>
            <button id="clear-cache-btn" class="btn btn-outline-danger ms-2">
              <i class="fas fa-trash me-1"></i>Limpar Cache
            </button>
          </div>
        </div>
      </div>
    `;
    
    resultsContainer.innerHTML = html;
    
    // Adicionar eventos aos botões
    document.getElementById('retry-connection-btn')?.addEventListener('click', () => this.runDetailedDiagnostic());
    document.getElementById('export-cache-btn')?.addEventListener('click', () => this.exportCachedData());
    document.getElementById('clear-cache-btn')?.addEventListener('click', () => this.clearBrowserCache());
  },
  
  // Calcular tamanho aproximado do localStorage
  calculateLocalStorageSize() {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      totalSize += (key.length + value.length) * 2; // Aproximação para UTF-16
    }
    return Math.round(totalSize / 1024); // Converter para KB
  },
  
  // Exportar dados em cache
  exportCachedData() {
    try {
      const cachedData = {
        userProfile: JSON.parse(localStorage.getItem('userProfile') || '{}'),
        dashboardStats: JSON.parse(localStorage.getItem('dashboardStats') || '{}'),
        clientsData: JSON.parse(localStorage.getItem('clientsData') || '[]'),
        promotionsData: JSON.parse(localStorage.getItem('promotionsData') || '[]'),
        messagesData: JSON.parse(localStorage.getItem('messagesData') || '[]'),
        exportDate: new Date().toISOString(),
        systemInfo: {
          browser: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform
        }
      };
      
      const jsonString = JSON.stringify(cachedData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `botpromo-cache-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      this.showToast('Dados em cache exportados com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar dados em cache:', error);
      this.showToast('Erro ao exportar dados em cache: ' + (error.message || 'Erro desconhecido'), 'danger');
    }
  },
  
  // Limpar cache do navegador
  clearBrowserCache() {
    if (confirm('Tem certeza que deseja limpar todos os dados em cache? Esta ação não pode ser desfeita.')) {
      try {
        // Limpar localStorage
        localStorage.clear();
        
        this.showToast('Cache limpo com sucesso! A página será recarregada.', 'success');
        
        // Recarregar a página após um breve delay
        setTimeout(() => {
          window.location.reload(true);
        }, 1500);
      } catch (error) {
        console.error('Erro ao limpar cache:', error);
        this.showToast('Erro ao limpar cache: ' + (error.message || 'Erro desconhecido'), 'danger');
      }
    }
  },
  
  // Exportar diagnóstico
  exportDiagnostic(diagnostic) {
    try {
      // Adicionar informações extras
      diagnostic.exportTimestamp = new Date().toISOString();
      diagnostic.browser = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
      };
      
      const jsonString = JSON.stringify(diagnostic, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `botpromo-diagnostic-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      this.showToast('Diagnóstico exportado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar diagnóstico:', error);
      this.showToast('Erro ao exportar diagnóstico: ' + (error.message || 'Erro desconhecido'), 'danger');
    }
  },
};

// Quando a página de configurações for carregada, inicializar o gerenciador
document.addEventListener('DOMContentLoaded', () => {
  // Verifica se estamos na página de configurações
  if (document.querySelector('.settings-tabs')) {
    SettingsManager.init();
  }
});

// Expõe o gerenciador globalmente para que os eventos onclick funcionem
window.SettingsManager = SettingsManager;
