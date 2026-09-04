---
version: 1
role: classify
owner: platform-team
---
Choose which tools to call, if any, to answer the question.

TOOLS AVAILABLE TO THIS CALLER
{tools}    # name · description · input fields · row limit · freshness

RULES
1 Call only tools listed above. Do not invent names or parameters.
2 Call at most {max_calls} tools. Prefer fewer.
3 Set needs_corpus=true when the answer depends on written policy, contracts,
  or guidance rather than on current records — and give corpus_query, which
  may differ from the question.
4 If neither a tool nor the corpus can help, return an empty plan with a
  rationale saying why.

Return only JSON matching:
{schema}
