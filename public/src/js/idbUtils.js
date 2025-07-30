import { firebasePushRecords, kvasirData, debugData } from "./dbSchemes.js";


// ###
// # Utility
// ###

function onupgradeneeded_generic(idb, oldVersion, dbScheme) {
    for (let iterationVersion = oldVersion + 1; iterationVersion <= dbScheme.dbVersion; iterationVersion++) {
        dbScheme.stores
            .filter(it => it.addedInVersion == iterationVersion)
            .forEach(storeScheme => {
                idb.createObjectStore(storeScheme.storeName, {
                    keyPath: storeScheme.keyPath,
                    autoIncrement: storeScheme.autoIncrement,
                });
            });
    }
}

async function useIdb(dbScheme, onupgradeneeded = onupgradeneeded_generic) {
    return new Promise((resolve, reject) => {
        if (!dbScheme.dbVersion || dbScheme.stores.filter(it => !it.addedInVersion) > 0) {
            const errorMessage = 'There is an issue with the database configuration! Make sure the dbScheme has dbVersion and all storeSchemes define their addedInVersion!'
            if (alert)
                alert(errorMessage);
            console.error(errorMessage);
            reject(errorMessage);
            return;
        }
        const idbRequest = indexedDB.open(dbScheme.dbName, dbScheme.dbVersion);
        idbRequest.onerror = (event) => {
            const errorMessage = `Failed to open IDB: ${event}`
            console.error(errorMessage, event);
            if (alert)
                alert(errorMessage);
            reject(errorMessage);
        };
        idbRequest.onupgradeneeded = (event) => {
            const idb = event.target.result;
            const oldVersion = event.oldVersion;
            onupgradeneeded(idb, oldVersion, dbScheme);
        };
        idbRequest.onsuccess = (event) => {
            const idb = event.target.result;
            resolve(idb);
        };
    });
}

function getTransaction(idb, storeSchemes, mode = "readonly") {
    const transaction = idb.transaction(storeSchemes.map((storeScheme) => storeScheme.storeName), mode);
    transaction.oncomplete = (event) => {
        console.debug('Transaction completed: ', event);
    };
    transaction.onerror = (err) => {
        const errorMessage = `Transaction failed: ${err}`;
        console.error(errorMessage, err);
        if (alert)
            alert(errorMessage);
    };
    return transaction;
}

function getStore(idb, storeScheme, mode = "readonly") {
    const transaction = getTransaction(idb, [storeScheme], mode);
    const store = transaction.objectStore(storeScheme.storeName);
    return store;
}

async function addSingleData(store, data) {
    return new Promise((resolve, reject) => {
        try {
            const request = store.add(data);
            if (request) {
                request.onsuccess = () => {
                    console.debug('DB add success');
                    resolve();
                }
                request.onerror = (err) => {
                    const errorMessage = `DB add error ${err}`;
                    console.error(errorMessage, err);
                    if (alert)
                        alert(errorMessage);
                    reject(errorMessage);
                }
            }
        } catch (err) {
            reject(err);
        }
    });
}

async function addMultipleData(idb, storeSchemes, datas) {
    const transaction = getTransaction(idb, storeSchemes, "readwrite");
    for (const i in storeSchemes) {
        const storeScheme = storeSchemes[i];
        for (const j in datas) {
            const data = datas[j];
            await addSingleData(
                transaction.objectStore(storeScheme.storeName),
                data,
            );
        }
    }
}

async function performActionAndDeleteEachEntry(store, oneach) {
    return new Promise((resolve, reject) => {
        const retObj = { success: [], failed: [], deletionSuccess: [], deletionFailed: [] };

        const attemptedCursor = store.openCursor();
        attemptedCursor.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const key = cursor.key;
                console.debug(`Retrieving idb entry ${cursor.key} : ${cursor.value}`, event);
                oneach(cursor.key, cursor.value)
                    .then(() => {
                        retObj.success.push(key);
                        const request = cursor.delete();
                        request.onsuccess = (event) => {
                            console.debug(`Deleted entry ${key}`, event);
                            retObj.deletionSuccess.push(key);
                            cursor.continue();
                        };
                        request.onerror = (err) => {
                            console.error(`Failed to delete entry ${key}`, err);
                            retObj.deletionFailed.push(key);
                            cursor.continue();
                        };
                    })
                    .catch((err) => {
                        console.error(`OnEach failed for entry ${key}, skipping deletion...`, err);
                        retObj.failed.push(key);
                        cursor.continue();
                    });
            } else {
                console.debug('No more idb entries...');
                resolve(retObj);
            }
        };
        attemptedCursor.onerror = (err) => {
            const errorMessage = `Cursor failed: ${err}`;
            console.error(errorMessage, err);
            if (alert)
                alert(errorMessage);
            reject(errorMessage);
        };
    })
}

