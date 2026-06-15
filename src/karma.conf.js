// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
    const configuration = {
        basePath: '',
        frameworks: ['jasmine'],
        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-jasmine-html-reporter'),
            require('karma-coverage')
        ],
        client: {
            clearContext: true
        },
        coverageReporter: {
            dir: require('path').join(__dirname, '../coverage'),
            subdir: '.',
            reporters: [
                { type: 'html' },
                { type: 'lcovonly' },
                { type: 'text-summary' }
            ]
        },
        // kjhtml (Jasmine HTML reporter) intentionally omitted: it is only useful
        // when running in a headed browser session and adds overhead in headless CI.
        reporters: ['progress'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_WARN,
        // Safe defaults: CI-friendly out of the box.
        // Pass --watch to opt in to watch mode instead of the other way around.
        autoWatch: false,
        browsers: ['ChromeHeadlessCI'],
        customLaunchers: {
            ChromeHeadlessCI: {
                base: 'ChromeHeadless',
                flags: [
                    '--no-sandbox',
                    '--disable-gpu',
                    '--disable-dev-shm-usage'
                ]
            }
        },
        singleRun: true
    };

    config.set(configuration);
};