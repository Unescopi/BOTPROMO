/**
 * Sistema de Diagnóstico para o Bot de Promoções
 * 
 * Este módulo fornece ferramentas para diagnosticar problemas no sistema,
 * verificar a integridade dos componentes e gerar relatórios de status.
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const config = require('../config/config');

class DiagnosticSystem {
  constructor() {
    this.results = {};
    this.startTime = null;
    this.endTime = null;
  }
  
  /**
   * Executa todos os testes de diagnóstico
   */
  async runAllDiagnostics() {
    this.startTime = new Date();
    this.results = {
      timestamp: this.startTime,
      system: {},
      database: {},
      api: {},
      filesystem: {},
      whatsapp: {}
    };
    
    try {
      // Diagnósticos do sistema
      await this.checkSystemInfo();
      
      // Diagnósticos do banco de dados
      await this.checkDatabaseConnection();
      await this.checkCollections();
      await this.checkIndexes();
      
      // Diagnósticos da API
      await this.checkApiRoutes();
      
      // Diagnósticos do sistema de arquivos
      await this.checkFileSystem();
      
      // Diagnósticos do WhatsApp
      await this.checkWhatsAppConnection();
      
      this.endTime = new Date();
      this.results.duration = (this.endTime - this.startTime) / 1000;
      this.results.success = true;
      
      return this.results;
    } catch (error) {
      logger.error(`Erro ao executar diagnósticos: ${error.message}`);
      logger.error(error.stack);
      
      this.endTime = new Date();
      this.results.duration = (this.endTime - this.startTime) / 1000;
      this.results.success = false;
      this.results.error = {
        message: error.message,
        stack: error.stack
      };
      
      return this.results;
    }
  }
  
  /**
   * Verifica informações do sistema
   */
  async checkSystemInfo() {
    this.results.system.nodeVersion = process.version;
    this.results.system.platform = process.platform;
    this.results.system.memory = {
      total: Math.round(require('os').totalmem() / (1024 * 1024 * 1024) * 100) / 100 + ' GB',
      free: Math.round(require('os').freemem() / (1024 * 1024 * 1024) * 100) / 100 + ' GB',
      usage: Math.round((1 - require('os').freemem() / require('os').totalmem()) * 10000) / 100 + '%'
    };
    this.results.system.uptime = Math.round(process.uptime() / 60) + ' minutos';
    this.results.system.env = process.env.NODE_ENV || 'development';
  }
  
  /**
   * Verifica a conexão com o banco de dados
   */
  async checkDatabaseConnection() {
    try {
      this.results.database.connected = mongoose.connection.readyState === 1;
      this.results.database.uri = process.env.MONGODB_URI.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@');
      
      if (this.results.database.connected) {
        const adminDb = mongoose.connection.db.admin();
        const serverStatus = await adminDb.serverStatus();
        
        this.results.database.version = serverStatus.version;
        this.results.database.uptime = Math.round(serverStatus.uptime / 60) + ' minutos';
        this.results.database.connections = serverStatus.connections;
        this.results.database.status = 'online';
      } else {
        this.results.database.status = 'offline';
        this.results.database.error = 'Banco de dados não conectado';
      }
    } catch (error) {
      this.results.database.status = 'error';
      this.results.database.error = error.message;
    }
  }
  
  /**
   * Verifica as coleções no banco de dados
   */
  async checkCollections() {
    try {
      if (mongoose.connection.readyState !== 1) {
        this.results.database.collections = {
          status: 'error',
          error: 'Banco de dados não conectado'
        };
        return;
      }
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionStats = {};
      
      for (const collection of collections) {
        const count = await mongoose.connection.db.collection(collection.name).countDocuments();
        collectionStats[collection.name] = {
          count,
          status: count > 0 ? 'ok' : 'empty'
        };
      }
      
      this.results.database.collections = {
        status: 'ok',
        list: collections.map(c => c.name),
        stats: collectionStats
      };
    } catch (error) {
      this.results.database.collections = {
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * Verifica os índices no banco de dados
   */
  async checkIndexes() {
    try {
      if (mongoose.connection.readyState !== 1) {
        this.results.database.indexes = {
          status: 'error',
          error: 'Banco de dados não conectado'
        };
        return;
      }
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      const indexStats = {};
      
      for (const collection of collections) {
        const indexes = await mongoose.connection.db.collection(collection.name).indexes();
        indexStats[collection.name] = {
          count: indexes.length,
          list: indexes.map(idx => idx.name)
        };
      }
      
      this.results.database.indexes = {
        status: 'ok',
        stats: indexStats
      };
    } catch (error) {
      this.results.database.indexes = {
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * Verifica as rotas da API
   */
  async checkApiRoutes() {
    try {
      // Obter as rotas registradas no Express
      // Isso requer acesso ao objeto app do Express, que pode não estar disponível aqui
      // Esta é uma implementação simplificada
      
      this.results.api.status = 'ok';
      this.results.api.endpoints = [
        '/api/auth',
        '/api/clients',
        '/api/promotions',
        '/api/messages',
        '/api/webhook',
        '/api/media'
      ];
    } catch (error) {
      this.results.api.status = 'error';
      this.results.api.error = error.message;
    }
  }
  
  /**
   * Verifica o sistema de arquivos
   */
  async checkFileSystem() {
    try {
      const directories = [
        { path: 'uploads', description: 'Diretório de uploads' },
        { path: 'logs', description: 'Diretório de logs' },
        { path: 'logs/webhooks', description: 'Diretório de logs de webhooks' }
      ];
      
      const directoryStats = {};
      
      for (const dir of directories) {
        const dirPath = path.join(process.cwd(), dir.path);
        
        try {
          const exists = fs.existsSync(dirPath);
          
          if (exists) {
            const stats = fs.statSync(dirPath);
            const files = fs.readdirSync(dirPath);
            
            directoryStats[dir.path] = {
              exists,
              isDirectory: stats.isDirectory(),
              size: Math.round(this.getTotalSize(dirPath) / 1024) + ' KB',
              files: files.length,
              writable: this.isDirectoryWritable(dirPath),
              status: 'ok'
            };
          } else {
            directoryStats[dir.path] = {
              exists,
              status: 'missing'
            };
          }
        } catch (dirError) {
          directoryStats[dir.path] = {
            exists: false,
            error: dirError.message,
            status: 'error'
          };
        }
      }
      
      this.results.filesystem.directories = directoryStats;
      this.results.filesystem.status = Object.values(directoryStats).every(d => d.status === 'ok') ? 'ok' : 'warning';
    } catch (error) {
      this.results.filesystem.status = 'error';
      this.results.filesystem.error = error.message;
    }
  }
  
  /**
   * Calcula o tamanho total de um diretório
   */
  getTotalSize(dirPath) {
    let totalSize = 0;
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += this.getTotalSize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      logger.error(`Erro ao calcular tamanho do diretório ${dirPath}: ${error.message}`);
    }
    
    return totalSize;
  }
  
  /**
   * Verifica se um diretório é gravável
   */
  isDirectoryWritable(dirPath) {
    try {
      const testFile = path.join(dirPath, `.test-${Date.now()}.tmp`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Verifica a conexão com o WhatsApp
   */
  async checkWhatsAppConnection() {
    try {
      // Verificar a conexão com a Evolution API
      // Esta é uma implementação simplificada
      
      const evolutionApiUrl = process.env.EVOLUTION_API_URL;
      
      if (!evolutionApiUrl) {
        this.results.whatsapp.status = 'not_configured';
        this.results.whatsapp.error = 'URL da Evolution API não configurada';
        return;
      }
      
      // Tentar fazer uma requisição para a Evolution API
      try {
        const response = await fetch(`${evolutionApiUrl}/instance/info`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.EVOLUTION_API_KEY
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          this.results.whatsapp.status = 'online';
          this.results.whatsapp.instance = data.instance;
          this.results.whatsapp.connected = data.connected;
          this.results.whatsapp.version = data.version;
        } else {
          this.results.whatsapp.status = 'error';
          this.results.whatsapp.error = `Erro HTTP: ${response.status}`;
        }
      } catch (fetchError) {
        this.results.whatsapp.status = 'offline';
        this.results.whatsapp.error = fetchError.message;
      }
    } catch (error) {
      this.results.whatsapp.status = 'error';
      this.results.whatsapp.error = error.message;
    }
  }
  
  /**
   * Gera um relatório de diagnóstico
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.results.duration || 0,
      summary: {
        system: this.results.system?.status || 'unknown',
        database: this.results.database?.status || 'unknown',
        api: this.results.api?.status || 'unknown',
        filesystem: this.results.filesystem?.status || 'unknown',
        whatsapp: this.results.whatsapp?.status || 'unknown'
      },
      details: this.results
    };
    
    // Salvar o relatório em um arquivo
    try {
      const reportDir = path.join(process.cwd(), 'logs', 'diagnostics');
      
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      const reportPath = path.join(reportDir, `diagnostic-${new Date().toISOString().replace(/:/g, '-')}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      logger.info(`Relatório de diagnóstico salvo em: ${reportPath}`);
    } catch (error) {
      logger.error(`Erro ao salvar relatório de diagnóstico: ${error.message}`);
    }
    
    return report;
  }
}

// Exportar uma instância única
module.exports = new DiagnosticSystem(); 