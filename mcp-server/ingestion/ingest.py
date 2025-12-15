"""
Main Ingestion Script
CLI tool to ingest PDF documents into the vector database
"""

import argparse
import os
import sys
from pathlib import Path
from tqdm import tqdm
import logging

from pdf_processor import PDFProcessor
from embeddings import EmbeddingModel
from vector_store import VectorStore


# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ingestion.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DocumentIngestion:
    def __init__(self, data_dir: str = "../data/farming_docs"):
        """
        Initialize ingestion pipeline
        
        Args:
            data_dir: Directory containing PDF files
        """
        self.data_dir = Path(data_dir)
        self.pdf_processor = PDFProcessor(chunk_size=500, chunk_overlap=50)
        self.embedding_model = EmbeddingModel()
        self.vector_store = VectorStore()
        
        logger.info(f"Initialized ingestion pipeline for directory: {self.data_dir}")
    
    def get_pdf_files(self) -> list:
        """Get all PDF files from the data directory"""
        if not self.data_dir.exists():
            logger.error(f"Directory does not exist: {self.data_dir}")
            return []
        
        pdf_files = list(self.data_dir.glob("*.pdf"))
        logger.info(f"Found {len(pdf_files)} PDF files")
        return pdf_files
    
    def ingest_file(self, filepath: Path, force: bool = False) -> bool:
        """
        Ingest a single PDF file
        
        Args:
            filepath: Path to PDF file
            force: If True, process even if already processed
            
        Returns:
            True if successfully ingested, False if skipped
        """
        try:
            logger.info(f"Processing: {filepath.name}")
            
            # Process PDF
            doc_metadata, chunks = self.pdf_processor.process_pdf(str(filepath))
            
            # Check if already processed (unless force=True)
            if not force and self.vector_store.is_file_processed(doc_metadata['file_hash']):
                logger.info(f"Skipping {filepath.name} - already processed")
                return False
            
            # Generate embeddings
            logger.info(f"Generating embeddings for {len(chunks)} chunks...")
            chunk_texts = [chunk['content'] for chunk in chunks]
            embeddings = self.embedding_model.embed_batch(chunk_texts, batch_size=32)
            
            # Store in database
            logger.info(f"Storing in database...")
            self.vector_store.store_document(doc_metadata, chunks, embeddings)
            
            logger.info(f"✓ Successfully ingested: {filepath.name}")
            return True
            
        except Exception as e:
            logger.error(f"✗ Error processing {filepath.name}: {e}")
            return False
    
    def ingest_all(self, force: bool = False, incremental: bool = True):
        """
        Ingest all PDF files in the directory
        
        Args:
            force: If True, reprocess all files
            incremental: If True, skip already processed files
        """
        pdf_files = self.get_pdf_files()
        
        if not pdf_files:
            logger.warning("No PDF files found to process")
            return
        
        logger.info(f"Starting ingestion of {len(pdf_files)} files...")
        logger.info(f"Mode: {'FULL (force)' if force else 'INCREMENTAL' if incremental else 'FULL'}")
        
        processed_count = 0
        skipped_count = 0
        error_count = 0
        
        for pdf_file in tqdm(pdf_files, desc="Ingesting PDFs"):
            try:
                success = self.ingest_file(pdf_file, force=force)
                if success:
                    processed_count += 1
                else:
                    skipped_count += 1
            except Exception as e:
                logger.error(f"Failed to process {pdf_file.name}: {e}")
                error_count += 1
        
        logger.info("\n" + "="*50)
        logger.info("Ingestion Summary:")
        logger.info(f"  Processed: {processed_count}")
        logger.info(f"  Skipped:   {skipped_count}")
        logger.info(f"  Errors:    {error_count}")
        logger.info("="*50)
    
    def close(self):
        """Clean up resources"""
        self.vector_store.close()


def main():
    parser = argparse.ArgumentParser(
        description="Ingest PDF documents into vector database for RAG"
    )
    parser.add_argument(
        '--data-dir',
        default='../data/farming_docs',
        help='Directory containing PDF files (default: ../data/farming_docs)'
    )
    parser.add_argument(
        '--full',
        action='store_true',
        help='Process all files (default mode)'
    )
    parser.add_argument(
        '--incremental',
        action='store_true',
        help='Skip already processed files (checks file hash)'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force reprocessing of all files, even if already processed'
    )
    parser.add_argument(
        '--file',
        type=str,
        help='Process a single specific file'
    )
    
    args = parser.parse_args()
    
    try:
        ingestion = DocumentIngestion(data_dir=args.data_dir)
        
        if args.file:
            # Process single file
            filepath = Path(args.file)
            if not filepath.exists():
                logger.error(f"File not found: {filepath}")
                sys.exit(1)
            ingestion.ingest_file(filepath, force=args.force)
        else:
            # Process all files
            ingestion.ingest_all(
                force=args.force,
                incremental=args.incremental or not args.full
            )
        
        ingestion.close()
        logger.info("Ingestion complete!")
        
    except KeyboardInterrupt:
        logger.info("\nIngestion interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
