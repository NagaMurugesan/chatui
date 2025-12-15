# Ingestion Pipeline for Farming Documents

This directory contains the document ingestion pipeline for processing PDF files and storing them in the vector database.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Ensure PostgreSQL with pgvector is running:
```bash
cd ../..
docker-compose up -d postgres
```

## Usage

### Initial Ingestion (Process all PDFs)
```bash
python ingest.py --full
```

### Incremental Ingestion (Only new/modified files)
```bash
python ingest.py --incremental
```

### Process a Single File
```bash
python ingest.py --file /path/to/document.pdf
```

### Force Reprocessing
```bash
python ingest.py --full --force
```

## Components

- **pdf_processor.py**: Extracts text from PDFs and chunks them
- **embeddings.py**: Generates vector embeddings using sentence-transformers
- **vector_store.py**: Manages PostgreSQL/pgvector operations
- **ingest.py**: Main CLI script

## Configuration

- **Chunk size**: 500 characters
- **Chunk overlap**: 50 characters
- **Embedding model**: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
- **Batch size**: 32 chunks per batch

## Logs

Ingestion logs are written to `ingestion.log`

## How It Works

1. Scans `../data/farming_docs/` for PDF files
2. Calculates file hash to track changes
3. Extracts text from each page
4. Splits text into overlapping chunks
5. Generates embeddings for each chunk
6. Stores chunks and embeddings in PostgreSQL
7. Marks file as processed to avoid reprocessing


docker exec chat-mcp-server-1 python ingestion/ingest.py --incremental --data-dir data/farming_docs

