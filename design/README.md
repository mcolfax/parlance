# Design explorations

Options for Parlance's next look, for Matt to review. They live in Claude Design:
**https://claude.ai/artifact/Qzi2d6c6LteToAfVtkPqJd** (private to Matt until shared).

- **Style directions:** Now (Petrol & Saffron), A · Señal (transit signage), B · Selva (jungle pop), C · Noche (night tram). Each shows the Learn screen plus palette, type, buttons, feedback banners and controls. Use the Language switch in Tweaks to see the Spanish line color.
- **Pip:** today's Pip plus four parrots, each in three moods: Rojo (scarlet macaw), Kiwi (budgie), Kakadu (cockatoo), Mango (yellow-headed amazon).
- **Cast styles:** Flat, Ink and spot color, Sticker, each shown with Lena, Emre, Sofía and Diego.

`concepts/make_art.py` draws the parrot and cast concept art as SVG into `concepts/art/`. When a direction is chosen, port it into `styles/tokens.css` and `js/core/art.js`. The app itself doesn't load anything from this folder.
