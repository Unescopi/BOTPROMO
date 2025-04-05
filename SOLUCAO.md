# Resolução do Problema - Bot de Promoções

## O Problema
O sistema não estava exibindo dados reais no dashboard e nas abas do website, mesmo com o `DEBUG_MODE=false` configurado no arquivo `.env`.

## Diagnóstico
1. Identificamos um problema na **conexão com o MongoDB** - os logs do servidor mostravam erros de conexão como "getaddrinfo ENOTFOUND botpromo_mongo" e "connect ECONNREFUSED".
2. O aplicativo estava tentando conectar-se a um host chamado `botpromo_mongo`, mas esse nome não é resolvido no ambiente local/VPS.

## Soluções Implementadas

### 1. Corrigido o arquivo `.env`
- Alteramos a URI de conexão do MongoDB para usar `127.0.0.1` (endereço IP local) em vez de hostnames que podem não ser resolvidos.
- Adicionamos uma URI alternativa em caso de falha na conexão primária.

### 2. Melhorias no código de conexão ao MongoDB
- Implementamos um sistema de fallback para tentar diferentes URIs de conexão.
- Aumentamos os timeouts para dar mais tempo à conexão.
- Adicionamos melhores mensagens de erro e logs para diagnóstico.

### 3. Scripts de Gerenciamento e Diagnóstico
- **switch-mode.js**: Script para alternar facilmente entre modo debug e produção.
- **mongodb-connect.js**: Script para testar diferentes configurações de conexão e identificar qual funciona melhor no ambiente.

### 4. Arquivos de Configuração
- `.env.debug`: Configuração otimizada para desenvolvimento com dados fictícios
- `.env.prod`: Configuração otimizada para produção com dados reais do MongoDB

### 5. Documentação
- **README-VPS.md**: Guia com instruções específicas para configuração em ambiente VPS
- **SOLUCAO.md**: Este resumo das soluções implementadas

## Instruções de Uso

1. Para testar a conexão com o MongoDB:
   ```
   node mongodb-connect.js
   ```

2. Para alternar entre modos debug e produção:
   ```
   node switch-mode.js debug   # Ativa modo debug com dados fictícios
   node switch-mode.js prod    # Ativa modo produção com dados reais
   ```

3. Após qualquer alteração, reinicie o servidor:
   ```
   npm run start
   ```

## Observações Importantes

1. O problema principal era que o sistema estava tentando se conectar ao MongoDB usando um hostname que não estava sendo resolvido no ambiente VPS.

2. No ambiente EasyPanel/docker, o hostname correto pode ser `botpromo_mongo`, mas em uma VPS regular ou ambiente local, é necessário usar `localhost` ou `127.0.0.1`.

3. Mesmo com o `DEBUG_MODE=false`, o sistema não mostrará dados reais se não conseguir se conectar ao MongoDB.

4. Agora o sistema tentará automaticamente uma conexão alternativa se a principal falhar. 