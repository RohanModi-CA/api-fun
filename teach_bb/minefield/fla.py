from flask import Flask, render_template, request, Response
import time

app = Flask(__name__)

def time_generator(text):
    """
    A generator that yields a formatted string with user input and current time.
    """
    while True:
        current_time = time.strftime("%Y-%m-%d %H:%M:%S")
        yield f"You wrote: {text} and it is now {current_time}<br>"
        time.sleep(1)  # Wait for 1 second

@app.route('/', methods=['GET', 'POST'])
def index():
    """
    Handles the main page rendering and form submission.
    """
    if request.method == 'POST':
        user_text = request.form['user_text']
        return Response(time_generator(user_text), mimetype='text/html')
    return render_template('index.html')


if __name__ == '__main__':
    app.run(debug=True, port=5001)
