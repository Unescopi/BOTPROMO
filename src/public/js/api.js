/**
 * API.js - Funções para comunicação com o backend
 * Versão Webhook 2.0
 */

const API = {
  // URL base da API
  baseUrl: window.location.origin + '/api',

  // Obter o token de autenticação do localStorage
  getAuthToken() {
    const token = localStorage.getItem('authToken');
    console.log('Token de autenticação:', token ? token.substring(0, 15) + '...' : 'Nenhum');
    return token;
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
    
    console.log('Cabeçalhos de autenticação:', headers);
    return headers;
  },

  // Método de teste de conexão com a API
  async testConnection() {
    try {
      console.log('=== Testando conexão com a API ===');
      
      // Array de endpoints para testar
      const endpoints = [
        '/status',
        '/stats',
        '/debug/test'
      ];
      
      const results = {
        success: false,
        timestamp: new Date().toISOString(),
        endpointTests: [],
        overallStatus: 'Falha na conexão'
      };
      
      // Testar cada endpoint
      for (const endpoint of endpoints) {
        try {
          console.log(`Testando endpoint: ${endpoint}`);
          const timestamp = new Date().getTime();
          const testUrl = `${this.baseUrl}${endpoint}?t=${timestamp}`;
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const startTime = performance.now();
          const response = await fetch(testUrl, {
            headers: this.getAuthHeaders(),
            signal: controller.signal,
            cache: 'no-store'
          });
          const endTime = performance.now();
          
          clearTimeout(timeoutId);
          
          console.log(`Status da resposta para ${endpoint}:`, response.status);
          
          let responseData = null;
          let responseText = null;
          
          try {
            responseText = await response.text();
            if (responseText) {
              responseData = JSON.parse(responseText);
            }
          } catch (e) {
            console.error(`Erro ao processar resposta de ${endpoint}:`, e);
          }
          
          const endpointResult = {
            endpoint,
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            time: Math.round(endTime - startTime),
            headers: Object.fromEntries([...response.headers.entries()]),
            data: responseData,
            rawResponse: responseText
          };
          
          results.endpointTests.push(endpointResult);
          
          // Se pelo menos um endpoint for bem-sucedido, consideramos conexão estabelecida
          if (response.ok) {
            results.success = true;
          }
        } catch (endpointError) {
          console.error(`Erro ao testar endpoint ${endpoint}:`, endpointError);
          
          results.endpointTests.push({
            endpoint,
            success: false,
            error: endpointError.message,
            errorType: endpointError.name,
            isAborted: endpointError.name === 'AbortError'
          });
        }
      }
      
      // Atualizar status geral
      if (results.success) {
        results.overallStatus = 'Conexão estabelecida';
      } else if (results.endpointTests.some(test => test.isAborted)) {
        results.overallStatus = 'Timeout de conexão';
      }
      
      console.log('Resultados do teste de conexão:', results);
      return results;
    } catch (error) {
      console.error('Erro fatal no teste de conexão:', error);
      return {
        success: false,
        error: error.message,
        errorType: error.name,
        timestamp: new Date().toISOString(),
        overallStatus: 'Erro fatal no teste'
      };
    }
  },

  // Métodos genéricos para requisições HTTP
  async get(endpoint) {
    try {
      console.log(`=== INÍCIO API.get: ${endpoint} ===`);
      console.log('Cabeçalhos:', this.getAuthHeaders());
      
      // Adicionar timeout para evitar requisições que nunca respondem
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos
      
      // Realizar a requisição com timeout
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: this.getAuthHeaders(),
        signal: controller.signal
      });
      
      // Limpar o timeout
      clearTimeout(timeoutId);
      
      console.log('Status da resposta:', response.status);
      console.log('Headers da resposta:', Object.fromEntries([...response.headers.entries()]));
      
      if (response.status === 401) {
        // Token expirado ou inválido
        this.handleAuthError();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na resposta:', errorData);
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }
      
      // Clonar a resposta para verificar o conteúdo
      const responseClone = response.clone();
      const rawText = await responseClone.text();
      console.log('Texto bruto da resposta:', rawText);
      
      // Se a resposta for vazia, retornar um objeto vazio
      if (!rawText) {
        console.log('Resposta vazia, retornando objeto vazio');
        return {};
      }
      
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        console.error('Erro ao parsear JSON:', e);
        console.log('Conteúdo que causou erro:', rawText);
        throw new Error('Erro ao processar resposta do servidor: JSON inválido');
      }
      
      console.log('Dados da resposta:', data);
      console.log(`=== FIM API.get: ${endpoint} ===`);
      
      return data;
    } catch (error) {
      console.error(`Erro na requisição GET para ${endpoint}:`, error);
      
      // Tratamento especial para timeout
      if (error.name === 'AbortError') {
        console.error('A requisição excedeu o tempo limite de 15 segundos');
      }
      
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
    async getAll(params = {}) {
      console.log('=== INÍCIO: API.clients.getAll ===');
      console.log('Parâmetros:', params);
      
      try {
        // Construir a query string
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key]) queryParams.append(key, params[key]);
        });
        
        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        
        console.log('URL base da API:', API.baseUrl);
        console.log('Endpoint: /clients' + queryString);
        
        // Usar método GET simplificado com timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const fullUrl = `${API.baseUrl}/clients${queryString}`;
        console.log('URL completa da requisição:', fullUrl);
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: API.getAuthHeaders(),
          signal: controller.signal,
          cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        
        console.log('Status da resposta:', response.status);
        
        if (response.status === 401) {
          console.error('Erro de autenticação ao buscar clientes');
          API.handleAuthError();
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Erro HTTP ${response.status} ao buscar clientes:`, errorText);
          
          // Se falhar, tenta buscar dados de exemplo
          console.log('Tentando buscar dados de demonstração...');
          return await API.clients.getDemoData();
        }
        
        // Verificar se a resposta está vazia
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          console.warn('Resposta vazia ao buscar clientes');
          
          // Se a resposta for vazia, também tenta buscar dados de exemplo
          return await API.clients.getDemoData();
        }
        
        // Tentar parsear a resposta como JSON
        try {
          const data = JSON.parse(responseText);
          console.log('Dados recebidos:', data);
          
          // Lidar com diferentes formatos de resposta
          if (Array.isArray(data)) {
            console.log(`Retornando ${data.length} clientes (formato de array)`);
            return data;
          } else if (data.data && Array.isArray(data.data)) {
            console.log(`Retornando ${data.data.length} clientes (formato de objeto com data)`);
            return data.data;
          } else if (data.clients && Array.isArray(data.clients)) {
            console.log(`Retornando ${data.clients.length} clientes (formato de objeto com clients)`);
            return data.clients;
          } else {
            console.warn('Formato de resposta não reconhecido:', data);
            
            // Se o formato não for reconhecido, também tenta buscar dados de exemplo
            return await API.clients.getDemoData();
          }
        } catch (e) {
          console.error('Erro ao parsear resposta como JSON:', e);
          console.error('Texto da resposta:', responseText);
          
          // Se houver erro no parse, tenta buscar dados de exemplo
          return await API.clients.getDemoData();
        }
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        
        // Tratamento especial para timeout
        if (error.name === 'AbortError') {
          console.log('Timeout ao buscar clientes, tentando dados de exemplo');
        }
        
        // Tenta buscar dados de exemplo em caso de qualquer erro
        return await API.clients.getDemoData();
      } finally {
        console.log('=== FIM: API.clients.getAll ===');
      }
    },
    
    // Método para buscar dados de exemplo
    async getDemoData() {
      console.log('=== INÍCIO: API.clients.getDemoData ===');
      try {
        // Tentar buscar dados de exemplo do endpoint específico
        const demoUrl = `${API.baseUrl}/clients/demo`;
        console.log('Buscando dados de exemplo de:', demoUrl);
        
        const response = await fetch(demoUrl, {
          method: 'GET',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`Erro HTTP ${response.status} ao buscar dados de exemplo`);
        }
        
        const data = await response.json();
        console.log('Dados de exemplo recebidos:', data);
        
        if (data.data && Array.isArray(data.data)) {
          console.log(`Retornando ${data.data.length} clientes de exemplo`);
          return data.data;
        } else {
          console.warn('Formato de dados de exemplo não reconhecido:', data);
          throw new Error('Formato de dados de exemplo inválido');
        }
      } catch (error) {
        console.error('Erro ao buscar dados de exemplo:', error);
        
        // Fallback final: retornar alguns clientes de exemplo embutidos no código
        console.log('Gerando dados de exemplo embutidos...');
        const fallbackClients = [];
        
        for (let i = 1; i <= 5; i++) {
          fallbackClients.push({
            _id: `fallback-${i}`,
            name: `Cliente Fallback ${i}`,
            phone: `55119999999${i}`,
            email: `fallback${i}@exemplo.com`,
            status: 'active',
            tags: ['fallback'],
            lastVisit: new Date()
          });
        }
        
        console.log(`Retornando ${fallbackClients.length} clientes fallback`);
        return fallbackClients;
      } finally {
        console.log('=== FIM: API.clients.getDemoData ===');
      }
    },
    
    async get(id) {
      return API.get(`/clients/${id}`);
    },
    
    async create(data) {
      console.log('API.clients.create - Dados:', data);
      return API.post('/clients', data)
        .then(response => {
          console.log('API.clients.create - Resposta:', response);
          return response;
        })
        .catch(error => {
          console.error('API.clients.create - Erro:', error);
          throw error;
        });
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
    async getAll(params = {}) {
      console.log('=== API.promotions.getAll ===');
      console.log('Parâmetros:', params);
      
      try {
        // Construir a query string
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key]) queryParams.append(key, params[key]);
        });
        
        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        console.log('Query string:', queryString);
        
        const response = await API.get(`/promotions${queryString}`);
        console.log('Resposta da API:', response);
        
        return response.data || [];
      } catch (error) {
        console.error('Erro ao buscar promoções:', error);
        throw error;
      }
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
    async getStats() {
      return API.get('/webhook/stats');
    },
    
    async getRecentEvents(limit = 10) {
      return API.get(`/webhook/events/recent?limit=${limit}`);
    },
    
    async getMessageFormats() {
      return API.get('/webhook/formats');
    },
    
    async getConfiguration() {
      return API.get('/webhook/config');
    },
    
    async updateConfiguration(config) {
      return API.put('/webhook/config', config);
    }
  },

  // API de Diagnóstico
  diagnostics: {
    async run() {
      return API.get('/diagnostics/run');
    },
    
    async generateReport() {
      return API.get('/diagnostics/report');
    },
    
    async checkDatabase() {
      return API.get('/diagnostics/database');
    },
    
    async checkWhatsApp() {
      return API.get('/diagnostics/whatsapp');
    },
    
    async checkFileSystem() {
      return API.get('/diagnostics/filesystem');
    }
  },

  // API de Exportação
  export: {
    async clientsToJson(filter = {}) {
      const queryParams = new URLSearchParams();
      if (filter && Object.keys(filter).length > 0) {
        queryParams.append('filter', JSON.stringify(filter));
      }
      
      window.location.href = `${API.baseUrl}/export/clients/json?${queryParams.toString()}`;
    },
    
    async clientsToCsv(filter = {}) {
      const queryParams = new URLSearchParams();
      if (filter && Object.keys(filter).length > 0) {
        queryParams.append('filter', JSON.stringify(filter));
      }
      
      window.location.href = `${API.baseUrl}/export/clients/csv?${queryParams.toString()}`;
    },
    
    async clientsToExcel(filter = {}) {
      const queryParams = new URLSearchParams();
      if (filter && Object.keys(filter).length > 0) {
        queryParams.append('filter', JSON.stringify(filter));
      }
      
      window.location.href = `${API.baseUrl}/export/clients/excel?${queryParams.toString()}`;
    },
    
    async promotionsToJson(filter = {}) {
      const queryParams = new URLSearchParams();
      if (filter && Object.keys(filter).length > 0) {
        queryParams.append('filter', JSON.stringify(filter));
      }
      
      window.location.href = `${API.baseUrl}/export/promotions/json?${queryParams.toString()}`;
    },
    
    async messagesToJson(filter = {}) {
      const queryParams = new URLSearchParams();
      if (filter && Object.keys(filter).length > 0) {
        queryParams.append('filter', JSON.stringify(filter));
      }
      
      window.location.href = `${API.baseUrl}/export/messages/json?${queryParams.toString()}`;
    },
    
    async createBackup() {
      return API.get('/export/backup');
    }
  }
};

// Exporta o objeto API para uso em outros arquivos
window.API = API;
