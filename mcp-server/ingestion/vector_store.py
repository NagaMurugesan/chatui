"""
Vector Store
Handles PostgreSQL operations with pgvector for document storage and retrieval
"""

import psycopg2
from psycopg2.extras import execute_values, RealDictCursor
from typing import List, Dict, Optional, Tuple
import json
from datetime import datetime
import os


class VectorStore:
    def __init__(self, host: str = None, port: int = None, 
                 database: str = None, user: str = None, password: str = None):
        """
        Initialize connection to PostgreSQL with pgvector
        """
        self.conn_params = {
            'host': host or os.getenv("POSTGRES_HOST", "postgres"),
            'port': port or int(os.getenv("POSTGRES_PORT", 5432)),
            'database': database or os.getenv("POSTGRES_DB", "mcpdb"),
            'user': user or os.getenv("POSTGRES_USER", "admin"),
            'password': password or os.getenv("POSTGRES_PASSWORD", "admin")
        }
        self.conn = None
        self.connect()
    
    def connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(**self.conn_params)
            self.conn.autocommit = False
            print("Connected to PostgreSQL")
        except Exception as e:
            print(f"Error connecting to database: {e}")
            raise
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            print("Database connection closed")
    
    def is_file_processed(self, file_hash: str) -> bool:
        """
        Check if a file has already been processed
        
        Args:
            file_hash: SHA-256 hash of the file
            
        Returns:
            True if file exists in processed_files table
        """
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM processed_files WHERE file_hash = %s",
                (file_hash,)
            )
            count = cur.fetchone()[0]
            return count > 0
    
    def insert_document(self, doc_metadata: Dict) -> int:
        """
        Insert document metadata
        
        Returns:
            document_id
        """
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO documents (filename, file_hash, total_pages)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (doc_metadata['filename'], doc_metadata['file_hash'], doc_metadata['total_pages'])
            )
            document_id = cur.fetchone()[0]
            return document_id
    
    def insert_chunks(self, document_id: int, chunks: List[Dict], embeddings: List[List[float]]):
        """
        Insert document chunks with their embeddings
        
        Args:
            document_id: ID of the parent document
            chunks: List of chunk dictionaries
            embeddings: List of embedding vectors
        """
        data = [
            (
                document_id,
                chunk['page_number'],
                chunk['chunk_index'],
                chunk['content'],
                json.dumps(chunk),  # Store full chunk metadata as JSONB
                embeddings[i]
            )
            for i, chunk in enumerate(chunks)
        ]
        
        with self.conn.cursor() as cur:
            execute_values(
                cur,
                """
                INSERT INTO document_chunks 
                (document_id, page_number, chunk_index, content, metadata, embedding)
                VALUES %s
                """,
                data,
                template="(%s, %s, %s, %s, %s, %s::vector)"
            )
    
    def mark_file_processed(self, doc_metadata: Dict):
        """
        Mark file as processed in tracking table
        """
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO processed_files 
                (filename, file_hash, file_size, last_modified, chunk_count)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (filename) DO UPDATE
                SET file_hash = EXCLUDED.file_hash,
                    file_size = EXCLUDED.file_size,
                    last_modified = EXCLUDED.last_modified,
                    processed_at = NOW(),
                    chunk_count = EXCLUDED.chunk_count
                """,
                (
                    doc_metadata['filename'],
                    doc_metadata['file_hash'],
                    doc_metadata['file_size'],
                    doc_metadata['last_modified'],
                    doc_metadata['chunk_count']
                )
            )
    
    def store_document(self, doc_metadata: Dict, chunks: List[Dict], embeddings: List[List[float]]):
        """
        Store complete document with chunks and embeddings
        
        Args:
            doc_metadata: Document metadata
            chunks: List of text chunks
            embeddings: List of embedding vectors
        """
        try:
            # Check if already processed
            if self.is_file_processed(doc_metadata['file_hash']):
                print(f"File {doc_metadata['filename']} already processed (hash: {doc_metadata['file_hash'][:8]}...)")
                return False
            
            # Insert document
            document_id = self.insert_document(doc_metadata)
            print(f"Inserted document {document_id}: {doc_metadata['filename']}")
            
            # Insert chunks with embeddings
            self.insert_chunks(document_id, chunks, embeddings)
            print(f"Inserted {len(chunks)} chunks")
            
            # Mark as processed
            self.mark_file_processed(doc_metadata)
            
            # Commit transaction
            self.conn.commit()
            print(f"Successfully stored document: {doc_metadata['filename']}")
            return True
            
        except Exception as e:
            self.conn.rollback()
            print(f"Error storing document: {e}")
            raise
    
    def similarity_search(self, query_embedding: List[float], top_k: int = 5) -> List[Dict]:
        """
        Search for similar document chunks using cosine similarity
        
        Args:
            query_embedding: Query vector
            top_k: Number of results to return
            
        Returns:
            List of matching chunks with metadata
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT 
                    dc.content,
                    dc.page_number,
                    dc.chunk_index,
                    dc.metadata,
                    d.filename,
                    1 - (dc.embedding <=> %s::vector) as similarity
                FROM document_chunks dc
                JOIN documents d ON dc.document_id = d.id
                ORDER BY dc.embedding <=> %s::vector
                LIMIT %s
                """,
                (query_embedding, query_embedding, top_k)
            )
            results = cur.fetchall()
            return [dict(row) for row in results]


if __name__ == "__main__":
    # Test vector store
    store = VectorStore()
    
    # Test connection
    print("Vector store initialized successfully")
    
    store.close()
