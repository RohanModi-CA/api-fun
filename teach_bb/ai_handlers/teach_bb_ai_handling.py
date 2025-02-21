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

# Load the system instructions
with open("resources/bb_ai_prompt.txt", "r") as bb_ai_prompt:
    system_instruction = bb_ai_prompt.read()

# Choose a model
model = genai.GenerativeModel( # pyright: ignore[reportPrivateImportUsage]
        model_name='gemini-2.0-flash-lite-preview-02-05',
        generation_config=generation_config,
        system_instruction=system_instruction) 


def filter_response(inp_str):
    inp_str.replace(r"\newline", "")
    inp_str.replace("\n", "")
    return inp_str

def send_message(model, msg_str):
    response, this_chunk = "", ""
    for chunk in model.generate_content(msg_str, stream=True):
        this_chunk = filter_response(chunk.text)
        response += this_chunk
        #print(chunk.text, end="", flush=True)  # Print each chunk immediately
        # We use yield to make this a "Generator" Function
        yield this_chunk

def segment_input(msg_str: str):
    """
    This function takes in a lengthy, hopefully linebroken, string, and breaks it at appropropriate points, 
    for the teacher to handle, returning a dictionary, {full_msg:msg_str, segments=[str1,str2,etc]}.
    """
    
    """
    We break every NL_LIMIT newlines, assuming that sufficient characters were in that line. 
    Additionally, we would not have more than DM_LIMIT \[ \] entity within a segment.
    """

    NL_LIMIT = 3
    DM_LIMIT = 1
    current_DM = 0
    current_NL = 0
    char_limit = 300
    over_char_count = False
    end_on_overchar = ['\n', '. ']

    previous_segment_end_index = 0 # This index was *not* included in the last one.

    output = {"msg_str": msg_str, "segments": []}
    
    # We are going to walk through our string
    for index, char in enumerate(msg_str):
        # Check to see if we are at a closing \]
        if(msg_str[index-1:index+1] == r'\['):
            current_DM+=1
        elif(msg_str[index-1:index+1] == r'$$'):
            current_DM += 0.5 # We need two of these.
        # Check if we're at a newline
        if(msg_str[index]=='\n'):
            current_NL+=1 

        # Check if we are over the total limit
        if(index - previous_segment_end_index >= char_limit):
            over_char_count = True

        # Check if we're done.
        if ((current_DM >= DM_LIMIT or current_NL >= NL_LIMIT)
            or (over_char_count and msg_str[index] in end_on_overchar)):
            # Reset the counters
            current_DM, current_NL = 0,0 
            over_char_count = False

            # Add the segment. 
            output["segments"].append(msg_str[previous_segment_end_index: index + 1])
            previous_segment_end_index = index + 1 # That is where the next segment starts. 
    # Don't forget the final segment
    output["segments"].append(msg_str[previous_segment_end_index: ])



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
    print("test call")
    dict_out = segment_input(inp)
    for chunk in prompt_bb_ai(dict_out):
        print("chunk, ", chunk)
        yield chunk




