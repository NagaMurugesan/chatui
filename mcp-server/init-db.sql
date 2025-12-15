-- Initialize database with pgvector extension and RAG tables

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to track processed files for incremental ingestion
CREATE TABLE IF NOT EXISTS processed_files (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE,
    file_hash VARCHAR(64),
    file_size BIGINT,
    last_modified TIMESTAMP,
    processed_at TIMESTAMP DEFAULT NOW(),
    chunk_count INTEGER
);

-- Main documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255),
    file_hash VARCHAR(64),
    total_pages INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Document chunks with embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER,
    chunk_index INTEGER,
    content TEXT,
    embedding vector(384),  -- dimension for all-MiniLM-L6-v2 model
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast similarity search
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_processed_hash ON processed_files(file_hash);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;
