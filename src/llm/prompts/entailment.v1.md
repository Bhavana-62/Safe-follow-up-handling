---
version: 1
role: classify
owner: platform-team
---
Does the EVIDENCE support the CLAIM?

supports        the evidence states or directly implies the claim
insufficient    the evidence concerns the right subject but does not establish it
contradicts     the evidence states something incompatible with the claim

Judge only what is written. Do not use outside knowledge.

CLAIM      {claim}
EVIDENCE   {evidence}

Return only JSON:
{"verdict": "supports|insufficient|contradicts", "why": "one sentence"}
