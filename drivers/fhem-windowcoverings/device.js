var fhem = require('./../fhem.js');

'use strict';

const Homey = require('homey');

class FhemWindowscoveringsDevice extends Homey.Device {

    // this method is called when the Device is inited
    onInit() {
        this.log('device init');
        this.log('name:', this.getName());
        this.log('class:', this.getClass());

        fhem.FHEMsetcache(this.getName(), this.getData(), 'fhem-windowscoverings', true);

        setTimeout(fhem.poll, 1000);

        // register a capability listener
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this))
        this.registerCapabilityListener('dim', this.onCapabilityDim.bind(this))
    }

    // this method is called when the Device is added
    onAdded() {
        fhem.FHEMsetcache(this.getName(), this.getData(), 'fhem-windowscoverings', true);
        fhem.restart_poll();
        this.log('device added');
    }

    // this method is called when the Device is deleted
    onDeleted() {
        fhem.FHEMdelcache(this.getName());
        fhem.restart_poll();
        this.log('device deleted');
    }

    onCapabilityOnoff( value, opts, callback ) {
        fhem.FHEMset_onoff(this.getData(), value, callback);
    }

    onCapabilityDim( value, opts, callback ) {
        fhem.FHEMset_dim(this.getData(), value, callback);
    }
}

module.exports = FhemWindowscoveringsDevice;
