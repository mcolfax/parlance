# Design explorations

Options for Parlance's next look, for Matt to review.

- **Figma (main working file):** https://www.figma.com/design/ZOAqSm0kQAjzkppKF0jLlS. It has three pages: Style directions, Pip and Cast. Screens are editable layers, colors are Figma variables (one collection per direction), and Pip and the cast are editable vectors.
- **Claude Design (first pass):** https://claude.ai/artifact/Qzi2d6c6LteToAfVtkPqJd, private to Matt until shared.

**Decision so far:** Matt picked **Selva** (direction B) as the style. Pip and the cast style are still open.

- **Style directions:** Now (Petrol & Saffron), A · Señal (transit signage), B · Selva (jungle pop), C · Noche (night tram). Each shows the Learn screen plus palette, type, buttons, feedback banners and controls. Use the Language switch in Tweaks to see the Spanish line color.
- **Pip:** today's Pip plus four parrots, each in three moods: Rojo (scarlet macaw), Kiwi (budgie), Kakadu (cockatoo), Mango (yellow-headed amazon).
- **Cast styles:** Flat, Ink and spot color, Sticker, each shown with Lena, Emre, Sofía and Diego.

**Character rig:** Pip is traced from the model sheet and rigged in Blender in [`rig/`](rig/README.md): `rig/blender/pip.blend` holds the bones, moods and moves, and a three.js player shows it. It's reviewed at https://claude.ai/artifact/Hcm6kmpuy6GhhNZEsTZtSF. The traced part sheet and the earlier SVG rig are in `rig/` too, and the concept sheets for all five birds are in `rig/reference/`.

`concepts/make_art.py` draws the parrot and cast concept art as SVG into `concepts/art/`. When a direction is chosen, port it into `styles/tokens.css` and `js/core/art.js`. The app itself doesn't load anything from this folder.
