# 📄 Ferramenta de Exportação para Word

## Guia de Utilização

Esta ferramenta permite exportar todos os dados das formações (conteúdo, módulos, questionários, durações) para um documento Word profissional.

---

## ⚙️ Instalação

### 1. Instalar dependências

```bash
npm install docx
```

Ou, se usar yarn:

```bash
yarn add docx
```

---

## 🚀 Como Usar

### Opção 1: Script de Linha de Comando (Recomendado)

Execute no terminal/PowerShell:

```bash
node export-to-word.js
```

Ou, no Windows PowerShell:

```powershell
node .\export-to-word.js
```

**Resultado:**
- Ficheiro gerado: `formacoes-export.docx`
- Localização: Pasta raiz do projeto
- Tempo: ~5 segundos

---

## 📋 O que é Exportado?

✅ **Informação de cada formação:**
- Título
- Categoria
- Duração total
- Nota de aprovação
- Descrição

✅ **Informação de cada módulo:**
- Título
- Duração específica
- Número de páginas

✅ **Conteúdo completo:**
- Títulos (H1, H2)
- Parágrafos
- Listas com bullets
- Callouts/destaquess

✅ **Questionários:**
- Questões de múltipla escolha
- Questões verdadeiro/falso
- Opções de resposta
- Respostas corretas marcadas (✓)
- Explicações detalhadas

---

## 📊 Exemplo de Estrutura Gerada

```
1. HACCP - Higiene e Segurança Alimentar
   ├── Categoria: Segurança
   ├── Duração: 2h 30min
   ├── Nota: 70%
   │
   ├── 1.1 O que é o HACCP
   │   ├── Duração: 15min
   │   ├── Conteúdo: [títulos, parágrafos, listas]
   │   └── Questionário: [5 questões]
   │
   ├── 1.2 Perigos alimentares
   └── ... [mais módulos]

2. Higiene e Segurança no Trabalho
   └── ... [todos os módulos]
```

---

## 🎨 Formatação do Documento Word

O documento gerado inclui:
- **Títulos hierárquicos** (H1, H2, H3, H4)
- **Negrito** para destaques
- **Itálico** para explicações
- **Listas com bullets** para conteúdo estruturado
- **Quebras de página** entre formações e módulos grandes
- **Bordas visuais** para callouts/caixas de informação
- **Ícones visuais** (✓, 📌) para melhor leitura

---

## 🔧 Personalização

Se quiser modificar a formatação, edite o ficheiro `export-to-word.js`:

- **Mudar tamanho de fonte**: Localize `size: 32` e altere
- **Mudar cores**: Use o parâmetro `color` nos Paragraph
- **Adicionar mais campos**: Edite a função `createDocument()`

---

## ✅ Checklist de Exportação

- [ ] Ficheiro `seed-data.js` atualizado
- [ ] Node.js instalado (`node --version`)
- [ ] Dependência `docx` instalada (`npm install docx`)
- [ ] Executar: `node export-to-word.js`
- [ ] Verificar ficheiro `formacoes-export.docx` gerado
- [ ] Abrir em Microsoft Word ou LibreOffice

---

## 🐛 Troubleshooting

### Erro: "Cannot find module 'docx'"
**Solução:** Instale as dependências
```bash
npm install docx
```

### Erro: "Cannot find module './seed-data.js'"
**Solução:** Certifique-se de que o script é executado na pasta raiz do projeto

### O ficheiro Word não abre
**Solução:** Tente abrir com LibreOffice ou outra aplicação compatível

---

## 📈 Estatísticas Típicas

Após exportação bem-sucedida, verá:
```
✅ Exportação concluída com sucesso!
📁 Ficheiro: formacoes-export.docx
📊 Total de formações: 14
📚 Total de módulos: 85+
```

---

## 💡 Dicas

1. **Documentação**: Use o Word gerado como documentação oficial das formações
2. **Impressão**: O documento é otimizado para impressão em A4
3. **Distribuição**: Compartilhe o `.docx` como backup ou documentação com stakeholders
4. **Atualização**: Sempre que modificar `seed-data.js`, re-exporte para manter documento atualizado

---

## 📞 Suporte

Se houver problemas:
1. Verifique se `seed-data.js` está no formato correto
2. Certifique-se de que `export-to-word.js` está na mesma pasta
3. Tente executar de novo - às vezes há problema de permissões

---

**Última atualização:** 2026-05-28
