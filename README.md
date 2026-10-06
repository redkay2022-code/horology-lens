# Timekeeper Collective

Build a modern, high-end vertical short-form video web app dedicated purely to luxury watch appreciation, horology enthusiasts, and collection showcasing ("Horology / WatchTok Vertical Platform"). 



CRITICAL DIRECTION:

- Absolutely NO marketplace, e-commerce, buying/selling, or escrow features.

- Focus strictly on visual aesthetics, mechanical appreciation, community engagement, and technical specs.



Design & Aesthetic System:

- Dark Mode Luxury Theme: Deep charcoal (#0D0F12) background, champagne gold (#D4AF37) accents, crisp white/gray typography.

- Mobile-First Viewport: Responsive mobile layout (centered inside a sleek mobile frame on desktop with ambient background glow).



Core App Layout & Features:



1. Vertical Video Feed (Main View):

- Full-screen snap-scrolling video player (TikTok / Reels style).

- Background video looping mock sample short-form videos featuring watches like Rolex Submariner, Audemars Piguet Royal Oak, Patek Philippe Nautilus, and Omega Speedmaster.

- Daily Challenge Banner (Top Overlay): Floating pill banner showing "Today's Ritual: #WOTD (Watch Of The Day)".

- Top Category Navigation Bar: Horizontal scroll pills ("For You", "Rolex", "Vintage", "Microbrands", "Complications", "Lume Shots", "ASMR Sound").

- Video Controls Overlay (Right Side):

  - Creator Avatar with (+) Follow button.

  - Heart / Like button with smooth counter animation.

  - Comment button (opens Slide-Up Comment Sheet).

  - Bookmark/Save button.

  - Share button.

  - Macro-Zoom Toggle Button (Simulates high-definition close-up preview).

  - ASMR Audio Mode Toggle Button (Highlights mechanical ticking/rotor sound badge).

- Video Info Overlay (Bottom Left):

  - Creator handle, caption, and hashtags (#Rolex #WOTD).

  - Interactive Wrist Size Badge: e.g., "📏 Worn on 16.5cm / 6.5\" Wrist".

  - Interactive AI Spec Tag Badge: "✨ AI Recognized: Rolex Submariner Date (Ref. 126610LN) • 98% Match".



2. Interactive AI Spec Sheet (Slide-Up Bottom Drawer):

- Clicking the AI Spec Badge slides up a detailed bottom drawer titled "Watch Technical Specifications":

  - Header: Watch Name, Reference Number, Release Year (e.g., "Released in 2020"), and "AI Confidence Score: 98%".

  - Price & Market Trend Card:

    - Original Retail Price (MSRP): $10,250

    - Estimated Market Value: $14,200 (+38.5%)

    - Interactive 12-Month Market Price Trend Line Chart (mock visual).

  - Technical Specs Grid:

    - Movement: Caliber 3235 (Automatic, 70-hr Power Reserve, 28,800 vph)

    - Dimensions: 41mm Diameter • 12mm Thickness • 48.1mm Lug-to-Lug

    - Dial & Bezel: Black Dial • Cerachrom Ceramic Bezel

    - Water Resistance: 300m / 1,000 ft

  - Interactive Action: Clicking any spec (e.g., "41mm" or "Caliber 3235") filters the feed to show similar watches.



3. Deep Search & Discover Page (Bottom Nav - Discover):

- Search bar with instant autocomplete.

- Filter Bar Matrix: Filter videos by [Wrist Size Range], [Case Diameter (34mm - 44mm)], [Dial Color], [Movement Type (Automatic/Manual/Quartz)], and [Brand].

- Trending Grid: Showcase trending watch models and community challenges (#LumeShot, #MovementFriday).



4. Virtual Watch Box Profile ("Watchbox" - Profile Tab):

- User Profile Header: Avatar, Bio, Total Watch Count, Estimated Collection Value Badge.

- "Virtual Watch Box" Grid: Render user uploaded videos as a 3x3 luxury Velvet Tray Watch Box grid layout.

- Tabs: "My Collection", "Videos", "Saved Videos".



5. Video Upload & AI Scanner Modal (Bottom Nav - Upload +):

- Simulated Upload Screen: Dropzone for video files.

- Interactive "AI Scanning Progress Bar" that simulates scanning the video frame and auto-populating Watch Specs (Brand, Model, Ref #, Wrist Size).



Data & Interactivity State:

- Include 4-5 realistic mock feed items with high-quality looping videos.

- Make all UI buttons functional: Liking, opening/closing comments, opening the Spec Drawer, switching bottom tabs, filtering by category, and toggling Macro-Zoom/ASMR indicators.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://horology-lens.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a1eb0ed5-ee2f-493e-be8c-8ff9398debeb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
