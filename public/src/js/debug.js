import { retrieveDebugs } from "./idbUtils.js";
import { formatCells, formatTable } from "./formatters.js";

export async function refreshDebugList() {
    const targets = document.querySelectorAll('.debug-container');
    if (targets.length == 0)
        return;

    const shouldFilter = Array.from(document.querySelectorAll('.debug-filter')).filter(it => it.checked).length > 0;
    const filter = shouldFilter ? it => ['app::onload', 'app.js::onload', 'app.js', 'SW::fetch'].indexOf(it.context) == -1 : () => true;

    const datas = await retrieveDebugs();
    const dataTable = datas.reverse().filter(filter).map(data => [
        new Date(data.loggedAt).toLocaleString(),
        data.context || '-',
        data.data.text || '-',
        `<textarea class="debug-data" disabled>${JSON.stringify(data.data)}</textarea>`,
    ]);
    const cells = [
        '<b>Debug Log</b>',
        formatTable(['Logged at', 'Context', 'Text', 'Data'], dataTable),
    ];

    const html = formatCells(cells);

    targets.forEach(element => element.innerHTML = html);
}
