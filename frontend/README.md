# Read-Only Enterprise Agent - Professional Frontend UI

A secure, enterprise-grade user interface built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS** for interacting with the **Secure Read-Only Enterprise Agent**.

## Features

- **Enterprise Security UI**:
  - Clear visual indicators of Read-Only status by construction.
  - Active Session ID tracking with 1-click generation of new sessions.
  - Invariant security reminder: *Session continuity does not grant permissions. Authenticated identity controls all access.*
- **Identity Persona Switching**:
  - Test access boundaries by switching between authenticated enterprise roles (`finance.lead`, `dana.reyes`, `analyst`, `procurement.lead`, `sales.lead`, `ops.analyst`).
  - Demonstrates that in a shared session, a second caller inherits zero data from a prior privileged caller.
- **Follow-Up Rewrite Prominence**:
  - Visually surfaces the rewritten standalone query (`Answer.rewritten_question`) before the answer.
  - Never passes prior evidence chunks back to the backend—ensuring zero context-leakage.
- **Grounded Evidence Citations**:
  - Collapsible audit cards displaying `source`, `locator`, `retrieved_at`, and `as_of` freshness dates.
  - Distinct confidence indicators (High, Medium, Low).
- **Honesty Behavior States**:
  - **Answer Available** (Emerald)
  - **Partial Answer** (Amber) with row limit truncation notifications.
  - **Unable to Answer / Declined** (Rose) with explicit missing sources.
  - **Considered but Rejected** hypotheses examined and dismissed with evidence.

## Quick Start (Development)

1. Make sure the FastAPI backend is running on `http://localhost:8000`:
   ```powershell
   uvicorn src.main:app --reload --port 8000
   ```

2. From the `frontend` folder:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

3. Open your browser to [http://localhost:5173](http://localhost:5173).

## Production Build

```powershell
cd frontend
npm run build
```
The production bundle will be output to `frontend/dist/`.
