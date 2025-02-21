// script.js
document.addEventListener('DOMContentLoaded', () => {
    const messageContainer = document.getElementById('messageContainer');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chat_container = document.getElementById('chat-container');
    const blackboard_container = document.getElementById('blackboard_container');
  
	var ai_message_divs = []
	var received_chunks = ["main_chat_end_of_message"]
	var chunks_since_end_str = ""

    let eventSource = null;



	function update_user_Message(text)
	{

		const newUserMessageDiv = document.createElement('div');
		newUserMessageDiv.classList.add('message');
		newUserMessageDiv.classList.add('user-message');
		newUserMessageDiv.textContent = text;
		messageContainer.appendChild(newUserMessageDiv);
	}

	async function update_AI_Message(text) {
		/* Check to see if we are starting a new message */
		if (received_chunks[received_chunks.length - 1] == "main_chat_end_of_message")
		{
			const newMessageDiv = document.createElement('div');
			newMessageDiv.classList.add('message');
        	newMessageDiv.classList.add('server-message');

			const office_hours_button = document.createElement('button');
			office_hours_button.classList.add('office-hours-button');

      office_hours_button.addEventListener('click', async function ()
      {
        //chat_container.classList.toggle('left_close');
        chat_container.classList.add('hidden');
        blackboard_container.classList.remove('hidden');
        await fetch(`/teach_bb_set_initial_message?initial_message=${chunks_since_end_str}`);

      });

			office_hours_button.textContent = "Go to Office Hours.";
			messageContainer.appendChild(office_hours_button);


			chunks_since_end_str = "";
      messageContainer.appendChild(newMessageDiv);
			ai_message_divs.push(newMessageDiv);
		}

		received_chunks.push(text);
		const which_message_div = ai_message_divs[ai_message_divs.length - 1];

		// Don't print the indicator
		if (!(text === "main_chat_end_of_message"))
		{
			chunks_since_end_str += text;
			which_message_div.textContent = chunks_since_end_str;
		}
	
		// Render KaTeX
		renderMathInElement(which_message_div, 
		{
			delimiters: [
				{ left: '$$', right: '$$', display: true },
				{ left: '$', right: '$', display: false },
				{ left: '\\(', right: '\\)', display: false },
				{ left: '\\[', right: '\\]', display: true }
			],
			throwOnError: false
		}); // katex delimiters
		which_message_div.innerHTML = marked.parse(which_message_div.innerHTML)
	
		messageContainer.scrollTop = messageContainer.scrollHeight;
	}

    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        update_user_Message(message);
        
        // Close existing SSE connection if any
        if (eventSource) {
            eventSource.close();
        }

        // Create new SSE connection
        eventSource = new EventSource(`/main_chat_message?message=${encodeURIComponent(message)}`);
        
        eventSource.onmessage = (event) => {
            update_AI_Message(event.data);
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        // Clear input
        messageInput.value = '';
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
