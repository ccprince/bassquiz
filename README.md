# bassquiz

A browser app for learning the bass fretboard. It names a note and a string, listens through the microphone, and tells you whether you played it.

See [GLOSSARY.md](./GLOSSARY.md) for the project's vocabulary.

```sh
npm install
npm run dev     # http://localhost:5173 (the mic works on localhost)
npm test
npm run build
```

Pushing to `main` deploys to GitHub Pages (enable Pages with source "GitHub Actions" in the repo settings). The microphone needs HTTPS, which Pages provides, so it also works on a tablet.
