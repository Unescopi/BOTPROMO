/**
 * Controlador para gerenciamento de clientes
 */
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Client = require('../models/Client');
const validator = require('../utils/validator');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// Upload de arquivo CSV com clientes
exports.importClients = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nenhum arquivo enviado' 
      });
    }

    const file = req.files.file;
    const fileExtension = path.extname(file.name).toLowerCase();

    // Verifica se é um arquivo CSV
    if (fileExtension !== '.csv') {
      return res.status(400).json({ 
        success: false, 
        message: 'Apenas arquivos CSV são permitidos' 
      });
    }

    // Move o arquivo para diretório de uploads
    const uploadPath = path.join(__dirname, '../../uploads/clients', `import_${Date.now()}.csv`);
    await file.mv(uploadPath);

    // Variáveis para acompanhar o progresso
    const results = {
      total: 0,
      imported: 0,
      skipped: 0,
      errors: []
    };

    // Arrays para processar os clientes em lote
    const clientsToInsert = [];
    const clientsToUpdate = [];
    const phoneSet = new Set(); // Para evitar duplicatas no lote atual
    
    // Processar arquivo CSV
    const processFile = () => {
      return new Promise((resolve, reject) => {
        fs.createReadStream(uploadPath)
          .pipe(csv())
          .on('data', async (row) => {
            results.total++;
            
            // Validar dados básicos
            if (!row.phone || !validator.isValidPhone(row.phone)) {
              results.skipped++;
              results.errors.push(`Linha ${results.total}: Telefone inválido - ${row.phone}`);
              return;
            }
            
            // Formatar o telefone
            const formattedPhone = validator.formatPhone(row.phone);
            
            // Evitar duplicatas no lote atual
            if (phoneSet.has(formattedPhone)) {
              results.skipped++;
              results.errors.push(`Linha ${results.total}: Telefone duplicado - ${formattedPhone}`);
              return;
            }
            
            phoneSet.add(formattedPhone);
            
            // Dados do cliente
            const clientData = {
              name: row.name || 'Cliente',
              phone: formattedPhone,
              email: row.email || null,
              tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : [],
              notes: row.notes || '',
              source: 'import',
              importedAt: new Date()
            };
            
            // Adicionar campos adicionais se existirem
            if (row.birthday) {
              try {
                clientData.birthday = new Date(row.birthday);
              } catch (e) {
                // Ignora data inválida
              }
            }
            
            if (row.last_visit) {
              try {
                clientData.lastVisit = new Date(row.last_visit);
              } catch (e) {
                // Ignora data inválida
              }
            }
            
            if (row.frequency_score && !isNaN(row.frequency_score)) {
              clientData.frequencyScore = parseInt(row.frequency_score);
            }
            
            clientsToInsert.push(clientData);
          })
          .on('end', () => {
            resolve();
          })
          .on('error', (error) => {
            reject(error);
          });
      });
    };

    // Processa o arquivo CSV
    await processFile();
    
    // Processa os clientes em lote
    if (clientsToInsert.length > 0) {
      // Verifica quais telefones já existem no banco
      const phones = clientsToInsert.map(c => c.phone);
      const existingClients = await Client.find({ phone: { $in: phones } });
      
      // Cria mapa de telefones existentes
      const existingPhonesMap = {};
      existingClients.forEach(client => {
        existingPhonesMap[client.phone] = client;
      });
      
      // Separa clientes para inserção e atualização
      clientsToInsert.forEach(clientData => {
        if (existingPhonesMap[clientData.phone]) {
          // Cliente já existe - preparar para atualização
          const existingClient = existingPhonesMap[clientData.phone];
          
          // Mesclando dados existentes com novos
          const updateData = {
            ...clientData,
            _id: existingClient._id,
            // Mantém tags existentes e adiciona novas
            tags: [...new Set([...existingClient.tags, ...clientData.tags])],
            // Preserva status e preferências
            status: existingClient.status,
            preferences: existingClient.preferences,
            updatedAt: new Date()
          };
          
          clientsToUpdate.push(updateData);
        } else {
          // Novo cliente
          results.imported++;
        }
      });
      
      // Insere novos clientes
      if (clientsToInsert.length > clientsToUpdate.length) {
        // Filtra apenas clientes que não existem
        const newClients = clientsToInsert.filter(
          client => !existingPhonesMap[client.phone]
        );
        
        if (newClients.length > 0) {
          await Client.insertMany(newClients);
        }
      }
      
      // Atualiza clientes existentes
      for (const clientData of clientsToUpdate) {
        const clientId = clientData._id;
        delete clientData._id; // Remove _id para update
        
        await Client.findByIdAndUpdate(clientId, clientData);
        results.imported++;
      }
    }

    // Remove o arquivo após processamento
    fs.unlinkSync(uploadPath);

    // Retorna resultados
    return res.status(200).json({ 
      success: true, 
      message: `Importação concluída: ${results.imported} clientes importados, ${results.skipped} ignorados`,
      results
    });

  } catch (error) {
    logger.error(`Erro na importação de clientes: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      message: `Erro na importação: ${error.message}` 
    });
  }
};

/**
 * Obter todos os clientes
 */
exports.getClients = async (req, res) => {
  try {
    console.log('=== INÍCIO: getClients controller ===');
    console.log('IP da requisição:', req.ip);
    console.log('Método:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Headers:', req.headers);
    console.log('Query params:', req.query);
    
    // Adicionar headers para debug CORS
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Filtros
    const query = {};
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.tag) {
      query.tags = { $in: [req.query.tag] };
    }
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex }
      ];
    }
    
    console.log('Filtros de busca:', query);
    console.log('Estado da conexão com MongoDB:', mongoose.connection.readyState);
    
    // Verificar conexão com o MongoDB
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB não está conectado. Retornando dados de demonstração.');
      return res.status(200).json({
        success: true,
        message: "Dados de demonstração (MongoDB não conectado)",
        data: getDemoClients()
      });
    }
    
    // Buscar clientes no banco de dados
    let clients = await Client.find(query).lean();
    console.log(`Encontrados ${clients.length} clientes`);
    
    // Se não houver clientes, retornar dados de demonstração
    if (!clients || clients.length === 0) {
      console.log('Nenhum cliente encontrado. Retornando dados de demonstração.');
      return res.status(200).json({
        success: true,
        message: "Dados de demonstração (nenhum cliente encontrado)",
        data: getDemoClients()
      });
    }
    
    // Garantir que os clientes têm todos os campos necessários
    clients = clients.map(client => ({
      _id: client._id.toString(), // Convertendo ObjectId para string
      name: client.name || 'Sem nome',
      phone: client.phone || 'Sem telefone',
      email: client.email || '',
      status: client.status || 'active',
      tags: Array.isArray(client.tags) ? client.tags : [],
      lastVisit: client.lastVisit || null,
      // Adicione outros campos necessários aqui
    }));
    
    // Log dos primeiros clientes para debug
    if (clients.length > 0) {
      console.log('Exemplo do primeiro cliente:', clients[0]);
    }
    
    console.log('=== FIM: getClients controller ===');
    
    // Responder com os dados em um formato consistente
    return res.status(200).json({
      success: true,
      message: `${clients.length} clientes encontrados`,
      data: clients
    });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    
    // Em caso de erro, retornar dados de demonstração
    return res.status(200).json({
      success: true,
      message: "Dados de demonstração (erro ao buscar clientes)",
      data: getDemoClients()
    });
  }
};

// Função auxiliar para gerar dados de demonstração
function getDemoClients() {
  const demoClients = [];
  for (let i = 1; i <= 10; i++) {
    demoClients.push({
      _id: `demo-${i}`,
      name: `Cliente Demonstração ${i}`,
      phone: `5511999999${i.toString().padStart(2, '0')}`,
      email: `cliente${i}@exemplo.com`,
      status: i % 5 === 0 ? 'inactive' : 'active',
      tags: ['demo', i % 2 === 0 ? 'vip' : 'regular'],
      lastVisit: new Date(Date.now() - (i * 86400000)) // Dias decrescentes
    });
  }
  return demoClients;
}

// Obter um cliente específico
exports.getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente não encontrado' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: client
    });
    
  } catch (error) {
    logger.error(`Erro ao buscar cliente: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      message: `Erro ao buscar cliente: ${error.message}` 
    });
  }
};

