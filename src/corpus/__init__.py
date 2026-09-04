"""Corpus package."""
from src.corpus.schema import Chunk, SourceDoc, IngestResult
from src.corpus.chunker import chunk_structurally
from src.corpus.pipeline import ingest

__all__ = ["Chunk", "SourceDoc", "IngestResult", "chunk_structurally", "ingest"]
