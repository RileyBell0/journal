import { get, readable, writable, type Writable } from "svelte/store";

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

/**
 * This relates to the fade out time of `.fadeout` in `NotificationDisplayer.svelte`
 */
const FADE_OUT_TIME_MS = 90;

/**
 * Handles interractions with our displayed notifications
 */
class Notifications {
    static #currID = 0; // for getting unique IDs for elements
    static #internalNotifications: Writable<Notification[]> = writable([]);

    /**
     * The currently visible notifications (including those that are fading out)
     */
    static notifications = readable<Notification[]>([], (set) => {
        return this.#internalNotifications.subscribe((data) => {
            set(data);
        });
    });

    /**
     * Adds a notification with the given level and message to the screen
     *
     * @param level The level of the notification
     * @param message The message to display in the notification
     */
    static #add(level: NotificationType, message: string) {
        // Make the notification
        const id = this.#currID++;
        const newNotification = { id, level, message, visible: true };

        const newNotifications = get(this.#internalNotifications);
        newNotifications.push(newNotification);

        // Record it
        this.#internalNotifications.set(newNotifications);
    };

    /**
     * Create an error notification
     *
     * @param message the message to display in the error notification
     */
    static error(message: string) {
        this.#add(NotificationType.Error, message);
    };

    /**
     * Removes the given notification, fading it out first
     *
     * @param id the ID of the notification to be removed
     */
    static remove(id: number) {
        // Get the notification, ensure it exists and isn't currently being hidden
        const notification = get(this.#internalNotifications).find((notification) => notification.id === id);
        if (notification === undefined || !notification.visible) {
            return;
        }

        // Fade out the notification (quickly)
        notification.visible = false;
        this.#internalNotifications.set(get(this.#internalNotifications));

        // Then remove it
        setTimeout(() => {
            this.#internalNotifications.set(get(this.#internalNotifications).filter((notification) => notification.id !== id));
        }, FADE_OUT_TIME_MS);
    };
}

/**
 * The currently visible notifications (including those that are fading out)
 */
const notifications = Notifications.notifications;

export { type Notification, NotificationType, Notifications, notifications };