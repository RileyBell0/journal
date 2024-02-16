<script lang="ts">
    export let show = true;
    export let canClose = true;

    function closeOnEscape(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            closePopup();
        }
    }

    function closePopup() {
        if (!canClose) {
            return;
        }

        show = false;
    }

    // Prevent the click event from propagating to the background
    function handlePopupClick(event: MouseEvent) {
        event.stopPropagation();
    }
</script>

<button class="popup-backdrop" hidden={!show} on:click|self={closePopup} on:keydown={closeOnEscape}>
    <slot />
</button>

<style lang="less">
    .popup-backdrop {
        z-index: 100;

        position: fixed;
        top: 0;
        left: 0;

        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;

        background-color: rgba(0, 0, 0, 0.5);

        width: 100vw;
        height: 100vh;

        cursor: default;

        &[hidden] {
            display: none !important;
        }
    }
</style>
