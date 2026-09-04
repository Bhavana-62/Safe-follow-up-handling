"""Real LLM client supporting Ollama and OpenAI-compatible providers.
Strictly disallows production fallback to fake/simulated AI answers.
If no real provider is available or configured, raises LLMUnavailableError.
Test suites may inject a controlled test responder via set_test_llm_client.
"""
import os
import json
import re
from pathlib import Path
from typing import Any, TypeVar, Optional
import httpx
from pydantic import BaseModel, ValidationError
from src.config import PROFILE, BASE_DIR
from src.telemetry.cost import record_cost, TokenUsage

T = TypeVar("T", bound=BaseModel)

PROMPTS_DIR = BASE_DIR / "src" / "llm" / "prompts"

class LLMUnavailableError(RuntimeError):
    """Raised when no real LLM provider is reachable or configured in production."""
    pass

def load_prompt_template(role: str) -> str:
    mapping = {
        "synthesise": PROMPTS_DIR / "synthesise.v3.md",
        "classify": PROMPTS_DIR / "plan.v1.md",
        "standalone_question": PROMPTS_DIR / "standalone_question.v1.md",
        "entailment": PROMPTS_DIR / "entailment.v1.md",
    }
    path = mapping.get(role, PROMPTS_DIR / f"{role}.v1.md")
    if not path.exists():
        return ""
    content = path.read_text(encoding="utf-8")
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            return parts[2].strip()
    return content

class LLMResponse:
    def __init__(self, text: str, usage: TokenUsage, provider: str = "unknown", model: str = "unknown"):
        self.text = text
        self.usage = usage
        self.provider = provider
        self.model = model

class LLMClient:
    def __init__(self):
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    def generate(self, model: str, prompt: str, temperature: float = 0.0) -> LLMResponse:
        """Attempts generation through real configured providers (OpenAI or Ollama).
        In production, never falls back to deterministic fake answers.
        """
        # 1. Try OpenAI-compatible API if configured
        if self.openai_api_key:
            try:
                headers = {
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "model": self.openai_model,
                    "messages": [
                        {"role": "system", "content": "You are a secure, read-only enterprise intelligence assistant. Return only valid JSON adhering strictly to the requested schema."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": temperature,
                    "response_format": {"type": "json_object"},
                }
                with httpx.Client(base_url=self.openai_base_url, timeout=25.0) as client:
                    resp = client.post("/chat/completions", headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        choice = data["choices"][0]["message"]["content"]
                        usage = data.get("usage", {})
                        in_tok = usage.get("prompt_tokens", len(prompt.split()) * 2)
                        out_tok = usage.get("completion_tokens", 50)
                        return LLMResponse(
                            text=choice,
                            usage=TokenUsage(prompt_tokens=in_tok, completion_tokens=out_tok),
                            provider="openai",
                            model=self.openai_model,
                        )
            except Exception as e:
                pass

        # 2. Try local Ollama if reachable
        try:
            with httpx.Client(base_url=self.ollama_base_url, timeout=10.0) as client:
                resp = client.post(
                    "/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json",
                        "options": {"temperature": temperature},
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    in_tok = data.get("prompt_eval_count", len(prompt.split()) * 2)
                    out_tok = data.get("eval_count", 50)
                    return LLMResponse(
                        text=data.get("response", "{}"),
                        usage=TokenUsage(prompt_tokens=in_tok, completion_tokens=out_tok),
                        provider="ollama",
                        model=model,
                    )
        except Exception:
            pass

        # 3. No real provider is available: FAIL EXPLICITLY in production!
        raise LLMUnavailableError(
            "AI intelligence service is currently unavailable. No reachable LLM provider found (checked Ollama and OpenAI-compatible endpoints). Enterprise data remains available for direct exploration."
        )

# Global test injection hook strictly for automated tests
_TEST_CLIENT: Optional[Any] = None

def set_test_llm_client(client: Any) -> None:
    global _TEST_CLIENT
    _TEST_CLIENT = client

def reset_test_llm_client() -> None:
    global _TEST_CLIENT
    _TEST_CLIENT = None

_GLOBAL_CLIENT = LLMClient()

def get_llm_client() -> Any:
    if _TEST_CLIENT is not None:
        return _TEST_CLIENT
    return _GLOBAL_CLIENT

def structured(role: str, schema: type[T], client: Any = None, **vars) -> T:
    """Executes structured generation against the schema."""
    if client is None:
        client = get_llm_client()

    cfg = PROFILE.roles.get(role)
    model = cfg.model if cfg else "default-model"
    temperature = cfg.temperature if cfg else 0.0

    template = load_prompt_template(role)
    rendered_prompt = template.format(
        schema=json.dumps(schema.model_json_schema(), indent=2),
        **vars,
    ) if template else str(vars)

    prompt = rendered_prompt
    for attempt in (1, 2):
        raw = client.generate(model=model, prompt=prompt, temperature=temperature)
        record_cost(role, model, raw.usage)
        try:
            return schema.model_validate_json(raw.text)
        except ValidationError as e:
            if attempt == 2:
                raise
            prompt = f"{prompt}\n\nYour previous reply failed validation:\n{e}\nReturn only valid JSON."

    raise AssertionError("unreachable")
