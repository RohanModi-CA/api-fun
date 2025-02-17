from flask import Flask, Response, request, jsonify, render_template
from flask_cors import CORS
import ai_handling
import subprocess

cauchy = r"""*Proof (of the theorem):*
    (⇒) *If $(x_n)$ is convergent, then it is a Cauchy sequence.*

    Assume that the sequence $(x_n)$ converges to a limit $L$.  This means that for every $\epsilon > 0$, there exists an $N$ such that if $n > N$, then $|x_n - L| < \epsilon/2$.

    Now, let $m, n > N$.  Then we have:

    $|x_m - L| < \epsilon/2$ and $|x_n - L| < \epsilon/2$

    Using the triangle inequality:

    $|x_m - x_n| = |x_m - L + L - x_n| \le |x_m - L| + |L - x_n| = |x_m - L| + |x_n - L| < \epsilon/2 + \epsilon/2 = \epsilon$.

    Therefore, if $(x_n)$ converges, it is a Cauchy sequence.

    (⇐) *If $(x_n)$ is a Cauchy sequence, then it is convergent.*

    This direction is more involved and relies on the completeness of the real numbers.  Here's a sketch of the proof:

    1.  *Boundedness:* First, we show that every Cauchy sequence is bounded.  Since $(x_n)$ is Cauchy, for $\epsilon = 1$, there exists an $N$ such that for all $m, n > N$, $|x_m - x_n| < 1$.  In particular, for all $n > N$, $|x_n - x_{N+1}| < 1$, which implies $|x_n| < |x_{N+1}| + 1$.
        Let $M = \max\{|x_1|, |x_2|, \dots, |x_N|, |x_{N+1}| + 1\}$. Then $|x_n| \le M$ for all $n$.  Therefore, $(x_n)$ is bounded.

    2.  *Bolzano-Weierstrass Theorem:* Since $(x_n)$ is bounded, by the Bolzano-Weierstrass Theorem, it has a convergent subsequence $(x_{n_k})$ that converges to some limit $L$.

    3.  *Convergence of the whole sequence:* We need to show that the *entire* sequence $(x_n)$ converges to $L$.  Let $\epsilon > 0$.  Since $(x_n)$ is Cauchy, there exists an $N_1$ such that for all $m, n > N_1$, $|x_m - x_n| < \epsilon/2$.
        Since $(x_{n_k})$ converges to $L$, there exists an $N_2$ such that for all $n_k > N_2$, $|x_{n_k} - L| < \epsilon/2$.

        Let $N = \max\{N_1, N_2\}$.  Then for any $n > N$, we can find an $n_k > N$ (since $(n_k)$ is a subsequence and goes to infinity).  Therefore, we have:

        $|x_n - L| = |x_n - x_{n_k} + x_{n_k} - L| \le |x_n - x_{n_k}| + |x_{n_k} - L| < \epsilon/2 + \epsilon/2 = \epsilon$.

        Thus, for every $\epsilon > 0$, there exists an $N$ such that for all $n > N$, $|x_n - L| < \epsilon$.  This means that $(x_n)$ converges to $L$.

    Therefore, if $(x_n)$ is a Cauchy sequence, it converges.  This completes the proof of the theorem.

    **Key Takeaway:** The completeness of the real numbers is crucial for the "Cauchy implies convergent" direction. This theorem is not true in all metric spaces. For example, the sequence $(1, 1.4, 1.41, 1.414, ...)$ in the rational numbers (approximating $\sqrt{2}$) is a Cauchy sequence, but it does not converge to a rational number.
     """


app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

@app.route('/')  # Add this route!
def index():
    return render_template('teach_bb.html')  # Assuming teach_bb.html is in a folder named 'templates'

@app.route('/update_blackboard', methods=['POST'])
def update_blackboard():
    data = request.get_json()
    text_to_process = data.get('text', '')
    processed_text = process_text(text_to_process)
    #return jsonify({'equation': processed_text})

def process_text(text):
    for response in ai_handling.test_call(cauchy):
        print("Responded. ")
        yield f"data: {response.replace("\n","")}\n\n"

    #result = subprocess.run(['python', 'process.py', text], capture_output=True, text=True)
    #return result.stdout.strip()


@app.route('/stream')
def stream():
    print("e")
    return Response(process_text(""), mimetype="text/event-stream")

if __name__ == '__main__':
    app.run(debug=True)
