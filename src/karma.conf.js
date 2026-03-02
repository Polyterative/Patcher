// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
    const coverageIstanbulPlugin = require('karma-coverage-istanbul-reporter');
    const configuration = {
        basePath: '',
        frameworks: ['jasmine', '@angular-devkit/build-angular'],
        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-jasmine-html-reporter'),
            coverageIstanbulPlugin,
            {
                // Angular CLI (with --code-coverage) expects a reporter named "coverage".
                // Alias it to the installed Istanbul reporter to keep CI working offline.
                'reporter:coverage': coverageIstanbulPlugin['reporter:coverage-istanbul']
            },
            require('@angular-devkit/build-angular/plugins/karma')
        ],
        client: {
            clearContext: true
        },
        coverageIstanbulReporter: {
            dir: require('path').join(__dirname, '../coverage'),
            reports: ['html', 'lcovonly', 'text-summary'],
            fixWebpackSourcePaths: true
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