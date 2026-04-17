// public/client.js
document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const chatWindow = document.getElementById('chat-window');
  const sendButton = document.getElementById('send-button');
  const chipsContainer = document.getElementById('chips-container');

  let chatHistory = [];

  // Mensaje de bienvenida
  addMessageToChat('¡Bzzz! 🌻 Hola, soy Meli. ¿En qué puedo ayudarte hoy?', 'bot');

  // Función global para chips
  window.sendChip = (text) => {
    sendMessage(text);
  };

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;
    sendMessage(message);
  });

  async function sendMessage(message) {
    // Ocultar chips después del primer mensaje
    if (chipsContainer) {
      chipsContainer.style.display = 'none';
    }

    addMessageToChat(message, 'user');
    messageInput.value = '';
    sendButton.disabled = true;

    const loadingMessage = addMessageToChat('Meli está pensando...', 'loading');

    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          history: chatHistory,
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
  }

  function addMessageToChat(text, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);

    if (type === 'bot') {
      const nameSpan = document.createElement('span');
      nameSpan.classList.add('bot-name');
      nameSpan.textContent = 'Meli';
      messageElement.appendChild(nameSpan);
      const textNode = document.createTextNode(text);
      messageElement.appendChild(textNode);
    } else {
      messageElement.textContent = text;
    }

    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return messageElement;
  }
});