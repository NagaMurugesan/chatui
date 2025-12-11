import requests
import os
import json

class OllamaTool:
    def __init__(self):
        self.host = os.getenv("OLLAMA_HOST", "http://host.docker.internal:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3")

    def generate_response(self, prompt: str, model: str = None) -> str:
        try:
            model_to_use = model or self.model
            response = requests.post(
                f"{self.host}/api/generate",
                json={
                    "model": model_to_use,
                    "prompt": prompt,
                    "stream": False
                }
            )
            if response.status_code == 200:
                return response.json().get("response", "")
            else:
                return f"Error: {response.text}"
        except Exception as e:
            return f"Error connecting to Ollama: {str(e)}"

    def chat(self, messages: list, model: str = None) -> str:
        try:
            model_to_use = model or self.model
            print(f"[OllamaTool] Calling Ollama chat API with model: {model_to_use}")
            response = requests.post(
                f"{self.host}/api/chat",
                json={
                    "model": model_to_use,
                    "messages": messages,
                    "stream": False
                }
            )
            if response.status_code == 200:
                result = response.json().get("message", {}).get("content", "")
                print(f"[OllamaTool] Received response from {model_to_use}")
                return result
            else:
                return f"Error: {response.text}"
        except Exception as e:
            return f"Error connecting to Ollama: {str(e)}"
