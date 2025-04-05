/**
 * Módulo para exportação de dados do sistema
 * 
 * Este módulo permite exportar dados do sistema em diferentes formatos,
 * como JSON, CSV e Excel, para facilitar a depuração e a migração de dados.
 */
const fs = require('fs');
const path = require('path');
const json2csv = require('json2csv').Parser;
const ExcelJS = require('exceljs');
const logger = require('./logger');
const Client = require('../models/Client');
const Promotion = require('../models/Promotion');
const Message = require('../models/Message');

class DataExporter {
  constructor() {
    this.exportDir = path.join(__dirname, '../../exports');
    this.ensureExportDirectory();
  }
  
  /**
   * Garante que o diretório de exportação existe
   */
  ensureExportDirectory() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
      logger.info(`Diretório de exportação criado: ${this.exportDir}`);
    }
  }
  
  /**
   * Exporta clientes para JSON
   */
  async exportClientsToJson(filter = {}) {
    try {
      const clients = await Client.find(filter).lean();
      
      const filename = `clients_${new Date().toISOString().replace(/:/g, '-')}.json`;
      const filepath = path.join(this.exportDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(clients, null, 2));
      
      logger.info(`Exportados ${clients.length} clientes para JSON: ${filepath}`);
      
      return {
        success: true,
        count: clients.length,
        filepath,
        filename
      };
    } catch (error) {
      logger.error(`Erro ao exportar clientes para JSON: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Exporta clientes para CSV
   */
  async exportClientsToCsv(filter = {}) {
    try {
      const clients = await Client.find(filter).lean();
      
      // Definir campos para exportação
      const fields = [
        'name',
        'phone',
        'email',
        'birthdate',
        'status',
        'tags',
        'notes',
        'createdAt',
        'updatedAt'
      ];
      
      // Transformar dados para CSV
      const json2csvParser = new json2csv({ fields });
      const csv = json2csvParser.parse(clients);
      
      const filename = `clients_${new Date().toISOString().replace(/:/g, '-')}.csv`;
      const filepath = path.join(this.exportDir, filename);
      
      fs.writeFileSync(filepath, csv);
      
      logger.info(`Exportados ${clients.length} clientes para CSV: ${filepath}`);
      
      return {
        success: true,
        count: clients.length,
        filepath,
        filename
      };
    } catch (error) {
      logger.error(`Erro ao exportar clientes para CSV: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Exporta clientes para Excel
   */
  async exportClientsToExcel(filter = {}) {
    try {
      const clients = await Client.find(filter).lean();
      
      // Criar workbook e worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Clientes');
      
      // Definir colunas
      worksheet.columns = [
        { header: 'Nome', key: 'name', width: 30 },
        { header: 'Telefone', key: 'phone', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Data de Nascimento', key: 'birthdate', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Tags', key: 'tags', width: 30 },
        { header: 'Notas', key: 'notes', width: 50 },
        { header: 'Criado em', key: 'createdAt', width: 20 },
        { header: 'Atualizado em', key: 'updatedAt', width: 20 }
      ];
      
      // Adicionar dados
      worksheet.addRows(clients.map(client => ({
        ...client,
        birthdate: client.birthdate ? new Date(client.birthdate).toLocaleDateString('pt-BR') : '',
        tags: client.tags ? client.tags.join(', ') : '',
        createdAt: client.createdAt ? new Date(client.createdAt).toLocaleString('pt-BR') : '',
        updatedAt: client.updatedAt ? new Date(client.updatedAt).toLocaleString('pt-BR') : ''
      })));
      
      // Estilizar cabeçalho
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      const filename = `clients_${new Date().toISOString().replace(/:/g, '-')}.xlsx`;
      const filepath = path.join(this.exportDir, filename);
      
      await workbook.xlsx.writeFile(filepath);
      
      logger.info(`Exportados ${clients.length} clientes para Excel: ${filepath}`);
      
      return {
        success: true,
        count: clients.length,
        filepath,
        filename
      };
    } catch (error) {
      logger.error(`Erro ao exportar clientes para Excel: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Exporta promoções para JSON
   */
  async exportPromotionsToJson(filter = {}) {
    try {
      const promotions = await Promotion.find(filter).lean();
      
      const filename = `promotions_${new Date().toISOString().replace(/:/g, '-')}.json`;
      const filepath = path.join(this.exportDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(promotions, null, 2));
      
      logger.info(`Exportadas ${promotions.length} promoções para JSON: ${filepath}`);
      
      return {
        success: true,
        count: promotions.length,
        filepath,
        filename
      };
    } catch (error) {
      logger.error(`Erro ao exportar promoções para JSON: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Exporta mensagens para JSON
   */
  async exportMessagesToJson(filter = {}) {
    try {
      const messages = await Message.find(filter).lean();
      
      const filename = `messages_${new Date().toISOString().replace(/:/g, '-')}.json`;
      const filepath = path.join(this.exportDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(messages, null, 2));
      
      logger.info(`Exportadas ${messages.length} mensagens para JSON: ${filepath}`);
      
      return {
        success: true,
        count: messages.length,
        filepath,
        filename
      };
    } catch (error) {
      logger.error(`Erro ao exportar mensagens para JSON: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Exporta backup completo do sistema
   */
  async exportFullBackup() {
    try {
      // Criar diretório para o backup
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const backupDir = path.join(this.exportDir, `backup_${timestamp}`);
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Exportar clientes
      const clients = await Client.find().lean();
      fs.writeFileSync(
        path.join(backupDir, 'clients.json'),
        JSON.stringify(clients, null, 2)
      );
      
      // Exportar promoções
      const promotions = await Promotion.find().lean();
      fs.writeFileSync(
        path.join(backupDir, 'promotions.json'),
        JSON.stringify(promotions, null, 2)
      );
      
      // Exportar mensagens
      const messages = await Message.find().lean();
      fs.writeFileSync(
        path.join(backupDir, 'messages.json'),
        JSON.stringify(messages, null, 2)
      );
      
      // Criar arquivo de metadados
      const metadata = {
        timestamp,
        counts: {
          clients: clients.length,
          promotions: promotions.length,
          messages: messages.length
        },
        version: process.env.npm_package_version || '1.0.0'
      };
      
      fs.writeFileSync(
        path.join(backupDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      // Criar arquivo ZIP (opcional)
      // Requer módulo adicional como 'archiver'
      
      logger.info(`Backup completo criado em: ${backupDir}`);
      
      return {
        success: true,
        backupDir,
        metadata
      };
    } catch (error) {
      logger.error(`Erro ao criar backup completo: ${error.message}`);
      throw error;
    }
  }
}

// Exportar uma instância única
module.exports = new DataExporter(); 