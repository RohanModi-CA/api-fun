// index_client.js
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const chatHistory = document.getElementById("chat-history");
const typingIndicator = document.getElementById("typing-indicator");
const fileInput = document.getElementById("file-input"); // Add this line

let sessionId = null;

sendButton.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        sendMessage();
    }
});

async function sendMessage() {
    const message = messageInput.value.trim();
    const file = fileInput.files[0]; // Get the selected file

    if (message || file) { // Allow sending if there's a message OR a file
        appendMessage("user", message || (file ? `Uploaded file: ${file.name}` : "")); // Display file name in chat

        messageInput.value = "";
        fileInput.value = ""; // Clear the file input
        typingIndicator.style.display = "block";

        const formData = new FormData();
        if (message) {
            formData.append("message", message);
        }
        if (file) {
            formData.append("file", file); // Append the file to the form data
        }
        if (sessionId) {
            formData.append("sessionId", sessionId);
        }

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                body: formData, // Use FormData for file uploads
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!sessionId) {
                sessionId = response.headers.get('Session-ID');
                console.log("Session ID received and stored:", sessionId);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponse = "";
            let aiMessageDiv = document.createElement("div");
            aiMessageDiv.classList.add("ai-message");
            chatHistory.appendChild(aiMessageDiv);

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                const chunk = decoder.decode(value);
                aiResponse += chunk;

                aiMessageDiv.textContent = aiResponse;

                renderMathInElement(aiMessageDiv, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });

                aiMessageDiv.innerHTML = marked.parse(aiMessageDiv.innerHTML);

                chatHistory.scrollTop = chatHistory.scrollHeight;
            }

        } catch (error) {
            console.error("Error sending message:", error);
            appendMessage("ai", "Error: Could not get response from AI.");
        } finally {
            typingIndicator.style.display = "none";
        }
    }
}

function appendMessage(sender, message) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add(sender === "user" ? "user-message" : "ai-message");

    messageDiv.textContent = message;

    renderMathInElement(messageDiv, {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
    });

    messageDiv.innerHTML = marked.parse(messageDiv.innerHTML);

    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}
