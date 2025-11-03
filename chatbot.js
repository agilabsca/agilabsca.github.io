(function() {
    const openaiApiKey = 'APIKeyNotRequired'; // Replace with your OpenAI API key

    // Create Style Element
    const style = document.createElement('style');
    style.innerHTML = `
        .chatbot-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
        }

        .chatbot-toggle-button {
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .chatbot-popup {
            display: none;
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 350px;
            max-height: 500px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            flex-direction: column;
            overflow: hidden;
        }

        .chatbot-header {
            background-color: #007bff;
            color: white;
            padding: 10px;
            text-align: center;
            font-weight: bold;
        }

        .chatbot-messages {
            flex-grow: 1;
            padding: 10px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }

        .chatbot-input-container {
            display: flex;
            padding: 10px;
            border-top: 1px solid #ddd;
        }

        .chatbot-input {
            flex-grow: 1;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 8px;
        }

        .chatbot-send-button {
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            margin-left: 10px;
            cursor: pointer;
        }

        .user-message, .bot-message {
            margin-bottom: 10px;
            padding: 8px 12px;
            border-radius: 18px;
            max-width: 80%;
            word-wrap: break-word;
        }

        .user-message {
            background-color: #007bff;
            color: white;
            align-self: flex-end;
        }

        .bot-message {
            background-color: #f1f1f1;
            color: #333;
            align-self: flex-start;
        }
    `;
    document.head.appendChild(style);

    // Create HTML Elements
    const chatbotContainer = document.createElement('div');
    chatbotContainer.className = 'chatbot-container';
    document.body.appendChild(chatbotContainer);

    const toggleButton = document.createElement('button');
    toggleButton.className = 'chatbot-toggle-button';
    toggleButton.innerHTML = '&#9998;'; // Pencil icon
    chatbotContainer.appendChild(toggleButton);

    const chatbotPopup = document.createElement('div');
    chatbotPopup.className = 'chatbot-popup';
    chatbotContainer.appendChild(chatbotPopup);

    const header = document.createElement('div');
    header.className = 'chatbot-header';
    header.textContent = 'Chat with us!';
    chatbotPopup.appendChild(header);

    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'chatbot-messages';
    chatbotPopup.appendChild(messagesContainer);

    const inputContainer = document.createElement('div');
    inputContainer.className = 'chatbot-input-container';
    chatbotPopup.appendChild(inputContainer);

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.className = 'chatbot-input';
    inputField.placeholder = 'Type your message...';
    inputContainer.appendChild(inputField);

    const sendButton = document.createElement('button');
    sendButton.className = 'chatbot-send-button';
    sendButton.textContent = 'Send';
    inputContainer.appendChild(sendButton);

    // Toggle chatbot visibility
    toggleButton.addEventListener('click', () => {
        chatbotPopup.style.display = chatbotPopup.style.display === 'flex' ? 'none' : 'flex';
    });

    // Handle sending messages
    const sendMessage = async () => {
        const userInput = inputField.value.trim();
        if (!userInput) return;

        addMessage(userInput, 'user');
        inputField.value = '';

        const botMessageElement = addMessage('', 'bot');
        let botMessageText = '';

        try {
            const response = await fetch('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiApiKey}`
                },
                body: JSON.stringify({
                    model: 'openai',
                    messages: [{ role: 'user', content: userInput }],
                    stream: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error from OpenAI API:', errorData);
                botMessageElement.textContent = `Error: ${errorData.error.message}`;
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            const processStream = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // Keep the last, possibly incomplete, line in the buffer

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.substring(6).trim();
                            if (data === '[DONE]') {
                                return;
                            }
                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices[0]?.delta?.content;
                                if (content) {
                                    botMessageText += content;
                                    botMessageElement.textContent = botMessageText;
                                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                }
                            } catch (error) {
                                console.error('Error parsing stream data:', error, 'Data:', data);
                            }
                        }
                    }
                }
            };

            await processStream();

        } catch (error) {
            console.error('Error fetching OpenAI response:', error);
            botMessageElement.textContent = 'Sorry, an error occurred.';
        }
    };

    sendButton.addEventListener('click', sendMessage);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function addMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `${sender}-message`;
        messageElement.textContent = text;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageElement;
    }
})();
