
import { writeDebug } from "./idbUtils.js";

// ###
// # Utility
// ###

function objectFromWindowClient(windowClient) {
    return {
        focused: windowClient.focused,
        frameType: windowClient.frameType,
        id: windowClient.id,
        type: windowClient.type,
        url: windowClient.url,
        visibilityState: windowClient.visibilityState,
    }
}


// ###
// # Click Handler
// ###

self.onnotificationclick = (event) => {
    // todo: doesn't work properly
    // - Works:
    //   - Firefox on Arch
    //   - Chromium on Arch
    //   - TWA/Brave on Android
    // - Doesn't work?:
    //   - Firefox on Android (opens browser, but not the URL)

    // todo: await writeDebug?
    console.log('notification clicked ', event);
    writeDebug('SW::onnotificationclick', {
        text: 'notification clicked',
        event: JSON.stringify(event),
    });
    console.log('notification data ', event.notification.data);
    const { origin } = self.location;
    const { articleUrl } = event.notification.data;

    event.notification.close();

    let pushUrl = `${origin}/`; // fallback url
    pushUrl = new URL(articleUrl, origin).href;

    console.log('pushUrl', pushUrl);
    writeDebug('SW::onnotificationclick', {
        text: 'pushUrl resolved',
        pushUrl,
        origin,
        articleUrl,
    });

    const promiseChain = clients
        .matchAll({
            type: 'window',
            includeUncontrolled: true,
        })
        .then((windowClients) => {
            console.log('windowClients', windowClients);
            writeDebug('SW::onnotificationclick', {
                text: 'resolved WindowClients',
                pushUrl,
                windowClients: windowClients.map(objectFromWindowClient),
            });
            let matchingClient = null;

            for (let i = 0; i < windowClients.length; i++) {
                const windowClient = windowClients[i];
                if (windowClient.url === pushUrl) {
                    matchingClient = windowClient;
                    break;
                }
            }

            if (matchingClient) {
                console.log('found hit and focus client, ', matchingClient);
                writeDebug('SW::onnotificationclick', {
                    text: 'found hit and focus client',
                    pushUrl,
                    match: JSON.stringify(matchingClient),
                    windowClients: windowClients.map(objectFromWindowClient),
                });
                matchingClient.focus();
            } else {
                clients.openWindow(pushUrl)
                    .then((client) => {
                        console.log('open new window on client, ', client);
                        writeDebug('SW::onnotificationclick', {
                            text: 'open new window on client',
                            pushUrl,
                            client: JSON.stringify(client),
                            windowClients: windowClients.map(objectFromWindowClient),
                        });
                        client.focus();
                    })
                    .catch(err => {
                        console.log('clients.openWindow.catch: ', err);
                        writeDebug('SW::onnotificationclick', {
                            text: 'failed to open new window',
                            pushUrl,
                            error: JSON.stringify(err),
                        });
                    });
            }
        })
        .catch((err) => {
            console.log('windowClients.catch: ', err);
            writeDebug('SW::onnotificationclick', {
                text: 'failed to resolve windowsClients',
                pushUrl,
                error: JSON.stringify(err),
            });
        });

    event.waitUntil(promiseChain);
};
