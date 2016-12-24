var fhem = require('./../fhem.js');

module.exports.init = function (devices_data, callback) {
    Homey.log("FHEM thermostat start");
    for ( var x = 0; x < devices_data.length; x++ ) {
        if (devices_data[x].hasOwnProperty("id")) {
        	fhem.FHEMsetcache(devices_data[x].id, devices_data[x], module.exports.realtime, true);
        }
    }

    setTimeout(fhem.poll, 1200);

    callback(null, true);
}

module.exports.capabilities = {
    measure_temperature: {
        get: function( device_data, callback ){
            fhem.FHEMget_measure_temperature(device_data, callback);
        }
    },
    target_temperature: {
        get: function( device_data, callback ){
            fhem.FHEMget_target_temperature(device_data, callback);
        },
        set: function( device_data, dev_state, callback ) {			
            fhem.FHEMset_target_temperature(device_data, dev_state, callback);
        }
    },
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
		
			var devices = fhem.FHEMgetdevices('thermostat', body, module.exports.realtime);
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

