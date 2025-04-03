# Bot de Promoções para Cafeteria

Sistema completo para envio de promoções e marketing via WhatsApp utilizando a Evolution API.

## Funcionalidades

- 🚀 **Integração com WhatsApp**: Envio de mensagens via Evolution API
- 📊 **Dashboard Interativo**: Interface amigável para gerenciar campanhas
- 📅 **Agendamento Automático**: Programação de envios diários ou periódicos
- 📱 **Gerenciamento de Clientes**: Importação e gestão de listas de contatos
- 🖼️ **Suporte a Mídias**: Envio de imagens, PDFs e outros arquivos
- 📈 **Estatísticas**: Acompanhamento de entregas e visualizações
- 🔔 **Notificações**: Alertas sobre status das campanhas
- 🔐 **Autenticação Segura**: Sistema completo de login e permissões

## Requisitos

- Node.js 16+
- MongoDB
- Evolution API configurada e operacional

## Instalação

1. Clone este repositório
2. Instale as dependências:
   ```
   npm install
   ```
3. Configure o arquivo `.env` com suas informações:
   ```
   # Configurações do Servidor
   PORT=3000
   NODE_ENV=development

   # Configurações do MongoDB
   MONGODB_URI=mongodb://localhost:27017/cafeteria-promo-bot

   # Configurações da Evolution API
   EVOLUTION_API_URL=http://localhost:8080
   EVOLUTION_API_KEY=sua-chave-api
   EVOLUTION_INSTANCE=cafeteria-bot

   # Configurações de JWT
   JWT_SECRET=seu-segredo-jwt
   JWT_EXPIRATION=7d

   # Configurações de Upload
   MAX_FILE_SIZE=5242880 # 5MB
   ```
4. Inicie o servidor:
   ```
   npm start
   ```
5. Acesse a interface em `http://localhost:3000`

## Estrutura do Projeto

```
BOT SPAM/
├── index.js                # Ponto de entrada da aplicação
├── .env                    # Variáveis de ambiente
├── package.json            # Dependências e scripts
├── src/
│   ├── config/             # Configurações da aplicação
│   ├── controllers/        # Controladores para as rotas
│   ├── models/             # Modelos do MongoDB
│   ├── public/             # Arquivos estáticos (frontend)
│   │   ├── css/            # Estilos CSS
│   │   ├── js/             # Scripts JavaScript
│   │   └── pages/          # Páginas HTML
│   ├── routes/             # Rotas da API
│   ├── services/           # Serviços de negócio
│   └── utils/              # Utilitários e helpers
└── uploads/                # Diretório para uploads de mídia
```

## Configuração da Evolution API

1. Instale e configure a Evolution API seguindo as instruções em [Evolution API](https://github.com/evolution-api/evolution-api)
2. Crie uma instância para sua cafeteria
3. Obtenha a chave de API e configure no arquivo `.env`

## Uso da Interface

### Dashboard
- Visualize estatísticas de campanhas
- Monitore o status das mensagens
- Acesse promoções recentes e agendadas

### Clientes
- Importe clientes via CSV
- Adicione e edite clientes individualmente
- Organize clientes com tags personalizadas
- Filtre clientes por diferentes critérios

### Promoções
- Crie campanhas promocionais
- Agende envios automáticos
- Personalize mensagens com variáveis dinâmicas
- Anexe imagens e outros arquivos

### Mensagens
- Envie mensagens individuais ou em massa
- Visualize histórico de mensagens
- Monitore taxas de entrega e leitura
- Reenvie mensagens que falharam

### Configurações
- Conecte-se ao WhatsApp via QR Code
- Configure parâmetros da API
- Gerencie tags de clientes
- Ajuste configurações de agendamento
- Faça backup e restauração de dados

## API Endpoints

### Clientes
- `GET /api/clients` - Listar todos os clientes
- `POST /api/clients` - Criar novo cliente
- `GET /api/clients/:id` - Obter cliente específico
- `PUT /api/clients/:id` - Atualizar cliente
- `DELETE /api/clients/:id` - Excluir cliente
- `POST /api/clients/import` - Importar clientes via CSV
- `GET /api/clients/export` - Exportar clientes para CSV
- `GET /api/clients/tags` - Listar todas as tags
- `POST /api/clients/tags/bulk` - Adicionar tag a múltiplos clientes

### Promoções
- `GET /api/promotions` - Listar todas as promoções
- `POST /api/promotions` - Criar nova promoção
- `GET /api/promotions/:id` - Obter promoção específica
- `PUT /api/promotions/:id` - Atualizar promoção
- `DELETE /api/promotions/:id` - Excluir promoção
- `POST /api/promotions/upload-media` - Fazer upload de mídia
- `POST /api/promotions/:id/schedule` - Agendar promoção
- `POST /api/promotions/:id/send` - Enviar promoção imediatamente
- `POST /api/promotions/:id/cancel` - Cancelar promoção agendada
- `POST /api/promotions/:id/test` - Testar promoção

### Mensagens
- `GET /api/messages` - Listar todas as mensagens
- `GET /api/messages/:id` - Obter mensagem específica
- `POST /api/messages/send` - Enviar mensagem individual
- `POST /api/messages/send-bulk` - Enviar mensagens em massa
- `PUT /api/messages/:id/status` - Atualizar status da mensagem

### WhatsApp
- `GET /api/whatsapp/status` - Verificar status da conexão
- `GET /api/whatsapp/qrcode` - Obter QR Code para conexão
- `POST /api/whatsapp/disconnect` - Desconectar WhatsApp

## Suporte

Em caso de dúvidas ou problemas, entre em contato com o suporte técnico.

## Licença

Este projeto está licenciado sob a licença MIT.
