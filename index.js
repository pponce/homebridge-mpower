var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerPlatform("homebridge-mpower", "mPower", mPowerPlatform);
}

function mPowerPlatform(log, config){
  function stringGen(length) {
    var text = "";
    var charset = "0123456789";
    for( var i=0; i < length; i++ )
        text += charset.charAt(Math.floor(Math.random() * charset.length));
    return text;
  }

  this.log = log;
  this.airos_sessionid = config["airos_sessionid"] || stringGen(32);
  this.outlets = config["outlets"];
}

mPowerPlatform.prototype = {
  accessories: function(callback){
    var foundAccessories = [];

    var count = this.outlets.length;

    for(index=0; index< count; ++index){
      var accessory  = new mPowerAccessory(
        this.log,
        this.airos_sessionid,
        this.outlets[index]);

      foundAccessories.push(accessory);
    }

    callback(foundAccessories);
  }
};

function mPowerAccessory(log, airos_sessionid, outlet) {
  this.log = log;
  this.airos_sessionid = airos_sessionid;
  
  // configuration vars
  this.name = outlet["name"];
  this.username = outlet["username"];
  this.password = outlet["password"];
  this.url = outlet["url"];
  this.id = outlet["id"];
  
  // register the service and provide the functions
  this.services = [];
  this.outletService = new Service.Outlet(this.name);
  
  // the current state (on / off)
  this.outletService
    .getCharacteristic(Characteristic.On)
    .on('get', this.getState.bind(this))
    .on('set', this.setState.bind(this));

  /*Power consumption in Watt*/
  this.outletService
    .getCharacteristic(Characteristic.OutletInUse)
    .on('get', this.getOutletInUse.bind(this));

  this.services.push(this.outletService);
}

mPowerAccessory.prototype.setState = function(state, callback) {
  var exec = require('child_process').exec;
  state = (state == true || state == 1) ? 1 : 0;
  var stateName = (state == 1) ? 'on' : 'off';
  //use expect to SSH to powerstrip to send on off commands directly on powerstrip
  var cmdUpdate = 'expect -c "set timeout 5; spawn ssh -oStrictHostKeyChecking=no ' + this.url + ' -l ' + this.username + '; expect \\"password: \\"; send \\"' + this.password + '\\"; send \\"\\r\\"; expect \\"#\\"; send \\"echo ' + state + ' > /proc/power/relay' + this.id + '\\r\\"; expect \\"#\\"; send \\"cd /proc/power;grep \'\' relay' + this.id + '* \\r\\"; expect \\"#\\"; send \\"exit\\r\\";"'
  //this.log("state variable = " + state + ".");


  this.log("Turning " + this.name + " outlet " + stateName + ".");

      exec(cmdUpdate, function(error, stdout, stderr) {
        if (!error) {
          if (stdout != "") {
	    var lines = stdout.toString().split('\n');
            var response = lines.splice(9,1);
			for (var i = 0; i < response.length; i++){
				response[i] = response[i].trim();
			}
	   //console.log("set " + this.name + " outlet to " + state + " and checked OnOff state for " + this.name + " outlet is " + response[0] + ".");
            if(response[0] == state) {
              callback(null);
            } else {
              callback(error);
            }
          } else {
            console.log("Failed with error: " + error);
          }
        }
      });
}

mPowerAccessory.prototype.getState = function(callback) {
  var exec = require('child_process').exec;

  //use expect to SSH to powerstrip to get state directly from powerstrip
  var cmdStatus = 'expect -c "set timeout 5; spawn ssh -oStrictHostKeyChecking=no ' + this.url + ' -l ' + this.username + '; expect \\"password: \\"; send \\"' + this.password + '\\r\\"; expect \\"#\\"; send \\"cd /proc/power;grep \'\' relay' + this.id + '* \\r\\"; expect \\"#\\"; send \\"exit\\r\\";"'


      exec(cmdStatus, function(error, stdout, stderr) {
        if (!error) {
          if (stdout != "") {
	    var lines = stdout.toString().split('\n');
            var state = lines.splice(8,1);
			for (var i = 0; i < state.length; i++){
				state[i] = state[i].trim();
			}
	    //console.log("OnOff state for " + this.name + " outlet is " + state[0] + ".");
            if(state[0] == 1) {
              callback(null, true);
            } else if(state[0] == 0) {
              callback(null, false);
            }
            else {
              callback(error);
            }
          } else {
            console.log("Failed to communicate with mPower accessory");
          }
        } else {
          console.log("Failed with error: " + error);
        }
      });
}

mPowerAccessory.prototype.getOutletInUse = function(callback) {
  var exec = require('child_process').exec;

  //use expect to SSH to powerstrip to get in use state directly from power strip
  var cmdOutletInUseStatus = 'expect -c "set timeout 5; spawn ssh -oStrictHostKeyChecking=no ' + this.url + ' -l ' + this.username + '; expect \\"password: \\"; send \\"' + this.password + '\\r\\"; expect \\"#\\"; send \\"cd /proc/power;grep \'\' active_pwr' + this.id + '* \\r\\"; expect \\"#\\"; send \\"exit\\r\\";"'
  
      exec(cmdOutletInUseStatus, function(error, stdout, stderr) {
        if (!error) {
          if (stdout != "") {
            var lines = stdout.toString().split('\n');
            var inUseState = lines.splice(8,1);
			for (var i = 0; i < inUseState.length; i++){
				inUseState[i] = inUseState[i].trim();
			}
	    //console.log("inUseState value for " + this.name + " outlet is " + inUseState[0] + ".");
            if(inUseState[0] != "0.0") {
              callback(null, true);
            } else if(inUseState[0] == "0.0") {
              callback(null, false);
            }
	    else {
              callback(error);
            }
          } else {
            console.log("Failed to communicate with mPower accessory");
          }
        } else {
          console.log("Failed with error: " + error);
        }
      });
}

mPowerAccessory.prototype.getDefaultValue = function(callback) {
  callback(null, this.value);
}

mPowerAccessory.prototype.setCurrentValue = function(value, callback) {
  this.log("Value: " + value);

  callback(null, value);
}

mPowerAccessory.prototype.getServices = function() {
  return this.services;
}
