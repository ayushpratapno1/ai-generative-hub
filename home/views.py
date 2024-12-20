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

# Set the API Key directly (for simplicity; use environment variables in production)
os.environ["FAL_KEY"] = "f718fafd-e662-4528-b73c-b9c67267abfe:b82b2b3db6662b306bb728d8381e42a4"
# hugging face api
API_URL = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev"
HEADERS = {"Authorization": "Bearer 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"}

# Configure the API key for Google Generative AI
genai.configure(api_key="AIzaSyBU4cynzWrrwXLn79FQ9x9DUTWDxOYm648")

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

        # Define configuration for the model generation
        generation_config = {
            "temperature": 1,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
            "response_mime_type": "text/plain",
        }

        try:
            # Initialize the model with the specified configuration
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config=generation_config,
            )

            # Start a new chat session
            chat_session = model.start_chat(history=[])

            # Send the prompt to the model
            response = chat_session.send_message(prompt)

            # Log the full response for debugging
            logger.info(f"Full response: {response}")

            if hasattr(response, 'text') and response.text:
                reply = response.text.strip()  # Ensure it's properly cleaned
            else:
                reply = "No valid response from the model."

            # Convert the model's reply from markdown to HTML
            html_reply = markdown2.markdown(reply)

            # Return the response to the frontend as a JSON object (HTML content)
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
