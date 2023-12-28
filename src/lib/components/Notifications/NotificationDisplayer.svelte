<script lang="ts">
    import { notifications, Notifications } from './Notifications';
    import { flip } from 'svelte/animate';
</script>

<div class="notifications-backdrop">
    <!-- position notifications relative to this-->
    <div class="notifications-position">
        {#each $notifications as { id, level, message, visible } (id)}
            <!-- an individual notification-->
            <div class="notification {level}" class:fadeout={!visible} animate:flip>
                <p>{message}</p>
                <button
                    on:click={() => {
                        Notifications.remove(id);
                    }}>X</button
                >
            </div>
        {/each}
    </div>
</div>

<style lang="less">
    @import '$styles/styles.less';

    .notifications-backdrop {
        @z-index: 1000;

        position: fixed;
        top: 0;
        left: 0;

        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;

        pointer-events: none;

        width: 100vw;
        height: 100vh;

        padding-bottom: 40px;

        .notifications-position {
            position: relative;
            width: 100%;
            max-width: 400px;
            height: 0px;

            .notification {
                @first-card-pos: -80px;

                visibility: hidden;
                pointer-events: all;

                position: absolute;

                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;

                width: 100%;
                max-width: 400px;

                scale: 0;
                opacity: 0;
                top: @first-card-pos + 60px;

                border-radius: 10px;

                background-color: @bg;
                box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.1);
                border: 1px solid @bg-300;

                &:nth-last-child(1) {
                    @nth: 0;
                    visibility: visible;
                    top: @first-card-pos;
                    scale: 1;
                    opacity: 1;
                }
                &:nth-last-child(2) {
                    @nth: 1;
                    visibility: visible;
                    top: @first-card-pos + 35px;
                    scale: 0.95;
                    opacity: 1;
                }
                &:nth-last-child(3) {
                    @nth: 2;
                    visibility: visible;
                    top: @first-card-pos + 50px;
                    scale: 0.85;
                    opacity: 1;
                }
                &:nth-last-child(4) {
                    @nth: 3;
                    visibility: visible;
                    top: @first-card-pos + 60px;
                    scale: 0.6;
                    opacity: 0.5;
                }

                &.fadeout {
                    opacity: 0;
                    transition: opacity 100ms ease; // related to FADE_OUT_TIME_MS in the script block
                }
            }
        }
    }
</style>
