---
version: 1
role: classify
owner: platform-team
---
Rewrite the following conversational follow-up into a complete, standalone question.
Use ONLY the immediate conversation history (up to 2 previous turns) to resolve pronouns,
implicit targets, or missing context.

Do not answer the question.
Do not carry forward any retrieved data or evidence.
Return a standalone question that can be understood and answered on its own.

CONVERSATION HISTORY (Capped at 2 turns)
{previous}

FOLLOW-UP QUESTION
{question}

Return only JSON matching:
{schema}
