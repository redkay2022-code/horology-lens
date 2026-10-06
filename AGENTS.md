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
