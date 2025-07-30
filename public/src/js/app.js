"use strict";

// Log startup
console.log('loading app...');

// Global vars
var deferredPrompt, fcmToken;

// Import Firebase SDKs
import { initializeApp } from "firebase/app";
import { getMessaging, onMessage } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";

// Import Firebase Config
import { activeConfig } from "./paperConfigs.js";

// Import helpers
import { enableNotifications, foregroundMessageHandler, getFcmToken } from "./fcm.js";
import { logBackgroundPush } from "./logger.js";
import { updatePushLog } from "./log.js";
import { retrieveDebugs, retrieveKvasirDatas, retrieveListened, retrieveLog, writeDebug } from "./idbUtils.js";
import { download, formatDate } from "./fileUtils.js";
import { refreshDebugList } from "./debug.js";

writeDebug('app::onload', {
    text: 'Loading app...',
    userAgent: navigator.userAgent,
    activeConfig,
});

// Initialize Firebase
const app = initializeApp(activeConfig.firebaseConfiguration);
const messaging = getMessaging(app);
const analytics = getAnalytics(app);

// HTML Elements
var enableNotificationsButtons = document.querySelectorAll('.enable-notifications');
var copyTokenButtons = document.querySelectorAll('.copy-token');
var installPWAButtons = document.querySelectorAll('.install-pwa');
var fcmTokenFields = document.querySelectorAll('.fcm-token');
var pushLogDivs = document.querySelectorAll('.push-log');
var kvasirInputs = document.querySelectorAll('.kvasir-input');
var kvasirButtons = document.querySelectorAll('.kvasir-button');
var newspaperNameFields = document.querySelectorAll('.newspaper-name');
var userAgentFields = document.querySelectorAll('.user-agent');
var debugFields = document.querySelectorAll('.debug-field');
var referrerFields = document.querySelectorAll('.referrer-field');

// Set foreground message handler
onMessage(messaging, foregroundMessageHandler(analytics));

// Register ServiceWorker
if ('serviceWorker' in navigator) {
    console.log('registering service worker...');
    navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
            console.log('Service worker registered!');
        });
}
else {
    console.log('service worker not supported!');
}

// Capture "beforeinstallprompt" so it may be fired later
window.addEventListener('beforeinstallprompt', (event) => {
    console.log('beforeinstallprompt fired');
    event.preventDefault();
    deferredPrompt = event;
    installPWAButtons.forEach(element => element.removeAttribute('disabled'));
    return false;
});

// Log push that happened while in background
const syncBackgroundPush = async () => {
    await logBackgroundPush(analytics);
}
window.addEventListener('focus', syncBackgroundPush);
await syncBackgroundPush();

const retrieveFCMToken = () => {
    getFcmToken(messaging, activeConfig.vapidPublicKey, (token) => {
        writeDebug('app::enableNotifications', {
            text: 'FCM Token received',
            token: token,
        });
        fcmToken = token;
        fcmTokenFields.forEach(element => element.innerHTML = fcmToken);
        copyTokenButtons.forEach(element => element.removeAttribute('disabled'));
    });
};

// Click handlers
enableNotificationsButtons.forEach(element => {
    element.addEventListener('click', () => {
        enableNotifications()
            .then((isGranted) => {
                writeDebug('app::enableNotifications', {
                    text: 'Permission check completed',
                    isGranted: isGranted,
                });
                if (isGranted)
                    retrieveFCMToken();
            });
    });
});
if (Notification.permission == 'granted') {
    enableNotificationsButtons.forEach(element => {
        element.setAttribute('disabled', true);
    });
    retrieveFCMToken();
}

copyTokenButtons.forEach(element => {
    element.addEventListener('click', () => {
        if (fcmToken) {
            navigator.clipboard.writeText(fcmToken)
                .catch((event) => {
                    alert('Failed to copy: ' + event.toString());
                });
        }
        else {
            alert('Token is undefined... Enable notifications first!');
        }
    });
});

installPWAButtons.forEach(element => {
    element.addEventListener('click', () => {
        console.log('Install PWA clicked!', element);
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                console.log(choiceResult.outcome);
                if (choiceResult.outcome === 'dismissed') {
                    console.log('User cancelled installation');
                } else {
                    console.log('User added to home screen');
                }
            });
            deferredPrompt = null;
        }
        element.setAttribute('disabled', true);
    });
});