/**
 * @desc    Criar um novo cliente
 * @route   POST /api/clients
 * @access  Privado
 */
exports.createClient = async (req, res) => {
  try {
    console.log('=== INÍCIO: createClient ===');
    console.log('Corpo da requisição:', JSON.stringify(req.body, null, 2));
    console.log('Headers da requisição:', JSON.stringify(req.headers, null, 2));
    console.log('Usuário autenticado:', req.user ? req.user.id : 'Não autenticado');
    
    const { name, phone, email, tags, status } = req.body;
    
    // Validação básica
    if (!name || !phone) {
      console.log('Erro de validação: Nome e telefone são obrigatórios');
      return res.status(400).json({
        success: false,
        message: 'Nome e telefone são obrigatórios'
      });
    }
    
    // Verificar se o cliente já existe pelo telefone
    const existingClient = await Client.findOne({ phone });
    if (existingClient) {
      console.log('Cliente já existe com este telefone:', phone);
      return res.status(400).json({
        success: false,
        message: 'Cliente com este telefone já existe'
      });
    }
    
    // Criar o cliente
    console.log('Criando novo cliente com dados:', { name, phone, email, tags, status });
    const client = await Client.create({
      name,
      phone,
      email,
      tags,
      status: status || 'active'
    });
    
    console.log('Cliente criado com sucesso. ID:', client._id);
    console.log('Dados do cliente criado:', JSON.stringify(client, null, 2));
    
    res.status(201).json({
      success: true,
      data: client
    });
    
    console.log('=== FIM: createClient ===');
  } catch (error) {
    console.error('=== ERRO: createClient ===');
    console.error('Mensagem de erro:', error.message);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao criar cliente',
      error: error.message
    });
  }
};

