# Farming Documents Directory

Place your farming PDF documents in this directory.

The ingestion pipeline will process all PDF files and create vector embeddings for semantic search.

## Supported Formats
- PDF files only

## Usage
1. Copy your farming PDFs to this directory
2. Run the ingestion script:
   ```bash
   cd ../ingestion
   python ingest.py --incremental
   ```

## Notes
- Files are tracked by hash to avoid reprocessing
- Only new or modified files will be processed on incremental runs
