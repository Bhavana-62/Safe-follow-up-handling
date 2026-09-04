"""OpenTelemetry tracer setup.
Falls back silently and gracefully when no local OTLP collector is running.
"""
import socket
from urllib.parse import urlparse
from src.config import OTLP_ENDPOINT

class DummySpan:
    def __init__(self, name="dummy"):
        self.name = name
        self.attributes = {}

    def set_attributes(self, attrs: dict):
        self.attributes.update(attrs)

    def set_attribute(self, key: str, val):
        self.attributes[key] = val

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

class DummyTracer:
    def start_as_current_span(self, name: str, **kwargs):
        return DummySpan(name)

    def get_current_span(self):
        return DummySpan("current")

_tracer = None

def _is_collector_reachable(endpoint: str) -> bool:
    try:
        parsed = urlparse(endpoint)
        host = parsed.hostname or "localhost"
        port = parsed.port or 4318
        with socket.create_connection((host, port), timeout=0.1):
            return True
    except Exception:
        return False

def get_tracer():
    global _tracer
    if _tracer is not None:
        return _tracer

    try:
        if _is_collector_reachable(OTLP_ENDPOINT):
            from opentelemetry import trace
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.resources import Resource
            from opentelemetry.sdk.trace.export import BatchSpanProcessor
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

            resource = Resource.create({
                "service.name": "readonly-agent",
                "service.version": "0.1.0",
                "deployment.environment": "development",
            })
            provider = TracerProvider(resource=resource)
            exporter = OTLPSpanExporter(endpoint=OTLP_ENDPOINT)
            provider.add_span_processor(BatchSpanProcessor(exporter))
            trace.set_tracer_provider(provider)
            _tracer = trace.get_tracer("readonly-agent")
            return _tracer
    except Exception:
        pass

    _tracer = DummyTracer()
    return _tracer
