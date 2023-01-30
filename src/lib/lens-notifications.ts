import type {Notification, NotificationRequest} from "../graph/lens-service";
import {AsyncNotifications} from "../graph/lens-service";

/**
 * Returns an array of notifications or an empty array if none were found.
 */
export const getNotifications = (request: NotificationRequest): Promise<Notification[]> => {
    return AsyncNotifications({variables: {request}})
        .then(res => {
            if (res.data.notifications) {
                return res.data.notifications.items as Notification[];
            }
            return [];
        })
};