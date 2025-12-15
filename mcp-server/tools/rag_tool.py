"""
RAG Tool for Farming Documents
Retrieves relevant document chunks and generates answers using Mistral LLM
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../ingestion'))

from embeddings import EmbeddingModel
from vector_store import VectorStore
from tools.ollama_tool import OllamaTool


class RAGTool:
    def __init__(self):
        """Initialize RAG tool with embedding model and vector store"""
        self.embedding_model = EmbeddingModel()
        self.vector_store = VectorStore()
        self.ollama = OllamaTool()
        print("[RAGTool] Initialized")
    
    def search_documents(self, query: str, top_k: int = 5) -> list:
        """
        Search for relevant document chunks
        
        Args:
            query: User query
            top_k: Number of results to return
            
        Returns:
            List of relevant chunks with metadata
        """
        # Generate embedding for query
        query_embedding = self.embedding_model.embed_text(query)
        
        # Search vector database
        results = self.vector_store.similarity_search(query_embedding, top_k=top_k)
        
        return results
    
    def format_context(self, search_results: list) -> str:
        """
        Format search results into context for LLM
        
        Args:
            search_results: List of search results
            
        Returns:
            Formatted context string
        """
        if not search_results:
            return "No relevant information found in the knowledge base."
        
        context_parts = []
        for i, result in enumerate(search_results, 1):
            context_parts.append(
                f"[Source {i}: {result['filename']}, Page {result['page_number']}]\n"
                f"{result['content']}\n"
            )
        
        return "\n".join(context_parts)
    
    def format_sources(self, search_results: list) -> str:
        """
        Format source citations
        
        Args:
            search_results: List of search results
            
        Returns:
            Formatted sources string
        """
        if not search_results:
            return ""
        
        sources = []
        seen = set()
        
        for result in search_results:
            source_key = (result['filename'], result['page_number'])
            if source_key not in seen:
                sources.append(f"- {result['filename']} (Page {result['page_number']})")
                seen.add(source_key)
        
        return "\n\nSources:\n" + "\n".join(sources)
    
    def generate_answer(self, query: str, model: str = "mistral-nemo", top_k: int = 5) -> dict:
        """
        Generate answer using RAG
        
        Args:
            query: User query
            model: LLM model to use
            top_k: Number of document chunks to retrieve
            
        Returns:
            Dict with answer and sources
        """
        try:
            # Search for relevant documents
            print(f"[RAGTool] Searching for relevant documents...")
            search_results = self.search_documents(query, top_k=top_k)
            
            if not search_results:
                return {
                    "answer": "I don't have any information about that in my farming documents knowledge base.",
                    "sources": []
                }
            
            print(f"[RAGTool] Found {len(search_results)} relevant chunks")
            
            # Format context
            context = self.format_context(search_results)
            
            # Create prompt for LLM
            prompt = f"""You are a helpful farming assistant. Answer the question based on the provided context from farming documents.

Context:
{context}

Question: {query}

Instructions:
- Answer based ONLY on the information provided in the context
- If the context doesn't contain enough information, say so
- Be specific and cite which source you're using
- Keep your answer clear and concise

Answer:"""
            
            # Generate answer using Mistral
            print(f"[RAGTool] Generating answer with {model}...")
            answer = self.ollama.generate_response(prompt, model=model)
            
            # Format sources
            sources_text = self.format_sources(search_results)
            
            return {
                "answer": answer + sources_text,
                "sources": search_results,
                "context_used": len(search_results)
            }
            
        except Exception as e:
            print(f"[RAGTool] Error: {e}")
            return {
                "answer": f"Error generating answer: {str(e)}",
                "sources": []
            }


if __name__ == "__main__":
    # Test the RAG tool
    rag = RAGTool()
    
    test_query = "What are the best practices for crop rotation?"
    print(f"\nQuery: {test_query}\n")
    
    result = rag.generate_answer(test_query)
    print(f"Answer:\n{result['answer']}\n")
    print(f"Context chunks used: {result.get('context_used', 0)}")
