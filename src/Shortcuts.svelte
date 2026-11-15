<script lang="ts">
  import { type Shortcut, keyLabel, shortcutFor } from './lib/shortcuts'

  interface Props {
    /** The current screen's shortcuts; ? always shows them. */
    shortcuts: Shortcut[]
  }

  let { shortcuts }: Props = $props()

  let dialog: HTMLDialogElement
  let open = $state(false)

  function show() {
    dialog.showModal()
    open = true
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === '?' && !e.repeat) {
      e.preventDefault()
      if (open) dialog.close()
      else show()
      return
    }
    // The dialog closes itself on Escape.
    if (open) return
    const found = shortcutFor(shortcuts, e)
    if (!found) return
    // Also keeps the key from pressing a focused button or scrolling.
    e.preventDefault()
    found.shortcut.run(found.key)
  }
</script>

<svelte:window {onkeydown} />

<button class="secondary open" onclick={show} aria-label="Keyboard shortcuts" aria-keyshortcuts="?">?</button>

<dialog bind:this={dialog} onclose={() => (open = false)} aria-labelledby="shortcuts-title">
  <h2 id="shortcuts-title">Keyboard shortcuts</h2>
  <dl>
    {#each shortcuts as shortcut (shortcut.does)}
      <div>
        <dt>{#each shortcut.keys as key (key)}<kbd>{keyLabel(key)}</kbd>{/each}</dt>
        <dd>{shortcut.does}</dd>
      </div>
    {/each}
    <div>
      <dt><kbd>?</kbd></dt>
      <dd>Show or hide this list</dd>
    </div>
  </dl>
  <form method="dialog">
    <button class="secondary">Close</button>
  </form>
</dialog>

<style>
  .open {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border-radius: 50%;
    font-weight: 700;
  }
  /* Shortcuts are for keyboards; a phone or tablet has none to press. */
  @media (hover: none) and (pointer: coarse) {
    .open {
      display: none;
    }
  }
  dialog {
    background: var(--surface);
    color: var(--text);
    border: none;
    border-radius: 0.75rem;
    padding: 1.25rem;
    width: min(26rem, calc(100vw - 2rem));
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
  }
  dl {
    margin: 0;
  }
  dl div {
    display: grid;
    grid-template-columns: 7rem 1fr;
    gap: 0.75rem;
    padding: 0.35rem 0;
  }
  dt {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  dd {
    margin: 0;
  }
  kbd {
    margin: 0;
  }
  form {
    margin-top: 1rem;
    text-align: right;
  }
</style>
