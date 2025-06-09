import os
import io
from django.conf import settings
import requests
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from PIL import Image
import logging
import fal_client
import markdown2
import google.generativeai as genai

# FAL API Key
FAL_KEY = os.environ.get("FAL_KEY")

# Hugging Face API
API_URL = os.environ.get("HUGGINGFACE_API_URL")
HEADERS = {"Authorization": os.environ.get("HUGGINGFACE_AUTH_KEY")}

# Google Generative AI Key
import google.generativeai as genai
genai.configure(api_key=os.environ.get("GOOGLE_GENAI_API_KEY"))

# Add logging
logger = logging.getLogger(__name__)

def home(request):
    return render(request, "index.html")

def chat(request):
    return render(request, "chat.html")

def image_page(request):
    return render(request, "image.html")

def vision(request):
    return render(request, "vision.html")

def chatAPI(request):
    if request.method == "POST":
        prompt = request.POST.get("prompt", "")
        if not prompt:
            return JsonResponse({"error": "No prompt provided"}, status=400)

        generation_config = {
            "temperature": 1,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
            "response_mime_type": "text/plain",
        }

        try:
            # ✅ Load chat history from session
            chat_history = request.session.get("chat_history", [])

            # ✅ Auto-clear history if any item uses "content" instead of "parts"
            if any("content" in msg for msg in chat_history):
                chat_history = []
                request.session["chat_history"] = []

            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config=generation_config,
            )

            # ✅ Create chat session with valid history
            chat_session = model.start_chat(history=chat_history)

            # ✅ Send prompt
            response = chat_session.send_message(prompt)

            # ✅ Update and save history with correct format
            chat_history.append({"role": "user", "parts": [prompt]})
            request.session["chat_history"] = chat_history
            

            html_reply = markdown2.markdown(response.text.strip())

            return JsonResponse({"message": html_reply})

        except Exception as e:
            logger.error(f"Error occurred: {e}")
            return JsonResponse({"error": f"Error processing request: {e}"}, status=500)

    return HttpResponse("Bad Request", status=400)

# Function to handle the Hugging Face API call
def query_hugging_face(payload):
    try:
        response = requests.post(API_URL, headers=HEADERS, json=payload)
        response.raise_for_status()  # Check for HTTP errors
        return response.content
    except requests.exceptions.RequestException as e:
        logger.error(f"Hugging Face API error: {e}")
        raise

# Unified Text-to-Image Generation
@csrf_exempt
def image_generation(request):
    if request.method == "POST":
        prompt = request.POST.get("prompt")
        api_choice = request.POST.get("api")  # "hugging_face" or "fal_ai"

        # Validate the inputs
        if not prompt or not api_choice:
            return JsonResponse({"status": "error", "message": "Prompt and API choice are required."})

        logs = []  # List to store logs
        try:
            if api_choice == "fal_ai":
                # Falcon AI Logic
                def on_queue_update(update):
                    """Callback function to handle logs during Falcon AI processing."""
                    if isinstance(update, fal_client.InProgress):
                        for log in update.logs:
                            logs.append(log["message"])

                result = fal_client.subscribe(
                    "fal-ai/fast-lightning-sdxl",
                    arguments={"prompt": prompt},
                    with_logs=True,
                    on_queue_update=on_queue_update,
                )

                images = result.get("images")
                if images and isinstance(images, list) and "url" in images[0]:
                    # Return the URL of the generated image
                    return JsonResponse({"status": "success", "result": images[0]["url"], "logs": logs})
                else:
                    logger.warning(f"Falcon AI response: {result}")
                    return JsonResponse({"status": "error", "message": "No image returned by Falcon AI.", "logs": logs})

            elif api_choice == "hugging_face":
                # Hugging Face Logic
                image_bytes = query_hugging_face({"inputs": prompt})
                
                # Convert bytes to image
                image = Image.open(io.BytesIO(image_bytes))

                # Save the image to an in-memory buffer (without saving to disk)
                img_io = io.BytesIO()
                image.save(img_io, 'PNG')
                img_io.seek(0)

                # Return the image as an HTTP response
                return HttpResponse(img_io, content_type='image/png')

            else:
                return JsonResponse({"status": "error", "message": "Invalid API choice."})

        except Exception as e:
            logger.error(f"Error in image generation: {e}")
            return JsonResponse({"status": "error", "message": str(e)})

    # If not POST, return the image generation page
    return render(request, "image.html")