# FHEM interface

Use your FHEM devices in Homey.

Homey supports lots of devices out of the box, but for those that are available in FHEM only, you can use this app to use them in Homey.
This app can read and set properties of your FHEM devices, and events in FHEM are forwarded to Homey.

# Supported devices
Currently supported device types:
* Lights
* Sockets
* Thermostats
* Window coverings

# Attribute mapping
In FHEM, add an attribute homeyMapping to the devices you want to be able to control in Homey. the format of the attribute is:

homey_class:homey_capability=fhem_value,homey_capability=fhem_value...

Here are the available homey_classes and their homey_capabilities:

Homey class | Homey capabilities
--- | ---
light | onoff dim measure_energy meausre_power
socket | onoff dim measure_energy measure_power
thermostat | target_temperature measure_temperature measure_humidity
windowcoverings | onoff dim

# Examples
Examples of a homeyMapping attribute for your FHEM devices:
* `attr mylight homeyMapping light:dim,onoff`
* `attr mythermostat homeyMapping measure_temperature=temperature,target_temperature=desired-temperature`

# What's new
# v0.1.0 
Initial release to the Homey app store