// Atualizar um cliente
exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente não encontrado' 
      });
    }
    
    // Validação para alteração de telefone
    if (req.body.phone) {
      if (!validator.isValidPhone(req.body.phone)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Número de telefone inválido' 
        });
      }
      
      const formattedPhone = validator.formatPhone(req.body.phone);
      
      // Verifica se o telefone já existe em outro cliente
      if (formattedPhone !== client.phone) {
        const existingClient = await Client.findOne({ phone: formattedPhone });
        
        if (existingClient) {
          return res.status(400).json({ 
            success: false, 
            message: 'Telefone já cadastrado para outro cliente' 
          });
        }
        
        client.phone = formattedPhone;
      }
    }
    
    // Atualiza campos básicos
    if (req.body.name) client.name = req.body.name;
    if (req.body.email) client.email = req.body.email;
    if (req.body.tags !== undefined) client.tags = req.body.tags;
    if (req.body.notes !== undefined) client.notes = req.body.notes;
    if (req.body.status) client.status = req.body.status;
    
    // Atualiza campos específicos
    if (req.body.birthday) {
      client.birthday = new Date(req.body.birthday);
    }
    
    if (req.body.lastVisit) {
      client.lastVisit = new Date(req.body.lastVisit);
    }
    
    if (req.body.frequencyScore !== undefined) {
      client.frequencyScore = req.body.frequencyScore;
    }
    
    // Atualiza preferências
    if (req.body.preferences) {
      for (const [key, value] of Object.entries(req.body.preferences)) {
        client.preferences.set(key, value);
      }
    }
    
    // Salva as alterações
    await client.save();
    
    return res.status(200).json({
      success: true,
      message: 'Cliente atualizado com sucesso',
      data: client
    });
    
  } catch (error) {
    logger.error(`Erro ao atualizar cliente: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      message: `Erro ao atualizar cliente: ${error.message}` 
    });
  }
};

// Excluir um cliente
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente não encontrado' 
      });
    }
    
    // Opção 1: Exclusão definitiva
    // await client.remove();
    
    // Opção 2: Inativação (soft delete)
    client.status = 'inactive';
    await client.save();
    
    return res.status(200).json({
      success: true,
      message: 'Cliente inativado com sucesso'
    });
    
  } catch (error) {
    logger.error(`Erro ao excluir cliente: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      message: `Erro ao excluir cliente: ${error.message}` 
    });
  }
};

