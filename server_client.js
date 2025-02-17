require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const multer = require('multer'); // For handling file uploads
const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require("@google/generative-ai");
const { v4: uuidv4 } = require('uuid');
const { GoogleAIFileManager } = require("@google/generative-ai/server"); // Import file manager
const fs = require('fs').promises;  // Use the promise-based fs module
const path = require('path');
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is not set. Please set it.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey); // Initialize file manager
const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

const app = express();
const port = 3000;

// Configure Multer for file uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/'); // Create an "uploads" folder in your project root
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    })
});

app.use(bodyParser.json());
app.use(express.static('.'));
app.use(express.static('uploads')); // Serve the "uploads" directory

// Create the uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Store chat histories in memory, keyed by session ID
const chatHistories = {};

// Helper functions for file upload and processing (asynchronous)
async function uploadAndProcessFile(filePath, mimeType) {
    try {
        const uploadResult = await fileManager.uploadFile(filePath, {
            mimeType,
            displayName: path.basename(filePath),
        });
        const file = uploadResult.file;
        console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
        return file;
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error; // Re-throw to be handled by the calling function
    }
}

async function waitForFileProcessing(fileName) {
    console.log("Waiting for file processing...");
    let file;
    try {
        file = await fileManager.getFile(fileName);
        while (file.state === "PROCESSING") {
            console.log("."); // Polling indicator
            await new Promise((resolve) => setTimeout(resolve, 10_000)); // 10-second poll
            file = await fileManager.getFile(fileName);
        }
        if (file.state !== "ACTIVE") {
            throw new Error(`File ${fileName} failed to process. State: ${file.state}`);
        }
    } catch (error) {
        console.error("Error waiting for file processing:", error);
        throw error;
    }
    console.log("...file ready\n");
    return file;
}


app.post("/api/chat", upload.single('file'), async (req, res) => { //  Accept file uploads via the 'file' field
    const message = req.body.message;
    let sessionId = req.body.sessionId;
    let fileInfo = null;

    if (!sessionId) {
        sessionId = uuidv4();
        console.log(`Generated new session ID: ${sessionId}`);
        chatHistories[sessionId] = [];
    } else {
        console.log(`Using existing session ID: ${sessionId}`);
        if (!chatHistories[sessionId]) {
            chatHistories[sessionId] = [];
        }
    }

    const history = chatHistories[sessionId];

    try {
        if (req.file) {
            // File was uploaded
            const filePath = req.file.path;
            const mimeType = req.file.mimetype;
            console.log(`Uploaded file: ${filePath} with MIME type: ${mimeType}`);

            const uploadedFile = await uploadAndProcessFile(filePath, mimeType);
            const processedFile = await waitForFileProcessing(uploadedFile.name);

            fileInfo = {
                mimeType: processedFile.mimeType,
                fileUri: processedFile.uri,
            };

            // Clean up the uploaded file (optional, but good practice)
            // await fs.unlink(filePath); // Delete the file from the server
            //console.log(`Deleted local file: ${filePath}`);


        }

        // Create chat model
        const chat = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: "If talking about math, use latex-formatting, and be sure to utilize display-math \\[ \\] to put math on its own line when needed to ensure Readability and clarity, the main goal.",
        }).startChat({
            generationConfig,
            history: history,
        });


        let parts = [{ text: message }];
        if (fileInfo) {
            parts.push({ fileData: fileInfo }); // Add the file to the parts
        }

        console.log(`Session ${sessionId} history length before new message: ${history.length}`);
        const streamingResult = await chat.sendMessageStream({
            parts,
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Session-ID', sessionId);

        let fullResponse = '';

        for await (const chunk of streamingResult.stream) {
            const text = chunk.text();
            fullResponse += text;
            res.write(text);
        }

        history.push({ role: 'user', parts: parts });
        history.push({ role: 'model', parts: [{ text: fullResponse }] });

        console.log(`Session ${sessionId} history length after new message: ${history.length}`);

        res.end();

    } catch (error) {
        console.error("Error in /api/chat:", error);
        res.status(500).send("Failed to generate response");
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
