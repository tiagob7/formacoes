#!/usr/bin/env node

/**
 * Export tool: Converte seed-data.js para Word document (.docx)
 * Uso: node export-to-word.js
 * Gera arquivo: formacoes-export.docx
 */

import { Document, Packer, Paragraph, Table, TableCell, TableRow, BorderStyle, WidthType, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip } from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar os dados
import { COURSES } from './seed-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createDocument() {
  const sections = [];

  // Título principal
  sections.push(
    new Paragraph({
      text: 'Formações Algartempo - Documentação Completa',
      heading: HeadingLevel.HEADING_1,
      bold: true,
      size: 32,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );

  sections.push(
    new Paragraph({
      text: `Gerado em: ${new Date().toLocaleDateString('pt-PT')}`,
      italic: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    })
  );

  // Para cada formação
  COURSES.forEach((course, courseIndex) => {
    // Título da Formação
    sections.push(
      new Paragraph({
        text: `${courseIndex + 1}. ${course.title}`,
        heading: HeadingLevel.HEADING_1,
        bold: true,
        spacing: { before: 400, after: 200 }
      })
    );

    // Informações da Formação
    sections.push(
      new Paragraph({
        text: `Categoria: ${course.category}`,
        spacing: { after: 100 }
      })
    );

    sections.push(
      new Paragraph({
        text: `Duração: ${course.duration}`,
        spacing: { after: 100 }
      })
    );

    sections.push(
      new Paragraph({
        text: `Nota de Aprovação: ${course.passingScore}%`,
        spacing: { after: 100 }
      })
    );

    sections.push(
      new Paragraph({
        text: `Descrição: ${course.subtitle}`,
        spacing: { after: 400 },
        italics: true
      })
    );

    // Para cada módulo
    course.modules.forEach((module, moduleIndex) => {
      // Título do Módulo
      sections.push(
        new Paragraph({
          text: `${courseIndex + 1}.${moduleIndex + 1} ${module.title}`,
          heading: HeadingLevel.HEADING_2,
          bold: true,
          spacing: { before: 300, after: 150 }
        })
      );

      sections.push(
        new Paragraph({
          text: `Duração: ${module.duration} | Páginas: ${module.pages}`,
          spacing: { after: 200 },
          italics: true
        })
      );

      // Conteúdo
      if (module.content && module.content.length > 0) {
        sections.push(
          new Paragraph({
            text: 'CONTEÚDO:',
            heading: HeadingLevel.HEADING_3,
            bold: true,
            spacing: { before: 150, after: 100 }
          })
        );

        module.content.forEach((item) => {
          if (item.type === 'h1') {
            sections.push(
              new Paragraph({
                text: item.text,
                heading: HeadingLevel.HEADING_3,
                bold: true,
                spacing: { before: 100, after: 100 }
              })
            );
          } else if (item.type === 'h2') {
            sections.push(
              new Paragraph({
                text: item.text,
                heading: HeadingLevel.HEADING_4,
                bold: true,
                spacing: { before: 80, after: 80 }
              })
            );
          } else if (item.type === 'p') {
            sections.push(
              new Paragraph({
                text: item.text,
                spacing: { after: 100 }
              })
            );
          } else if (item.type === 'lead') {
            sections.push(
              new Paragraph({
                text: item.text,
                spacing: { after: 150 },
                italics: true,
                border: {
                  top: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 6 }
                }
              })
            );
          } else if (item.type === 'list') {
            item.items.forEach((listItem) => {
              sections.push(
                new Paragraph({
                  text: listItem,
                  spacing: { after: 80 },
                  bullet: { level: 0 }
                })
              );
            });
          } else if (item.type === 'callout') {
            sections.push(
              new Paragraph({
                text: `📌 ${item.label}:`,
                bold: true,
                spacing: { before: 100, after: 50 }
              })
            );
            sections.push(
              new Paragraph({
                text: item.text,
                spacing: { after: 150 },
                italics: true,
                indent: { left: 720 }
              })
            );
          }
        });
      }

      // Questionário
      if (module.quiz && module.quiz.length > 0) {
        sections.push(
          new Paragraph({
            text: 'QUESTIONÁRIO:',
            heading: HeadingLevel.HEADING_3,
            bold: true,
            spacing: { before: 200, after: 100 }
          })
        );

        module.quiz.forEach((question, qIndex) => {
          if (question.type === 'mc') {
            sections.push(
              new Paragraph({
                text: `${qIndex + 1}. [MÚLTIPLA ESCOLHA] ${question.question}`,
                spacing: { before: 100, after: 80 },
                bold: true
              })
            );

            question.options.forEach((option, optIndex) => {
              const isCorrect = optIndex === question.answer ? ' ✓' : '';
              sections.push(
                new Paragraph({
                  text: `   ${String.fromCharCode(97 + optIndex)}) ${option}${isCorrect}`,
                  spacing: { after: 50 },
                  bullet: { level: 1 }
                })
              );
            });

            sections.push(
              new Paragraph({
                text: `Explicação: ${question.explanation}`,
                spacing: { after: 150 },
                italics: true,
                indent: { left: 720 }
              })
            );
          } else if (question.type === 'tf') {
            sections.push(
              new Paragraph({
                text: `${qIndex + 1}. [VERDADEIRO/FALSO] ${question.question}`,
                spacing: { before: 100, after: 80 },
                bold: true
              })
            );

            sections.push(
              new Paragraph({
                text: `Resposta: ${question.answer ? 'VERDADEIRO ✓' : 'FALSO ✓'}`,
                spacing: { after: 80 },
                bullet: { level: 1 }
              })
            );

            sections.push(
              new Paragraph({
                text: `Explicação: ${question.explanation}`,
                spacing: { after: 150 },
                italics: true,
                indent: { left: 720 }
              })
            );
          }
        });
      }

      // Quebra de página entre módulos
      if (moduleIndex < course.modules.length - 1) {
        sections.push(
          new Paragraph({
            text: '',
            pageBreakBefore: true
          })
        );
      }
    });

    // Quebra de página entre formações
    if (courseIndex < COURSES.length - 1) {
      sections.push(
        new Paragraph({
          text: '',
          pageBreakBefore: true
        })
      );
    }
  });

  return new Document({
    sections: [
      {
        children: sections
      }
    ]
  });
}

async function exportToWord() {
  try {
    console.log('📄 Gerando documento Word...');
    const doc = createDocument();

    const buffer = await Packer.toBuffer(doc);
    const fileName = 'formacoes-export.docx';
    const filePath = path.join(__dirname, fileName);

    fs.writeFileSync(filePath, buffer);

    console.log(`✅ Exportação concluída com sucesso!`);
    console.log(`📁 Ficheiro: ${fileName}`);
    console.log(`📊 Total de formações: ${COURSES.length}`);
    console.log(`📚 Total de módulos: ${COURSES.reduce((sum, c) => sum + c.modules.length, 0)}`);

  } catch (error) {
    console.error('❌ Erro ao gerar documento:', error.message);
    process.exit(1);
  }
}

exportToWord();
