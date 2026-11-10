# G3-D limited development review

Baseline: `be8562a`. No deployment, real inference, quota consumption, database/policy change, package installation or G4 benchmarking.

## Implemented

- Separate `watch-identify.real.multi.v1` schemas: 1–3 frames, 2MiB/image, 5MiB aggregate, 160–1024 actual header dimensions, maximum 3,145,728 pixels, canonical base64, unique IDs, safe revisions, strict fields and evidence/target/outcome consistency.
- Separate injected single-call real adapter with no retry/fallback and a separately labelled `g3-mock-only` local adapter. Mock results cannot validate as real responses. Explicit candidate selection and final confirmation; manual atomic edits and stale/session/cancel guards.
- Authenticated `identifyWatchMulti` uses existing auth middleware and existing global CSRF; returns only `disabled` with no result/source and no-store. It imports no Gateway and contains no quota RPC. Execution has no environment/query switch or connected provider callback.
- `/multi-image-preview?g3=preview` requires development build plus independent opt-in. Local sample preparation reuses unchanged A; no server function, publishing, persistence, auth or external AI calls. Mock candidates are PREVIEW values, not identification.

## Validation boundaries and blockers

Dependency-free screening uses only Web standard atob/btoa, typed arrays and DataView with bounded offset/length checks. JPEG SOF/SOS/EOI, PNG chunk framing/IHDR/IDAT/IEND, and simple VP8/VP8L headers are checked. PNG animation chunks and extended/animated WebP containers are rejected. MIME/header/dimension mismatches, missing structural sections and canonical encoding failures are rejected.

This is **header-only**, not a complete decoder: PNG CRC/zlib pixels, JPEG entropy/progressive scans, WebP compressed pixels and all semantic corruption are not validated. Crafted structurally plausible files may pass screening. Header rejection is safe for bounded parsing but never authorizes external transmission or establishes full image validity. No new decoder installed.

No pre-serialization HTTP ingress body cap implemented; schema limits cannot prevent allocation before RPC parsing. Full Worker-safe decode and ingress protection are blockers. Real execution remains unconditionally disabled even if screening passes. Authentication/CSRF code and policies unchanged. Durable dedup/service-wide spending gates not implemented.

## Actual verification

- Full Vitest suite: 30 files, 158/158 tests passed. Includes unchanged upload, single-image recognition, G1, SERVER/DEMO and V2.1 playback regressions.
- Automatic harness typecheck and build: build OK after correcting a test optional property. No manual build/typecheck run (harness owns these).
- G3 function registration test checks existing auth middleware, directly exercises disabled handler with mocked user context, and asserts provider spy and quota RPC spy called zero times. Authentication helper rejects absent identity; no hosted authenticated RPC transport test was performed. Existing generated middleware and CSRF protection remain unchanged.
- Local Playwright Chromium: 369×696, 320×696 and 1280×1800. No-opt-in screen disabled; synthetic H.264 selection → A extraction → candidate selection → correction → confirmation → multiple targets → unknown. All passed; write requests 0, page errors 0, horizontal document overflow absent. Screenshots inspected.
- These are local synthetic/Chromium and mocked security tests, not real iOS/Android, HEVC/HDR, real provider or actual ownership/identity benchmarks.

## Security/privacy

No images transmitted to Gateway, no quota consumer in the function, no hidden retry or automatic single-image fallback, no publication callback or database persistence. Local frames remain component memory; cancel/replacement abort decoder work and reject late generations. No frame or token logging added. Global shared navigation remains unchanged; opening an existing app page does not merge G3 drafts with its publishing forms.

## Approvals still required

- Full decoder/dependency and ingress guard approval, runtime verification and server execution gate review before any real call can be connected.
- G3 real provider wiring plus generated SDK contract/types, explicit same-quota single multi-image request semantics, privacy/retention/log/region checks, cost/output budget and unknown-outcome recovery review.
- G4 separate authorization for consented dataset images sent to AI, paid pilot size/credits, ground truth/heldout/group split and evaluation plan. None started.
- Browser detector remains deferred; G1 and A, existing identifyWatch, upload/publishing/player/auth/RLS and quota limits remain unchanged. Production release requires separate CTO approval.