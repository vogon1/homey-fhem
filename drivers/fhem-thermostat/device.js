var fhem = require('./../fhem.js');

'use strict';

const Homey = require('homey');

class FhemThermostatDevice extends Homey.Device {

    // this method is called when the Device is inited
    onInit() {
        this.log('device init');
        this.log('name:', this.getName());
        this.log('class:', this.getClass());

        fhem.FHEMsetcache(this.getData().id, this.getData(), 'fhem-thermostat', true);

        setTimeout(fhem.poll, 1000);

        // register a capability listener
        this.registerCapabilityListener('target_temperature', this.onCapabilityTargetTemperature.bind(this))
    }

    // this method is called when the Device is added
    onAdded() {
        fhem.FHEMsetcache(this.getName(), this.getData(), 'fhem-thermostat', true);
        fhem.restart_poll();
        this.log('device added');
    }

    // this method is called when the Device is deleted
    onDeleted() {
        fhem.FHEMdelcache(this.getName());
        fhem.restart_poll();
        this.log('device deleted');
    }

    onCapabilityTargetTemperature( value, opts, callback ) {
        fhem.FHEMset_onoff(this.getData(), value, callback);
        fhem.FHEMset_target_temperature(this.getData(), value, callback);
    }
}


let FHEMthermostat_set_measure_temperature = new Homey.FlowCardAction('FHEMthermostat_set_measure_temperature');
FHEMthermostat_set_measure_temperature
    .register()
    .registerRunListener(( args, state, callback ) => {
        console.log("Set temperature");
        fhem.FHEMset_measure_temperature(args.device.getData(), args.temperature, callback);
    })

module.exports = FhemThermostatDevice;
