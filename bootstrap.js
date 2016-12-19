'use strict';

var angular = require('angular');

var readyPromise;
module.exports = {
    appModuleName: 'app',

    /**
     * Returns a promise that is resolved when the app is ready to be initialised.
     * @returns {Promise}
     */
    whenReady: function () {
        if (readyPromise) { // return cached promise
            return readyPromise;
        }

        var Q = require('q');
        return readyPromise = Q.Promise(function (resolve, reject) {
            angular.element(global.document).ready(function () {
                try {
                    if (global.fin) {
                        // openfin page is ready only after this
                        global.fin.desktop.main(resolve);
                    } else {
                        resolve();
                    }
                } catch (err) {
                    reject(err);
                }
            });
        }).catch(function (reason) {
            console.error(reason.stack || reason.message || reason);
            throw reason; // the official Q library treats an exception as a rejected promise
        });
    },

    /**
     * Setup angular when the DOM is ready
     * @param {string} [appModuleName] Main angular module name too start
     */
    bootstrap: function (appModuleName) {

        if (appModuleName) {
            this.appModuleName = appModuleName;
        } else {
            appModuleName = this.appModuleName;
        }

        var callback = function () {
            angular.bootstrap(document, [appModuleName]);
        };

        this.whenReady().then(callback).catch(function(err) {
            console.error(err.stack || err);
        });
    }
};
