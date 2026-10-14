# Browser presentation demo

This directory provides a fictional client-side simulation for static frontend hosting. It makes no HTTP API calls, does not include a server or filesystem persistence, and does not perform real identity verification or payments.

- `seed.json`: pristine fictional fixture, copied from the original demo seed rather than live user-edited state.
- `domain.ts`: browser-compatible command transitions and demo role checks.
- `advance.ts`: completion of pending simulated verification/payment operations on state refresh.
- `validation.ts`: consistency checks before state is saved.
- `csv.ts`: client-side CSV formatting with spreadsheet formula-prefix protection.
- `browserDemo.ts`: isolated local browser persistence, serialized operations, reset, and API adapter methods.

The transition and validation code was adapted from the local demo domain so browser and API presentation flows retain the same questionnaire, review, quota, and ledger semantics. These client-side checks are presentation behavior, not a security boundary.

`VITE_DEMO_MODE=browser` selects this adapter. Production builds without an external API also select it automatically. `VITE_DEMO_MODE=api` explicitly selects the existing HTTP client. An API failure never switches modes silently.
