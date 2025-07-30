# push-app-pwa-poc
Proof of Concept for a Progressive Web App with push notifications


## Service Worker hashing

In order to log and identify what version of the ServiceWorker a user has active, the service worker (`public/sw.js`) is hashed and injected as a variable.
This is logged in the client, and may be used to identify the corresponding version, without needing to set up or keep track of version numbers.

This process is automated using the `npm run sw:hash:update` command, and may be enforced by the pre-commit hook in `.githooks/pre-commit`.
Enable this hook by setting the hookspath in your git-config: `git config --local core.hookspath .githooks`.


## Source and Building

The POC is written in JavaScript and the source code is located in `public/src/js`.
When it is bundled, two bundles are created: `public/main.js` and `public/sw.js`.

`main.js` is the main application source included by the HTML pages (`public/index.html`, `public/log/index.html`, `public/debug/index.html`).
It is bundled from the `public/js/app.js` and its imports.

`sw.js` is the service worker installed in the browser.
It is bundled from the `public/js/serviceWorker.js` and its imports.


## Running locally

The POC may be run locally: `npm run start`.


## Deployment

The POC is deployed using Firebase Hosting.
Use the helper command `npm run deploy:salsap`.

This helper command updates the service worker hash, bundles the project, ensures the user is logged into firebase, sets the correct target project and deploys it.
