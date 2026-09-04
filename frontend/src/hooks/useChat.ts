import { useState, useCallback } from 'react';
import { ChatMessage, UserPersona } from '../types/api';
import { askQuestion } from '../api/client';

function generateSessionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 7);
  return `session-${ts}-${rand}`;
}

export function useChat(token: string | null, currentUser: UserPersona | null) {
  const [sessionId, setSessionId] = useState<string>(() => generateSessionId());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const newSession = useCallback(() => {
    setSessionId(generateSessionId());
    setMessages([]);
    setError(null);
  }, []);

  const sendQuestion = useCallback(
    async (questionText: string, explicitFollowup?: boolean | null) => {
      const q = questionText.trim();
      if (!q || !token || !currentUser || isLoading) return;

      setError(null);
      setIsLoading(true);

      const msgId = `msg-${Date.now()}`;
      const turnNum = messages.length + 1;

      // Add temporary user message with loading state
      const newMsg: ChatMessage = {
        id: msgId,
        turnNumber: turnNum,
        question: q,
        caller: currentUser,
        timestamp: new Date().toLocaleTimeString(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, newMsg]);

      try {
        // Strict Security: Send ONLY the question and session_id.
        // Never send previous chunks or evidence back to backend!
        let activeToken = token;
        let answer;
        try {
          answer = await askQuestion(
            {
              question: q,
              session_id: sessionId,
              is_followup: explicitFollowup,
            },
            activeToken
          );
        } catch (apiErr: any) {
          if (apiErr.status === 401 && currentUser) {
            // Auto-refresh token and retry once
            const { loginPersona } = await import('../api/client');
            const authRes = await loginPersona(currentUser.username);
            activeToken = authRes.access_token;
            sessionStorage.setItem('agent_token', activeToken);
            answer = await askQuestion(
              {
                question: q,
                session_id: sessionId,
                is_followup: explicitFollowup,
              },
              activeToken
            );
          } else {
            throw apiErr;
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, answer, isLoading: false } : m
          )
        );
      } catch (err: any) {
        const errorMsg = err.message || 'Error occurred while querying the agent.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, error: errorMsg, isLoading: false } : m
          )
        );
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [token, currentUser, sessionId, messages.length, isLoading]
  );

  return {
    sessionId,
    messages,
    isLoading,
    error,
    newSession,
    sendQuestion,
  };
}
