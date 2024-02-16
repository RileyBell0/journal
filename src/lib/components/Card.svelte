<script>
    export let forcePointerEvents = false;
</script>

<!-- A standard card backing -->
<div class="card" class:pointer-events={forcePointerEvents}>
    <slot />
</div>

<style lang="less">
    @import '$styles/definitions.less';

    .card {
        width: 100%;
        max-width: 650px;

        padding: 30px;

        background-color: @bg;
        border-radius: 10px;
        box-shadow: @shadow;
    }

    .pointer-events {
        pointer-events: all;
    }
</style>