// Listar todas as tags disponíveis
exports.getTags = async (req, res) => {
  try {
    // Agrupa clientes por tags e conta ocorrências
    const tags = await Client.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    return res.status(200).json({
      success: true,
      count: tags.length,
      data: tags.map(tag => ({
        name: tag._id,
        count: tag.count
      }))
    });
    
  } catch (error) {
    logger.error(`Erro ao listar tags: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      message: `Erro ao listar tags: ${error.message}` 
    });
  }
};

// Adicionar tag a vários clientes
exports.addTagToMany = async (req, res) => {
  try {
    if (!req.body.tag || !req.body.clientIds || !Array.isArray(req.body.clientIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tag e lista de clientes são obrigatórios' 
      });
    }
    
    const tag = req.body.tag.trim();
    const clientIds = req.body.clientIds;
    
    // Atualiza todos os clientes selecionados
    const result = await Client.updateMany(
      { _id: { $in: clientIds } },
      { $addToSet: { tags: tag } }
    );
    
    return res.status(200).json({
      success: true,
      message: `Tag adicionada a ${result.modifiedCount} clientes`,
      modifiedCount: result.modifiedCount
    });
    
  } catch (error) {
    logger.error(`Erro ao adicionar tag: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      message: `Erro ao adicionar tag: ${error.message}` 
    });
  }
};

// Exportar clientes para CSV
exports.exportClients = async (req, res) => {
  try {
    // Filtros
    const filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.tag) {
      filter.tags = req.query.tag;
    }
    
    // Busca clientes
    const clients = await Client.find(filter);
    
    // Gera nome do arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `clients_export_${timestamp}.csv`;
    const filepath = path.join(__dirname, '../../uploads/clients', filename);
    
    // Cria arquivo CSV
    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'name', title: 'Name' },
        { id: 'phone', title: 'Phone' },
        { id: 'email', title: 'Email' },
        { id: 'tags', title: 'Tags' },
        { id: 'status', title: 'Status' },
        { id: 'birthday', title: 'Birthday' },
        { id: 'lastVisit', title: 'Last Visit' },
        { id: 'frequencyScore', title: 'Frequency Score' },
        { id: 'notes', title: 'Notes' },
        { id: 'createdAt', title: 'Created At' }
      ]
    });
    
    // Formata dados para CSV
    const records = clients.map(client => ({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      tags: client.tags.join(', '),
      status: client.status,
      birthday: client.birthday ? client.birthday.toISOString().split('T')[0] : '',
      lastVisit: client.lastVisit ? client.lastVisit.toISOString().split('T')[0] : '',
      frequencyScore: client.frequencyScore,
      notes: client.notes || '',
      createdAt: client.createdAt.toISOString().split('T')[0]
    }));
    
    // Escreve no arquivo
    await csvWriter.writeRecords(records);
    
    // Envia o arquivo
    return res.download(filepath, filename, (err) => {
      if (err) {
        logger.error(`Erro ao enviar arquivo: ${err.message}`);
      }
      
      // Remove o arquivo após o download
      fs.unlinkSync(filepath);
    });
    
  } catch (error) {
    logger.error(`Erro ao exportar clientes: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      message: `Erro ao exportar clientes: ${error.message}` 
    });
  }
};

// Obter estatísticas dos clientes
exports.getStats = async (req, res) => {
  try {
    // Total de clientes
    const totalClients = await Client.countDocuments();
    
    // Clientes por status
    const statusStats = await Client.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Clientes por fonte
    const sourceStats = await Client.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);
    
    // Clientes com aniversário no mês atual
    const currentMonth = new Date().getMonth() + 1;
    const birthdaysThisMonth = await Client.aggregate([
      { 
        $project: {
          month: { $month: '$birthday' }
        }
      },
      {
        $match: {
          month: currentMonth
        }
      },
      {
        $count: 'total'
      }
    ]);
    
    // Novos clientes nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newClients = await Client.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    return res.status(200).json({
      success: true,
      data: {
        totalClients,
        statusBreakdown: statusStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        sourceBreakdown: sourceStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        birthdaysThisMonth: birthdaysThisMonth[0]?.total || 0,
        newClientsLast30Days: newClients
      }
    });
    
  } catch (error) {
    logger.error(`Erro ao obter estatísticas: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      message: `Erro ao obter estatísticas: ${error.message}` 
    });
  }
};

