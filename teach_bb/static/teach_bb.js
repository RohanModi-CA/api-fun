document.addEventListener('DOMContentLoaded', function() {
    const updateButton = document.getElementById('server_req');
    const equationDiv = document.getElementById('equation');
    const textBox = document.getElementById('label');

	/*updateButton.addEventListener('click', function() {
        // Use fetch to send a request to your Python server.
        const text = textBox.value;
        fetch('/update_blackboard', {  // Replace with your server endpoint.
            method: 'POST',  // Or 'GET' if appropriate (see server code).
            headers: {
                'Content-Type': 'application/json' // Important for sending JSON data
            },
            body: JSON.stringify({text: text}) // Send data as JSON
        })
        .then(response => response.json()) // Parse the JSON response
        .then(data => {
            // Update the blackboard content with the data from the server.
            equationDiv.textContent = data.equation; // Or use innerHTML if the data is HTML
            //If you want to render using katex, it is better to use the render function
            //katex.render(data.equation, equationDiv, {
            //    throwOnError: false
            //});
        })
        .catch(error => {
            console.error('Error:', error);
            equationDiv.textContent = "Error fetching data."; // Handle errors gracefully
        });
    });
	*/

	updateButton.addEventListener('click', function ()
	{
		const eventSource = new EventSource("/stream");
		console.log("bonhour");
		eventSource.onmessage = function(event)
		{
			console.log("respo");
			console.log(event.data);
			const ai_message = JSON.parse(event.data);
			equationDiv.textContent = ai_message["Blackboard Written"]
			console.log(ai_message)
			
		}
		eventSource.onerror = function(error) 
		{
                console.error("Error", error);
                eventSource.close(); // Close connection on error
			};

	});


});
