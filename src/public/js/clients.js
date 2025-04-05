/**
 * clients.js - Gerenciamento de clientes
 */

const ClientsManager = {
  init() {
    console.log('Inicializando gerenciamento de clientes...');
    
    // Verificar se o usuário está autenticado
    if (!Auth.isAuthenticated()) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
    this.setupEventListeners();
    this.loadClients();
  },

  setupEventListeners() {
    console.log('Configurando event listeners para clientes...');
    
    // Adicione logs para verificar se os botões estão sendo encontrados
    const saveClientBtn = document.getElementById('save-client-btn');
    console.log('Botão salvar cliente:', saveClientBtn);
    
    // Manipulador para adicionar novo cliente
    const clientForm = document.getElementById('client-form');
    if (clientForm) {
      clientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveClient();
      });
    }
    
    // Evento para resetar o formulário quando o modal de novo cliente for aberto
    const clientModal = document.getElementById('clientModal');
    if (clientModal) {
      clientModal.addEventListener('show.bs.modal', (event) => {
        // Se o botão que acionou o modal foi o de novo cliente (não tem data-client-id)
        const button = event.relatedTarget;
        if (!button || !button.getAttribute('data-client-id')) {
          this.resetClientForm();
        }
      });
    }
    
    // Manipulador para importar clientes
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importClients());
    }
    
    // Manipulador para exportar clientes
    const exportBtn = document.getElementById('export-clients-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportClients());
    }
    
    // Manipulador para pesquisa
    const searchInput = document.getElementById('client-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.filterClients();
      });
    }
    
    // Manipulador para filtros
    const tagFilter = document.getElementById('tag-filter');
    const statusFilter = document.getElementById('status-filter');
    if (tagFilter) tagFilter.addEventListener('change', () => this.filterClients());
    if (statusFilter) statusFilter.addEventListener('change', () => this.filterClients());
    
    // Reset de filtros
    const resetFiltersBtn = document.getElementById('reset-filters');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => this.resetFilters());
    }
    
    // Select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-clients');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        this.toggleSelectAll(e.target.checked);
      });
    }
    
    // Botões de ação para clientes selecionados
    const addTagBtn = document.getElementById('add-tag-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    if (addTagBtn) addTagBtn.addEventListener('click', () => this.addTagToSelected());
    if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', () => this.deleteSelected());
  },
  
  async loadClients() {
    try {
      console.log('=== INÍCIO: loadClients ===');
      
      // Mostrar indicador de carregamento
      const tableBody = document.getElementById('clients-table-body');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando clientes...</span></div><p class="mt-2">Carregando clientes...</p></td></tr>';
      }
      
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        console.log('Usuário não autenticado, redirecionando para login');
        Auth.logout();
        return;
      }
      
      // Usar o módulo API centralizado para buscar clientes
      console.log('Buscando clientes da API');
      try {
        const clients = await API.clients.getAll();
        console.log('Clientes recebidos da API:', clients);
        
        // Verificar se há clientes
        if (!clients || clients.length === 0) {
          console.warn('Nenhum cliente retornado da API');
          
          // Para depuração, adicionar um cliente de teste se não houver clientes
          const mockClient = {
            _id: 'teste-mock-id',
            name: 'Cliente de Teste',
            phone: '554499999999',
            email: 'teste@exemplo.com',
            status: 'active',
            tags: ['teste', 'debug'],
            lastVisit: new Date().toISOString()
          };
          
          console.log('Adicionando cliente de teste para depuração:', mockClient);
          this.renderClientsTable([mockClient]);
        } else {
          // Atualizar a tabela com os clientes
          this.renderClientsTable(clients);
        }
        
        // Atualizar contadores
        this.updateCounters(clients || []);
        
        // Atualizar filtros de tags
        this.updateTagFilters(clients || []);
      } catch (apiError) {
        console.error('Erro ao chamar API.clients.getAll():', apiError);
        
        // Verificar erro de API específico
        if (apiError.message && apiError.message.includes('404')) {
          console.error('Endpoint /clients não encontrado. Verifique se a rota está correta no backend.');
          
          // Exibir mensagem específica na tabela
          if (tableBody) {
            tableBody.innerHTML = `
              <tr>
                <td colspan="7" class="text-center text-danger">
                  <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Erro 404: Endpoint de clientes não encontrado
                    <p class="small mt-2">Verifique se o servidor está configurado corretamente</p>
                  </div>
                </td>
              </tr>
            `;
          }
        } else if (apiError.message && apiError.message.includes('Sessão expirada')) {
          Auth.logout();
          return;
        } else {
          // Erro genérico
          if (tableBody) {
            tableBody.innerHTML = `
              <tr>
                <td colspan="7" class="text-center text-danger">
                  <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Erro ao carregar clientes: ${apiError.message || 'Erro desconhecido'}
                    <button class="btn btn-sm btn-outline-secondary mt-2" onclick="ClientsManager.loadClients()">
                      <i class="fas fa-sync me-1"></i>Tentar novamente
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }
        }
      }
      
      console.log('=== FIM: loadClients ===');
    } catch (error) {
      console.error('=== ERRO: loadClients ===');
      console.error('Mensagem de erro:', error);
      console.error('Stack trace:', error.stack);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      const tableBody = document.getElementById('clients-table-body');
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center text-danger">
              <div class="alert alert-danger">
                <i class="fas fa-bug me-2"></i>
                Erro ao carregar clientes: ${error.message || 'Erro desconhecido'}
                <p class="small mb-0 mt-2">Verifique o console para mais detalhes (F12)</p>
              </div>
            </td>
          </tr>
        `;
      }
    }
  },
  
  async saveClient() {
    try {
      console.log('=== INÍCIO: saveClient ===');
      
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        console.log('Usuário não autenticado, redirecionando para login');
        Auth.logout();
        return;
      }
      
      // Obter dados do formulário
      const clientId = document.getElementById('client-id').value;
      const name = document.getElementById('client-name').value.trim();
      const phone = document.getElementById('client-phone').value.trim();
      const email = document.getElementById('client-email').value.trim();
      const status = document.getElementById('client-status').value;
      const tags = document.getElementById('client-tags').value.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
      
      console.log('Dados do formulário:', { clientId, name, phone, email, status, tags });
      
      if (!name || !phone) {
        console.log('Validação falhou: Nome e telefone são obrigatórios');
        this.showToast('Nome e telefone são obrigatórios', 'warning');
        return;
      }
      
      // Desabilitar o botão de salvar para evitar cliques duplos
      const saveButton = document.getElementById('save-client-btn');
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';
      }
      
      // Preparar dados do cliente
      const clientData = {
        name,
        phone,
        email,
        status,
        tags
      };
      
      console.log('Dados do cliente a serem enviados:', clientData);
      
      // Usar o módulo API centralizado
      let response;
      if (clientId) {
        // Atualizar cliente existente
        console.log('Atualizando cliente existente, ID:', clientId);
        response = await API.clients.update(clientId, clientData);
        console.log('Resposta da atualização:', response);
      } else {
        // Criar novo cliente
        console.log('Criando novo cliente');
        response = await API.clients.create(clientData);
        console.log('Resposta da criação:', response);
      }
      
      // Fechar o modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
      if (modal) {
        modal.hide();
      }
      
      // Limpar o formulário
      this.resetClientForm();
      
      // Recarregar a lista de clientes
      console.log('Recarregando lista de clientes');
      await this.loadClients();
      console.log('Lista de clientes recarregada');
      
      // Mostrar mensagem de sucesso
      this.showToast(`Cliente ${clientId ? 'atualizado' : 'criado'} com sucesso`, 'success');
      
      console.log('=== FIM: saveClient ===');
    } catch (error) {
      console.error('=== ERRO: saveClient ===');
      console.error('Mensagem de erro:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao salvar cliente: ${error.message || 'Erro desconhecido'}`, 'danger');
    } finally {
      // Restaurar o botão de salvar
      const saveButton = document.getElementById('save-client-btn');
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = 'Salvar';
      }
    }
  },
  
  async editClient(clientId) {
    if (!clientId) {
      this.showToast('ID do cliente não fornecido', 'warning');
      return;
    }
    
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Obter dados do cliente
      const client = await API.clients.get(clientId);
      
      // Preencher o formulário
      document.getElementById('client-id').value = client._id;
      document.getElementById('client-name').value = client.name || '';
      document.getElementById('client-phone').value = client.phone || '';
      document.getElementById('client-email').value = client.email || '';
      document.getElementById('client-status').value = client.status || 'active';
      document.getElementById('client-tags').value = client.tags?.join(', ') || '';
      
      // Atualizar o título do modal
      document.getElementById('client-modal-title').innerHTML = '<i class="fas fa-user-edit me-2"></i>Editar Cliente';
      
      // Abrir o modal
      const modal = new bootstrap.Modal(document.getElementById('clientModal'));
      modal.show();
      
    } catch (error) {
      console.error('Erro ao carregar cliente para edição:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao carregar cliente: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },
  
  async deleteClient(clientId) {
    if (!clientId) {
      this.showToast('ID do cliente não fornecido', 'warning');
      return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este cliente?')) {
      return;
    }
    
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Usar o módulo API centralizado
      await API.clients.delete(clientId);
      
      // Recarregar a lista de clientes
      this.loadClients();
      
      // Mostrar mensagem de sucesso
      this.showToast('Cliente excluído com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao excluir cliente: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },
  
  async importClients() {
    const fileInput = document.getElementById('import-file');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      this.showToast('Selecione um arquivo CSV para importar', 'warning');
      return;
    }
    
    // Verificar se o usuário está autenticado
    if (!Auth.isAuthenticated()) {
      Auth.logout();
      return;
    }
    
    const file = fileInput.files[0];
    
    // Verificar se é um arquivo CSV
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      this.showToast('Por favor, selecione um arquivo CSV válido', 'warning');
      return;
    }
    
    try {
      // Mostrar indicador de carregamento
      const importBtn = document.getElementById('import-btn');
      if (importBtn) {
        importBtn.disabled = true;
        importBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Importando...';
      }
      
      // Criar FormData para upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Usar o módulo API centralizado
      const result = await API.clients.import(formData);
      
      // Fechar o modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
      if (modal) {
        modal.hide();
      }
      
      // Limpar o input de arquivo
      fileInput.value = '';
      
      // Recarregar a lista de clientes
      this.loadClients();
      
      // Mostrar mensagem de sucesso
      this.showToast(`${result.imported} clientes importados com sucesso`, 'success');
      
    } catch (error) {
      console.error('Erro ao importar clientes:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao importar clientes: ${error.message || 'Erro desconhecido'}`, 'danger');
    } finally {
      // Restaurar o botão
      const importBtn = document.getElementById('import-btn');
      if (importBtn) {
        importBtn.disabled = false;
        importBtn.innerHTML = 'Importar';
      }
    }
  },
  
  async exportClients() {
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Redirecionar para a API de exportação
      window.location.href = `${API.baseUrl}/clients/export`;
    } catch (error) {
      console.error('Erro ao exportar clientes:', error);
      this.showToast(`Erro ao exportar clientes: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },
  
  filterClients() {
    const searchTerm = document.getElementById('client-search').value.toLowerCase();
    const tagFilter = document.getElementById('tag-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    
    const rows = document.querySelectorAll('#clients-table-body tr');
    
    rows.forEach(row => {
      const name = row.cells[2]?.textContent.toLowerCase() || '';
      const phone = row.cells[3]?.textContent.toLowerCase() || '';
      const email = row.cells[4]?.textContent.toLowerCase() || '';
      const tags = row.cells[5]?.textContent.toLowerCase() || '';
      const status = row.cells[6]?.textContent.toLowerCase() || '';
      
      const matchesSearch = name.includes(searchTerm) || 
                          phone.includes(searchTerm) || 
                          email.includes(searchTerm);
      
      const matchesTag = !tagFilter || tags.includes(tagFilter.toLowerCase());
      const matchesStatus = !statusFilter || status.includes(statusFilter.toLowerCase());
      
      row.style.display = (matchesSearch && matchesTag && matchesStatus) ? '' : 'none';
    });
  },
  
  resetFilters() {
    document.getElementById('client-search').value = '';
    document.getElementById('tag-filter').value = '';
    document.getElementById('status-filter').value = '';
    
    this.filterClients();
  },
  
  toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.client-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
    });
    
    this.updateSelectedCount();
  },
  
  updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll('.client-checkbox:checked');
    const selectedCount = selectedCheckboxes.length;
    
    document.getElementById('selected-count').textContent = selectedCount;
    
    const addTagBtn = document.getElementById('add-tag-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    
    if (addTagBtn) addTagBtn.disabled = selectedCount === 0;
    if (deleteSelectedBtn) deleteSelectedBtn.disabled = selectedCount === 0;
  },
  
  getSelectedClientIds() {
    const checkboxes = document.querySelectorAll('.client-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.getAttribute('data-id'));
  },
  
  async addTagToSelected() {
    const clientIds = this.getSelectedClientIds();
    if (clientIds.length === 0) return;
    
    const tag = prompt('Digite a tag que deseja adicionar aos clientes selecionados:');
    if (!tag) return;
    
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Usar o módulo API centralizado
      await API.clients.addTagToMany({
        clientIds,
        tag
      });
      
      // Recarregar a lista de clientes
      this.loadClients();
      
      // Mostrar mensagem de sucesso
      this.showToast(`Tag adicionada a ${clientIds.length} clientes`, 'success');
    } catch (error) {
      console.error('Erro ao adicionar tag:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao adicionar tag: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },
  
  async deleteSelected() {
    const clientIds = this.getSelectedClientIds();
    if (clientIds.length === 0) return;
    
    if (!confirm(`Tem certeza que deseja excluir ${clientIds.length} clientes?`)) return;
    
    try {
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        Auth.logout();
        return;
      }
      
      // Usar o módulo API centralizado para excluir vários clientes
      await API.clients.deleteMany(clientIds);
      
      // Recarregar a lista de clientes
      this.loadClients();
      
      // Mostrar mensagem de sucesso
      this.showToast(`${clientIds.length} clientes excluídos com sucesso`, 'success');
    } catch (error) {
      console.error('Erro ao excluir clientes:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      this.showToast(`Erro ao excluir clientes: ${error.message || 'Erro desconhecido'}`, 'danger');
    }
  },
  
  getStatusBadgeClass(status) {
    switch (status) {
      case 'active':
        return 'bg-success';
      case 'inactive':
        return 'bg-secondary';
      case 'blocked':
        return 'bg-danger';
      default:
        return 'bg-primary';
    }
  },
  
  getStatusLabel(status) {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'blocked':
        return 'Bloqueado';
      default:
        return status;
    }
  },
  
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
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
  
  resetClientForm() {
    document.getElementById('client-form').reset();
    document.getElementById('client-id').value = '';
    document.getElementById('client-modal-title').innerHTML = '<i class="fas fa-user-plus me-2"></i>Novo Cliente';
  },
  
  renderClientsTable(clients) {
    console.log('=== INÍCIO: renderClientsTable ===');
    console.log('Clientes recebidos:', clients);
    
    const tableBody = document.getElementById('clients-table-body');
    if (!tableBody) {
      console.error('Elemento clients-table-body não encontrado!');
      console.error('Seletor usado: #clients-table-body');
      console.error('HTML da página:', document.body.innerHTML);
      return;
    }
    
    if (!clients || clients.length === 0) {
      console.log('Nenhum cliente encontrado');
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhum cliente encontrado</td></tr>';
      return;
    }
    
    // Limpar a tabela
    tableBody.innerHTML = '';
    
    // Adicionar cada cliente à tabela
    clients.forEach(client => {
      try {
        console.log('Renderizando cliente:', client);
        
        const row = document.createElement('tr');
        row.dataset.id = client._id;
        
        // Verificar propriedades obrigatórias
        const name = client.name || 'Nome não definido';
        const phone = client.phone || 'Telefone não definido';
        const email = client.email || '-';
        const status = client.status || 'active';
        const tags = Array.isArray(client.tags) ? client.tags : [];
        
        // Formatar data da última visita
        let lastVisitDisplay = '-';
        if (client.lastVisit) {
          try {
            const lastVisitDate = new Date(client.lastVisit);
            lastVisitDisplay = isNaN(lastVisitDate) ? '-' : lastVisitDate.toLocaleDateString('pt-BR');
          } catch (e) {
            console.warn('Erro ao formatar data da última visita:', e);
          }
        }
        
        // Adicionar as células
        row.innerHTML = `
          <td>
            <div class="form-check">
              <input class="form-check-input client-checkbox" type="checkbox" value="${client._id}" data-id="${client._id}">
            </div>
          </td>
          <td>${name}</td>
          <td>${phone}</td>
          <td>${email}</td>
          <td>
            ${tags.length > 0 
              ? tags.map(tag => `<span class="badge bg-info me-1">${tag}</span>`).join('') 
              : '-'}
          </td>
          <td>
            <span class="badge ${this.getStatusBadgeClass(status)}">
              ${this.getStatusLabel(status)}
            </span>
          </td>
          <td>${lastVisitDisplay}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary edit-client-btn" data-client-id="${client._id}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger delete-client-btn" data-client-id="${client._id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        
        tableBody.appendChild(row);
      } catch (err) {
        console.error('Erro ao renderizar cliente:', err);
        console.error('Cliente que causou erro:', client);
      }
    });
    
    // Adicionar manipuladores de eventos para os botões
    this.addClientButtonHandlers();
    
    // Atualizar contador de clientes
    const totalCount = document.getElementById('total-count');
    if (totalCount) {
      totalCount.textContent = clients.length;
    }
    
    console.log('=== FIM: renderClientsTable ===');
  },
  
  addClientButtonHandlers() {
    console.log('=== INÍCIO: addClientButtonHandlers ===');
    
    // Buscar todos os botões de edição
    const editButtons = document.querySelectorAll('.edit-client-btn');
    console.log(`Encontrados ${editButtons.length} botões de edição`);
    
    editButtons.forEach(button => {
      button.addEventListener('click', () => {
        const clientId = button.getAttribute('data-client-id');
        console.log(`Botão de edição clicado para o cliente: ${clientId}`);
        this.editClient(clientId);
      });
    });
    
    // Buscar todos os botões de exclusão
    const deleteButtons = document.querySelectorAll('.delete-client-btn');
    console.log(`Encontrados ${deleteButtons.length} botões de exclusão`);
    
    deleteButtons.forEach(button => {
      button.addEventListener('click', () => {
        const clientId = button.getAttribute('data-client-id');
        console.log(`Botão de exclusão clicado para o cliente: ${clientId}`);
        
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
          this.deleteClient(clientId);
        }
      });
    });
    
    // Atualizar contador quando checkboxes forem alterados
    const checkboxes = document.querySelectorAll('.client-checkbox');
    console.log(`Encontrados ${checkboxes.length} checkboxes de clientes`);
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateSelectedCount();
      });
    });
    
    // Adicionar manipulador para o checkbox "selecionar todos"
    const selectAllCheckbox = document.getElementById('select-all-clients');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        this.toggleSelectAll(e.target.checked);
      });
    }
    
    console.log('=== FIM: addClientButtonHandlers ===');
  },
  
  updateTagFilters(clients) {
    const tagFilter = document.getElementById('tag-filter');
    if (!tagFilter) return;
    
    // Limpar opções existentes exceto a primeira (Todas as tags)
    while (tagFilter.options.length > 1) {
      tagFilter.remove(1);
    }
    
    // Coletar todas as tags únicas
    const allTags = new Set();
    clients.forEach(client => {
      if (client.tags && Array.isArray(client.tags)) {
        client.tags.forEach(tag => {
          if (tag && tag.trim()) {
            allTags.add(tag.trim());
          }
        });
      }
    });
    
    // Adicionar as tags ordenadas alfabeticamente
    const sortedTags = Array.from(allTags).sort();
    
    sortedTags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagFilter.appendChild(option);
    });
  },
  
  updateCounters(clients) {
    // Atualizar contador total
    const totalCount = document.getElementById('total-count');
    if (totalCount) {
      totalCount.textContent = clients.length;
    }
    
    // Resetar contador de selecionados
    const selectedCount = document.getElementById('selected-count');
    if (selectedCount) {
      selectedCount.textContent = '0';
    }
    
    // Desabilitar botões de ação
    const addTagBtn = document.getElementById('add-tag-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    
    if (addTagBtn) addTagBtn.disabled = true;
    if (deleteSelectedBtn) deleteSelectedBtn.disabled = true;
  },
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM carregado para gerenciamento de clientes');
  if (document.querySelector('#clients-table-body')) {
    ClientsManager.init();
  }
});

// Expõe o gerenciador globalmente para que os eventos onclick funcionem
window.ClientsManager = ClientsManager;
