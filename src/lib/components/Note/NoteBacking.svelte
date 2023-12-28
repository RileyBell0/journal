<!-- The standard card backing for a note -->
<div class="note-backing">
    <slot />
</div>

<style lang="less">
    @import '$styles/definitions.less';

    .note-backing {
        width: 100%;
        max-width: 650px;

        padding: 30px;

        background-color: @bg;
        border-radius: 10px;
        box-shadow: @shadow;
    }
</style>
