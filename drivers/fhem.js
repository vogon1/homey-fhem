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
    if (readings[fhem_cap]) {
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

fhem.FHEMsliderval = function(dev, val) {
    var slider = dev.slider.split(",");
    if (val < slider[0]) {
        val = slider[0];
    } else if (val > slider[2]) {
        val = slider[2];
    } else {
        val = Math.round(val / slider[1]) * slider[1];
    }
    return val;
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

