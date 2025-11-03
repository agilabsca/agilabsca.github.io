(function() {
    const openaiApiKey = 'APIKeyNotRequired'; // Replace with your OpenAI API key

    // --- Create and Inject CSS ---
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
            line-height: 1.4;
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
        /* Typing indicator styles */
        .typing-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px 0;
        }
        .typing-indicator span {
            height: 8px;
            width: 8px;
            background-color: #999;
            border-radius: 50%;
            display: inline-block;
            margin: 0 2px;
            animation: blink 1.4s infinite both;
        }
        .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }
        .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }
        @keyframes blink {
            0% { opacity: 0.2; }
            20% { opacity: 1; }
            100% { opacity: 0.2; }
        }
        /* Styles for formatted code */
        .bot-message code {
            font-family: monospace;
            background-color: rgba(0,0,0,0.05);
            padding: 2px 4px;
            border-radius: 4px;
        }
        .bot-message pre {
            background-color: #2d2d2d;
            color: #f1f1f1;
            padding: 10px;
            border-radius: 8px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .bot-message pre code {
            background-color: transparent;
            padding: 0;
        }
    `;
    document.head.appendChild(style);

    // --- Create HTML Elements ---
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

    // --- Chatbot Logic ---

    // Toggle chatbot visibility
    toggleButton.addEventListener('click', () => {
        chatbotPopup.style.display = chatbotPopup.style.display === 'flex' ? 'none' : 'flex';
    });
    
    // Function to convert basic markdown to HTML
    function formatResponse(text) {
        let html = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    // Handle sending messages
    const sendMessage = async () => {
        const userInput = inputField.value.trim();
        if (!userInput) return;

        addMessage(userInput, 'user');
        inputField.value = '';

        // Show typing indicator
        const indicatorHtml = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        const botMessageElement = addMessage(indicatorHtml, 'bot');
        let botMessageText = '';
        let isFirstChunk = true;

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
                botMessageElement.innerHTML = `Error: ${errorData.error.message}`;
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
                    buffer = lines.pop(); 

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
                                    // If it's the first chunk, remove the indicator
                                    if (isFirstChunk) {
                                        botMessageElement.innerHTML = '';
                                        isFirstChunk = false;
                                    }
                                    botMessageText += content;
                                    botMessageElement.innerHTML = formatResponse(botMessageText);
                                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                }
                            } catch (error) {
                                console.error('Could not parse stream data:', data, error);
                            }
                        }
                    }
                }
            };

            await processStream();

        } catch (error) {
            console.error('Error fetching OpenAI response:', error);
            botMessageElement.innerHTML = 'Sorry, an error occurred while connecting.';
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
        if (sender === 'user') {
            messageElement.textContent = text;
        } else {
            messageElement.innerHTML = text; // Allow HTML for bot messages
        }
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageElement;
    }
})();
