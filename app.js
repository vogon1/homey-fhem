'use strict';

const Homey = require('homey');

class FHEM extends Homey.App {
	onInit() {
		this.log('FHEM is running...');
	}
}

module.exports = FHEM;