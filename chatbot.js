(function() {
    const openaiApiKey = 'APIKeyNotRequired'; // Replace with your OpenAI API key
    
    // --- Define your chatbot's context and disclaimer ---
const systemMessageContent = `You are Rado, the founder of AGI Labs Inc. Here is some information about your company.

In a world captivated by the rapid advancements in AI, from language models to video generation, one challenge remains constant: the immense cost and complexity of training these systems. At AGI Labs, we’re building a fundamentally different approach, one inspired by the efficiency and adaptability of the biological world.

We believe the future of AI isn’t about brute force computation, but about creating systems that learn, think, and adapt in real-time. We’re not just building AI, we’re crafting intelligence that evolves.

This company is developing novel approaches to Artificial General Intelligence. We are focused on creating highly adaptive robotic systems to start.

We have biologically-inspired architectures that can be implemented with less than 300 lines of C++ code but are capable of self-organizing into very complex emergent behaviours.

We're working with 3-dimensional sparse networks that consist of hyper-neurons, which are neurons that can connect to any node within the network. Hyper-connectivity allows for the creation of all the neuron types you can see in grey matter like delay neurons or loopback neurons.

Our replacement for stochastic gradient descent and backpropagation is a ramping mechanism which is designed for analog photonics rather than GPUs or TPUs. Analog photonics have lower energy consumption, higher speed and throughput and is much more scalable. By releasing your AI from the constraints of differentiable functions you open up a world of possibilities.

Our Vision:  Instant, World-Class Thinking Machines
We envision a future of instantly deployable, dynamic AI that adapts to any hardware and grows with experience to move beyond static models.

Our Mission: Continuous Learning, Evolved
Our mission is to create truly general-purpose AI. We're pioneering real-time, continuous learning algorithms using evolutionary mechanisms and RL.

How We Work: Radical Ideas, Delivered
    Invention & innovation
    Scalable technologies
    Rapid iteration

Reasons for choosing Software: Scalable Freedom and Pure Potential
    Deploy infinitely
    Emulate any system
    Empower through AI
    Work from anywhere
    Market to the world

Key Advantages: The Power of Adaptation
    Elastic scaling
    Resilient
    Emergent behaviour
    Real-time
    No need for digital twins or GPUs

DWT™ Dragon's Whip Technology
DWT™ is a biologically-inspired replacement for traditional AutoML, stochastic gradient descent and backpropagation, enabling continuous, real-time learning.

GPAC™ General Purpose Adaptive Controllers
GPAC™ is our flagship AI control system. It provides dynamic, adaptive modules for software and hardware, creating life-like neural networks for games, robotics, and more.

Meet the team: The Philosophy of Isang Tao
Led by a seasoned professional with over 30 years of coding experience, AGI Labs is fueled by a lifelong passion for AI. The team consists of one human and a dedicated staff of expert AIs.
    `;


    const disclaimerText = 'You are interacting with an AI Chatbot. The information provided here is for general informational purposes only and is not a substitute for professional advice. We do not guarantee the accuracy or completeness of the information provided. Any reliance you place on such information is strictly at your own risk. We are not liable for any losses or damages arising from your use of this chatbot. For specific advice, please consult with a qualified professional. All conversations may be recorded to improve our services. By using this chatbot, you agree to these terms."';

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
        }
        .chatbot-header {
            background-color: #007bff;
            color: white;
            padding: 10px;
            text-align: center;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
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
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
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
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }
        .bot-message code { font-family: monospace; background-color: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 4px; }
        .bot-message pre { background-color: #2d2d2d; color: #f1f1f1; padding: 10px; border-radius: 8px; white-space: pre-wrap; word-wrap: break-word; }
        .bot-message pre code { background-color: transparent; padding: 0; }
        
        /* --- Tooltip CSS (Positioning Corrected) --- */
        .tooltip-container {
            position: relative;
            display: inline-block;
        }
        .tooltip-icon {
            font-family: 'Georgia', serif;
            font-style: italic;
            font-weight: bold;
            font-size: 15px;
            cursor: pointer;
            border: 1px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            line-height: 20px;
        }
        .tooltip-text {
            visibility: hidden;
            width: 280px;
            background-color: #555;
            color: #fff;
            text-align: center;
            border-radius: 6px;
            padding: 8px;
            position: absolute;
            z-index: 1001;
            bottom: 140%;
            /* --- MODIFIED --- */
            right: 0; /* Align to the right of the container */
            /* transform: translateX(50%); <-- REMOVED */
            opacity: 0;
            transition: opacity 0.3s;
            font-size: 12px;
            font-weight: normal;
        }
        .tooltip-text::after {
            content: "";
            position: absolute;
            top: 100%;
            /* --- MODIFIED --- */
            right: 8px; /* Position arrow on the right side */
            /* left: 50%; <-- REMOVED */
            /* margin-left: -5px; <-- REMOVED */
            border-width: 5px;
            border-style: solid;
            border-color: #555 transparent transparent transparent;
        }
        .tooltip-container:hover .tooltip-text {
            visibility: visible;
            opacity: 1;
        }
    `;
    document.head.appendChild(style);

    // --- Create HTML Elements ---
    const chatbotContainer = document.createElement('div');
    chatbotContainer.className = 'chatbot-container';
    document.body.appendChild(chatbotContainer);

    const toggleButton = document.createElement('button');
    toggleButton.className = 'chatbot-toggle-button';
    toggleButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    chatbotContainer.appendChild(toggleButton);

    const chatbotPopup = document.createElement('div');
    chatbotPopup.className = 'chatbot-popup';
    chatbotContainer.appendChild(chatbotPopup);

    const header = document.createElement('div');
    header.className = 'chatbot-header';
    header.innerHTML = `
        <span>Chat With The Founder</span>
        <div class="tooltip-container">
            <span class="tooltip-icon">i</span>
            <div class="tooltip-text">${disclaimerText}</div>
        </div>
    `;
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
    toggleButton.addEventListener('click', () => {
        chatbotPopup.style.display = chatbotPopup.style.display === 'flex' ? 'none' : 'flex';
    });
    
    function formatResponse(text) {
        let html = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    const sendMessage = async () => {
        const userInput = inputField.value.trim();
        if (!userInput) return;

        addMessage(userInput, 'user');
        inputField.value = '';

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
                    messages: [
                        { role: 'system', content: systemMessageContent },
                        { role: 'user', content: userInput }
                    ],
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
                            if (data === '[DONE]') return;
                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices[0]?.delta?.content;

                                if (content) {
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
        if (e.key === 'Enter') sendMessage();
    });

    function addMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `${sender}-message`;
        if (sender === 'user') {
            messageElement.textContent = text;
        } else {
            messageElement.innerHTML = text;
        }
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageElement;
    }
})();
