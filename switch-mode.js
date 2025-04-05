/**
 * Script para alternar entre modo debug e produção
 * Uso: node switch-mode.js debug|prod
 */
const fs = require('fs');
const path = require('path');

// Verificar argumentos
const mode = process.argv[2]?.toLowerCase();
if (!mode || (mode !== 'debug' && mode !== 'prod')) {
  console.error('Erro: Você deve especificar o modo "debug" ou "prod"');
  console.log('Uso: node switch-mode.js debug|prod');
  process.exit(1);
}

// Caminhos dos arquivos
const envPath = path.join(__dirname, '.env');
const envDebugPath = path.join(__dirname, '.env.debug');
const envProdPath = path.join(__dirname, '.env.prod');

// Função para verificar se um arquivo existe
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
};

// Verificar se os arquivos necessários existem
if (mode === 'debug' && !fileExists(envDebugPath)) {
  console.error('Erro: Arquivo .env.debug não encontrado');
  process.exit(1);
}

if (mode === 'prod' && !fileExists(envProdPath)) {
  console.error('Erro: Arquivo .env.prod não encontrado');
  process.exit(1);
}

try {
  // Fazer backup do .env atual (se necessário)
  if (fileExists(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Verificar se já está no modo desejado
    if (mode === 'debug') {
      if (envContent.includes('DEBUG_MODE=true')) {
        console.log('O sistema já está no modo DEBUG');
        process.exit(0);
      }
    } else if (mode === 'prod') {
      if (envContent.includes('NODE_ENV=production') && envContent.includes('DEBUG_MODE=false')) {
        console.log('O sistema já está no modo PROD');
        process.exit(0);
      }
    }
  }
  
  // Copiar o arquivo correto
  const sourceFile = mode === 'debug' ? envDebugPath : envProdPath;
  fs.copyFileSync(sourceFile, envPath);
  
  console.log(`Sistema alternado para o modo ${mode.toUpperCase()} com sucesso!`);
  console.log('Reinicie o servidor para aplicar as alterações.');
  
} catch (error) {
  console.error(`Erro ao alternar para o modo ${mode}:`, error.message);
  process.exit(1);
} 