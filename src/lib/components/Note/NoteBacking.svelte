<!-- The standard card backing for a note -->
<div class="note-backing">
    <slot />
</div>

<style>
    .note-backing {
        width: 100%;
        max-width: 650px;

        padding: 30px;

        background-color: var(--bg);
        border-radius: 10px;
        box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.1);
    }
</style>
