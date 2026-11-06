import os
from google import genai
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required
import logging
import markdown2
from google.genai import types

# Add logging
logger = logging.getLogger(__name__)

def home(request):
    return render(request, "index.html")

@login_required
def chat(request):
    return render(request, "chat.html")

@login_required
def chatAPI(request):
    if request.method == "POST":
        prompt = request.POST.get("prompt", "")
        if not prompt:
            return JsonResponse({"error": "No prompt provided"}, status=400)

        # 1. Use the new SDK's configuration object
        config = types.GenerateContentConfig(
            temperature=1,
            top_p=0.95,
            top_k=40,
            max_output_tokens=8192,
            response_mime_type="text/plain",
        )

        try:
            # 2. Initialize the Client with your API key
            client = genai.Client(api_key=os.environ.get("GOOGLE_GENAI_API_KEY"))

            # 3. Load chat history from Django session
            chat_history = request.session.get("chat_history", [])

            # 4. Safety check: Clear history if it's using the old SDK's formatting 
            # (Old SDK used strings in parts, new SDK uses {"text": prompt} dicts)
            if chat_history:
                first_msg = chat_history[0]
                if "content" in first_msg or (first_msg.get("parts") and isinstance(first_msg["parts"][0], str)):
                    chat_history = []
                    request.session["chat_history"] = []

            # 5. Create the chat session
            chat_session = client.chats.create(
                model="gemini-2.5-flash",
                config=config,
                history=chat_history
            )

            # 6. Send the prompt
            response = chat_session.send_message(prompt)

            # 7. Sync the complete chat history back to the Django session
            # We iterate through the SDK's history and convert it to JSON-serializable dicts
            updated_history = []
            for msg in chat_session.get_history():
                updated_history.append({
                    "role": msg.role,
                    "parts": [{"text": part.text} for part in msg.parts if part.text]
                })
            
            request.session["chat_history"] = updated_history

            # 8. Convert to HTML and return
            html_reply = markdown2.markdown(response.text.strip())
            return JsonResponse({"message": html_reply})

        except Exception as e:
            # logger.error(f"Error occurred: {e}") # Ensure logger is imported at the top of your file
            return JsonResponse({"error": f"Error processing request: {str(e)}"}, status=500)

    return HttpResponse("Bad Request", status=400)
