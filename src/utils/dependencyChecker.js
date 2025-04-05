/**
 * Verificador de Dependências
 * 
 * Este módulo verifica se todas as dependências necessárias estão instaladas
 * e fornece instruções para instalá-las se necessário.
 */
const logger = require('./logger');

class DependencyChecker {
  constructor() {
    this.requiredDependencies = [
      { name: 'json2csv', optional: true, purpose: 'Exportação para CSV' },
      { name: 'exceljs', optional: true, purpose: 'Exportação para Excel' }
    ];
  }
  
  /**
   * Verifica se todas as dependências necessárias estão instaladas
   */
  checkDependencies() {
    logger.info('Verificando dependências...');
    
    const missingDependencies = [];
    
    for (const dependency of this.requiredDependencies) {
      try {
        require(dependency.name);
        logger.info(`Dependência encontrada: ${dependency.name}`);
      } catch (error) {
        if (dependency.optional) {
          logger.warn(`Dependência opcional não encontrada: ${dependency.name} (${dependency.purpose})`);
        } else {
          logger.error(`Dependência obrigatória não encontrada: ${dependency.name} (${dependency.purpose})`);
          missingDependencies.push(dependency);
        }
      }
    }
    
    if (missingDependencies.length > 0) {
      const installCommand = `npm install ${missingDependencies.map(d => d.name).join(' ')}`;
      
      logger.warn('Algumas dependências obrigatórias não foram encontradas.');
      logger.warn(`Execute o seguinte comando para instalá-las: ${installCommand}`);
      
      return false;
    }
    
    logger.info('Todas as dependências obrigatórias estão instaladas.');
    return true;
  }
}

// Exportar uma instância única
module.exports = new DependencyChecker(); 