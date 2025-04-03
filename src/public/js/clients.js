/**
 * clients.js - Gerenciamento de clientes
 */

const ClientsManager = {
  init() {
    console.log('Inicializando gerenciamento de clientes...');
    this.setupEventListeners();
    this.loadClients();
  },

  setupEventListeners() {
    // Manipulador para adicionar novo cliente
    const clientForm = document.getElementById('client-form');
    if (clientForm) {
      clientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveClient();
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
    const tableBody = document.getElementById('clients-table-body');
    if (!tableBody) return;
    
    try {
      // Mostrar o indicador de carregamento
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Carregando...</span>
            </div>
          </td>
        </tr>
      `;
      
      const response = await fetch('/api/clients');
      const clients = await response.json();
      
      if (clients.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-4">
              <i class="fas fa-info-circle me-2"></i>Nenhum cliente encontrado
            </td>
          </tr>
        `;
        return;
      }
      
      // Renderizar a lista de clientes
      tableBody.innerHTML = clients.map(client => `
        <tr>
          <td>
            <div class="form-check">
              <input class="form-check-input client-checkbox" type="checkbox" data-id="${client._id}">
              <label class="form-check-label"></label>
            </div>
          </td>
          <td>${client.name}</td>
          <td>${client.phone}</td>
          <td>${client.email || '-'}</td>
          <td>
            ${client.tags && client.tags.length > 0 ? 
              client.tags.map(tag => `<span class="badge bg-primary me-1">${tag}</span>`).join('') : 
              '-'
            }
          </td>
          <td>
            <span class="badge ${this.getStatusBadgeClass(client.status)}">${this.getStatusLabel(client.status)}</span>
          </td>
          <td>${client.lastVisit ? this.formatDate(client.lastVisit) : '-'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="ClientsManager.editClient('${client._id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="ClientsManager.deleteClient('${client._id}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `).join('');
      
      // Atualize os contadores
      document.getElementById('total-count').textContent = clients.length;
      
      // Adicionar event listeners para as checkboxes
      const checkboxes = document.querySelectorAll('.client-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => this.updateSelectedCount());
      });
      
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-danger py-4">
            <i class="fas fa-exclamation-circle me-2"></i>Erro ao carregar clientes
          </td>
        </tr>
      `;
    }
  },
  
  saveClient() {
    const clientId = document.getElementById('client-id').value;
    const clientName = document.getElementById('client-name').value;
    const clientPhone = document.getElementById('client-phone').value;
    const clientEmail = document.getElementById('client-email').value;
    
    if (!clientName || !clientPhone) {
      alert('Nome e telefone são obrigatórios!');
      return;
    }
    
    const clientData = {
      name: clientName,
      phone: clientPhone,
      email: clientEmail || null
    };
    
    const url = clientId ? `/api/clients/${clientId}` : '/api/clients';
    const method = clientId ? 'PUT' : 'POST';
    
    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clientData)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao salvar cliente');
        }
        return response.json();
      })
      .then(data => {
        // Fechar o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
        modal.hide();
        
        // Recarregar a lista de clientes
        this.loadClients();
        
        // Mostrar mensagem de sucesso
        this.showToast(`Cliente ${clientId ? 'atualizado' : 'cadastrado'} com sucesso`, 'success');
      })
      .catch(error => {
        console.error('Erro ao salvar cliente:', error);
        this.showToast('Erro ao salvar cliente', 'danger');
      });
  },
  
  editClient(clientId) {
    // Limpa o formulário
    document.getElementById('client-form').reset();
    
    // Atualiza o título do modal
    document.getElementById('client-modal-title').innerHTML = '<i class="fas fa-user-edit me-2"></i>Editar Cliente';
    
    // Busca os dados do cliente
    fetch(`/api/clients/${clientId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao buscar dados do cliente');
        }
        return response.json();
      })
      .then(client => {
        // Preenche o formulário com os dados do cliente
        document.getElementById('client-id').value = client._id;
        document.getElementById('client-name').value = client.name;
        document.getElementById('client-phone').value = client.phone;
        document.getElementById('client-email').value = client.email || '';
        
        // Abre o modal
        const modal = new bootstrap.Modal(document.getElementById('clientModal'));
        modal.show();
      })
      .catch(error => {
        console.error('Erro ao editar cliente:', error);
        this.showToast('Erro ao buscar dados do cliente', 'danger');
      });
  },
  
  deleteClient(clientId) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    fetch(`/api/clients/${clientId}`, {
      method: 'DELETE'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao excluir cliente');
        }
        return response.json();
      })
      .then(data => {
        // Recarregar a lista de clientes
        this.loadClients();
        
        // Mostrar mensagem de sucesso
        this.showToast('Cliente excluído com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao excluir cliente:', error);
        this.showToast('Erro ao excluir cliente', 'danger');
      });
  },
  
  importClients() {
    const fileInput = document.getElementById('client-file');
    const hasHeader = document.getElementById('has-header').checked;
    const importOption = document.querySelector('input[name="import-option"]:checked').value;
    
    if (!fileInput.files[0]) {
      alert('Selecione um arquivo CSV');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('hasHeader', hasHeader);
    formData.append('importOption', importOption);
    
    fetch('/api/clients/import', {
      method: 'POST',
      body: formData
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao importar clientes');
        }
        return response.json();
      })
      .then(data => {
        // Fechar o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('importClientsModal'));
        modal.hide();
        
        // Recarregar a lista de clientes
        this.loadClients();
        
        // Mostrar mensagem de sucesso
        this.showToast(`${data.imported} clientes importados com sucesso`, 'success');
      })
      .catch(error => {
        console.error('Erro ao importar clientes:', error);
        this.showToast('Erro ao importar clientes', 'danger');
      });
  },
  
  exportClients() {
    window.location.href = '/api/clients/export';
  },
  
  filterClients() {
    const searchTerm = document.getElementById('client-search').value.toLowerCase();
    const tagFilter = document.getElementById('tag-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    
    const rows = document.querySelectorAll('#clients-table-body tr');
    
    rows.forEach(row => {
      const name = row.cells[1]?.textContent.toLowerCase() || '';
      const phone = row.cells[2]?.textContent.toLowerCase() || '';
      const email = row.cells[3]?.textContent.toLowerCase() || '';
      const tags = row.cells[4]?.textContent.toLowerCase() || '';
      const status = row.cells[5]?.textContent.toLowerCase() || '';
      
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
  
  addTagToSelected() {
    const clientIds = this.getSelectedClientIds();
    if (clientIds.length === 0) return;
    
    const tag = prompt('Digite a tag que deseja adicionar aos clientes selecionados:');
    if (!tag) return;
    
    fetch('/api/clients/tag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientIds,
        tag
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao adicionar tag');
        }
        return response.json();
      })
      .then(data => {
        // Recarregar a lista de clientes
        this.loadClients();
        
        // Mostrar mensagem de sucesso
        this.showToast(`Tag adicionada a ${clientIds.length} clientes`, 'success');
      })
      .catch(error => {
        console.error('Erro ao adicionar tag:', error);
        this.showToast('Erro ao adicionar tag', 'danger');
      });
  },
  
  deleteSelected() {
    const clientIds = this.getSelectedClientIds();
    if (clientIds.length === 0) return;
    
    if (!confirm(`Tem certeza que deseja excluir ${clientIds.length} clientes?`)) return;
    
    fetch('/api/clients/batch', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientIds
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao excluir clientes');
        }
        return response.json();
      })
      .then(data => {
        // Recarregar a lista de clientes
        this.loadClients();
        
        // Mostrar mensagem de sucesso
        this.showToast(`${clientIds.length} clientes excluídos com sucesso`, 'success');
      })
      .catch(error => {
        console.error('Erro ao excluir clientes:', error);
        this.showToast('Erro ao excluir clientes', 'danger');
      });
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
  }
};

// Quando a página de clientes for carregada, inicializar o gerenciador
document.addEventListener('DOMContentLoaded', () => {
  // Verifica se estamos na página de clientes
  if (document.querySelector('#clients-table-body')) {
    ClientsManager.init();
  }
});

// Expõe o gerenciador globalmente para que os eventos onclick funcionem
window.ClientsManager = ClientsManager;
