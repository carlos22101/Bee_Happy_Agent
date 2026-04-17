// externs.js

// 1. La función que simula la obtención de datos
async function combineEstadisticas() {
  console.log("🐝 FUNCIÓN: combineEstadisticas() llamada");
  // Simulación de una llamada a base de datos
  // En una app real, aquí harías tu fetch a tu API_ESTADISTICA
  const mockData = {
    data: [
      { colmena_id: "C-001", produccion_miel_kg: 5.2, salud: "fuerte", poblacion: 50000 },
      { colmena_id: "C-002", produccion_miel_kg: 2.1, salud: "debil", poblacion: 15000 },
      { colmena_id: "C-003", produccion_miel_kg: 4.8, salud: "fuerte", poblacion: 48000 },
    ],
    resumen: {
      total_colmenas: 3,
      produccion_total_kg: 12.1,
      colmenas_debiles: 1,
    }
  };
  return mockData;
}

// 2. La definición de la herramienta para la API de Gemini
// Es un array de objetos FunctionDeclaration
const tools = [
  {
    functionDeclarations: [
      {
        name: "combineEstadisticas",
        description: "Obtiene las estadísticas de producción y salud de todas las colmenas del apiario. Úsalo siempre que el usuario pida datos, números, reportes o un resumen de la producción.",
        parameters: {
          type: "OBJECT",
          properties: {}, // No requiere parámetros de entrada
        },
      },
    ],
  },
];

module.exports = { combineEstadisticas, tools };