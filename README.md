# homebridge-mpower
This is a plugin for [homebridge](https://github.com/nfarina/homebridge). It allows you to control your Ubiquiti mPower outlets with HomeKit.
This version of the plugin uses SSH to execute the commands on the mPower device. It requires some special setup to allow being able to SSH without the need for password. Instructions below on how to generate the SSH key needed to do this and where to place it on the mPower device.

# Installation

1. Install homebridge (if not already installed) using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g pponce/homebridge-mpower`
3. Update your configuration file. See below for a sample.
4. You will need to create an ssh key and install it on the mPower device to automate ssh login from homebridge device without the need for a password. Instructions below.

Creating SSH key for mPower device:

1.) You will need run the command below on your homebridge device. I'm running it on a raspberry device and i run homebridge with user "homebridge".  Replace the username below (homebridge) with the username you use to run homebridge.

sudo -u homebridge ssh-keygen –t rsa <return>
Hit 3 times return

2.) Private and public keys are created in my case under  /home/homebridge/.ssh/. Navigate to this directory. It may be under a different user folder in your case based on what user you use to run homebridge. copy the contents of id_rsa.pub by running the following command.

tail id_rsa.pub

3.) ssh to the mPower device and navigate to the directory /var/etc/persistent/.ssh/
If the directory's don't exist create them.

4.)Within the ssh directory create a new file called authorized_keys and paste the contents from step 2 into this file.
Here is one way to do it

cat > authorized_keys <enter>
<paste contents>
<Hit control d a couple of times>
  
5.) From the homebridge device ssh one time to the mPower pro to permantly add the ip address of the homebridge device to the list of known hosts. Run the ssh command as the same user that runs homebridge. Replace mPower username and Ip below as well.

sudo -u homebridge ssh -oKexAlgorithms=+diffie-hellman-group1-sha1 <username of mPower device>@<ip of mPower device>
respond yes when prompted.
  
6.) you should be all set now.

# Configuration

```
"platforms": [
  {
    "platform": "mPower",
    "name": "mPower",
    "outlets": [
      {
        "name": "Fan",
        "username": "admin",
        "url": "10.0.1.5",
        "id": "1"
      },
      {
        "name": "Hall Light",
        "username": "admin",
        "url": "10.0.1.5",
        "id": "2"
      },
      {
        "name": "Mr. Coffee",
        "username": "admin",
        "url": "10.0.1.6",
        "id": "1"
      }
    ]
  }
]
```

| Parameter | Description |
|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `name` | The human-readable name of the device plugged into your outlet |
| `username` | Your mFi Controller username |
| `url` | May be either a hostname or an IP address |
| `id` | The specific outlet you hope to control. For mPower mini, this can only be `1`. For mPower and mPower PRO, you might have to do some trial and error to figure out which outlet has which `id`. I only have an mPower mini, so I can't check :) |
