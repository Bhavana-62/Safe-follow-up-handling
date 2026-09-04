"""Session store tracking multi-turn interactions with per-turn caller identity.
Strictly caps contextual history retrieval at two turns.
"""
from collections import defaultdict
import threading
from src.session.schema import Turn

class SessionStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._sessions: dict[str, list[Turn]] = defaultdict(list)

    def append_turn(self, session_id: str, turn: Turn) -> None:
        """Appends a turn to the session with per-turn caller identity."""
        with self._lock:
            self._sessions[session_id].append(turn)

    def get_history(self, session_id: str, cap: int = 2) -> list[Turn]:
        """Returns the recent turns capped at `cap` (default 2 turns).
        Strict two-turn history cap prevents prompt degradation.
        """
        with self._lock:
            turns = self._sessions.get(session_id, [])
            if cap > 0:
                return list(turns[-cap:])
            return list(turns)

    def get_all_turns(self, session_id: str) -> list[Turn]:
        """Returns all turns in session for auditing / testing."""
        with self._lock:
            return list(self._sessions.get(session_id, []))

    def clear(self, session_id: str | None = None) -> None:
        with self._lock:
            if session_id:
                self._sessions.pop(session_id, None)
            else:
                self._sessions.clear()

_SESSION_STORE = SessionStore()

def get_session_store() -> SessionStore:
    return _SESSION_STORE
