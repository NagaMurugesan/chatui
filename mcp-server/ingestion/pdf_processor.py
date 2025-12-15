"""
PDF Document Processor
Extracts text from PDF files and chunks them for embedding
"""

import PyPDF2
import pdfplumber
from typing import List, Dict, Tuple
import hashlib
import os
from datetime import datetime


class PDFProcessor:
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize PDF processor
        
        Args:
            chunk_size: Number of characters per chunk
            chunk_overlap: Number of overlapping characters between chunks
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def calculate_file_hash(self, filepath: str) -> str:
        """Calculate SHA-256 hash of file for tracking changes"""
        sha256_hash = hashlib.sha256()
        with open(filepath, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def extract_text_from_pdf(self, filepath: str) -> List[Dict]:
        """
        Extract text from PDF file page by page
        
        Returns:
            List of dicts with page_number and text
        """
        pages = []
        
        try:
            # Try pdfplumber first (better text extraction)
            with pdfplumber.open(filepath) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    if text and text.strip():
                        pages.append({
                            'page_number': page_num,
                            'text': text.strip()
                        })
        except Exception as e:
            print(f"pdfplumber failed, trying PyPDF2: {e}")
            # Fallback to PyPDF2
            try:
                with open(filepath, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page_num in range(len(pdf_reader.pages)):
                        page = pdf_reader.pages[page_num]
                        text = page.extract_text()
                        if text and text.strip():
                            pages.append({
                                'page_number': page_num + 1,
                                'text': text.strip()
                            })
            except Exception as e2:
                print(f"PyPDF2 also failed: {e2}")
                raise
        
        return pages
    
    def chunk_text(self, text: str, page_number: int) -> List[Dict]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Text to chunk
            page_number: Page number for metadata
            
        Returns:
            List of chunks with metadata
        """
        chunks = []
        start = 0
        chunk_index = 0
        
        while start < len(text):
            end = start + self.chunk_size
            chunk_text = text[start:end]
            
            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence endings
                last_period = chunk_text.rfind('.')
                last_newline = chunk_text.rfind('\n')
                break_point = max(last_period, last_newline)
                
                if break_point > self.chunk_size * 0.5:  # Only break if not too early
                    chunk_text = chunk_text[:break_point + 1]
                    end = start + break_point + 1
            
            chunks.append({
                'content': chunk_text.strip(),
                'page_number': page_number,
                'chunk_index': chunk_index,
                'char_start': start,
                'char_end': end
            })
            
            chunk_index += 1
            start = end - self.chunk_overlap
        
        return chunks
    
    def process_pdf(self, filepath: str) -> Tuple[Dict, List[Dict]]:
        """
        Process a PDF file: extract text and create chunks
        
        Returns:
            Tuple of (document_metadata, chunks)
        """
        filename = os.path.basename(filepath)
        file_hash = self.calculate_file_hash(filepath)
        file_size = os.path.getsize(filepath)
        last_modified = datetime.fromtimestamp(os.path.getmtime(filepath))
        
        # Extract text from all pages
        pages = self.extract_text_from_pdf(filepath)
        
        # Create chunks from all pages
        all_chunks = []
        for page_data in pages:
            page_chunks = self.chunk_text(page_data['text'], page_data['page_number'])
            all_chunks.extend(page_chunks)
        
        document_metadata = {
            'filename': filename,
            'file_hash': file_hash,
            'file_size': file_size,
            'last_modified': last_modified,
            'total_pages': len(pages),
            'chunk_count': len(all_chunks)
        }
        
        return document_metadata, all_chunks


if __name__ == "__main__":
    # Test the processor
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python pdf_processor.py <pdf_file>")
        sys.exit(1)
    
    processor = PDFProcessor()
    doc_meta, chunks = processor.process_pdf(sys.argv[1])
    
    print(f"Document: {doc_meta['filename']}")
    print(f"Pages: {doc_meta['total_pages']}")
    print(f"Chunks: {doc_meta['chunk_count']}")
    print(f"\nFirst chunk:")
    print(chunks[0]['content'][:200] + "...")
