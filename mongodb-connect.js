/**
 * Script para testar diferentes configurações de conexão ao MongoDB
 * Uso: node mongodb-connect.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

// Lista de possíveis configurações para testar
const connectionConfigs = [
  {
    name: 'Configuração 1 - Padrão (localhost)',
    uri: process.env.MONGODB_URI || 'mongodb://mongo:d198a39d3590bbd64e35@localhost:27017/cafeteria-promo-bot?tls=false',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    }
  },
  {
    name: 'Configuração 2 - IP Local',
    uri: 'mongodb://mongo:d198a39d3590bbd64e35@127.0.0.1:27017/cafeteria-promo-bot?tls=false',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    }
  },
  {
    name: 'Configuração 3 - Container',
    uri: 'mongodb://mongo:d198a39d3590bbd64e35@botpromo_mongo:27017/cafeteria-promo-bot?tls=false',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    }
  },
  {
    name: 'Configuração 4 - IP Externo (pode precisar ser modificado)',
    uri: 'mongodb://mongo:d198a39d3590bbd64e35@HOST_IP:27017/cafeteria-promo-bot?tls=false',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    }
  }
];

// Função para testar uma configuração
async function testConnection(config) {
  console.log(`\nTestando ${config.name}...`);
  console.log(`URI: ${config.uri.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@')}`);

  try {
    // Limpar conexões anteriores
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    // Testar conexão
    await mongoose.connect(config.uri, config.options);
    
    console.log(`✅ SUCESSO: Conexão estabelecida com ${config.name}`);
    
    // Verificar coleções
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Coleções disponíveis: ${collections.map(c => c.name).join(', ')}`);
    
    // Fechar conexão
    await mongoose.connection.close();
    
    return true;
  } catch (error) {
    console.log(`❌ FALHA: ${config.name}`);
    console.log(`Erro: ${error.message}`);
    return false;
  }
}

// Função principal
async function main() {
  console.log('=== TESTE DE CONEXÃO AO MONGODB ===');
  console.log('Testando diferentes configurações para determinar a melhor para seu ambiente...\n');
  
  // Testar cada configuração
  const results = [];
  
  for (const config of connectionConfigs) {
    // Pular configuração 4 se não foi modificada
    if (config.name.includes('IP Externo') && config.uri.includes('HOST_IP')) {
      console.log('Pulando configuração 4 - Modifique o HOST_IP no script para testar.');
      results.push({ config, success: false });
      continue;
    }
    
    const success = await testConnection(config);
    results.push({ config, success });
  }
  
  // Resumo
  console.log('\n=== RESUMO DOS TESTES ===');
  results.forEach(({ config, success }) => {
    console.log(`${success ? '✅' : '❌'} ${config.name}`);
  });
  
  // Encontrar configurações bem-sucedidas
  const successfulConfigs = results.filter(r => r.success);
  
  if (successfulConfigs.length > 0) {
    console.log('\n=== CONFIGURAÇÃO RECOMENDADA ===');
    console.log(`Recomendamos usar a seguinte configuração: ${successfulConfigs[0].config.name}`);
    console.log('Adicione esta URI ao seu arquivo .env:');
    console.log(`MONGODB_URI=${successfulConfigs[0].config.uri}`);
  } else {
    console.log('\n❌ Nenhuma configuração funcionou. Verifique as credenciais e a conectividade com o MongoDB.');
  }
}

// Executar o script
main()
  .then(() => {
    console.log('\nTeste concluído.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
  }); 