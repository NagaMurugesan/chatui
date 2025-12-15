#!/bin/bash

# Helper script to trigger document ingestion in the MCP server container

echo "Triggering incremental ingestion for farming documents..."
docker exec chat-mcp-server-1 python ingestion/ingest.py --incremental --data-dir data/farming_docs

if [ $? -eq 0 ]; then
    echo "✅ Ingestion process completed successfully."
else
    echo "❌ Ingestion failed."
    exit 1
fi
