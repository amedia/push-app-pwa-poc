
import { activeConfig } from "./paperConfigs.js";
import { writeDebug, recordBackgroundPush, recordListenedPush } from "./idbUtils.js";
import { swHash } from "./swHash.js";


// ###
// # Browser Events
// ###

self.addEventListener('install', async (event) => {
    const msg = `Installing Service Worker`;
    console.log('[Service Worker]', msg, swHash, event);
    await writeDebug('SW::install', {
        text: msg,
        hash: swHash,
        event: JSON.stringify(event),
    });
    // The promise that skipWaiting() returns can be safely ignored. (ref: MDN)
    self.skipWaiting();
});

self.addEventListener('activate', async (event) => {
    const msg = `Activating Service Worker`;
    console.log('[Service Worker]', msg, swHash, event);
    await writeDebug('SW::activate', {
        text: msg,
        hash: swHash,
        event: JSON.stringify(event),
    });
    event.waitUntil(clients.claim());
});

self.addEventListener('push', async function (event) {
    console.log("[Service Worker] Received push event", event);
    const data = event.data.json();
    console.log("pushEvent.data.json()", data);
    event.waitUntil(recordListenedPush(data));
});


// ###
// # Firebase Cloud Messaging
// ###

// set up click-handler before importing Firebase
// ref: https://firebase.google.com/docs/cloud-messaging/js/receive#setting_notification_options_in_the_service_worker
import "./notificationClickHandler.js";

// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

const firebaseApp = initializeApp(activeConfig.firebaseConfiguration);
const messaging = getMessaging(firebaseApp);

onBackgroundMessage(messaging, async (payload) => {
    console.log(
        '[sw.js] Received background message ',
        payload
    );
    const receivedAt = Date.now();
    // await writeDebug('SW::onbackgroundmessage', {
    //     text: 'received background message',
    //     payload,
    // });

    console.log('got background notification (data or notification message?)');
    console.log('payload from onBackgroundMessage', payload);
    console.log('service worker location', self.location);
    console.log('service worker self', self);

    // Customize notification here
    const { title, body, articleId, articleUrl, image } = payload.data;
    const notificationTitle = title;
    const notificationOptions = {
        body: body,
        badge: '/src/images/icons-polpos/drawable-xxxhdpi/ic_stat_name.png',
        image: null,
        icon: null,
        tag: articleId,
    };

    const data = {
        ...payload.data,
        receivedAt,
    };
    try {
        await recordBackgroundPush(data);
    } catch (e) {
        console.error('[Service Worker] record background push failed', e);
        await self.registration.showNotification('Error in background!', {
            body: `Please report to an administrator: ${e}`,
            badge: '/src/images/problem.svg',
            icon: '/src/images/problem.svg',
            image: '/src/images/problem.svg',
        });
    }

    if (image) {
        console.log(`Image: ${image}`);
        notificationOptions.image = image;
        notificationOptions.icon = image;
    } else {
        console.log("No image...");
    }

    notificationOptions.data = {
        articleUrl,
    };

    // only show notification if data-message
    if (payload.notification) {
        console.log("Using default FCM handler...");
        return;
    } else {
        console.log("Using custom notification handler...");
    }

    // await writeDebug('SW::onbackgroundmessage', {
    //     text: 'showing notification',
    //     title: notificationTitle,
    //     options: notificationOptions,
    // });
    console.log(`showing custom notification '${notificationTitle}'`, notificationOptions);

    await self.registration.showNotification(notificationTitle, notificationOptions);
});
