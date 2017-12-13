var fhem = require('./../fhem.js');

'use strict';

const Homey = require('homey');

class FhemSensorDevice extends Homey.Device {

    // this method is called when the Device is inited
    onInit() {
        this.log('device init');
        this.log('name:', this.getName());
        this.log('class:', this.getClass());

        fhem.FHEMsetcache(this.getData().id, this.getData(), 'fhem-sensor', true);

        setTimeout(fhem.poll, 1000);
    }

    // this method is called when the Device is added
    onAdded() {
        fhem.FHEMsetcache(this.getName(), this.getData(), 'fhem-sensor', true);
        fhem.restart_poll();
        this.log('device added');
    }

    // this method is called when the Device is deleted
    onDeleted() {
        fhem.FHEMdelcache(this.getName());
        fhem.restart_poll();
        this.log('device deleted');
    }
}

module.exports = FhemSensorDevice;
