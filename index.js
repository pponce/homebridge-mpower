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

  //use SSH to powerstrip to send on off commands directly to powerstrip
  var cmdUpdate = 'echo $(ssh ubnt@' + this.url + ' "echo ' + state + ' > /proc/power/relay' + this.id + ';cd /proc/power;grep \'\' relay' + this.id + '*;exit;")';
  //this.log("state variable = " + state + ".");
  var stateName = (state == 1) ? 'on' : 'off';

  this.log("Turning " + this.name + " outlet " + stateName + ".");
  
      exec(cmdUpdate, function(error, stdout, stderr) {
        if (!error) {
          if (stdout != "") {
	      var response = stdout.trim();
	      //console.log("set " + this.name + " outlet to " + state + " and checked OnOff state for " + this.name + " outlet is " + response[0] + ".");
              if(response == state) {
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
	
  var cmdStatus = 'echo $(ssh ubnt@' + this.url + ' "cd /proc/power;grep \'\' relay' + this.id + '*;exit;")';

      exec(cmdStatus, function(error, stdout, stderr) {
        if (!error) {
          if (stdout != "") {
            var state = stdout.trim();
	    //console.log("OnOff state for " + this.name + " outlet is " + state[0] + ".");
            if(state == 1) {
              callback(null, true);
            } else if(state == 0) {
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

  var cmdOutletInUseStatus = 'echo $(ssh ubnt@' + this.url + ' "cd /proc/power;grep \'\' active_pwr' + this.id + '*;exit;")';
      
	  exec(cmdOutletInUseStatus, function(error, stdout, stderr) {
        if (!error) {
          if (stdout != "") {
            var inUseState = stdout.trim();
	    //console.log("inUseState value for " + this.name + " outlet is " + inUseState[0] + ".");
            if(inUseState != "0.0") {
              callback(null, true);
            } else if(inUseState == "0.0") {
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
