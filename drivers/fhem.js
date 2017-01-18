"use strict";

var request = require("request");

var dev_cache = [];

var fhem = {
	polling: false
};

fhem.FHEMsetcache = function(id, device_data, realtime, poll) {
	if (dev_cache[id]) {
		// Already exists; set poll to true if poll argument is true
        if (poll) dev_cache[id]['poll'] = true;
        return;
	} else {
        dev_cache[id] = [];
    }

	dev_cache[id]['device_data'] = device_data;
    dev_cache[id]['realtime'] = realtime;

    console.log(device_data);
    var caps = [ ];
    var capmap = [ ];
    if (device_data.fhem_to_homey_maps) {
        var capslist = device_data.fhem_to_homey_maps.split(',');
        capslist.forEach(function(cap) {
            var map = cap.split("=");
            if (map[1]) {
                caps.push(map[0]);
                capmap[map[1]] = map[0];
            } else {
                capmap[cap] = cap;
            }
        });
    }
    dev_cache[id]['fhem_to_homey_maps'] = capmap;
    dev_cache[id]['homey_class'] = device_data.homey_class;
    dev_cache[id]['poll'] = poll;
}

fhem.FHEMdelcache = function(id) {
    delete dev_cache[id];
}

fhem.FHEMrequest = function(cmd, dev, params, callback) {
    var fhemIP   = Homey.manager('settings').get( 'fhem_server' );
    var fhemPort = Homey.manager('settings').get( 'fhem_port' );
    var fhemPath = Homey.manager('settings').get( 'fhem_path' );

	var save_resp = false;
	var url = 'http://' + fhemIP + ':' + fhemPort + fhemPath + '?cmd=';

	if (cmd == 'get') {
		url = url + 'jsonlist2';
	}

	if (cmd == 'set') {
		url = url + 'set';
	}

	if (dev) {
		url = url + '+' + dev;
	}

	if (params) {
		url = url + '+' + params;
	}

	url = url + '&XHR=1';
	console.log('Execute url ' + url);

	request({
		method: 'GET',
		url: url,
		json: true,
		headers: {
		}
	}, function(err, result, body) {
		callback(err, result, body);
	});
}

fhem.FHEMgetdevices = function(type, list, realtime) {
	var devices = [ ];

    if (list.Results && list.Results.isArray()) {
    	list.Results.forEach(function(device) {
    		if (device.Attributes.homeyMapping) {
    			console.log('Adding device ' + device.Name);
    			var hclass_caps = device.Attributes.homeyMapping.split(":");
    			var hclass = hclass_caps[0];
                var caps = [ ];
                var capslist = hclass_caps[1].split(',');
                if (capslist.constructor == Array) {
                    capslist.forEach(function(cap) {
                        var map = cap.split("=");
                        caps.push(map[0]);
                    });
                }
    			var dev = {
    				data: {
    					id: device.Name,
    					fhem_name: device.Name,
    					fhem_to_homey_maps: hclass_caps[1],
                        homey_class: type
    				},
    				name: device.Name,
    				capabilities: caps
    			};
    			// Find slider values
    			if (device.PossibleSets && device.PossibleSets.match(/slider/)) {
    				var setList = device.PossibleSets.split(/ /);
    				var arrayLength = setList.length;
    				for (var i = 0; i < arrayLength; i++) {
    					if (setList[i].match(/:slider/)) {
    						dev.data.slider = setList[i].replace(/.*:slider,/, "");
    						console.log(" -- Slider: " + dev.data.slider);
    					}
    				}
    			}
                fhem.FHEMsetcache(dev.data.id, dev.data, realtime, false);
                if (hclass == type) {
    				devices.push(dev);
    			}
    		};
    	});
    }
	return devices;
}

