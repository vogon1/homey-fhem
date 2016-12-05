var fhem = require('./../fhem.js');

module.exports.init = function (devices_data, callback) {
    Homey.log("FHEM windowcoverings start");
    devices_data.forEach(function (device_data) {
       	fhem.FHEMsetcache(device_data.id, device_data, module.exports.realtime, true);
    });

    setTimeout(fhem.poll, 1300);

    callback(null, true);
}

module.exports.capabilities = {
    dim: {
        get: function( device_data, callback ){
            
            // get the bulb with a locally defined function
            var fhem_dev = device_data.id;
            if( fhem_dev instanceof Error ) return callback( fhem_dev );

            // Get state
			fhem.FHEMrequest('get', fhem_dev, '', function(err, result, body){
				if( err ) return callback(err);
                if (!body || !body.Results || body.Results.length == 0) return callback( fhem_dev );

				var state = body.Results[0].Readings.state.Value;
				if (state.match(/off/i))
					state = '0';
				else if (state.match(/on/i))
					state = '100';
				state = fhem.FHEMgetnum(state, 'int') / 100;
				console.log(fhem_dev + ' - Return to callback on get dim: ' + state);
                callback( null,  state);
            })
        },
        set: function( device_data, dev_state, callback ) {
            var fhem_dev = device_data.id;
            if( fhem_dev instanceof Error ) return callback( fhem_dev );

            var cap = fhem.FHEMgetcap(device_data, 'dim');
            var val = fhem.FHEMsliderval(device_data, Math.round(dev_state*100));

            // Set state
			fhem.FHEMrequest('set', fhem_dev, cap + '+' + val, function(err, result, body){
				if( err ) return callback(err);
                callback( null, dev_state );
            })
        }
    },
    onoff: {
        get: function( device_data, callback ){
            
            // get the bulb with a locally defined function
            var fhem_dev = device_data.id;
            if( fhem_dev instanceof Error ) return callback( fhem_dev );

            // Get state
			fhem.FHEMrequest('get', fhem_dev, '', function(err, result, body){
				if( err ) return callback(err);
                if (!body || !body.Results || body.Results.length == 0) return callback( fhem_dev );

				var state = body.Results[0].Readings.state.Value;
				console.log(fhem_dev + ' - Onoff state: ' + state);
				if (state == 'off')
					state = 0;
				else
		            state = fhem.FHEMgetnum(state, 'int');
				if (state == 0) state = false; else state = true;
				console.log(fhem_dev + ' - Return to callback on get onoff: ' + state);
                callback( null,  state);
            })
        },
        set: function( device_data, dev_state, callback ) {			
            var fhem_dev = device_data.id;
            if( fhem_dev instanceof Error ) return callback( fhem_dev );

            if (dev_state) dev_state = 'on'; else dev_state = 'off';

            // Set state
			fhem.FHEMrequest('set', fhem_dev, dev_state, function(err, result, body){
				if( err ) return callback(err);
                callback( null, dev_state );
            })
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

			var devices = fhem.FHEMgetdevices('windowcoverings', body, module.exports.realtime);		
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

