# 🎨 Modo Preview - Visualização de Telas

Este modo permite visualizar todas as telas do frontend **sem precisar do backend ou fazer login**. É perfeito para:

- ✅ Ver os efeitos visuais dos botões
- ✅ Testar a navegação entre telas
- ✅ Visualizar layouts e componentes
- ✅ Desenvolver e ajustar estilos
- ✅ Demonstrar o frontend para stakeholders

## 🚀 Como Usar

### Opção 1: Script NPM (Recomendado)

```bash
cd frontend/anamnes-ia
npm run dev:preview
```

Isso abrirá automaticamente o navegador no modo preview.

### Opção 2: Manual

1. Abra o arquivo `index.preview.html` no navegador
2. Ou acesse `http://localhost:5173/index.preview.html` quando o servidor estiver rodando

## 📋 Telas Disponíveis

No modo preview, você pode acessar todas as telas através da barra de navegação no topo:

- 🔐 **Login** - Tela de login
- 📝 **Cadastro** - Tela de registro
- 🧭 **Navegador** - Menu de navegação principal
- 🏠 **Página Principal** - Dashboard principal
- 💬 **Chat** - Interface de chat
- 👨‍🏫 **Chat Professor** - Interface de chat para professores
- 💳 **Pagamentos** - Tela de planos e pagamentos
- 📋 **Conversa** - Visualização de conversas

## ⚠️ Limitações do Modo Preview

- **Sem autenticação real**: O modo preview usa um token mockado
- **Sem dados do backend**: Chamadas à API/Supabase não funcionarão
- **Sem persistência**: Dados não são salvos
- **Apenas visualização**: Foco em ver layouts e efeitos visuais

## 🎯 Quando Usar

✅ **Use o modo preview quando:**
- Quiser ver rapidamente como uma tela ficou
- Testar efeitos de hover, animações e transições
- Mostrar o design para alguém
- Desenvolver componentes isolados

❌ **Não use o modo preview quando:**
- Precisar testar funcionalidades completas
- Precisar de dados reais do banco
- Quiser testar autenticação e autorização

## 🔧 Como Funciona

O modo preview:
1. Usa `AppPreview.tsx` em vez de `App.tsx`
2. Bypassa a autenticação com um token mockado
3. Remove a proteção de rotas (`ProtectedRoute`)
4. Adiciona uma barra de navegação no topo para alternar entre telas

## 📝 Arquivos Relacionados

- `src/AppPreview.tsx` - Aplicação principal do modo preview
- `src/main.preview.tsx` - Entry point do modo preview
- `src/components/PreviewNavigator.tsx` - Barra de navegação
- `index.preview.html` - HTML do modo preview

## 💡 Dica

Para voltar ao modo normal, use:
```bash
npm run dev
```