fhem.FHEMgetcap = function(dev, homey_cap) {
    var fhem_cap = homey_cap;
    var id = dev.id;
    if (dev_cache[id] && dev_cache[id].fhem_to_homey_maps) {
        var keys = Object.keys(dev_cache[id].fhem_to_homey_maps);
        if (keys.constructor === Array) {
            keys.forEach(function(fcap) {
                if (dev_cache[id].fhem_to_homey_maps[fcap] == homey_cap) {
                    fhem_cap = fcap;
                }
            });
        }
    }
    return fhem_cap;
}

fhem.FHEMgetreading = function(homey_cap, dev, readings) {
    var fhem_cap = fhem.FHEMgetcap(dev, homey_cap);
    var val = '';
    if (readings[fhem_cap] && readings[fhem_cap].Value != 'state') {
        val = readings[fhem_cap].Value;
    }
    return val;
}

fhem.FHEMgetnum = function(value, type) {
    // Filter out the digits and decimal separator; return as 'type'
    if (value) {
        value = value.replace(/[^0-9.]/g, '');
        if (type == 'int')
            value = Math.round(parseFloat(value));
        else if (type == 'float1') {
            value = Math.round(parseFloat(value) * 10) / 10;
        }
        else if (type == 'float2') {
            value = Math.round(parseFloat(value) * 100) / 100;
        }
    }
    return value;
}

fhem.FHEMgetmotion = function(value) {
    var motion = false;

    if (value) {
        if (value == '0') motion      = false;
        if (value == 'closed') motion = false;
        if (value == 'open') motion   = true;
        if (value == '255') motion    = true;
        if (value == '0xff') motion   = true;
    }
    return motion;
}

fhem.FHEMgetcontact = function(value) {
    var contact_alarm = false;

    if (value) {
        if (value == 'open') contact_alarm = true;
        if (value == 'closed') contact_alarm = false;
    }
    return contact_alarm;
}

fhem.FHEMsliderval = function(dev, val) {
    if (dev.slider) {
        var slider = dev.slider.split(",");
        if (val < slider[0]) {
            val = slider[0];
        } else if (val > slider[2]) {
            val = slider[2];
        } else {
            val = Math.round(val / slider[1]) * slider[1];
        }
    } else {
        val = 0;
    }
    return val;
}

