import Anthropic from '@anthropic-ai/sdk'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, LevelFormat
} from 'docx'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  const { action, payload } = await req.json()

  // ── Llamada a Claude para ayuda de redacción ──
  if (action === 'ai_assist') {
    const { systemPrompt, userPrompt } = payload
    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    return Response.json({ text: msg.content[0].text })
  }

  // ── Generar informe integrado ──
  if (action === 'generate_report') {
    const { caseData } = payload
    let fullContent = ''
    for (const sp of caseData.specialists || []) {
      const sec = caseData.sections?.[sp.id]
      if (sec?.content) {
        fullContent += `\n\n=== ${sp.role}: ${sp.name} ===\n${sec.content}`
      }
    }

    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: `Eres un especialista redactor de informes clínicos diagnósticos. 
Integra las secciones de los distintos especialistas en un informe coherente y profesional.
Devuelve SOLO JSON válido, sin markdown ni backticks, con esta estructura exacta:
{
  "datosGenerales": "string",
  "motivacion": "string", 
  "instrumentos": ["string"],
  "secciones": [{"titulo": "string", "contenido": "string"}],
  "conclusion": "string",
  "derivaciones": {"familiar": "string", "clinico": "string", "universitario": "string"},
  "especialistas": [{"nombre": "string", "especialidad": "string", "acreditacion": "string"}]
}`,
      messages: [{
        role: 'user',
        content: `PACIENTE: ${caseData.patientName}
Nacimiento: ${caseData.dob} | Evaluación: ${caseData.evaluationDate}
Residencia: ${caseData.residence} | Escolaridad: ${caseData.escolaridad}
Informante: ${caseData.informant}
Motivo: ${caseData.motivacion}

APORTACIONES:
${fullContent}`
      }]
    })

    let report
    try {
      report = JSON.parse(msg.content[0].text.replace(/```json|```/g, '').trim())
    } catch {
      return Response.json({ error: 'Error al parsear respuesta de Claude' }, { status: 500 })
    }
    return Response.json({ report })
  }

  // ── Generar archivo .docx ──
  if (action === 'generate_docx') {
    const { report, caseData } = payload

    const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
    const borders = { top: border, bottom: border, left: border, right: border }

    const h1 = (text) => new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 320, after: 160 },
      children: [new TextRun({ text, bold: true, size: 28, font: 'Arial', color: '1E3A6E' })]
    })

    const h2 = (text) => new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '4F8EF7', space: 4 } },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, font: 'Arial', color: '2E4A8A' })]
    })

    const body = (text) => new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text: text || '', size: 22, font: 'Arial' })]
    })

    const space = () => new Paragraph({ children: [new TextRun('')] })

    const children = [
      // Encabezado
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: 'INFORME DE EVALUACIÓN DIAGNÓSTICA', bold: true, size: 32, font: 'Arial', color: '1E3A6E' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 400 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '4F8EF7', space: 4 } },
        children: [new TextRun({ text: caseData.patientName, bold: true, size: 26, font: 'Arial', color: '2E4A8A' })]
      }),
      space(),

      h2('Datos Generales'),
      body(report.datosGenerales),
      space(),

      h2('Motivo de Evaluación'),
      body(report.motivacion),
      space(),

      h2('Instrumentos Aplicados'),
      ...(report.instrumentos || []).map(i => new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [new TextRun({ text: i, size: 22, font: 'Arial' })]
      })),
      space(),

      // Secciones de resultados
      h1('RESULTADOS DE LA EVALUACIÓN'),
      ...(report.secciones || []).flatMap(s => [
        h2(s.titulo),
        body(s.contenido),
        space(),
      ]),

      // Conclusión
      h1('CONCLUSIÓN DIAGNÓSTICA'),
      new Paragraph({
        spacing: { before: 60, after: 60 },
        shading: { fill: 'EBF2FF', type: ShadingType.CLEAR },
        children: [new TextRun({ text: report.conclusion || '', size: 22, font: 'Arial' })]
      }),
      space(),

      // Derivaciones
      h1('DERIVACIONES Y SUGERENCIAS'),
      ...[
        ['Contexto Familiar', report.derivaciones?.familiar],
        ['Contexto Clínico / Terapéutico', report.derivaciones?.clinico],
        ['Contexto Universitario / Académico', report.derivaciones?.universitario],
      ].filter(([, v]) => v).flatMap(([title, content]) => [
        h2(title),
        body(content),
        space(),
      ]),

      // Firmas
      space(),
      space(),
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 4 } },
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: 'Equipo Evaluador', bold: true, size: 22, font: 'Arial', color: '2E4A8A' })]
      }),
      ...(report.especialistas || []).flatMap(e => [
        new Paragraph({ spacing: { before: 200, after: 20 }, children: [new TextRun({ text: '_'.repeat(40), color: 'AAAAAA' })] }),
        new Paragraph({ children: [new TextRun({ text: e.nombre, bold: true, size: 22, font: 'Arial' })] }),
        new Paragraph({ children: [new TextRun({ text: e.especialidad, size: 20, font: 'Arial', color: '555555' })] }),
        e.acreditacion ? new Paragraph({ children: [new TextRun({ text: e.acreditacion, size: 18, font: 'Arial', color: '888888', italics: true })] }) : null,
        space(),
      ]).filter(Boolean),
    ]

    const doc = new Document({
      numbering: {
        config: [{
          reference: 'bullets',
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }]
        }]
      },
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children,
      }]
    })

    const buffer = await Packer.toBuffer(doc)
    const base64 = Buffer.from(buffer).toString('base64')
    return Response.json({ docxBase64: base64, filename: `Informe_${caseData.patientName.replace(/\s+/g, '_')}.docx` })
  }

  return Response.json({ error: 'Acción no reconocida' }, { status: 400 })
}
