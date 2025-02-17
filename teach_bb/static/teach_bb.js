document.addEventListener('DOMContentLoaded', function() {
    const updateButton = document.getElementById('server_req');
    const equationDiv = document.getElementById('equation');
	const closed_captions = document.getElementById('closed-captions');
    const textBox = document.getElementById('label');
	const next_sse_button = document.getElementById('next_sse');
	
	content_slides = [];
	which_slide_on = -1;
	generation_terminated = false;


	updateButton.addEventListener('click', function ()
	{
		updateButton.classList.add("hidden");
		next_sse_button.classList.remove("hidden");
		const eventSource = new EventSource("/stream");
		eventSource.onmessage = function(event)
		{
			const ai_message = JSON.parse(event.data);
			let this_slide = [];
			this_slide.push(ai_message["Blackboard Written"]);
			this_slide.push(ai_message["Spoken Lecture"]);

			console.log(ai_message["Blackboard Written"])

			content_slides.push(this_slide);
		}


		eventSource.onerror = function(error) 
		{
                console.error("Error", error);
                eventSource.close(); // Close connection on error
				generation_terminated = true;
		};
	}); // updateButton eventlistener

	next_sse_button.addEventListener('click', function ()
	{
		next_slide();
	}); // next_sse_button eventlistener


	function next_slide()
	{
		if(which_slide_on + 1 < content_slides.length)
		{
			which_slide_on += 1;
			equationDiv.textContent = content_slides[which_slide_on][0];
			closed_captions.textContent = content_slides[which_slide_on][1];
			renderMathInElement(equationDiv, {
				delimiters: [
					{ left: '$$', right: '$$', display: true },
					{ left: '$', right: '$', display: false },
					{ left: '\\(', right: '\\)', display: false },
					{ left: '\\[', right: '\\]', display: true }
				],
				throwOnError: false
			}); // katex delimiters
			renderMathInElement(closed_captions, {
				delimiters: [
					{ left: '$$', right: '$$', display: true },
					{ left: '$', right: '$', display: false },
					{ left: '\\(', right: '\\)', display: false },
					{ left: '\\[', right: '\\]', display: true }
				],
				throwOnError: false
			}); // katex delimiters
		}
		else if(!generation_terminated)
		{
			alert("Wait! We aren't ready yet!");
		}
		else
		{
		next_sse_button.classList.add('hidden');
		}		


		

	} // next_slide
});
