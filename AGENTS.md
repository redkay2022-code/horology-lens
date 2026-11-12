<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep watch content in typed shared data and community state in a root provider so likes, saves, follows and simulated uploads stay consistent across navigation.
- Keep demo auction eligibility on typed watch records and offer, countdown and accepted-chat state in the shared community provider; every entry point enforces eligibility and expiry so feed, listings and chat stay consistent without real transactions.
- Store heritage and expanded specifications in each watch's typed details record and render shared collapsible sections so every model receives the same complete drawer layout.
- Use separate Feed, Active Bids, Chat, Discover and Watchbox routes within the shared mobile shell so each view is shareable with its own metadata.
- Treat recognition, valuations and upload scanning as explicit session-only demos; no server persistence or real AI is implied.
- Keep live challenge recording and its ownership badges explicitly simulated and isolated from gallery uploads; client timers cannot establish ownership or server verification.
- Define visual roles and control variants in the global stylesheet and shared Button so the luxury theme remains coherent.
- Keep grid/player selection in the feed and clean-view state in the shared provider so video overlays and shell navigation fade together without interrupting playback.
- Use generated watch photography and CDN-hosted looping cinematic mock films, not live brand footage; this keeps demo media available without external hotlinks.
- Keep Instagram caption and watermark previews local to the upload editor, separate from the native feed post, because simulated cross-post settings must not imply a real export or alter WRISTORY playback.
- Use react-zoom-pan-pinch on the existing video element for macro inspection, with local per-post transforms and shared clean-view state, so gestures remain bounded and playback never remounts on entry or exit.

- Auth identity comes from Lovable Cloud sessions; roles live only in user_roles (checked via has_role) and profile column grants limit edits, so privileges can never be self-assigned.
- isDemoMode (true only when VITE_BACKEND_MODE=demo; server mode is the default) gates the DEMO role switcher; mock community state stays the default until server adapters replace it per feature.
- watch_catalog is written only by service_role/migrations; anon/authenticated get SELECT only and RLS exposes confirmed rows — the catalog is a reference list, not ownership proof.
- owned_watches: owner_id is forced from auth.uid() by trigger and never accepted from clients; only owner-scoped RLS exists (no public SELECT), so purchase data stays private even when visibility becomes public.
- Server-mode screens live in server-views.tsx and are swapped in per route via isDemoMode; demo components stay untouched so the two data sources never mix.
- Posts/likes/saves/comments/follows are written through the browser client with owner-only RLS; public reads go only through narrow definer functions (get_feed, get_like_summary, get_post_comments, get_follow_counts) so tables never have open SELECT policies and liker/follower lists stay private; posts_guard forces author and author-folder video paths.
- Post videos live in the private post-media bucket under <uid>/; storage reads are owner-only and other viewers get short-lived signed URLs from the signPlaybackUrls server function, which signs only files referenced by a post (workspace blocks public buckets).
- Profiles rows are owner-only; other users and visitors read only handle, display name and photo via get_public_profiles/get_public_profile_by_handle, so bios and future private profile fields never leak.
- Server-mode video: grid cards never mount video; they batch-authorize signed URLs for at most four on-screen cards into the per-video playback cache, and fullscreen mounts only the active post plus one preload that attaches after the active first frame — keeps media downloads bounded and gives the chosen video first bandwidth.
- deletePost removes the post row before the file and reports cleanup failure with an owner-only retry, because row removal revokes public access and a missing file must never leave a broken post.
- Creation sheets use their own viewport-aware shell, not global BottomSheet changes, to keep unrelated drawers stable.
- Collection-to-post selection uses an explicit identification-only projection with no collection ID or purchase fields, to preserve private data and avoid permanent links.
- Primary button surfaces use shared static metallic tokens; non-button accents remain solid for readability and semantic states stay independent.
- Recognition prepares human-labelled complementary frames locally and sends only one explicitly selected image to the unchanged identifyWatch; multi-image contracts stay mock-only until separately approved.
- Treat watch identity as an atomic group, revalidate brand/model/full reference with brand-specific normalization, require user selection for every AI candidate and explicit consent before replacing edited identity; confidence cannot authorize catalog attachment.

- Keep G1 behind a development-build plus explicit query opt-in, with a separate mock draft and no publication callback; this prevents preview identities or editorial placeholders from entering real post writes.
- G1 mock adapters import no Gateway or server runtime and story panels are metadata-only siblings of video; this preserves network isolation and playback identity.
- Keep G3 real contracts separate from G1, its authenticated endpoint unconditionally disabled with no provider/quota import, and its development workspace local mock-only; header screening cannot authorize inference without full decoding and ingress protection.
- /demo and /demo/collector/$handle render existing demo components only when import.meta.env.DEV is true, and DemoRouteContext keeps collector links inside /demo (editor live preview); production builds, including the published site and built previews, 404 there, because preview and published share build-time env and VITE_BACKEND_MODE cannot separate them.
- The shell derives demo scope from the URL (isDemoPath, DEV-only) and publishes it to the community provider: inside /demo, auctions are seeded session-only from existing auctionPosts data and exposed only while in scope, and every creation entry is refused with no real upload sheet mounted, so demo bids never reach real pages or server writes.
