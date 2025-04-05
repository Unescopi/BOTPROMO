/**
 * Método para gerar clientes de exemplo para debug
 */
exports.getDebugClients = () => {
  console.log('Gerando clientes de exemplo para debug');
  
  const demoClients = [];
  
  // Gerar 10 clientes de teste
  for (let i = 1; i <= 10; i++) {
    demoClients.push({
      _id: `demo-client-${i}`,
      name: `Cliente Demo ${i}`,
      phone: `55119999999${i < 10 ? '0' + i : i}`,
      email: `cliente${i}@exemplo.com`,
      status: i % 3 === 0 ? 'inactive' : (i % 5 === 0 ? 'blocked' : 'active'),
      tags: ['demo', i % 2 === 0 ? 'vip' : 'regular', `grupo-${Math.ceil(i/3)}`],
      lastVisit: new Date(Date.now() - (i * 86400000)) // i dias atrás
    });
  }
  
  return {
    success: true,
    message: 'Clientes de exemplo gerados com sucesso',
    data: demoClients
  };
};

/**
 * Método para gerar promoções de exemplo para debug
 */
exports.getDebugPromotions = () => {
  console.log('Gerando promoções de exemplo para debug');
  
  const demoPromotions = [];
  
  // Gerar 5 promoções de teste
  for (let i = 1; i <= 5; i++) {
    demoPromotions.push({
      _id: `demo-promo-${i}`,
      name: `Promoção Demo ${i}`,
      description: `Esta é uma promoção de demonstração número ${i}`,
      type: i % 2 === 0 ? 'weekly' : 'daily',
      message: `Olá {{nome}}, aproveite nossa promoção especial ${i}!`,
      status: i % 3 === 0 ? 'scheduled' : (i % 4 === 0 ? 'completed' : 'active'),
      targetAudience: {
        all: i % 2 === 0,
        tags: i % 2 === 0 ? [] : ['vip']
      },
      schedule: {
        startDate: new Date(Date.now() + (i * 86400000)), // i dias a frente
        sendTime: '10:00'
      },
      stats: {
        sent: i * 10,
        delivered: i * 8,
        read: i * 6,
        clicked: i * 3
      }
    });
  }
  
  return {
    success: true,
    message: 'Promoções de exemplo geradas com sucesso',
    data: demoPromotions
  };
};

/**
 * Método para gerar estatísticas de exemplo para debug
 */
exports.getDebugStats = () => {
  console.log('Gerando estatísticas de exemplo para debug');
  
  return {
    success: true,
    message: 'Estatísticas de exemplo geradas com sucesso',
    data: {
      clients: {
        total: 253,
        active: 189,
        inactive: 42,
        blocked: 22,
        newLastWeek: 15,
        newLastMonth: 47
      },
      promotions: {
        total: 38,
        active: 12,
        scheduled: 5,
        completed: 21,
        sentLastWeek: 4,
        sentLastMonth: 15
      },
      messages: {
        total: 1573,
        delivered: 1498,
        read: 1123,
        failed: 75,
        sentLastWeek: 153,
        sentLastMonth: 654
      },
      system: {
        uptime: 864000, // 10 dias em segundos
        dbStatus: 'connected',
        whatsappStatus: 'connected',
        storageUsage: 45, // porcentagem
        memoryUsage: 32  // porcentagem
      }
    }
  };
}; 