// Operações em lote para clientes
exports.batchOperation = async (req, res) => {
  try {
    if (!req.body.operation || !req.body.clientIds || !Array.isArray(req.body.clientIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Operação e lista de clientes são obrigatórios' 
      });
    }
    
    const { operation, clientIds, data } = req.body;
    let result;
    
    switch (operation) {
      case 'addTag':
        // Adicionar tag a vários clientes
        if (!data || !data.tag) {
          return res.status(400).json({ 
            success: false, 
            message: 'Tag é obrigatória para esta operação' 
          });
        }
        
        result = await Client.updateMany(
          { _id: { $in: clientIds } },
          { $addToSet: { tags: data.tag.trim() } }
        );
        
        return res.status(200).json({
          success: true,
          message: `Tag adicionada a ${result.modifiedCount} clientes`,
          modifiedCount: result.modifiedCount
        });
        
      case 'removeTag':
        // Remover tag de vários clientes
        if (!data || !data.tag) {
          return res.status(400).json({ 
            success: false, 
            message: 'Tag é obrigatória para esta operação' 
          });
        }
        
        result = await Client.updateMany(
          { _id: { $in: clientIds } },
          { $pull: { tags: data.tag.trim() } }
        );
        
        return res.status(200).json({
          success: true,
          message: `Tag removida de ${result.modifiedCount} clientes`,
          modifiedCount: result.modifiedCount
        });
        
      case 'updateStatus':
        // Atualizar status de vários clientes
        if (!data || !data.status) {
          return res.status(400).json({ 
            success: false, 
            message: 'Status é obrigatório para esta operação' 
          });
        }
        
        result = await Client.updateMany(
          { _id: { $in: clientIds } },
          { $set: { status: data.status } }
        );
        
        return res.status(200).json({
          success: true,
          message: `Status atualizado para ${result.modifiedCount} clientes`,
          modifiedCount: result.modifiedCount
        });
        
      case 'delete':
        // Excluir (soft delete) vários clientes
        result = await Client.updateMany(
          { _id: { $in: clientIds } },
          { $set: { status: 'inactive' } }
        );
        
        return res.status(200).json({
          success: true,
          message: `${result.modifiedCount} clientes inativados com sucesso`,
          modifiedCount: result.modifiedCount
        });
        
      default:
        return res.status(400).json({ 
          success: false, 
          message: `Operação '${operation}' não suportada` 
        });
    }
    
  } catch (error) {
    logger.error(`Erro em operação em lote: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      message: `Erro em operação em lote: ${error.message}` 
    });
  }
};
