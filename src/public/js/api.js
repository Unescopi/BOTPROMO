/**
 * API.js - Funções para comunicação com o backend
 * Versão Webhook 2.0
 */

const API = {
  // URL base da API
  baseUrl: '/api',

  // Métodos genéricos para requisições HTTP
  async get(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
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
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Erro na requisição DELETE para ${endpoint}:`, error);
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
