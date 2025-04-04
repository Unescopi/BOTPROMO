/**
 * Script para renomear o arquivo de modelo User.js para user.js
 */
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../src/models');
const upperCaseFile = path.join(modelsDir, 'User.js');
const lowerCaseFile = path.join(modelsDir, 'user.js');

console.log('Verificando arquivos no diretório models:');
fs.readdir(modelsDir, (err, files) => {
  if (err) {
    console.error('Erro ao ler o diretório:', err);
    return;
  }
  
  console.log('Arquivos encontrados:');
  files.forEach(file => {
    console.log(`- ${file}`);
  });
  
  // Verificar se o arquivo User.js existe
  if (fs.existsSync(upperCaseFile)) {
    console.log('Arquivo User.js encontrado, renomeando para user.js...');
    
    // Verificar se user.js já existe
    if (fs.existsSync(lowerCaseFile)) {
      console.log('Arquivo user.js já existe. Comparando conteúdo...');
      
      const upperCaseContent = fs.readFileSync(upperCaseFile, 'utf8');
      const lowerCaseContent = fs.readFileSync(lowerCaseFile, 'utf8');
      
      if (upperCaseContent === lowerCaseContent) {
        console.log('Os arquivos têm o mesmo conteúdo. Removendo User.js...');
        fs.unlinkSync(upperCaseFile);
        console.log('Arquivo User.js removido com sucesso!');
      } else {
        console.log('Os arquivos têm conteúdo diferente!');
        console.log('Criando backup de user.js...');
        fs.copyFileSync(lowerCaseFile, path.join(modelsDir, 'user.js.bak'));
        console.log('Substituindo user.js pelo conteúdo de User.js...');
        fs.copyFileSync(upperCaseFile, lowerCaseFile);
        fs.unlinkSync(upperCaseFile);
        console.log('Operação concluída com sucesso!');
      }
    } else {
      console.log('Renomeando User.js para user.js...');
      fs.copyFileSync(upperCaseFile, lowerCaseFile);
      fs.unlinkSync(upperCaseFile);
      console.log('Arquivo renomeado com sucesso!');
    }
  } else if (fs.existsSync(lowerCaseFile)) {
    console.log('Apenas o arquivo user.js foi encontrado. Nenhuma ação necessária.');
  } else {
    console.error('Nenhum arquivo de modelo de usuário encontrado!');
  }
}); 