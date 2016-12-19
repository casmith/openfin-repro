(function () {
    'use strict';
    var openfin = require('openfin-launcher');
        
    openfin.launchOpenFin({
        configPath: 'http://localhost:8080/app.json',
        rvmPath: 'C:/Temp/OpenFinRVM.exe'
    })
        .then(function () {
            console.log('success!');
        })
        .catch(function (error) {
            console.log('error!', error);
        });
})();