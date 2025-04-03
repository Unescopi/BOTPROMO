/**
 * settings.js - Gerenciamento de configurações do sistema
 */

const SettingsManager = {
  init() {
    console.log('Inicializando gerenciamento de configurações...');
    this.setupEventListeners();
    this.loadSettings();
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
      const settings = await response.json();
      
      this.populateSettings(settings);
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      this.showToast('Erro ao carregar configurações. Verifique a conexão com o servidor.', 'danger');
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
    
    fetch('/api/settings/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: apiUrl,
        key: apiKey
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Falha na conexão');
        }
        return response.json();
      })
      .then(data => {
        this.showToast('Conexão estabelecida com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao testar conexão:', error);
        this.showToast('Erro ao conectar com a API', 'danger');
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
  }
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
