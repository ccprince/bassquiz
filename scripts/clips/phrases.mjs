// Prints every phrase a drill can say, with its clip's file name, as JSON for generate.py.
import { runnerImport } from 'vite'

const { module: spoken } = await runnerImport(new URL('../../src/lib/spoken.ts', import.meta.url).pathname)
const phrases = spoken.everyPhrase().map((phrase) => ({ phrase, file: spoken.clipFile(phrase) }))
console.log(JSON.stringify(phrases))
