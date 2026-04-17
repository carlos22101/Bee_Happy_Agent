// public/client.js
document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const chatWindow = document.getElementById('chat-window');
  const sendButton = document.getElementById('send-button');

  // Historial en formato Gemini: role 'user' o 'model', con parts
  let chatHistory = [];

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    addMessageToChat(message, 'user');
    messageInput.value = '';
    sendButton.disabled = true;

    const loadingMessage = addMessageToChat('Meli está pensando... 🐝', 'loading');

    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          history: chatHistory,   // ✅ Historial activado
        }),
      });

      chatWindow.removeChild(loadingMessage);
      sendButton.disabled = false;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error del servidor');
      }

      const data = await response.json();
      addMessageToChat(data.response, 'bot');

      // ✅ Actualizar historial en formato Gemini
      chatHistory.push({ role: 'user',  parts: [{ text: message }] });
      chatHistory.push({ role: 'model', parts: [{ text: data.response }] });

    } catch (error) {
      console.error('Error:', error);
      if (chatWindow.contains(loadingMessage)) {
        chatWindow.removeChild(loadingMessage);
      }
      addMessageToChat(`¡Bzzz! Hubo un error: ${error.message}`, 'system');
      sendButton.disabled = false;
    }
  });

  function addMessageToChat(text, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    messageElement.textContent = text;
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return messageElement;
  }
});