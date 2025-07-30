import { logEvent } from "firebase/analytics";
import { forEachBackgroundPush } from "./idbUtils.js";

export function logPush(key, value, analytics) {
    const id = value.articleId ? value.articleId : key;
    const event = `WEBPUSH_${value.receivedAt}_${id.toString().replaceAll('-', '_')}`;
    console.log(`Logging Firebase: ${event.substring(0, 40)}`);
    logEvent(analytics, event);
    logEvent(analytics, 'WEBPUSH_RECEIVE', {
        articleId: key.toString(),
        ...value,
    });
    logEvent(analytics, 'notification_receive');
}

export async function logBackgroundPush(analytics) {
    await forEachBackgroundPush((key, value) => {
        console.log(`Entry ${key} : ${value.receivedAt}`);
        logPush(key, value, analytics);
    });
}
