// testGen.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Iniciamos la IA con nuestra clave del .env
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function runTest() {
  console.log('🐝 ¡Bzzz! Probando una sola generación de contenido...');

  try {
    // 2. Usamos el modelo más estable y común: "gemini-1.0-pro"
    // (El "gemini-2.0-flash" de tu ejemplo puede no ser un modelo público real)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.0-pro",
    });

    // 3. El prompt de tu ejemplo
    const prompt = "Explain how AI works"; // "Explain how AI works"

    console.log(`Pidiendo a Google: "${prompt}"...`);

    // 4. Hacemos la llamada para generar contenido
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('---------------------------------');
    console.log('✅ ¡ÉXITO! Google respondió:');
    console.log('---------------------------------');
    console.log(text);

  } catch (e) {
    console.log('---------------------------------');
    console.error('❌ ¡FALLÓ! Este es el error:');
    console.error(e.message);
    console.log('---------------------------------');

    if (e.message.includes('404')) {
      console.log("👉 Veredicto: Es un 404. El nombre 'gemini-1.0-pro' TAMPOCO se encuentra.");
      console.log("👉 Intenta cambiarlo por 'models/gemini-1.5-pro-latest' en este mismo archivo y prueba de nuevo.");
    
    } else if (e.message.includes('400') || e.message.includes('API key')) {
      console.log("👉 Veredicto: Es un 400. Esto es casi 100% seguro un problema con tu API Key.");
      console.log("👉 Vuelve a generar una NUEVA clave en aistudio.google.com y pégala en .env");
    
    } else {
        console.log("👉 Veredicto: Es un error inesperado.");
    }
  }
}

runTest();