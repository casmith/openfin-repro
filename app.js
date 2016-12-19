(function () {
	'use strict'

	var angular = require('angular'),
		$ = require('jquery'),
        cuid = require('cuid'),
		domReady = require('domready'),
		app = angular.module('app', []);

		app.service('windowManager', ['$log', '$window', function ($log, $window) {

            var tempWindow, 
                isOpenFromStorage, 
                rootFin;

            (function () { 
                var win = window; 
                while (win.opener) { 
                    win = win.opener; 
                } 
                rootFin = win.fin; 
            })();

		    function createWindow(callback, options) {
		        var childWindow;
		        var windObj = {
		            name: cuid(),
		            autoShow: false,
		            frame: true,
		            shadow: true,
		            url: '',
		            resizable: true,
		            maximizable: true,
		            hideOnClose: false,
		            defaultWidth: 640,
		            defaultHeight: 480,
		            width: 640,
		            height: 480,
		            showTaskbarIcon: true,
		            // ensure iframes don't try to connect to openfin
		            'delay_connection': true
		        };

		        function successCallback() {
		            if (callback) {
		                callback(childWindow);
		            }
		        }

		        function errorCallback(err) {
		            console.error('error creating window: ' + err);
		        }

		        if (options.moduleDescriptor && options.moduleDescriptor.showInTaskbar !== undefined && !options.moduleDescriptor.showInTaskbar) {
		            windObj.showTaskbarIcon = false;
		        }
		        // TODO: use rootFin
		        childWindow = new rootFin.desktop.Window(windObj, successCallback, errorCallback);
		    }

		    /**
		     * Redirect the given OpenFin window to a URL
		     * @param {fin.desktop.Window} openFinWindow
		     * @param {string} [url] URL string
		     * @param {Function} callback
		     */
		    function goTo(openFinWindow, url, callback) {
		        var newDomWindow = openFinWindow.contentWindow;
		        if (angular.isFunction(url)) {
		            callback = url;
		            url = null;
		        }
		        if (url) {
		            newDomWindow.location.href = url;
		        }
		        if (callback) {
		            $(newDomWindow.document).ready(callback);
		        }
		    }

            function moveWindow(win, left, top, callback) {
                if (win && !isNullOrUndefined(top) && !isNullOrUndefined(left)) {
                    win.moveTo(left, top, callback);
                } else {
                    callback();
                }
            }

            function isNullOrUndefined(val) {
                return typeof (val) === 'undefined' || val === null;
            }

            function resizeWindow(viewWindow, options, callback) {
                if (options.width && options.height) {
                    if (options.animate) {
                        viewWindow.animate({
                            size: {
                                width: options.width,
                                height: options.height,
                                duration: 100
                            }
                        }, callback);
                    } else {
                        viewWindow.resizeTo(options.width, options.height, 'top-left', callback);
                    }
                } else {
                    callback();
                }
            }

            function dock(mainWindow, childWindow, options, callback) {
                if (options.dock) {
                    // dock next to window
                    var left = mainWindow.contentWindow.screenX + mainWindow.contentWindow.outerWidth;
                    var top = mainWindow.contentWindow.screenY;
                    moveWindow(childWindow, left, top, function () {
                        childWindow.joinGroup(mainWindow, callback);
                    });
                } else if (options.isOpenFromStorage && tempWindow !== childWindow && tempWindow && isOpenFromStorage) {
                    childWindow.joinGroup(tempWindow, callback);
                    tempWindow = childWindow;
                } else {
                    callback();
                    tempWindow = childWindow;
                    isOpenFromStorage = options.isOpenFromStorage;
                }
            }

            function openWindow(viewWindow, options, openCallback, closeCallback) {
                var token = viewWindow.name;

                viewWindow.updateOptions(options, function () {
                    viewWindow.show(function () {
                        var subWindow = viewWindow.contentWindow;
                        viewWindow.addEventListener('closed', function () {
                            $log.info('Closing window for ' + options.url);
                            var data = {
                                left: subWindow.screenLeft,
                                width: subWindow.outerWidth
                            };
                            //messageBus.publish(EVENTS.WINDOW_CLOSED_DOCK_UNDOCK_NOTIFICATION, data);
                            subWindow.location.href = 'about:blank';
                            delete windows[token];
                            if (closeCallback) {
                                closeCallback();
                            }
                        });
                        windows[token] = viewWindow;

                        //set token on contentWindow because not able to set it on viewWindow
                        subWindow.token = token;

                        viewWindow.bringToFront();
                        viewWindow.focus(function () {
                            if (openCallback) {
                                openCallback(token);
                            }
                        });
                    });
                });
            }

            this.getCurrent = function () {
                return fin.desktop.Window.getCurrent();
            }


			this.open = function (options, openCallback, closeCallback) {
                var self = this;
                options.maximizable = !options.maxWidth && !options.maxHeight;
                options.resizable = (!options.maxWidth) || options.maxWidth !== options.minWidth;

                $log.info('Opening window for url: ' + options.url);
                createWindow(function (newOpenFinWindow) {
                    
                    if (newOpenFinWindow) {
                        var currentPage = $window.frost ? $window.frost.name : $window.name,
                            url = options.url,
                            modules = url.split('/'),
                            params = url.split('?'),
                            moduleNameIndex = modules.indexOf('modules'),
                            moduleName = modules[moduleNameIndex + 1],
                            eventDataObj = {
                                isEventData: true
                            };

                        eventDataObj.page = currentPage;
                        eventDataObj.feature = moduleName;
                        if (params[1]) {
                            eventDataObj.params = angular.toJson(params[1]);
                        }

                        //$log.usage('New Window', eventDataObj, $log.LOG_LEVEL.INFO, __filename);

                        goTo(newOpenFinWindow, options.url, function () {
                            moveWindow(newOpenFinWindow, options.left, options.top, function () {
                                resizeWindow(newOpenFinWindow, options, function () {
                                    dock(self.getCurrent(), newOpenFinWindow, options, function () {
                                        openWindow(newOpenFinWindow, options, openCallback, closeCallback);
                                    });
                                });
                            });
                            messageBus.publish(EVENTS.WINDOW_OPEN_NOTIFICATION, {
                                'name': newOpenFinWindow.name,
                                'params': params[1],
                                'module': options.moduleDescriptor
                            });
                        });
                    } else {
                        logger.warn('Failed to open window for ' + options.url);
                    }
                }, options);

                return null;
            }

		}]);

		app.controller('MainCtrl', ['$scope', 'windowManager', function ($scope, windowManager) {
			
			$scope.message = 'Hello, OpenFin!';

			$scope.openChildWindow = function () {
				windowManager.open({
                    url: 'http://localhost:8080'
                });
			}
		}]);

	require('./bootstrap').bootstrap();
})();