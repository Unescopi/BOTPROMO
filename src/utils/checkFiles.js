/**
 * Script para verificar os arquivos no diretório models
 */
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../models');

console.log('Verificando arquivos no diretório models:');
fs.readdir(modelsDir, (err, files) => {
  if (err) {
    console.error('Erro ao ler o diretório:', err);
    return;
  }
  
  files.forEach(file => {
    console.log(`- ${file}`);
  });
}); 