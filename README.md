# Note board

A small static web app and a dependency-free text library.

- `lib/textkit.js` exports `titleCase`, `slugify`, and `summarize`.
- `web/` is the note board. It formats each note with that library.

Serve the repository root so the page can import the library:

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/web/`.
