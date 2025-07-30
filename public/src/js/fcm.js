import { getToken } from "firebase/messaging";
import { logPush } from "./logger.js";
import { recordForegroundPush, writeDebug } from "./idbUtils.js";

export function foregroundMessageHandler(analytics) {
    return async (payload) => {
        console.log('Message received. ', payload);
        const receivedAt = Date.now();
        const { articleId } = payload.data;
        const data = { ...payload.data, receivedAt };
        await recordForegroundPush(data);
        logPush(
            articleId ? articleId : payload.messageId,
            data,
            analytics,
        );
    }
}

export async function enableNotifications() {
    const supportsNotificaton = 'Notification' in window;
    const supportsServiceWorker = 'serviceWorker' in navigator;

    writeDebug('fcm::enableNotifications', {
        text: 'EnableNotifications clicked',
        supportsNotificaton: supportsNotificaton,
        supportsServiceWorker: supportsServiceWorker,
        currentPermission: supportsNotificaton ? Notification.permission : 'n/a',
    });

    if (supportsNotificaton && supportsServiceWorker) {
        if (Notification.permission == 'denied') {
            console.log('User previously denied notifications');
            alert('Notification permission denied, please enable in your browser.');
            return false;
        } else if (Notification.permission == 'granted') {
            console.debug('Notification permission previously granted');
            return true;
        }

        // implicitly allows push as well
        const result = await Notification.requestPermission();
        writeDebug('fcm::enableNotifications', {
            text: 'Requested permission',
            result: JSON.stringify(result),
        });
        if (result == 'granted') {
            console.debug('Notification permission granted');
            return true;
        } else if (result == 'denied') {
            console.warn('Notification permission denied!');
            return false;
        } else if (result == 'default') {
            console.warn('User avoided providing permission!');
            return false;
        } else {
            throw `Unknown permission result ${result}`;
        }
    } else {
        const text = (
            'Unsupported browser!'
            + (supportsNotificaton ? '' : "\nMissing 'window.Notification'")
            + (supportsServiceWorker ? '' : "\nMissing 'navigator.serviceWorker'")
        );
        writeDebug('fcm::enableNotifications', {
            text: 'Unsupported browser',
            alert: text,
        });
        console.error(text);
        alert(text);
    }
    return false;
}

export function getFcmToken(messaging, vapidKey, onSuccess) {
    navigator.serviceWorker.ready.then(serviceWorkerRegistration => {
        getToken(messaging, { vapidKey, serviceWorkerRegistration })
            .then((currentToken) => {
                if (currentToken) {
                    console.log('token: ', currentToken);
                    onSuccess(currentToken);
                }
                else {
                    console.log('Notification permission has not been granted...');
                }
            })
            .catch((err) => {
                console.error('error retrieving token ', err);
                alert('An error occurred, please try again...');
            });
    });
}
