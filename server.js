// server.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const Groq    = require('groq-sdk');
const { combineEstadisticas, tools } = require('./externs');

const app  = express();
const port = 3000;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.static('public'));

// --- DETECCIÓN DE TIPO ---
function detectarTipoConsulta(mensaje) {
  const mensajeLower = mensaje.toLowerCase();

  const tipos = {
    estadisticas: {
      palabras: [
        'estadística', 'estadisticas', 'producción', 'produccion', 'datos',
        'rendimiento', 'números', 'numeros', 'reporte', 'informe', 'métricas',
        'metricas', 'cifras', 'cantidad', 'cuánto', 'cuanto', 'porcentaje',
        'promedio', 'total', 'resumen', 'análisis', 'analisis', 'registros',
        'mostrar', 'muestra', 'dame', 'ver', 'consultar', 'obtener',
        'temperatura', 'humedad', 'sensor', 'colmena', 'estado',
      ],
      requiere_funcion: true
    },
    recomendaciones: {
      palabras: [
        'recomendación', 'recomendaciones', 'recomienda', 'recomiendas',
        'sugieres', 'sugerencia', 'sugerencias', 'consejo', 'consejos',
        'qué debo', 'que debo', 'cómo puedo', 'como puedo', 'mejor manera',
        'ayuda', 'ayúdame', 'ayudame', 'orientación', 'orientacion',
        'intervención', 'intervencion', 'qué hacer', 'que hacer',
        'ventilación', 'ventilacion', 'agua', 'jarabe', 'sombra',
      ],
      requiere_funcion: true  // también usa el AG para recomendaciones
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

  let tipoDetectado   = 'general';
  let maxCoincidencias = 0;
  let requiereFuncion  = false;

  for (const [tipo, config] of Object.entries(tipos)) {
    const coincidencias = config.palabras.filter(p => mensajeLower.includes(p)).length;
    if (coincidencias > maxCoincidencias) {
      maxCoincidencias = coincidencias;
      tipoDetectado    = tipo;
      requiereFuncion  = config.requiere_funcion;
    }
  }

  console.log(`🐛 DEBUG - Tipo: ${tipoDetectado} | Requiere función: ${requiereFuncion}`);
  return { tipo: tipoDetectado, requiere_funcion: requiereFuncion };
}

// --- LIMPIEZA MARKDOWN ---
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

const SYSTEM_PROMPT_DATOS = `${SYSTEM_PROMPT_BASE}

CUANDO RECIBAS DATOS DE ESTADÍSTICAS Y AG:
• Menciona la temperatura y humedad promedio del día
• Explica la mejor intervención recomendada por el algoritmo genético en términos simples
• Indica el costo estimado en pesos mexicanos
• Si el estado es crítico, usa ⚠️ y sé más enfático
• Traduce los valores técnicos a lenguaje apícola natural
  - vent: ventilación de la colmena
  - agua: suministro de agua fresca
  - jarabe: alimentación con jarabe de azúcar
  - sombra: colocar protección solar
• Siempre termina con un consejo motivador 🌻`;

const PROMPTS_ESPECIALIZADOS = {
  recomendaciones: SYSTEM_PROMPT_DATOS,
  estadisticas:    SYSTEM_PROMPT_DATOS,
  problemas: `${SYSTEM_PROMPT_BASE}
Especialízate en diagnosticar y resolver problemas de colmenas con empatía y conocimiento experto.`,
};

// --- RUTA PRINCIPAL ---
app.post('/api/message', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: '¡Bzzz! 🐝 Necesito un mensaje.' });

    const { tipo, requiere_funcion } = detectarTipoConsulta(message);

    const systemPrompt = PROMPTS_ESPECIALIZADOS[tipo] || SYSTEM_PROMPT_BASE;

    // Convertir historial Gemini → Groq
    const historialConvertido = (history || []).map(msg => ({
      role:    msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts ? msg.parts[0].text : msg.content,
    }));

    const messages = [
      { role: 'system',    content: systemPrompt },
      ...historialConvertido,
      { role: 'user',      content: message },
    ];

    console.log(`🐛 DEBUG - Enviando a Groq (tipo: ${tipo}, función: ${requiere_funcion})...`);

    let respuestaFinal = '';
    let data = null;

    if (requiere_funcion) {
      // Primera llamada con tools habilitados
      const completion = await groq.chat.completions.create({
        model:       'llama-3.3-70b-versatile',
        messages:    messages,
        tools:       tools,
        tool_choice: 'auto',
        max_tokens:  2048,
        temperature: 0.7,
      });

      const choice     = completion.choices[0];
      const toolCalls  = choice.message.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        console.log(`🐝 INFO - Groq solicitó tool: ${toolCalls[0].function.name}`);

        // Ejecutar la función real
        const resultado = await combineEstadisticas();
        data = resultado.data;

        // Segunda llamada con el resultado del tool
        const followUp = await groq.chat.completions.create({
          model:      'llama-3.3-70b-versatile',
          max_tokens: 2048,
          temperature: 0.7,
          messages: [
            ...messages,
            { role: 'assistant', content: null, tool_calls: toolCalls },
            {
              role:         'tool',
              tool_call_id: toolCalls[0].id,
              content:      JSON.stringify(resultado),
            },
          ],
        });

        respuestaFinal = followUp.choices[0]?.message?.content || '';
      } else {
        respuestaFinal = choice.message?.content || '';
      }
    } else {
      // Respuesta directa sin tools
      const completion = await groq.chat.completions.create({
        model:       'llama-3.3-70b-versatile',
        messages:    messages,
        max_tokens:  1024,
        temperature: 0.7,
      });
      respuestaFinal = completion.choices[0]?.message?.content || '';
    }

    res.json({
      response:      eliminarMarkdown(respuestaFinal),
      data:          data,
      tipo_consulta: tipo,
    });

  } catch (error) {
    console.error('❌ ERROR general:', error);
    res.status(500).json({ error: '¡Bzzz! 🐝 Algo salió mal en el panal. ' + error.message });
  }
});

app.listen(port, () => {
  console.log(`🐝 Servidor Meli (Groq + AG + Estadísticas) en http://localhost:${port}`);
});