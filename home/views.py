import os
import bleach
import markdown2
from google import genai
from google.genai import types
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required
import logging

# Add logging
logger = logging.getLogger(__name__)

# Strict allowlist of safe HTML tags and attributes for LLM markdown rendering
ALLOWED_HTML_TAGS = list(set(list(bleach.sanitizer.ALLOWED_TAGS) + [
    'p', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'br',
    'span', 'blockquote', 'strong', 'em', 'b', 'i', 'u', 's', 'strike',
    'ul', 'ol', 'li', 'a',
]))

ALLOWED_HTML_ATTRIBUTES = {
    '*': ['class'],
    'a': ['href', 'title', 'target', 'rel'],
}

ALLOWED_URL_PROTOCOLS = ['http', 'https', 'mailto']

def render_markdown_safe(text: str) -> str:
    """
    Parses LLM markdown into HTML while guaranteeing full XSS protection.
    1. markdown2 converts fenced code blocks with language classes (highlightjs-lang).
    2. bleach sanitizes the HTML against a strict allowlist, stripping arbitrary scripts.
    """
    if not text:
        return ""

    # Parse markdown into HTML
    html_output = markdown2.markdown(
        text.strip(),
        extras=[
            "fenced-code-blocks",
            "highlightjs-lang",
            "code-friendly",
            "cuddled-lists",
            "tables",
        ],
        safe_mode="escape",
    )

    # Sanitize tags and attributes against whitelist
    clean_html = bleach.clean(
        html_output,
        tags=ALLOWED_HTML_TAGS,
        attributes=ALLOWED_HTML_ATTRIBUTES,
        protocols=ALLOWED_URL_PROTOCOLS,
        strip=True,
    )
    return clean_html

def home(request):
    return render(request, "index.html")

def chat(request):
    return render(request, "chat.html")


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
                model="gemini-3.5-flash-lite",
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

            # 8. Convert to HTML and return using render_markdown_safe
            raw_text = response.text.strip() if response.text else ""
            html_reply = render_markdown_safe(raw_text)
            return JsonResponse({"message": html_reply})

        except Exception as e:
            # logger.error(f"Error occurred: {e}") # Ensure logger is imported at the top of your file
            return JsonResponse({"error": f"Error processing request: {str(e)}"}, status=500)

    return HttpResponse("Bad Request", status=400)
