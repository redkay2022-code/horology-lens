# G1 development review

Baseline: `6e2cc63`. G1 only; no deployment or G2–G9 implementation.

## Preview entry

Development build plus explicit `?g1=preview` opt-in is required. Review workspace: `/recognition-preview?g1=preview`. The same opt-in on `/` enables the isolated mock panel in the existing authenticated upload sheet and the metadata-only story button in fullscreen posts. Without opt-in the existing single-image SERVER UI is unchanged. Production builds always disable G1.

Mock identity is a separate component-local draft, with no publication callback. Existing `uploadPost` receives only its original independently edited watch inputs. Preview-workspace publishing is local React state, not a backend write. Editorial content is placeholder text, not generated historical claims or approved watch specifications.

## Implementation

- Strict `watch-identify.multi.v2` request/result parsers, 1–3 frames, bounded bytes, unique IDs, atomic identity shape, evidence/frame references and request/revision checks.
- Mock adapter imports no runtime server function or Gateway. Existing `identifyWatch({image})` unchanged.
- Existing detached video/canvas source reused in a separate bounded preparation module: initial 5 samples, at most 9, at most 3 selected frames, identical-image reduction and temporal diversity. Watch presence/view remain unknown.
- Mock auto-population, meaningful identity/target clarification, unknown/defer paths, final confirmation, correction preservation and stale generation/session cancellation.
- Optional existing frame selection/crop tools. Read-only story contract and separately mounted metadata panel with no player lifecycle control.

## Actual validation

- All 27 Vitest files passed: 142 tests, including 27 new G1 tests. AI and publication integration calls are mocked.
- Platform automatic typecheck/build: latest `build OK`. No manual production build was run.
- Chromium 390/369/320 × 696: synthetic MP4 selection → extraction → mock draft → correction → final confirmation → local publish → story open/close. Same video DOM node, video stayed playing, no horizontal document overflow, no runtime errors, no write requests or Gateway requests in the workspace flow. Screenshots inspected after animation completion.
- Authenticated requesting account at 369 × 696: existing upload opened, video accepted, real manual identity preserved separately from mock edits, publish enabled, no AI request/runtime error. Real publish was deliberately not clicked to avoid production data writes. Outside opt-in the original SERVER identification panel remained visible.
- Default home showed no G1 content; review route without opt-in disabled. Existing SERVER/DEMO tests passed. A/B behavior is tested using mocked identities; no hosted second-account test or changed-policy/security scan claim.

## Limits and plan deviations

- Added a dedicated development-only review route/workspace for write-free browser validation; this path was not in the original file list. It does not replace the shared shell or normal upload.
- Naming deviation: `watch-detection.ts` is an SSR-safe unknown-capability port, not `.client.ts`, because it has no browser/model implementation and must be safe in the shared import graph.
- Sampling and UI implemented in new modules rather than modifying the existing extraction/legacy identification modules. Existing server endpoint and video infrastructure are unchanged.
- Mock candidates are deterministic `PREVIEW / Sample Watch / SAMPLE-A|B`, never real manufacturer identities. No actual watch detection, multi-image inference, reference precision, manufacturer specification or historical claim is validated.
- Duplicate reduction currently removes exact image duplicates plus near-in-time redundancy; perceptual duplicate reduction and measured detector quality remain future evaluation work.
- Mobile results are Chromium viewport checks with H.264 synthetic test video, not actual iPhone/Android, HEVC/MOV/HDR/low-memory proof. Actual fullscreen server post playback/story on real media was not available for end-to-end testing; existing V2.1 regressions plus local-video DOM/playback checks passed.
- No backend schema/RLS/auth/storage/production data changes, paid calls, scraping, persistence, background jobs or deployment.

## Remaining approvals

G2 detector/license/device budget; G3 actual versioned multi-image endpoint and transmission; G4 paid independent video evaluation; G5 manufacturer/editorial source rights and claim verification; G6 persistence/snapshots/transaction/public projection; G7 private temporary frames/durable queue/quota ledger; G8 reviewed editorial publication; G9 explicit release approval.

腕表之家 (`xbiao.com`) is only a potential G5 provider. Future review must assess official API availability, commercial license/data partnership, reference-level coverage, specification accuracy, manufacturer cross-verification and copyright/reuse permissions. No source visit, scraping, import, endorsement or approval was performed in G1.