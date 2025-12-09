import requests
import os
import json

class OllamaTool:
    def __init__(self):
        self.host = os.getenv("OLLAMA_HOST", "http://host.docker.internal:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3")

    def generate_response(self, prompt: str) -> str:
        try:
            response = requests.post(
                f"{self.host}/api/generate",
                json={
                    "model": self.model,
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

    def chat(self, messages: list) -> str:
        try:
            response = requests.post(
                f"{self.host}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False
                }
            )
            if response.status_code == 200:
                return response.json().get("message", {}).get("content", "")
            else:
                return f"Error: {response.text}"
        except Exception as e:
            return f"Error connecting to Ollama: {str(e)}"
