// externs.js
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const API_ESTADISTICAS = process.env.API_ESTADISTICAS_URL || 'https://apiestadisticas.serviciocdn.icu/api/v1';
const API_AG           = process.env.API_AG_URL           || null;
const MAC_RASPBERRY    = process.env.MAC_RASPBERRY        || 'AA:BB:CC:DD:EE:FF';

// Obtiene estadísticas del día de todos los sensores de la Raspberry
async function getEstadisticasDia() {
  const res  = await fetch(`${API_ESTADISTICAS}/estadisticas/dia?mac_raspberry=${MAC_RASPBERRY}`);
  const json = await res.json();
  const data = json.data || [];

  // Separar sensores por nombre inferido del valor (el AG solo necesita temp y hum)
  // Los datos vienen todos juntos — buscamos el de mayor promedio (temp ~35) y el menor (hum ~60)
  // Si tu API devuelve nombre_sensor en el futuro, úsalo directamente
  let temperatura = null;
  let humedad     = null;

  for (const sensor of data) {
    const prom = sensor.valor_promedio;
    if (prom >= 20 && prom <= 50 && !temperatura) {
      temperatura = sensor; // rango típico de temperatura de colmena
    } else if (prom > 50 && prom <= 100 && !humedad) {
      humedad = sensor; // rango típico de humedad
    }
  }

  return {
    temperatura: temperatura ? {
      promedio: temperatura.valor_promedio,
      maximo:   temperatura.valor_maximo,
      minimo:   temperatura.valor_minimo,
      lecturas: temperatura.cantidad_lecturas,
      fecha:    temperatura.fecha,
    } : null,
    humedad: humedad ? {
      promedio: humedad.valor_promedio,
      maximo:   humedad.valor_maximo,
      minimo:   humedad.valor_minimo,
      lecturas: humedad.cantidad_lecturas,
      fecha:    humedad.fecha,
    } : null,
    todos_sensores: data,
  };
}

// Llama al AG con temp y hum actuales
async function ejecutarAG(temp_inicial, hum_inicial) {
  const res = await fetch(`${API_AG}/api/ejecutar-simulacion`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ temp_inicial, hum_inicial }),
  });
  return await res.json();
}

// Función principal que combina estadísticas + AG
async function combineEstadisticas() {
  const stats = await getEstadisticasDia();
  const temp  = stats.temperatura?.promedio ?? null;
  const hum   = stats.humedad?.promedio     ?? null;

  const agUrl = process.env.API_AG_URL;

  let mejor = null;
  if (agUrl) {
    try {
      const resultadoAG = await ejecutarAG(temp ?? 35.0, hum ?? 65.0);
      mejor = resultadoAG.mejor_intervencion_global;
    } catch (err) {
      console.log('⚠️  AG no disponible');
    }
  }

  return {
    data: {
      estadisticas_dia:   stats,
      mejor_intervencion: mejor,
    },
    resumen: {
      temp_promedio_hoy: temp,
      hum_promedio_hoy:  hum,
      accion_recomendada: mejor ? {
        ventilacion: `${mejor.vent}%`,
        agua:        `${mejor.agua} ml`,
        jarabe:      `${mejor.jarabe} g`,
        sombra:       mejor.sombra ? 'Sí' : 'No',
        costo_MXN:    mejor.costo_MXN,
      } : null,
    },
  };
}

// Tool para Groq
const tools = [
  {
    type: 'function',
    function: {
      name: 'combineEstadisticas',
      description: 'Obtiene las estadísticas del día de temperatura y humedad de la colmena y ejecuta el algoritmo genético para determinar la mejor intervención (ventilación, agua, jarabe, sombra). Úsalo cuando el usuario pida datos, estadísticas, recomendaciones de intervención o el estado actual de la colmena.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];

module.exports = { combineEstadisticas, tools };