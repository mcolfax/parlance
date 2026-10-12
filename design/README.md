# Design explorations

Options for Parlance's next look, for Matt to review.

- **Figma (main working file):** https://www.figma.com/design/ZOAqSm0kQAjzkppKF0jLlS. It has three pages: Style directions, Pip and Cast. Screens are editable layers, colors are Figma variables (one collection per direction), and Pip and the cast are editable vectors.
- **Claude Design (first pass):** https://claude.ai/artifact/Qzi2d6c6LteToAfVtkPqJd, private to Matt until shared.

**Decision so far:** Matt picked **Selva** (direction B) as the style, and it's built (Parlance 4.4.0: `styles/tokens.css` plus the shared building blocks in `styles/base.css`). Pip is decided too: the traced, rigged Pip below is in the app (Parlance 4.5.0). The four other parrots are traced and rigged the same way, and learners can pick one to learn with instead of Pip (Parlance 4.9.0, Me → Your bird). The cast style is still open.

- **Style directions:** Now (Petrol & Saffron), A · Señal (transit signage), B · Selva (jungle pop), C · Noche (night tram). Each shows the Learn screen plus palette, type, buttons, feedback banners and controls. Use the Language switch in Tweaks to see the Spanish line color.
- **Pip:** today's Pip plus four parrots, each in three moods: Rojo (scarlet macaw), Kiwi (budgie), Kakadu (cockatoo), Mango (yellow-headed amazon).
- **Cast styles:** Flat, Ink and spot color, Sticker, each shown with Lena, Emre, Sofía and Diego.

**Character rig:** all five birds are traced from their model sheets and rigged in Blender in [`rig/`](rig/README.md): `rig/blender/<bird>.blend` holds each bird's bones, moods and moves, and a three.js player shows them. They're reviewed at https://claude.ai/artifact/Hcm6kmpuy6GhhNZEsTZtSF (pick a bird at the top). The app draws the same birds with the rig's SVG runtime and part sheets, which live with the app in `js/core/` (`rig.js`, `bird.js`, `pip.js`, `kiwi.js`, `mango.js`, `kakadu.js`, `rojo.js`). The concept sheets are in `rig/reference/`.

`concepts/make_art.py` draws the parrot and cast concept art as SVG into `concepts/art/`. When a direction is chosen, port it into `styles/tokens.css` and `js/core/art.js`. The app itself doesn't load anything from this folder.
