var fhem = require('./../fhem.js');

module.exports.init = function (devices_data, callback) {
    Homey.log("FHEM light start");
    devices_data.forEach(function (device_data) {
       	fhem.FHEMsetcache(device_data.id, device_data, module.exports.realtime, true);
    });

    setTimeout(fhem.poll, 1000);

    callback(null, true);
}

module.exports.capabilities = {
    dim: {
        get: function( device_data, callback ){
            fhem.FHEMget_dim(device_data, callback);
        },
        set: function( device_data, dev_state, callback ) {
            fhem.FHEMset_dim(device_data, dev_state, callback);
        }
    },
    onoff: {
        get: function( device_data, callback ){
            fhem.FHEMget_onoff(device_data, callback);
        },
        set: function( device_data, dev_state, callback ) {			
            fhem.FHEMset_onoff(device_data, dev_state, callback);
        }
    },
    measure_power: {
        get: function( device_data, callback ){
            fhem.FHEMget_measure_power(device_data, callback);
        }
    },
    meter_power: {
        get: function( device_data, callback ){
            fhem.FHEMget_meter_power(device_data, callback);
        }
    }
};

module.exports.pair = function( socket ) {
	socket.on('list_devices', function( data, callback ) {

		var devices = [ ];

        // Do we have an IP address
        var fhem_ip = Homey.manager('settings').get( 'fhem_server' );
        if (typeof fhem_ip == 'undefined') {
            callback (null, devices );
            return;
        }

		fhem.FHEMrequest('get', '', '', function(err, result, body){
			if( err ) return callback(err);

			var devices = fhem.FHEMgetdevices('light', body, module.exports.realtime);		
			callback( null, devices );
		});
	});

	// this is called when the user presses save settings button in start.html
	socket.on('get_devices', function( data, callback ) {
		socket.emit ( 'continue', null );
	});

	socket.on('disconnect', function(){
		console.log("FHEM app - User aborted pairing, or pairing is finished");
	})
};

module.exports.added = function( device_data, callback ) {
	fhem.FHEMsetcache(device_data.id, device_data, module.exports.realtime, true);
	fhem.restart_poll();
    callback( null, true );
};

module.exports.deleted = function( device_data, callback ) {
	fhem.FHEMdelcache(device_data.id);
	fhem.restart_poll();
    callback( null, true );
};