fhem.FHEMget_onoff = function(device_data, callback) {
    var fhem_dev = device_data.id;
    if( fhem_dev instanceof Error ) return callback( fhem_dev );

    // Get state
    fhem.FHEMrequest('get', fhem_dev, '', function(err, result, body){
        if( err ) return callback(err);
        if (!body || !body.Results || body.Results.length == 0 || !body.Results[0].Readings || !body.Results[0].Readings.state) return callback( fhem_dev );

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
}

fhem.FHEMset_onoff = function(device_data, dev_state, callback) {
    var fhem_dev = device_data.id;
    if( fhem_dev instanceof Error ) return callback( fhem_dev );

    if (dev_state) dev_state = 'on'; else dev_state = 'off';

    // Set state
    fhem.FHEMrequest('set', fhem_dev, dev_state, function(err, result, body){
        if( err ) return callback(err);
        callback( null, dev_state );
    })
}

fhem.FHEMget_dim = function(device_data, callback) {
    var fhem_dev = device_data.id;
    if( fhem_dev instanceof Error ) return callback( fhem_dev );

    // Get state
    fhem.FHEMrequest('get', fhem_dev, '', function(err, result, body){
        if( err ) return callback(err);
        if (!body || !body.Results || body.Results.length == 0 || !body.Results[0].Readings || !body.Results[0].Readings.state) return callback( fhem_dev );

        var state = body.Results[0].Readings.state.Value;
        if (state.match(/off/i))
            state = '0';
        else if (state.match(/on/i))
            state = '100';
        state = fhem.FHEMgetnum(state, 'int') / 100;
        console.log(fhem_dev + ' - Return to callback on get dim: ' + state);
        callback( null,  state);
    })
}

fhem.FHEMset_dim = function(device_data, dev_state, callback) {
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

fhem.FHEMget_target_temperature = function(device_data, callback) {
    var fhem_dev = device_data.id;
    if( fhem_dev instanceof Error ) return callback( fhem_dev );

    // Get temperature
    fhem.FHEMrequest('get', fhem_dev, '', function(err, result, body){
        if( err ) return callback(err);
        if (!body || !body.Results || body.Results.length == 0) return callback( fhem_dev );

        var temperature = '0';
        temperature = fhem.FHEMgetreading('target_temperature', device_data, body.Results[0].Readings);
        temperature = fhem.FHEMgetnum(temperature, 'float1');
        console.log(fhem_dev + ' - Return to callback on target temperature get: ' + temperature);
        callback( null,  temperature);
    })
}

fhem.FHEMset_target_temperature = function(device_data, dev_state, callback) {
    var fhem_dev = device_data.id;
    if( fhem_dev instanceof Error ) return callback( fhem_dev );

    var cap = fhem.FHEMgetcap(device_data, 'target_temperature');
    var val = fhem.FHEMsliderval(device_data, dev_state);

    // Set temperature
    fhem.FHEMrequest('set', fhem_dev, cap + '+' + val, function(err, result, body){
        if( err ) return callback(err);
        callback( null, val );
    })
}

fhem.FHEMget_measure_temperature = function(device_data, callback) {
    var fhem_dev = device_data.id;
    if( fhem_dev instanceof Error ) return callback( fhem_dev );

    // Get temperature
    fhem.FHEMrequest('get', fhem_dev, '', function(err, result, body){
        if( err ) return callback(err);
        if (!body || !body.Results || body.Results.length == 0) return callback( fhem_dev );

        var temperature = '0';
        temperature = fhem.FHEMgetreading('measure_temperature', device_data, body.Results[0].Readings);
        temperature = fhem.FHEMgetnum(temperature, 'float1');
        console.log(fhem_dev + ' - Return to callback on measure temperature get: ' + temperature);
        callback( null,  temperature);
    })
}

fhem.FHEMget_measure_humidity = function(device_data, callback) {
    var fhem_dev = device_data.id;
    if( fhem_dev instanceof Error ) return callback( fhem_dev );

    // Get temperature
    fhem.FHEMrequest('get', fhem_dev, '', function(err, result, body){
        if( err ) return callback(err);
        if (!body || !body.Results || body.Results.length == 0) return callback( fhem_dev );

        var humidity = '0';
        humidity = fhem.FHEMgetreading('measure_humidity', device_data, body.Results[0].Readings);
        humidity = fhem.FHEMgetnum(humidity, 'int');
        console.log(fhem_dev + ' - Return to callback on measure humidity get: ' + humidity);
        callback( null,  humidity);
    })
}

fhem.FHEMget_meter_power = function(device_data, callback) {
    // get power value
    var fhem_dev = device_data.id;
    if( fhem_dev instanceof Error ) return callback( fhem_dev );

    // Get state
    var cap = fhem.FHEMgetcap(device_data, 'meter_power');
    fhem.FHEMrequest('get', fhem_dev, cap, function(err, result, body){
        if( err ) return callback(err);
        if (!body || !body.Results || body.Results.length == 0) return callback( fhem_dev );

        var energy = 0;
        energy = fhem.FHEMgetreading('meter_power', device_data, body.Results[0].Readings);
        energy = fhem.FHEMgetnum(energy, 'float2');

        console.log(fhem_dev + ' - Return to callback on get meter_power: ' + energy);
        callback( null,  energy);
    })
}

fhem.FHEMget_measure_luminance = function(device_data, callback) {
    var fhem_dev = device_data.id;
    if( fhem_dev instanceof Error ) return callback( fhem_dev );

    // Get luminance
    fhem.FHEMrequest('get', fhem_dev, '', function(err, result, body){
        if( err ) return callback(err);
        if (!body || !body.Results || body.Results.length == 0) return callback( fhem_dev );

        var luminance = '0';
        luminance = fhem.FHEMgetreading('measure_luminance', device_data, body.Results[0].Readings);
        luminance = fhem.FHEMgetnum(luminance, 'int');
        console.log(fhem_dev + ' - Return to callback on measure luminance get: ' + luminance);
        callback( null,  luminance);
    })
}

fhem.FHEMget_measure_power = function(device_data, callback) {
    // get power value
    var fhem_dev = device_data.id;
    if( fhem_dev instanceof Error ) return callback( fhem_dev );

    // Get state
    var cap = fhem.FHEMgetcap(device_data, 'measure_power');
    fhem.FHEMrequest('get', fhem_dev, cap, function(err, result, body){
        if( err ) return callback(err);
        if (!body || !body.Results || body.Results.length == 0) return callback( fhem_dev );

        var power = 0;
        power = fhem.FHEMgetreading('measure_power', device_data, body.Results[0].Readings);
        power = fhem.FHEMgetnum(power, 'float2');

        console.log(fhem_dev + ' - Return to callback on get measure_power: ' + power);
        callback( null,  power);
    })
}

fhem.FHEMget_alarm_motion = function(device_data, callback) {
    var fhem_dev = device_data.id;
    if( fhem_dev instanceof Error ) return callback( fhem_dev );

    // Get state
    var cap = fhem.FHEMgetcap(device_data, 'alarm_motion');
    fhem.FHEMrequest('get', fhem_dev, cap, function(err, result, body){
        if( err ) return callback(err);
        if (!body || !body.Results || body.Results.length == 0) return callback( fhem_dev );

        var motion = false;
        motion = fhem.FHEMgetreading('alarm_motion', device_data, body.Results[0].Readings);
        motion = fhem.FHEMgetmotion(motion);

        console.log(fhem_dev + ' - Return to callback on get alarm_motion: ' + motion);
        callback( null,  motion);
    })
}

fhem.FHEMget_alarm_contact = function(device_data, callback) {
    var fhem_dev = device_data.id;
    if( fhem_dev instanceof Error ) return callback( fhem_dev );

    // Get state
    var cap = fhem.FHEMgetcap(device_data, 'alarm_contact');
    if (cap == 'alarm_contact') cap = '';
    fhem.FHEMrequest('get', fhem_dev, cap, function(err, result, body){
        if( err ) return callback(err);
        if (!body || !body.Results || body.Results.length == 0) return callback( fhem_dev );

        var contact = false;
        contact = fhem.FHEMgetreading('alarm_contact', device_data, body.Results[0].Readings);
        contact = fhem.FHEMgetcontact(contact);

        console.log(fhem_dev + ' - Return to callback on get alarm_contact: ' + contact);
        callback( null,  contact);
    })
}

var request_obj;

fhem.restart_poll = function () {
    if (fhem.polling)
        request_obj.abort();
    else
        fhem.poll();
}

fhem.poll = function () {
    var fhemIP   = Homey.manager('settings').get( 'fhem_server' );
    var fhemPort = Homey.manager('settings').get( 'fhem_port' );
    var fhemPath = Homey.manager('settings').get( 'fhem_path' );

    if (!fhemIP) return;

	if (fhem.polling) return;
	fhem.polling = true;	

	var url = 'http://' + fhemIP + ':' + fhemPort + fhemPath + '?XHR=1&inform=type=status;filter=';
	var start = true;
	for (var dev in dev_cache) {
        if (dev_cache[dev].poll) {
    		if (start)
    			start = false;
    		else
    			url = url + "|";
    		url = url + dev;
        }
	}

	console.log("Start poll: " + url);
	request_obj = request.get({ url: url })
        .on('data', function (data) {
        	// console.log("Data received in poll: " + data);
       		var lines = data.toString().split(/\n/);
       		lines.forEach(function (line) {
       			var elements = line.split("<<");
       			var dev_attr = elements[0].split("-");
       			var dev = dev_attr[0];
                if (!dev_cache[dev]) return; // Device not in my list

       			var attr = dev_attr[1];
       			if (!attr || dev_attr[2] == 'ts') return; // is timestamp line

       			var val = elements[1];
   				var fn = dev_cache[dev]['realtime'];
   				var device_data = dev_cache[dev]['device_data'];
                var fhem_to_homey = dev_cache[dev]['fhem_to_homey_maps'];
                var homey_class = 'light';
                if (dev_cache[dev]['homey_class']) homey_class = dev_cache[dev]['homey_class'];

       			console.log("Event: Device=" + dev + "; property=" + attr + "; value=" + val);
   				if (!val) {
   					console.log('No value!');
   					return;
   				}

                if (attr == 'state') {
                    switch (homey_class) {
                        case 'light':
                        case 'socket':
                        case 'windowcoverings':
                            if (val == 'off') {
                                console.log('RT event: ' + 'onoff' + ' -> ' + 'off');
                                fn(device_data, 'onoff', false);
                                return;
                            }

                            if (val == 'on') {
                                console.log('RT event: ' + 'onoff' + ' -> ' + 'on');
                                fn(device_data, 'onoff', true);
                                return;
                            }

                            // if we have something like 'state dim 10', promote dim to attr
                            if (val.match(/^[^ ]+ /)) {
                                var parts = val.split(' ');
                                attr = parts.shift();
                                val = parts.join(' ');
                            }
                            break;
                        default:
                            break;
                    }
                }

                if (fhem_to_homey[attr]) {
                    var homey_cap = fhem_to_homey[attr];
                    switch (homey_cap) {
                        case 'dim':
                            val = fhem.FHEMgetnum(val, 'int') / 100;
                            console.log('RT event: ' + homey_cap + ' -> ' + val);
                            fn(device_data, homey_cap, val);
                            if (val > 0 && (homey_class == 'light' || homey_class == 'windowcoverings')) {
                                // Switch the light/windowcovering on
                                console.log('RT event: ' + 'onoff' + ' -> ' + 'on');
                                fn(device_data, 'onoff', true);
                            }
                            return;
                        case 'target_temperature':
                        case 'measure_temperature':
                            val = fhem.FHEMgetnum(val, 'float1');
                            console.log('RT event: ' + homey_cap + ' -> ' + val);
                            fn(device_data, homey_cap, val);
                            return;
                        case 'measure_power':
                        case 'meter_power':
                            val = fhem.FHEMgetnum(val, 'float2');
                            console.log('RT event: ' + homey_cap + ' -> ' + val);
                            fn(device_data, homey_cap, val);
                            return;
                        case 'measure_battery':
                        case 'measure_humidity':
                        case 'measure_luminance':
                            val = fhem.FHEMgetnum(val, 'int');
                            console.log('RT event: ' + homey_cap + ' -> ' + val);
                            fn(device_data, homey_cap, val);
                            return;
                        case 'alarm_contact':
                            val = fhem.FHEMgetcontact(val);
                            console.log('RT event: ' + 'alarm_contact' + ' -> ' + val);
                            fn(device_data, 'alarm_contact', val);
                            return;
                        case 'alarm_motion':
                            val = fhem.FHEMgetmotion(val);
                            console.log('RT event: ' + 'alarm_motion' + ' -> ' + val);
                            fn(device_data, 'alarm_motion', val);
                            return;
                        default:
                            console.log('Unsupported homey_cap ' + homey_cap);
                            return;
                    }
                } else {
                    console.log('Ignoring event: ' + attr + ' -> ' + val);
                }
       		})
        })
        .on('end', function() {
       		console.log("End poll, retry in 5 seconds");
       		fhem.polling = false;
		    setTimeout(function() { fhem.poll(); }, 5000);

        })
        .on('error', function(err) {
       		console.log("Error poll (retry in 30 seconds): " + err);
       		fhem.polling = false;
		    setTimeout(function() { fhem.poll(); }, 30000);
        });
}

module.exports = fhem;

