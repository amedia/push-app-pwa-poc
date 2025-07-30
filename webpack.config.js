const path = require('path');

module.exports = {
    entry: {
        main: './public/src/js/app.js',
        sw: './public/src/js/serviceWorker.js',
    },
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: '[name].js',
    },
    mode: 'production',
    optimization: {
        minimize: false,
    },
};