async function getAllValues(idb, storeScheme) {
    return new Promise((resolve, reject) => {
        const arr = [];

        const store = getStore(idb, storeScheme);
        const attemptedCursor = store.openCursor();
        attemptedCursor.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                console.debug(`Retrieving idb entry: ${cursor.key} : ${cursor.value}`, event);
                arr.push(cursor.value);
                cursor.continue();
            }
            else {
                console.debug('No more idb entries...');
                resolve(arr);
            }
        };
        attemptedCursor.onerror = (err) => {
            const errorMessage = `Cursor failed: ${err}`;
            console.error(errorMessage, err);
            if (alert)
                alert(errorMessage);
            reject(errorMessage);

        };
    });
}


// ###
// # Exports
// ###

export async function recordBackgroundPush(data) {
    await addMultipleData(
        await useIdb(firebasePushRecords),
        firebasePushRecords.stores.slice(0, 2),
        [{ ...data, background: true }],
    );
}

export async function recordForegroundPush(data) {
    await addMultipleData(
        await useIdb(firebasePushRecords),
        firebasePushRecords.stores.filter(storeScheme => storeScheme.storeName == 'pushLogRecords'),
        [{ ...data, background: false }],
    );
}

export async function forEachBackgroundPush(oneach) {
    const idb = await useIdb(firebasePushRecords);
    const storeScheme = firebasePushRecords.stores.filter(it => it.storeName == 'pushBackgroundEvents')[0];
    const store = getStore(idb, storeScheme, "readwrite");

    const response = await performActionAndDeleteEachEntry(store, async (key, value) => {
        // ensure the passed function is a promise by using async
        await oneach(key, value);
    });
    console.log(
        `Successfully logged ${response.success.length}`,
        `(of which ${response.deletionSuccess.length} deleted`,
        `and ${response.deletionFailed.length} failed to delete)`,
        `and failed to log ${response.failed.length}`,
        response,
    );
}

export async function retrieveLog() {
    const storeScheme = firebasePushRecords.stores.filter(it => it.storeName == 'pushLogRecords')[0];
    const idb = await useIdb(firebasePushRecords);
    const values = await getAllValues(idb, storeScheme);
    return values;
}

export async function recordListenedPush(data) {
    const idb = await useIdb(firebasePushRecords);
    await addMultipleData(
        idb,
        [firebasePushRecords.stores[2]],
        [{ ...data, background: true }],
    );
}

export async function retrieveListened() {
    const idb = await useIdb(firebasePushRecords);
    const storeScheme = firebasePushRecords.stores.filter(it => it.storeName == 'pushListenEvent')[0];
    const values = getAllValues(idb, storeScheme);
    return values;
}

export async function writeKvasirData(kvasir) {
    if (!kvasir) {
        return;
    }
    await addMultipleData(
        await useIdb(kvasirData),
        kvasirData.stores,
        [{ data: kvasir, submittedAt: Date.now() }],
    );
}

export async function retrieveKvasirDatas() {
    const idb = await useIdb(kvasirData);
    const storeScheme = kvasirData.stores[0];
    const values = await getAllValues(idb, storeScheme);
    return values;
}

export async function writeDebug(context, data) {
    if (!data) {
        return;
    }

    console.debug(`writeDebug[${context}]:`, data);

    await addMultipleData(
        await useIdb(debugData),
        debugData.stores,
        [{ data, context, loggedAt: Date.now() }],
    );
}

export async function retrieveDebugs() {
    const idb = await useIdb(debugData);
    const storeScheme = debugData.stores[0];
    const values = getAllValues(idb, storeScheme);
    return values;
}
