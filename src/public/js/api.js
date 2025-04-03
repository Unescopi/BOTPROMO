/**
 * API.js - Funções para comunicação com o backend
 * Versão Webhook 2.0
 */

const API = {
  // URL base da API
  baseUrl: '/api',

  // Obter o token de autenticação do localStorage
  getAuthToken() {
    return localStorage.getItem('authToken');
  },

  // Adicionar cabeçalhos de autenticação
  getAuthHeaders() {
    const token = this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  },

  // Métodos genéricos para requisições HTTP
  async get(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.status === 401) {
        // Token expirado ou inválido
        this.handleAuthError();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Erro na requisição GET para ${endpoint}:`, error);
      throw error;
    }
  },

  async post(endpoint, data) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });
      
      if (response.status === 401) {
        // Token expirado ou inválido
        this.handleAuthError();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Erro na requisição POST para ${endpoint}:`, error);
      throw error;
    }
  },

  async put(endpoint, data) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });
      
      if (response.status === 401) {
        // Token expirado ou inválido
        this.handleAuthError();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Erro na requisição PUT para ${endpoint}:`, error);
      throw error;
    }
  },

  async delete(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      if (response.status === 401) {
        // Token expirado ou inválido
        this.handleAuthError();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Erro na requisição DELETE para ${endpoint}:`, error);
      throw error;
    }
  },

  // Tratamento de erro de autenticação
  handleAuthError() {
    // Limpar o token inválido
    localStorage.removeItem('authToken');
    
    // Redirecionar para a página de login se não estiver lá
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login?expired=true';
    }
  },

  // Upload de arquivos com FormData
  async upload(endpoint, formData) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData
      });
      
      if (response.status === 401) {
        // Token expirado ou inválido
        this.handleAuthError();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Erro no upload para ${endpoint}:`, error);
      throw error;
    }
  },

  // Upload de arquivos
  async uploadFile(endpoint, formData) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData
      });
      
      if (response.status === 401) {
        // Token expirado ou inválido
        this.handleAuthError();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Erro no upload para ${endpoint}:`, error);
      throw error;
    }
  },

  // API de Dashboard
  dashboard: {
    async getStats() {
      return API.get('/stats');
    },
    
    async getRecentPromotions() {
      return API.get('/promotions/recent');
    },
    
    async getUpcomingPromotions() {
      return API.get('/promotions/upcoming');
    },
    
    async getCampaignMetrics() {
      return API.get('/metrics/campaigns');
    }
  },

  // API de Clientes
  clients: {
    async getAll() {
      return API.get('/clients');
    },
    
    async get(id) {
      return API.get(`/clients/${id}`);
    },
    
    async create(client) {
      return API.post('/clients', client);
    },
    
    async update(id, client) {
      return API.put(`/clients/${id}`, client);
    },
    
    async delete(id) {
      return API.delete(`/clients/${id}`);
    },
    
    async deleteMany(clientIds) {
      return API.post('/clients/batch', { clientIds, method: 'DELETE' });
    },
    
    async import(formData) {
      return API.uploadFile('/clients/import', formData);
    },
    
    async export() {
      window.location.href = `${API.baseUrl}/clients/export`;
    },
    
    async getTags() {
      return API.get('/clients/tags');
    },
    
    async addTagToMany(tagData) {
      return API.post('/clients/tags/bulk', tagData);
    },
    
    async getStats() {
      return API.get('/clients/stats');
    }
  },

  // API de Promoções
  promotions: {
    async getAll() {
      return API.get('/promotions');
    },
    
    async get(id) {
      return API.get(`/promotions/${id}`);
    },
    
    async create(promotion) {
      return API.post('/promotions', promotion);
    },
    
    async update(id, promotion) {
      return API.put(`/promotions/${id}`, promotion);
    },
    
    async delete(id) {
      return API.delete(`/promotions/${id}`);
    },
    
    async uploadMedia(formData) {
      return API.uploadFile('/promotions/upload-media', formData);
    },
    
    async schedule(id, scheduleData) {
      return API.post(`/promotions/${id}/schedule`, scheduleData);
    },
    
    async send(id, sendData) {
      return API.post(`/promotions/${id}/send`, sendData);
    },
    
    async cancel(id) {
      return API.post(`/promotions/${id}/cancel`);
    },
    
    async test(id, testData) {
      return API.post(`/promotions/${id}/test`, testData);
    },
    
    async getMetrics(id) {
      return API.get(`/promotions/${id}/metrics`);
    },
    
    async getStats() {
      return API.get('/promotions/stats');
    }
  },

  // API de Mensagens
  messages: {
    async getAll() {
      return API.get('/messages');
    },
    
    async get(id) {
      return API.get(`/messages/${id}`);
    },
    
    async send(messageData) {
      return API.post('/messages/send', messageData);
    },
    
    async sendBulk(messagesData) {
      return API.post('/messages/send-bulk', messagesData);
    },
    
    async updateStatus(id, statusData) {
      return API.put(`/messages/${id}/status`, statusData);
    },
    
    async delete(id) {
      return API.delete(`/messages/${id}`);
    },
    
    async resend(id) {
      return API.post(`/messages/${id}/resend`);
    },
    
    async uploadMedia(formData) {
      return API.uploadFile('/media/upload', formData);
    },
    
    async getStats() {
      return API.get('/messages/stats');
    }
  },
  
  // API de Webhook
  webhook: {
    async getEventLog() {
      return API.get('/webhook/events');
    },
    
    async getLastEvents(limit = 10) {
      return API.get(`/webhook/events/recent?limit=${limit}`);
    },
    
    async getConfiguration() {
      return API.get('/webhook/config');
    },
    
    async updateConfiguration(config) {
      return API.put('/webhook/config', config);
    }
  }
};

// Exporta o objeto API para uso em outros arquivos
window.API = API;
