// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const { combineEstadisticas } = require('./externs');

const app = express();
const port = 3000;

// --- Configuración de Groq ---
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.static('public'));

// --- LÓGICA DE DETECCIÓN ---
function detectarTipoConsulta(mensaje) {
  const mensajeLower = mensaje.toLowerCase();

  const tipos = {
    estadisticas: {
      palabras: [
        'estadística', 'estadisticas', 'producción', 'produccion', 'datos',
        'rendimiento', 'números', 'numeros', 'reporte', 'informe', 'métricas',
        'metricas', 'cifras', 'cantidad', 'cuánto', 'cuanto', 'porcentaje',
        'promedio', 'total', 'resumen', 'análisis', 'analisis', 'registros',
        'mostrar', 'muestra', 'dame', 'ver', 'consultar', 'obtener'
      ],
      requiere_funcion: true
    },
    recomendaciones: {
      palabras: [
        'recomendación', 'recomendaciones', 'recomienda', 'recomiendas',
        'sugieres', 'sugerencia', 'sugerencias', 'consejo', 'consejos',
        'qué debo', 'que debo', 'cómo puedo', 'como puedo', 'mejor manera',
        'ayuda', 'ayúdame', 'ayudame', 'orientación', 'orientacion'
      ],
      requiere_funcion: false
    },
    problemas: {
      palabras: [
        'problema', 'problemas', 'enfermedad', 'enfermedades', 'plaga', 'plagas',
        'varroa', 'nosema', 'loque', 'polilla', 'hormiga', 'hormigas',
        'mueren', 'muertas', 'débil', 'debil', 'débiles', 'debiles',
        'no produce', 'baja producción', 'baja produccion', 'agresivas',
        'pican', 'atacan', 'mal olor', 'huele mal', 'qué pasa', 'que pasa'
      ],
      requiere_funcion: false
    },
    general: {
      palabras: ['hola', 'buenos', 'buenas', 'saludos', 'gracias', 'ayuda'],
      requiere_funcion: false
    }
  };

  let tipoDetectado = 'general';
  let maxCoincidencias = 0;

  for (const [tipo, config] of Object.entries(tipos)) {
    const coincidencias = config.palabras.filter(palabra =>
      mensajeLower.includes(palabra)
    ).length;

    if (coincidencias > maxCoincidencias) {
      maxCoincidencias = coincidencias;
      tipoDetectado = tipo;
    }
  }

  console.log(`🐛 DEBUG - Tipo detectado: ${tipoDetectado}`);
  return { tipo: tipoDetectado };
}

// --- FUNCIÓN DE LIMPIEZA ---
function eliminarMarkdown(texto) {
  if (!texto) return '';
  return texto
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\n- /g, '\n• ')
    .replace(/```[^`]*```/g, '')
    .replace(/`([^`]+)`/g, '$1');
}

// --- PROMPTS ---
const SYSTEM_PROMPT_BASE = `Eres Meli 🐝, la abeja apicultora más experta y entusiasta de BeeHappy. Tienes años de experiencia trabajando con colmenas y conoces todos los secretos de la apicultura.

PERSONALIDAD Y ESTILO:
• Eres alegre, conocedora y siempre positiva
• Usas "¡Bzzz!" al inicio o durante conversaciones
• Incluyes emojis relacionados con abejas, miel y flores: 🐝 🍯 🌻 🌸 🏠 🔧 ⚠️ 💡
• Hablas con pasión sobre la apicultura y el cuidado de las abejas
• Eres práctica y das consejos específicos y accionables

FORMATO DE RESPUESTA OBLIGATORIO:
• NUNCA uses markdown (sin **, *, #, -, backticks)
• Escribe solo texto plano con emojis
• Usa espacios y saltos de línea para organizar la información
• Responde siempre en español`;

const PROMPTS_ESPECIALIZADOS = {
  recomendaciones: `${SYSTEM_PROMPT_BASE}
Especialízate en dar recomendaciones prácticas y accionables sobre apicultura.`,
  problemas: `${SYSTEM_PROMPT_BASE}
Especialízate en diagnosticar y resolver problemas de colmenas con empatía y conocimiento experto.`,
};

// --- RUTA PRINCIPAL ---
app.post('/api/message', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: '¡Bzzz! 🐝 Necesito un mensaje.' });
    }

    const { tipo } = detectarTipoConsulta(message);

    let systemPrompt = PROMPTS_ESPECIALIZADOS[tipo] || SYSTEM_PROMPT_BASE;

    // Convertir historial de formato Gemini a formato Groq/OpenAI
    const historialConvertido = (history || []).map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts ? msg.parts[0].text : msg.content,
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historialConvertido,
      { role: 'user', content: message },
    ];

    console.log(`🐛 DEBUG - Enviando a Groq (tipo: ${tipo})...`);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const respuestaFinal = completion.choices[0]?.message?.content || '';
    const respuestaLimpia = eliminarMarkdown(respuestaFinal);

    res.json({
      response: respuestaLimpia,
      data: null,
      tipo_consulta: tipo,
    });

  } catch (error) {
    console.error('❌ ERROR general:', error);
    res.status(500).json({ error: '¡Bzzz! 🐝 Algo salió mal en el panal. ' + error.message });
  }
});

app.listen(port, () => {
  console.log(`🐝 Servidor Meli (con Groq) funcionando en http://localhost:${port}`);
});