# Configuração do Bot de Promoções em Ambiente VPS

## Problema de Conexão com MongoDB

Se você estiver enfrentando problemas com a conexão ao MongoDB em um ambiente VPS, siga estas instruções para resolver o problema.

## Alternando entre Modo Debug e Produção

Criamos um script para facilitar a alternância entre modo debug (dados fictícios) e modo produção (dados reais do MongoDB).

```bash
# Para ativar o modo debug (sem banco de dados)
node switch-mode.js debug

# Para ativar o modo produção (com banco de dados)
node switch-mode.js prod
```

**IMPORTANTE**: Após mudar o modo, você precisa reiniciar o servidor para que as alterações entrem em vigor.

## Diagnosticando Problemas de Conexão com MongoDB

Se o sistema não estiver exibindo dados reais mesmo com o `DEBUG_MODE=false`, o problema pode estar na conexão com o MongoDB.

Criamos um script de diagnóstico para testar diferentes configurações de conexão:

```bash
# Execute o teste de conexão
node mongodb-connect.js
```

Este script testará diferentes configurações de conexão e mostrará qual é a mais adequada para o seu ambiente VPS.

### Possíveis Soluções para Problemas de Conexão

1. **Edite o arquivo `.env`** e altere a URI do MongoDB para a configuração recomendada pelo script de teste.

2. **Verificar Firewall**: Certifique-se de que a porta 27017 (MongoDB) está aberta no firewall da VPS.

3. **Verificar Configuração do MongoDB**: O MongoDB precisa estar configurado para aceitar conexões do endereço IP correto.

4. **Verificar Credenciais**: Confirme se o usuário e senha estão corretos.

## Estrutura dos Arquivos de Configuração

- `.env`: Arquivo principal de configuração usado pelo aplicativo
- `.env.debug`: Configurações para modo debug (dados fictícios)
- `.env.prod`: Configurações para modo produção (dados reais)

## Contato para Suporte

Se você continuar enfrentando problemas, entre em contato com o desenvolvedor para obter suporte.

## Observações Importantes

- O sistema só exibirá dados reais quando estiver no modo produção (`DEBUG_MODE=false`) E a conexão com o MongoDB estiver funcionando corretamente.
- No ambiente EasyPanel, o host do MongoDB geralmente é `botpromo_mongo` em vez de `localhost` ou `127.0.0.1`.
- Se estiver executando fora do ambiente de contêiner, pode ser necessário ajustar as configurações de conexão. 