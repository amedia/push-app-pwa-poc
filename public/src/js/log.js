import { retrieveKvasirDatas, retrieveLog, writeKvasirData, retrieveListened } from "./idbUtils.js";
import { formatCells, formatMilliseconds, formatTable } from "./formatters.js";

function calcMedian(arr) {
    console.log('median of:', arr);
    if (!arr || arr.length == 0)
        return null;
    const sortedArr = arr.toSorted();
    const odd = sortedArr.length % 2 == 1;
    const middle = Math.floor(sortedArr.length / 2);
    return odd ? sortedArr[middle] : (sortedArr[middle - 1] + sortedArr[middle]) / 2;
}

/**
 * 
 * @param {*} targets Array of HTMLElements to which the output should be displayed
 * @param {*} received Array of received push-messages (non-null)
 * @param {*} sent Data from Kvasir, if any (nullable)
 */
export function displayLog(targets, _received, _sent, listenedArray) {

    // inject timestamp and Date-object
    const received = _received.map(it => {
        return {
            ...it,
            timestamp: it.receivedAt,
            receivedAt: new Date(it.receivedAt),
        };
    });
    const sent = _sent ? _sent.map(it => {
        return {
            ...it,
            timestamp: it.timestamp * 1000,
            sentAt: new Date(it.timestamp * 1000), // todo: remove this workaround?
        };
    }) : null;

    let tableData;
    if (received.length == 0) {
        tableData = [];
    } else if (sent) {
        const receivedWithSent = received.map(r => {
            const articleIdMatches = sent.filter(s => s.article_id == r.articleId);
            const titleMatches = articleIdMatches.filter(s => s.title == r.body);

            if (titleMatches > 1) {
                alert(`Found ${articleIdMatches.length} matches for ${r.articleId}\nand ${titleMatches.length} matches for title '${r.body}'.\nPlease report this to admin!`);
            }
            else if (articleIdMatches > 1) {
                alert(`Found ${articleIdMatches.length} matches for ${r.articleId}.\nPlease report this to admin!`);
            }

            const match = titleMatches.length > 0 ? titleMatches[0] : null;
            return {
                received: r,
                sent: match,
            }
        });

        const sentNotReceived = sent.filter(s => {
            const matches = received.filter(r => r.articleId == s.article_id && r.body == s.title)
            return matches.length == 0
        }).map(it => {
            return {
                received: null,
                sent: it,
            };
        });
        const sentAndReceived = receivedWithSent.concat(sentNotReceived);

        sentAndReceived.sort((a, b) => {
            // compare timestamp: sent/sent, sent/received, received/sent, received/received (if available)
            return (a.sent ? a.sent : a.received).timestamp - (b.sent ? b.sent : b.received).timestamp;
        });

        // exclude sents before first received push
        const oldest = received.toSorted((a, b) => a.timestamp - b.timestamp)[0];
        const startTimestamp = oldest.timestamp;
        // alert(`Oldest received push: ${oldest.body}\nreceived at: ${oldest.receivedAt.toLocaleString()}\nwith timestamp: ${startTimestamp}`);
        console.log(`Oldest received push: ${oldest.body}\nreceived at: ${oldest.receivedAt.toLocaleString()}\nwith timestamp: ${startTimestamp}`);

        if (!startTimestamp) {
            alert("Could not determine oldest received.\nPlease report this to admin!");
            console.log(sentAndReceived);
            tableData = sentAndReceived;
        } else {
            const receivedHidden = received.filter(it => it.timestamp < startTimestamp);
            if (receivedHidden.length > 0) {
                alert(`${receivedHidden.length} received push hidden!\nPlease report this to admin!`);
                console.log('receivedHidden:', receivedHidden);
            }
            tableData = sentAndReceived.filter(it => (it.received ? it.received : it.sent).timestamp >= startTimestamp);
            console.log('tableData:', tableData);
        }
    } else {
        tableData = received.map(r => {
            return {
                received: r,
                sent: null,
            };
        });
    }

    if (sent) {
        for (let i = 0; i < sent.length; i++) {
            const element = sent[i];
            const match = sent.filter(it => it.article_id == element.article_id);
            if (match.length > 2) {
                alert(`Assumption of no duplicates in Kvasir failed\nfor article_id: ${match[0].article_id}\nwith ${match.length} entries.`);
            }
        }
    }

    const receivedCount = tableData.filter(it => it.received).length;
    const sentCount = sent ? tableData.filter(it => it.sent).length : '-';
    const sentNotReceivedCount = sent ? tableData.filter(it => !it.received).length : '-';
    const articleIdReceived = new Map();
    received.forEach(element => {
        const existing = articleIdReceived.get(element.articleId);
        if (existing) {
            existing.push(element);
        } else {
            articleIdReceived.set(element.articleId, [element]);
        }
    });
    const articleIdDuplicatesCount = Array.from(articleIdReceived.values().filter(it => it.length > 1)).length;
    const articleIdAndBodyReceived = new Map();
    articleIdReceived.entries().forEach(entry => { // entry = [articleId, [value, value, value]]
        entry[1].forEach(value => {
            const key = `${entry[0]}--${value.body}`;
            const existing = articleIdAndBodyReceived.get(key);
            if (existing) {
                existing.push(value);
            } else {
                articleIdAndBodyReceived.set(key, [value]);
            }
        });
    });
    console.log('articleIdAndBodyReceived:', articleIdAndBodyReceived);
    const articleIdAndBodyDuplicatesCount = Array.from(articleIdAndBodyReceived.values().filter(it => it.length > 1)).length;
    const receivedInBackgroundCount = Array.from(received.filter(it => it.background == true)).length;
    const receivedInForegroundCount = Array.from(received.filter(it => it.background == false)).length;
    const allDelays = Array.from(tableData.filter(it => it.received && it.sent).map(it => it.received.timestamp - it.sent.timestamp));
    const avgDelay = allDelays.length == 0 ? '-' : allDelays.reduce((subtotal, it) => subtotal + it) / allDelays.length;
    const medianDelay = allDelays.length == 0 ? '-' : calcMedian(allDelays);

    const stats = [
        ['received', receivedCount],
        ['sent', sentCount],
        ['sent, but not received', sentNotReceivedCount],
        ['duplicates (same article id)', articleIdDuplicatesCount],
        ['duplicates (same article id and body)', articleIdAndBodyDuplicatesCount],
        ['received in background', receivedInBackgroundCount],
        ['received in foreground', receivedInForegroundCount],
        [`average delay (from ${allDelays.length} rows)`, formatMilliseconds(avgDelay)],
        [`median delay (from ${allDelays.length} rows)`, formatMilliseconds(medianDelay)],
        [`listened push events ('push'-event)`, listenedArray.length]
    ];

    const headers = ['index', 'articleId', 'title', 'body', 'receivedAt', 'sentAt', 'delay', 'background/foreground',]

    const tableOutput = tableData.map(it => {
        return [
            it.received ? it.received.notificationIdentifier : '-',
            it.received ? it.received.articleId : it.sent.article_id,
            it.received ? it.received.title : '-',
            it.received ? it.received.body : it.sent.title,
            it.received ? it.received.receivedAt.toLocaleString() : '-',
            it.sent ? it.sent.sentAt.toLocaleString() : '-',
            (it.sent && it.received) ? formatMilliseconds(it.received.timestamp - it.sent.timestamp) : '-',
            it.received ? (it.received.background ? 'background' : it.received.background == false ? 'foreground' : '-') : '-',
        ];
    });

    const articleIdDuplicates = Array.from(articleIdReceived.entries().filter(it => it[1].length > 1).map(it => [it[0]].concat(it[1].map(inner => `[${inner.notificationIdentifier} @ ${inner.receivedAt.toLocaleString()} : ${inner.body}]`))));
    const articleIdAndBodyDuplicates = Array.from(articleIdAndBodyReceived.entries().filter(it => it[1].length > 1).map(it => [it[0]].concat(it[1].map(inner => `[${inner.notificationIdentifier} @ ${inner.receivedAt.toLocaleString()}]`))));

    const cells = [
        '<b>Stats:</b>',
        formatTable(['Stat', 'Value'], stats),
        '<b>Push log</b>',
        formatTable(headers, tableOutput),
        '<b>Article ID duplicates:</b>',
        formatTable(['Article ID', 'Duplicates'], articleIdDuplicates.map(it => [it[0], it.slice(1).join('<br/>')])),
        '<b>Article ID and Body duplicates:</b>',
        formatTable(['Article ID and Body', 'Duplicates'], articleIdAndBodyDuplicates.map(it => [it[0], it.slice(1).join('<br/>')])),
    ];
    const html = formatCells(cells);

    targets.forEach(element => element.innerHTML = html);
}

