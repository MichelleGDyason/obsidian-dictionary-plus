<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { Synonym } from "src/integrations/types";
  import type { Coords } from "./synonymPopover";

  export let coords: Coords;
  export let synonyms: Synonym[];
  export let onSelect: (selection: string) => void;
  export let onClickOutside: () => void;

  function init(node: HTMLElement) {
    // Reposition the popover to fit on screen, if needed
    const height = node.clientHeight;
    const width = node.clientWidth;
    const ownerDocument = node.doc;
    const ownerWindow = node.win;

    if (coords.bottom + height > ownerWindow.innerHeight) {
      node.style.setProperty("top", `${coords.top - height}px`);
    }

    if (coords.left + width > ownerWindow.innerWidth) {
      node.style.setProperty("left", `${ownerWindow.innerWidth - width - 15}px`);
    }
    
    // Fire onClickOutside if anything but the popover is clicked
    function onBodyPointerUp(e: MouseEvent) {
      if (!node.contains(e.target as Node)) {
        ownerDocument.body.removeEventListener("pointerup", onBodyPointerUp);
        onClickOutside();
      }
    }

    ownerDocument.body.addEventListener("pointerup", onBodyPointerUp);
  }

  function selectOnKeyboard(event: KeyboardEvent, word: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(word);
    }
  }
</script>

<div
  use:init
  style="left: {coords.left}px; top: {coords.bottom}px"
  class="dict-s-popover"
  in:fade="{{ duration: 50 }}"
>
  {#each synonyms as synonym}
    <div
      class="dict-s-popover__select-option"
      role="button"
      tabindex="0"
      on:click={() => onSelect(synonym.word)}
      on:keydown={(event) => selectOnKeyboard(event, synonym.word)}
    >
      <div class="dict-s-popover__select-label">
        <div class="dict-s-popover__term">{synonym.word}</div>
        {#if !!synonym.partsOfSpeech?.length}
          <div class="dict-s-popover__meta-pos">{synonym.partsOfSpeech.join(", ")}</div>
        {/if}
      </div>
      {#if synonym.description}
        <div class="dict-s-popover__meta-description">{synonym.description}</div>
      {/if}
    </div>
  {/each}
</div>

<style lang="scss">
  .dict-s-popover {
    min-width: 210px;
    max-width: 250px;
    max-height: 200px;
    background-color: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    position: absolute;
    z-index: var(--layer-popover);
    border-radius: 5px;
    box-shadow: 0px 15px 25px rgba(0, 0, 0, 0.2);
    font-size: 14px;
    overflow-y: auto;
    overflow-x: hidden;
    line-height: 1.4;
  }

  .dict-s-popover__select-option {
    cursor: pointer;
    padding: 10px;
    border-bottom: 1px solid var(--background-modifier-border);
  }

  .dict-s-popover__select-option:hover {
    background-color: var(--background-secondary);
  }

  .dict-s-popover > .dict-s-popover__select-option:last-child {
    border-bottom: none;
  }

  .dict-s-popover__select-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dict-s-popover__meta-description,
  .dict-s-popover__meta-pos {
    font-size: 12px;
    color: var(--text-muted);
  }

  .dict-s-popover__meta-pos {
    display: inline-block;
    margin-left: 10px;
  }
</style>
