from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import requests
import json
from tools.postgres_tool import PostgresTool
from tools.ollama_tool import OllamaTool
from tools.rag_tool import RAGTool

app = FastAPI()

# Initialize Tools
postgres_tool = PostgresTool()
ollama_tool = OllamaTool()
rag_tool = RAGTool()

class PromptRequest(BaseModel):
    messages: List[dict]
    model: str = "llama3"

@app.post("/prompt")
async def process_prompt(request: PromptRequest):
    try:
        user_message = request.messages[-1]['content']
        print(f"Received request with model: {request.model}")
        
        # Simple Agent Logic:
        # 1. Ask Llama to classify intent
        # 2. Route to appropriate tool
        
        classification_prompt = f"""
        You are an AI assistant router. Analyze the following user request and decide which tool to use.
        Available tools:
        1. POSTGRES: Use this for database queries, checking users, or SQL related tasks.
        2. FARMING: Use this for questions about farming, agriculture, crops, livestock, or farming practices.
        3. OLLAMA: Use this for general chat, coding questions, or anything not related to database or farming.
        
        User Request: "{user_message}"
        
        Reply ONLY with "POSTGRES", "FARMING", or "OLLAMA".
        """
        
        intent = ollama_tool.generate_response(classification_prompt, request.model).strip().upper()
        print(f"Intent detected: {intent}, using model: {request.model}")

        if "FARMING" in intent:
            # Route to RAG tool for farming questions
            print(f"[MCP Server] Routing to RAG tool for farming query")
            result = rag_tool.generate_answer(user_message, model=request.model)
            return {"content": result['answer']}
        
        elif "POSTGRES" in intent:
            # If Postgres, we might need to generate SQL first or just pass the query
            # For this demo, let's ask Llama to generate SQL, then execute it
            sql_prompt = f"Generate a valid SQL query for the following request. Reply ONLY with the SQL query, no markdown. Request: {user_message}"
            sql_query = ollama_tool.generate_response(sql_prompt, request.model).strip()
            # Clean up SQL (remove markdown code blocks if any)
            sql_query = sql_query.replace("```sql", "").replace("```", "").strip()
            
            print(f"Executing SQL: {sql_query}")
            result = postgres_tool.execute_query(sql_query)
            return {"content": f"Executed SQL: {sql_query}\n\nResult:\n{json.dumps(result, indent=2)}"}
            
        else:
            # Default to Ollama Chat
            response = ollama_tool.chat(request.messages, request.model)
            return {"content": response}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}
