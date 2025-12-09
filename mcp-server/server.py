from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import requests
import json
from tools.postgres_tool import PostgresTool
from tools.ollama_tool import OllamaTool

app = FastAPI()

# Initialize Tools
postgres_tool = PostgresTool()
ollama_tool = OllamaTool()

class PromptRequest(BaseModel):
    messages: List[dict]
    model: str = "llama3"

@app.post("/prompt")
async def process_prompt(request: PromptRequest):
    try:
        user_message = request.messages[-1]['content']
        
        # Simple Agent Logic:
        # 1. Ask Llama to classify intent
        # 2. Route to appropriate tool
        
        classification_prompt = f"""
        You are an AI assistant router. Analyze the following user request and decide which tool to use.
        Available tools:
        1. POSTGRES: Use this for database queries, checking users, or SQL related tasks.
        2. OLLAMA: Use this for general chat, coding questions, or anything not related to the database.
        
        User Request: "{user_message}"
        
        Reply ONLY with "POSTGRES" or "OLLAMA".
        """
        
        intent = ollama_tool.generate_response(classification_prompt).strip().upper()
        print(f"Intent detected: {intent}")

        if "POSTGRES" in intent:
            # If Postgres, we might need to generate SQL first or just pass the query
            # For this demo, let's ask Llama to generate SQL, then execute it
            sql_prompt = f"Generate a valid SQL query for the following request. Reply ONLY with the SQL query, no markdown. Request: {user_message}"
            sql_query = ollama_tool.generate_response(sql_prompt).strip()
            # Clean up SQL (remove markdown code blocks if any)
            sql_query = sql_query.replace("```sql", "").replace("```", "").strip()
            
            print(f"Executing SQL: {sql_query}")
            result = postgres_tool.execute_query(sql_query)
            return {"content": f"Executed SQL: {sql_query}\n\nResult:\n{json.dumps(result, indent=2)}"}
            
        else:
            # Default to Ollama Chat
            response = ollama_tool.chat(request.messages)
            return {"content": response}

    except Exception as e:
        print(f"Error processing prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}
