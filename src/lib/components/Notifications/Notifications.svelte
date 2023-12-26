<script lang="ts">
    import { flip } from 'svelte/animate';

    const FADE_OUT_TIME_MS = 90;

    /**
     * The types of notifications that we can display - mapped
     * from their name to the class name for said error
     */
    enum NotificationType {
        Error = 'notification-error'
    }

    /**
     * The representation / data of a uniquely identifiable notification
     */
    type Notification = {
        id: number;
        level: NotificationType;
        message: String;
        visible: boolean;
    };

    // We use this to generate unique IDs for each active notification
    let currID = 0;

    let notifications: Notification[] = [];
    let notificationsMap: { [id: number]: Notification } = {};

    /**
     * Removes the given notification, fading it out first
     *
     * @param id the ID of the notification to be removed
     */
    const removeNotification = (id: number) => {
        // Get the notification, ensure it exists and isn't currently being hidden
        const notification = notificationsMap[id];
        if (notification === undefined || !notification.visible) {
            return;
        }

        // Fade out the notification (quickly)
        notification.visible = false;
        notifications = notifications;

        // Then remove it
        setTimeout(() => {
            notifications = notifications.filter((notification) => notification.id !== id);
        }, FADE_OUT_TIME_MS);
    };

    /**
     * Adds a notification with the given level and message to the screen
     *
     * @param level The level of the notification
     * @param message The message to display in the notification
     */
    const add = (level: NotificationType, message: string) => {
        // Make the notification
        const id = currID++;
        const newNotification = { id, level, message, visible: true };

        // Record it
        notifications.push(newNotification);
        notificationsMap[id] = newNotification;
    };

    /**
     * Create an error notification
     *
     * @param message the message to display in the error notification
     */
    export const error = (message: string) => {
        add(NotificationType.Error, message);
    };
</script>

<div class="notifications-backdrop">
    <div class="notifications-base">
        {#each notifications as { id, level, message, visible } (id)}
            <div class="notification-example {level}" class:fadeout={!visible} animate:flip>
                <p>{message}</p>
                <button
                    on:click={() => {
                        removeNotification(id);
                    }}>X</button
                >
            </div>
        {/each}
    </div>
</div>

<style lang="less">
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

        .notifications-base {
            position: relative;
            width: 100%;
            max-width: 400px;
            height: 0px;

            .notification-example {
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

                background-color: var(--bg);
                box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.1);
                border: 1px solid var(--bg-300);

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
