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
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Carregando clientes...</td></tr>';
      }
      
      // Verificar se o usuário está autenticado
      if (!Auth.isAuthenticated()) {
        console.log('Usuário não autenticado, redirecionando para login');
        Auth.logout();
        return;
      }
      
      // Usar o módulo API centralizado para buscar clientes
      console.log('Buscando clientes da API');
      const clients = await API.clients.getAll();
      console.log('Clientes recebidos da API:', clients);
      
      // Atualizar a tabela com os clientes
      this.renderClientsTable(clients);
      
      // Atualizar contadores
      this.updateCounters(clients);
      
      // Atualizar filtros de tags
      this.updateTagFilters(clients);
      
      console.log('=== FIM: loadClients ===');
    } catch (error) {
      console.error('=== ERRO: loadClients ===');
      console.error('Mensagem de erro:', error);
      
      // Verificar se é um erro de autenticação
      if (error.message && error.message.includes('Sessão expirada')) {
        Auth.logout();
        return;
      }
      
      const tableBody = document.getElementById('clients-table-body');
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">
          Erro ao carregar clientes: ${error.message || 'Erro desconhecido'}
        </td></tr>`;
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
      return;
    }
    
    if (!clients || clients.length === 0) {
      console.log('Nenhum cliente encontrado');
      tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum cliente encontrado</td></tr>';
      return;
    }
    
    // Limpar a tabela
    tableBody.innerHTML = '';
    
    // Adicionar cada cliente à tabela
    clients.forEach(client => {
      console.log('Renderizando cliente:', client);
      
      const row = document.createElement('tr');
      row.dataset.id = client._id;
      
      // Adicionar as células
      row.innerHTML = `
        <td>
          <div class="form-check">
            <input class="form-check-input client-checkbox" type="checkbox" value="${client._id}">
          </div>
        </td>
        <td>${client.name}</td>
        <td>${client.phone}</td>
        <td>${client.email || '-'}</td>
        <td>
          <span class="badge ${this.getStatusBadgeClass(client.status)}">
            ${this.getStatusLabel(client.status)}
          </span>
        </td>
        <td>
          ${client.tags && client.tags.length > 0 
            ? client.tags.map(tag => `<span class="badge bg-info me-1">${tag}</span>`).join('') 
            : '-'}
        </td>
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
    });
    
    // Adicionar manipuladores de eventos para os botões
    this.addClientButtonHandlers();
    
    console.log('=== FIM: renderClientsTable ===');
  }
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
