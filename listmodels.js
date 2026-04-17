// listModels.js (¡LA VERSIÓN 100% CORRECTA!)
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    console.log("🐝 ¡Bzzz! Conectando a Google para listar modelos...");
    
    //
    // ✅✅✅ ¡AQUÍ ESTÁ LA CORRECCIÓN! ✅✅✅
    //
    // Se llama directamente a 'genAI.listModels()'
    // ¡No se encadena con 'getGenerativeModel'!
    //
    const models = await genAI.listModels();
    
    console.log("✅ ¡ÉXITO! Estos son los modelos que tu API Key SÍ puede usar:");
    console.log("---------------------------------------------------");
    
    // 'models' es un iterador, lo convertimos a array para filtrarlo
    const allModels = (await models.all()).map(m => m);
    
    const usableModels = allModels.filter(m => 
      m.supportedGenerationMethods.includes("generateContent")
    );

    if (usableModels.length === 0) {
      console.log("No se encontraron modelos que soporten 'generateContent'.");
      console.log("Modelos disponibles (todos):");
      allModels.forEach(m => console.log(`• ${m.name}`));
    } else {
      usableModels.forEach(m => console.log(`• ${m.name}`));
    }

    console.log("---------------------------------------------------");
    console.log("🎯 ACCIÓN: Copia uno de estos nombres (ej: 'models/gemini-1.5-pro-latest') y pégalo en la línea 'model:' de tu 'server.js'");
    
  } catch(e) {
    console.error("❌ ERROR AL LISTAR MODELOS:", e.message);
    
    if (e.message.includes('400') || e.message.includes('401') || e.message.includes('API key')) {
        console.log("👉 Revisa que tu GOOGLE_API_KEY en el .env sea correcta y esté habilitada.");
    }
  }
}

run();