// Run on load and on clicking 'Process'
updatePushLog(pushLogDivs, kvasirInputs);
kvasirButtons.forEach(element => element.addEventListener('click', () => {
    updatePushLog(pushLogDivs, kvasirInputs);
}));

document.querySelectorAll('a.kvasir-link').forEach(element => element.href = `https://services.api.no/api/kvasir/v1/feed/${activeConfig.siteKey}/e1`);

setTimeout(() => {
    // console.log(newspaperNameFields);
    newspaperNameFields.forEach(element => {
        element.innerHTML = activeConfig.siteKey;
    });

    userAgentFields.forEach(element => {
        element.innerHTML = navigator.userAgent;
    });

    debugFields.forEach(element => {
        let matchMedia = window.matchMedia ? window.matchMedia('(display-mode: standalone)') : { matches: -1, media: -1 };
        element.innerHTML = [
            `matchMedia${matchMedia.media}: ${matchMedia.matches}`,
            `navigator.standalone: ${window.navigator.standalone}`,
            `document.referrer: ${document.referrer}`,
            `location: ${window.location}`,
            `pushSubscription: <i><span class="pushSubscriptionEndpoint">unknown</span></i>`,
        ].join('<br \\>');
    });
    referrerFields.forEach(element => {
        element.innerHTML = document.referrer;
    });
    navigator.serviceWorker.ready.then((serviceWorkerRegistration) => {
        serviceWorkerRegistration.pushManager.getSubscription().then((sub) => {
            if (!sub) {
                console.warn('Returned falsish sub', sub);
                return;
            }
            console.log(sub);
            document.querySelectorAll('.pushSubscriptionEndpoint').forEach(element => element.innerHTML = sub.endpoint);
        });
    });
}, 500);

document.querySelectorAll('.export-log').forEach(element => element.addEventListener('click', async () => {
    const logArray = await retrieveLog();
    if (!logArray || logArray.length == 0) {
        alert('No stored data in log');
        console.log('Log empty:', logArray);
        return;
    }
    download(JSON.stringify(logArray), `${formatDate()}_pushLog.json`, 'application/json');
}));

document.querySelectorAll('.export-kvasir').forEach(element => element.addEventListener('click', async () => {
    const kvasirs = await retrieveKvasirDatas();
    if (!kvasirs || kvasirs.length == 0) {
        alert('No stored data from Kvasir');
        console.log('Kvasirs empty:', kvasirs);
        return;
    }
    download(JSON.stringify(kvasirs), `${formatDate()}_kvasirs.json`, 'application/json');
}));

document.querySelectorAll('.export-events').forEach(element => element.addEventListener('click', async () => {
    const listenedArray = await retrieveListened();
    if (!listenedArray || listenedArray.length == 0) {
        alert('No stored data to export');
        console.log('Push events empty: ', listenedArray);
        return;
    }
    download(JSON.stringify(listenedArray), `${formatDate()}_pushEvents.json`, 'application/json');
}));

document.querySelectorAll('.export-debug').forEach(element => element.addEventListener('click', async () => {
    const debugArray = await retrieveDebugs();
    if (!debugArray || debugArray.length == 0) {
        alert('No debug data to export');
        console.log('Debugs empty: ', debugArray);
        return;
    }
    download(JSON.stringify(debugArray), `${formatDate()}_debugData.json`, 'application/json');
}));

window.addEventListener('focus', refreshDebugList);
document.querySelectorAll('.debug-filter').forEach(element => element.addEventListener('change', refreshDebugList));
refreshDebugList();

document.querySelectorAll('.simulate-notification').forEach((element) => {
    element.addEventListener('click', () => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((serviceWorkerRegistration) => {
                let options = {
                    "badge": "/src/images/icons-polpos/badge.png",
                    "body": "this is a test notification",
                    "icon": "/src/images/test-icon.png",
                    "image": "/src/images/test-image.png",
                    "tag": "test-notification",
                    "requireInteraction": true,
                    "silent": false,
                };
                console.log("Showing notification from ", serviceWorkerRegistration, options);
                serviceWorkerRegistration.showNotification("Test notification", options);
            });
        }
    });
});

document.querySelectorAll('.newspaper-link').forEach((element) => {
    element.href = activeConfig.frontpage;
});
