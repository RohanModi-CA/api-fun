import os
from dotenv import load_dotenv
import google.generativeai as genai
from google.ai.generativelanguage_v1beta.types import content

# Load environment variables
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

# Configure the API key
genai.configure(api_key=api_key) # pyright: ignore[reportPrivateImportUsage]

# Create the model
generation_config = {
      "temperature": 1.1,
      "top_p": 0.95,
      "top_k": 40,
      "max_output_tokens": 8192,
      "response_schema": content.Schema(
        type = content.Type.OBJECT,
        enum = [],
        required = ["Blackboard Written", "Spoken Lecture"],
        properties = {
          "Blackboard Written": content.Schema(
            type = content.Type.STRING,
          ),
          "Spoken Lecture": content.Schema(
            type = content.Type.STRING,
          ),
        },
      ),
      "response_mime_type": "application/json",
}

# Choose a model
model = genai.GenerativeModel( # pyright: ignore[reportPrivateImportUsage]
        model_name='gemini-1.5-flash-8b',
        generation_config=generation_config,
        system_instruction="You are a university lecturer, lecturing on the blackboard. I will send you your full lecture notes, what you have already said, and tell you which portion you are currently showing the class at this instant. We aim for fluidity, and clarity for the students. You are fluidly doing this, continuing from where you left off. Output what you would write on the blackboard for this portion, and the commentary of what you would audibly say to the students here. Remember, students don't want to read massive amounts of text on a blackboard. Typically, you would just write the equations, important details, manipulations, whatever, on the board, but the commentary is done aloud. For writing on the board, math should be written within $$ for inline or $$ $$ for multiline. For read aloud, write as you would speak. (So, for the spoken lecture you should say: integrate from 0 to 1, instead $of \\int_0^1$, and for the blackboard written you should do the opposite. Never include \\n or \\newlines anywhere. ") 


def send_message(model, msg_str):
    response = ""
    for chunk in model.generate_content(msg_str, stream=True):
        response += chunk.text
        # print(chunk.text, end="", flush=True)  # Print each chunk immediately
        # We use yield to make this a "Generator" Function
        yield chunk.text

def segment_input(msg_str: str):
    """
    This function takes in a lengthy, hopefully linebroken, string, and breaks it at appropropriate points, 
    for the teacher to handle, returning a dictionary, {full_msg:msg_str, segments=[str1,str2,etc]}.
    """
    
    output = {"msg_str": msg_str, "segments": []}

    # Initially, we will just chunk at 4 lines each.
    counter = 0
    split_string = msg_str.split("\n")
    for index, _ in enumerate(split_string):
        if ( (index % 4 == 0)  and  (index + 3) < len(split_string)):
            segment = split_string[index] + split_string[index+1] + split_string[index+2] + split_string[index+3]
            output["segments"].append(segment)
        if ( (index % 4 == 0)  and  (index + 3) >= len(split_string)):
            segment = ""
            num_to_add = len(split_string) - index
            for i in range(0,num_to_add):
                segment += split_string[index + i]
                output["segments"].append(segment)
    return output
    

def prompt_bb_ai(segmented_dict: dict):
    full_msg_preamble = "THIS IS THE FULL LECTURE, for Context: \n"
    segment_preamble = "\n ===== \n\n THIS IS THE PART YOU ARE CURRENTLY TEACHING\n\n"

    responses, response_str = "", ""
    for segment in segmented_dict["segments"]:
        if(responses != ""):
            response_str = "\n HERE IS WHAT YOU HAVE ALREADY SAID THIS LECTURE" + responses + "\n\n"

        prompt = full_msg_preamble + segmented_dict["msg_str"] + response_str + segment_preamble + segment
        recent_response = ""
        for chunk in send_message(model, prompt): # Iterate through the generator
            responses += chunk
            recent_response += chunk
        yield recent_response


def test_call(inp):
    dict_out = segment_input(inp)
    for chunk in prompt_bb_ai(dict_out):
        yield chunk




