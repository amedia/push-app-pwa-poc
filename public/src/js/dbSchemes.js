
export const firebasePushRecords = {
    dbName: 'firebasePushRecords',
    dbVersion: 2,
    stores: [
        { // onbackgroundmessage, wiped after forwarded to firebase analytics
            storeName: 'pushBackgroundEvents',
            keyPath: 'notificationIdentifier',
            autoIncrement: true,
            addedInVersion: 1,
        },
        { // both onmessage and onbackgroundmessage
            storeName: 'pushLogRecords',
            keyPath: 'notificationIdentifier', // use same for simplicity
            autoIncrement: true,
            addedInVersion: 1,
        },
        {
            storeName: 'pushListenEvent',
            keyPath: 'notificationIdentifier',
            autoIncrement: true,
            addedInVersion: 2,
        },
    ]
};

export const kvasirData = {
    dbName: 'kvasirDataCache',
    dbVersion: 1,
    stores: [
        {
            storeName: 'kvasirData',
            keyPath: 'submittedAt',
            autoIncrement: false,
            addedInVersion: 1,
        },
    ]
};

export const debugData = {
    dbName: 'debugData',
    dbVersion: 1,
    stores: [
        {
            storeName: 'debugData',
            keyPath: 'dataIdentifier',
            autoIncrement: true,
            addedInVersion: 1,
        },
    ]
};
