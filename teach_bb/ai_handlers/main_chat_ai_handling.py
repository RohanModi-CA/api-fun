import os
from dotenv import load_dotenv
import google.generativeai as genai
from google.ai.generativelanguage_v1beta.types import content
from google.generativeai.generative_models import ChatSession

# Load environment variables
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

# Configure the API key
genai.configure(api_key=api_key) # pyright: ignore[reportPrivateImportUsage]

# Create the model
generation_config = {
  "temperature": 1,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192,
  "response_mime_type": "text/plain",
}

# Load the system instructions
with open("resources/main_chat_ai_prompt.txt", "r") as main_chat_ai_prompt:
    system_instruction = main_chat_ai_prompt.read()

# Choose a model
model = genai.GenerativeModel( # pyright: ignore[reportPrivateImportUsage]
        model_name='gemini-2.0-flash',
        generation_config=generation_config,
        system_instruction=system_instruction) 


def main_chat_init_chat():
    return model.start_chat()

def main_chat_send_message(chat: ChatSession, inp_str: str):
    response = chat.send_message(inp_str,stream=True)
    for chunk in response:
        response = chunk.text
        print(response)
        yield f"data: {response.replace('\n', '')}\n\n"
    yield f"data: main_chat_end_of_message\n\n!"

