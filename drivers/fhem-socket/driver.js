var fhem = require('./../fhem.js');

'use strict';

const Homey = require('homey');

class FhemSocketDriver extends Homey.Driver {

    onPairListDevices( data, callback ){
        var devices = [ ];

        // Do we have an IP address
        var fhem_ip = Homey.ManagerSettings.get('fhem_server');
        if (typeof fhem_ip == 'undefined') {
            callback (null, devices );
            return;
        }

        fhem.FHEMrequest('get', '', '', function(err, result, body){
            if( err ) return callback(err);

            var devices = fhem.FHEMgetdevices('socket', body, 'fhem-socket');      
            callback( null, devices );
        });
    }
}

module.exports = FhemSocketDriver;
