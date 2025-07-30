
export function formatMilliseconds(ms) {
    if (!ms || ms == '-' || Number.isNaN(ms))
        return '-';
    let remainingSeconds = ms / 1000;
    const hours = Math.floor(remainingSeconds / 3600);
    remainingSeconds = remainingSeconds % 3600;
    const minutes = Math.floor(remainingSeconds / 60);
    remainingSeconds = remainingSeconds % 60;
    const seconds = Math.floor(remainingSeconds);
    return `${hours}h${minutes}m${seconds}s`;
}

export function formatTable(headers, data) {
    return (
        `<table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp table-center"><thead><tr>${headers.map(it => `<th class="mdl-data-table__cell--non-numeric">${it}</th>`).join('')
        }</tr></thead><tbody>${data.map(row => `<tr><td class="mdl-data-table__cell--non-numeric">${row.join('</td><td class="mdl-data-table__cell--non-numeric">')
            }</td></tr>`).join('')
        }</tbody></table>`
    );
}

export function formatCells(cells) {
    return cells.map(it => {
        return `<div class="mdl-cell mdl-cell--12-col text-center">${it}</div>`
    }).join('');
}
