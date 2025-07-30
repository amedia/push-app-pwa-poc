export function formatDate(date, sep = '') {
    if (!date) date = new Date();
    return `${date.getFullYear()
        }${sep}${date.getMonth().toString().padStart(2, '0')
        }${sep}${date.getDate().toString().padStart(2, '0')
        }_${date.getHours().toString().padStart(2, '0')
        }${sep}${date.getMinutes().toString().padStart(2, '0')
        }${sep}${date.getSeconds().toString().padStart(2, '0')
        }`;
}

// Function to download data to a file
// ref: https://stackoverflow.com/a/30832210
export function download(data, filename, type) {
    alert(`Starting download of ${filename}`);
    var file = new Blob([data], { type: type });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        const a = document.createElement("a");
        const url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}