export async function updatePushLog(targets, inputs) {
    if (targets.length > 0) {
        const logArray = await retrieveLog();
        const listenedArray = await retrieveListened();

        var parsedKvasir;
        if (inputs.length > 0) {
            inputs.forEach(input => {
                const json = input.value;
                if (json == '')
                    return;
                try {
                    console.log('input:', input);
                    parsedKvasir = JSON.parse(json);
                } catch (e) {
                    // do nothing...
                    console.error(e);
                }
            });
        }
        console.log('parsedKvasir:', parsedKvasir);
        if (parsedKvasir) {
            // save to idb
            await writeKvasirData(parsedKvasir);
        }

        try {
            const kvasirDatas = await retrieveKvasirDatas();
            const map = new Map();
            // sort by age of data, and add oldest first, and input at last
            const sortedDatas = kvasirDatas.toSorted((a, b) => a.submittedAt - b.submittedAt);
            sortedDatas.forEach(it => it.data.forEach(entry => map.set(entry.article_id, entry)));
            if (parsedKvasir) {
                parsedKvasir.forEach(it => map.set(it.article_id, it));
            }
            const mergedKvasir = Array.from(map.values());
            displayLog(targets, logArray, mergedKvasir, listenedArray);
        } catch (e) {
            console.error(e);
            alert(e);
            displayLog(targets, logArray, parsedKvasir ? parsedKvasir : null, listenedArray);
        }
    }
}
