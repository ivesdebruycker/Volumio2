'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var config = new (require('v-conf'))();
var mountutil = require('linux-mountutils');
var libUUID = require('node-uuid');
var S = require('string');

// Define the ControllerNetworkfs class
module.exports = ControllerNetworkfs;

function ControllerNetworkfs(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context = context;
	self.commandRouter = self.context.coreCommand;
	self.logger = self.commandRouter.logger;


}

ControllerNetworkfs.prototype.getConfigurationFiles = function () {
	var self = this;

	return ['config.json'];
};

ControllerNetworkfs.prototype.onVolumioStart = function () {
	var self = this;

	var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
	config.loadFile(configFile);

	self.initShares();

    return libQ.resolve();
};

ControllerNetworkfs.prototype.languageCallback = function (data) {
	var self = this;
	console.log(data);
};


ControllerNetworkfs.prototype.onStop = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerNetworkfs.prototype.onRestart = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerNetworkfs.prototype.onInstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetworkfs.prototype.onUninstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetworkfs.prototype.getUIConfig = function () {
	var self = this;

	var self = this;
	var lang_code = self.commandRouter.sharedVars.get('language_code');

	var defer=libQ.defer();
	self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+lang_code+'.json',
		__dirname+'/../../../i18n/strings_en.json',
		__dirname + '/UIConfig.json')
		.then(function(uiconf)
		{
			defer.resolve(uiconf);
		})
		.fail(function()
		{
			defer.reject(new Error());
		})

	return defer.promise;
};

ControllerNetworkfs.prototype.setUIConfig = function (data) {
	var self = this;

	var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');

};

ControllerNetworkfs.prototype.getConf = function (varName) {
	var self = this;

	return self.config.get(varName);
};

ControllerNetworkfs.prototype.setConf = function (varName, varValue) {
	var self = this;

	self.config.set(varName, varValue);
};

//Optional functions exposed for making development easier and more clear
ControllerNetworkfs.prototype.getSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetworkfs.prototype.setSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetworkfs.prototype.getAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetworkfs.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetworkfs.prototype.initShares = function () {
	var self = this;

	var keys = config.getKeys('NasMounts');
	for (var i in keys) {
		var key = keys[i];
		self.mountShare(key);
	}
};

ControllerNetworkfs.prototype.mountShare = function (shareid) {
	var self = this;

	var defer = libQ.defer();

	var sharename = config.get('NasMounts.' + shareid + '.name');
	var fstype = config.get('NasMounts.' + shareid + '.fstype');
	var pointer;
	var fsopts;
	var credentials;
	var responsemessage = {status:""};

	if (fstype == "cifs") {
		pointer = '//' + config.get('NasMounts.' + shareid + '.ip') + '/' + config.get('NasMounts.' + shareid + '.path');
		//Password-protected mount
		if (config.get('NasMounts.' + shareid + '.user') !== 'undefined' && config.get('NasMounts.' + shareid + '.user') !== '') {
			credentials = 'username=' + config.get('NasMounts.' + shareid + '.user') + ',' + 'password=' + config.get('NasMounts.' + shareid + '.password') + ",";
		} else {
			credentials = 'guest,';
		}
		fsopts = credentials + "dir_mode=0777,file_mode=0666,iocharset=utf8,noauto";
	} else { // nfs
		pointer = config.get('NasMounts.' + shareid + '.ip') + ':' + config.get('NasMounts.' + shareid + '.path');
	}

	var mountpoint = '/mnt/NAS/' + config.get('NasMounts.' + shareid + '.name');

	mountutil.mount(pointer, mountpoint, {"createDir": true, "fstype": fstype, "fsopts": fsopts}, function (result) {
		if (result.error) {
			if (result.error.indexOf('Permission denied') > -1);{
				result.error = 'Permission denied';
			}
			responsemessage = {status:"fail", reason:result.error}
			defer.resolve(responsemessage);
		} else {
			responsemessage = {status:"success"}
			defer.resolve(responsemessage);

		}
	});

	return defer.promise;
};

ControllerNetworkfs.prototype.getConfigurationFiles = function () {
	var self = this;

	return ['config.json'];
};

ControllerNetworkfs.prototype.saveShare = function (data) {
	var self = this;

	var defer = libQ.defer();

	console.log('saving share');

	var name = data['Flac.name'];
	var nameStr = S(name);

	/**
	 * Check special characters
	 */
	if (nameStr.contains('/')) {
		self.commandRouter.pushToastMessage('warning', self.getI18NString('networkfs_shares'), self.getI18NString('networkfs_share_name_error'));
		defer.reject(new Error('Share names cannot contain /'));
		return;
	}

	var ip = data['Flac.ip'];
	var fstype = data['Flac.fstype'].value;
	var username = data['Flac.username'];
	var password = data['Flac.password'];
	var options = data['Flac.options'];

	if (username == undefined) username = '';
	if (password == undefined) password = '';
	if (options == undefined) options = '';

	config.addConfigValue('NasMounts.Flac.name', 'string', name);
	config.addConfigValue('NasMounts.Flac.path', 'string', path);
	config.addConfigValue('NasMounts.Flac.ip', 'string', ip);
	config.addConfigValue('NasMounts.Flac.fstype', 'string', fstype);
	config.addConfigValue('NasMounts.Flac.user', 'string', username);
	config.addConfigValue('NasMounts.Flac.password', 'string', password);
	config.addConfigValue('NasMounts.Flac.options', 'string', options);

	self.mountShare();

	self.commandRouter.pushToastMessage('success', self.getI18NString('networkfs_configuration_update'), self.getI18NString('networkfs_configuration_update_success'));
	setTimeout(function () {
		self.scanDatabase();
		//Wait for share to be mounted before scanning
	}, 3000)
	defer.resolve({});
	return defer.promise;
};


ControllerNetworkfs.prototype.getShare = function (name, ip, path) {
	var self = this;

	var keys = config.getKeys('NasMounts');
	for (var i in keys) {
		var subKey = 'NasMounts.' + keys[i];
		self.logger.info("Checking key " + subKey);

		if (config.get(subKey + '.name') == name &&
			config.get(subKey + '.ip') == ip && config.get(subKey + '.path') == path) {
			self.logger.info("Found correspondence in configuration");
			return keys[i];
		}

	}
};


ControllerNetworkfs.prototype.scanDatabase = function () {
	var self = this;

	exec("/usr/bin/mpc update", function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushToastMessage('warning', self.getI18NString('networkfs_my_music'), self.getI18NString('networkfs_scan_database_error') + error);
			self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Database scan error: ' + error);
		}
		else {
			self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Database update started');
			self.commandRouter.pushToastMessage('success', self.getI18NString('networkfs_my_music'), self.getI18NString('networkfs_scan_database_in_progress'));
		}
	});
};

ControllerNetworkfs.prototype.listShares = function () {
	var mounts = config.getKeys();


};


/*
 New APIs
 ###############################
 */

/**
 * This method adds a new share into the configuration
 * @param data {
  name:’SHARE’,
  ip:’192.168.10.1’,
  fstype:’’,
  username:’’,
  password:’’,
  options:’’
}

 */
ControllerNetworkfs.prototype.addShare = function (data) {
	var self = this;


	self.logger.info("Adding a new share");

	var defer = libQ.defer();

	var name = data['name'];
	var nameStr = S(name);


	/**
	 * Check special characters
	 */
	if (nameStr.contains('/')) {
		self.commandRouter.pushToastMessage('warning', self.getI18NString('networkfs_shares'), self.getI18NString('networkfs_share_name_error'));
		defer.reject(new Error('Share names cannot contain /'));
		return defer.promise;
	}

	var ip = data['ip'];
	var path = data['path'];
	var fstype = data['fstype'];
	var username = data['username'];
	var password = data['password'];
	var options = data['options'];

	if (username == undefined) username = '';
	if (password == undefined) password = '';
	if (options == undefined) options = '';

	var uuid = self.getShare(name, ip, path);
	var response;
	if (uuid == undefined) {
		uuid = libUUID.v4();
		var key = "NasMounts." + uuid + ".";
		self.logger.info("No correspondence found in configuration for share " + name + " on IP " + ip);

		var saveshare = self.saveShareConf(key, uuid, name, ip, path, fstype, username, password, options);
		
		saveshare.then(function () {
		var mountshare = self.mountShare(uuid);
		if (mountshare != undefined) {
			mountshare.then(function (data) {
				var responsemessage = {};
				if (data.status == 'success') {
					responsemessage = {emit: 'pushToastMessage', data:{ type: 'success', title: 'Success', message: name + ' mounted successfully'}};
					defer.resolve(responsemessage);
					self.scanDatabase();
				} else if (data.status == 'fail') {
					if(data.reason) {
						responsemessage = {emit: 'pushToastMessage', data:{ type: 'warning', title: 'Error in mounting share '+name, message: data.reason}};
							defer.resolve(responsemessage);
					}
				}


			});
		}
		});
	}
	else {
		defer.resolve({
			success: false,
			reason: 'This share has already been configured'
		});
	}

	return defer.promise;
};

ControllerNetworkfs.prototype.saveShareConf = function (key, uuid, name, ip, path, fstype, username, password, options) {
	var self = this;

	var defer = libQ.defer();
	config.addConfigValue(key + 'name', 'string', name);
	config.addConfigValue(key + 'ip', 'string', ip);
	config.addConfigValue(key + 'path', 'string', path);
	config.addConfigValue(key + 'fstype', 'string', fstype);
	config.addConfigValue(key + 'user', 'string', username);
	config.addConfigValue(key + 'password', 'string', password);
	config.addConfigValue(key + 'options', 'string', options);
	
	defer.resolve('ok')
	return defer.promise;
}

ControllerNetworkfs.prototype.deleteShare = function (data) {
	var self = this;

	var defer = libQ.defer();
	var key = "NasMounts." + data['id'];

	var response;

	if (config.has(key)) {
		var mountpoint = '/mnt/NAS/' + config.get(key + '.name');

		setTimeout(function () {
			try {
				exec('/usr/bin/sudo /bin/umount -f ' + mountpoint + ' ', {
					uid: 1000,
					gid: 1000
				}, function (error, stdout, stderr) {
					if (error !== null) {
						self.commandRouter.pushToastMessage('alert', self.getI18NString('networkfs_configuration_update'), self.getI18NString('networkfs_share_delete_error') + error);
						self.logger.error("Mount point cannot be removed, won't appear next boot. Error: " + error);
					}
					else {
						exec('rm -rf ' + mountpoint + ' ', {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
							if (error !== null) {
								self.commandRouter.pushToastMessage('alert', self.getI18NString('networkfs_configuration_update'), self.getI18NString('networkfs_folder_delete_error') + error);
								self.logger.error("Cannot Delete Folder. Error: " + error);
							}
							else {

								self.commandRouter.pushToastMessage('success',self.getI18NString('networkfs_configuration_update'), self.getI18NString('networkfs_share_delete_success'));
							}
						});
					}
				});


				setTimeout(function () {

					self.scanDatabase();
				}, 3000);
				defer.resolve({success: true});
			}
			catch (err) {
				defer.resolve({
					success: false,
					reason: 'An error occurred deleting your share'
				});
			}


		}, 500);

		config.delete(key);
	}
	else {
		defer.resolve({
			success: false,
			reason: 'This share is not configured'
		});
	}

	return defer.promise;
};


ControllerNetworkfs.prototype.listShares = function (data) {
	var self = this;

	var response = [];
	var size = '';
	var unity = '';
	var defer = libQ.defer();

	var shares = config.getKeys('NasMounts');
	var nShares = shares.length;

	if (nShares > 0) {
		response = [];

		var promises = [];

		for (var i = 0; i < nShares; i++) {
			promises.push(this.getMountSize(shares[i]));
		}
		libQ.all(promises).then(function (d) {
			defer.resolve(d);
		}).fail(function (e) {
			console.log("Failed getting mounts size", e)
		});
	}
	else {
		response = [];
		defer.resolve(response);

	}
	return defer.promise;
};

ControllerNetworkfs.prototype.getMountSize = function (share) {
	return new Promise(function (resolve, reject) {
		var realsize = '';
		var key = 'NasMounts.' + share + '.';
		var name = config.get(key + 'name');
		var mountpoint = '/mnt/NAS/' + name;
		var mounted = mountutil.isMounted(mountpoint, false);
		var respShare = {
			path: config.get(key + 'path'),
			ip: config.get(key + 'ip'),
			id: share,
			name: name,
			fstype: config.get(key + 'fstype'),
			mounted: mounted.mounted,
			size: realsize
		};
		var cmd="df -BM "+mountpoint+" | awk '{print $3}'";
		var promise = libQ.ncall(exec,respShare,cmd).then(function (stdout){


			var splitted=stdout.split('\n');
			var sizeStr=splitted[1];

			var size=parseInt(sizeStr.substring(0,sizeStr.length-1));

			var unity = 'MB';
			if (size > 1024) {
				size = size / 1024;
				unity = 'GB';
				if (size > 1024) {
					size = size / 1024;
					unity = 'TB';
				}
			}
			realsize = size.toFixed(2);
			respShare.size = realsize + " " + unity ;
			resolve(respShare);

		}).fail(function (e){
			console.log("fail...." + e);
			reject(respShare);
		});
	});
};

/**
 * {
 name:’SHARE su 192.168.10.135’
  path:’SHARE’,
  id:’dsdsd’,
  ip:’192.168.10.1’,
  fstype:’’,
  username:’’,
  password:’’,
  options:’’
}

 * @param data
 * @returns {*}
 */
ControllerNetworkfs.prototype.infoShare = function (data) {
	var self = this;

	var defer = libQ.defer();

	if (config.has('NasMounts.' + data['id'])) {
		var key = 'NasMounts.' + data['id'] + '.';
		var response = {
			path: config.get(key + 'path'),
			name: config.get(key + 'name'),
			id: data['id'],
			ip: config.get(key + 'ip'),
			fstype: config.get(key + 'fstype'),
			username: config.get(key + 'user'),
			password: config.get(key + 'password'),
			options: config.get(key + 'options')
		};

		defer.resolve(response);
	}
	else defer.resolve({});

	return defer.promise;
};

/**
 * {
  id:’fdfdvoeo’,
  name:’SHARE’,
  ip:’192.168.10.1’,
  fstype:’’,
  username:’’,
  password:’’,
  options:’’
}

 * @param data
 * @returns {*}
 */
ControllerNetworkfs.prototype.editShare = function (data) {
	var self = this;

	var defer = libQ.defer();

	if (config.has('NasMounts.' + data['id'])) {
		var mountpoint = '/mnt/NAS/' + config.get('NasMounts.' + data['id'] + '.name');
		mountutil.umount(mountpoint, false, {"removeDir": true}, function (result) {
			if (result.error) {
				defer.resolve({
					success: false,
					reason: 'Cannot unmount share'
				});
			} else {
				self.logger.info("Share " + config.get('NasMounts.' + data['id'] + '.name') + " successfully unmounted");
				var key = 'NasMounts.' + data['id'] + '.';

				var oldpath = config.get(key + 'path');
				var oldname = config.get(key + 'name');
				var oldip = config.get(key + 'ip');
				var oldfstype = config.get(key + 'fstype');
				var oldusername = config.get(key + 'user');
				var oldpassword = config.get(key + 'password');
				var oldoptions = config.get(key + 'options');

				config.set(key + 'name', data['name']);
				config.set(key + 'path', data['path']);
				config.set(key + 'ip', data['ip']);
				config.set(key + 'fstype', data['fstype']);
				config.set(key + 'user', data['username']);
				config.set(key + 'password', data['password']);
				config.set(key + 'options', data['options']);

				var mountDefer = self.mountShare(data['id']);
				mountDefer.then(function (value) {
						self.logger.info("New share mounted");
						defer.resolve({
							success: true,
							reason: 'Cannot unmount share'
						});
					})
					.fail(function () {

						self.logger.info("An error occurred mounting the new share. Rolling back configuration");
						config.set(key + 'name', oldname);
						config.set(key + 'path', oldpath);
						config.set(key + 'ip', oldip);
						config.set(key + 'fstype', oldfstype);
						config.set(key + 'user', oldusername);
						config.set(key + 'password', oldpassword);
						config.set(key + 'options', oldoptions);

						defer.resolve({
							success: true,
							reason: 'Cannot unmount share'
						});
					});


			}
		});

	}
	else defer.resolve({
		success: false,
		reason: 'Share not found'
	});

	return defer.promise;
};

ControllerNetworkfs.prototype.discoverShares = function () {
	var self = this;

	var defer = libQ.defer();
	var sharesjson = {"nas":[]};
	try {
	var shares = execSync("/bin/echo volumio | /usr/bin/smbtree", { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 2000 });
	} catch (err) {
		var shares = err.stdout;
	}
	//console.log(shares);
	var allshares = shares.split("\n");
	var num = allshares.length;
	var progress = 0;


	for (var i = 0; i < allshares.length; i++) {
		progress++
		var asd = allshares[i];
		var asd2 = asd.replace('\t\t\\\\','');
		if (asd2.indexOf('\t\\\\') >= 0) {
			var cleaned = asd.split(' ');
			var final1 = cleaned[0].replace('\t\\\\','');
			var final2 = final1.split('\t');
			var final = final2[0];
			sharesjson.nas.push({"name":final,"shares":[]});
		} else  {
			var clean2 = asd2.split(' ');
			for (var e = 0; e < sharesjson.nas.length; e++) {
				if (asd2.indexOf(sharesjson.nas[e].name) >= 0) {
					var sharenamearray = clean2[0].split("\\");
					var sharename = sharenamearray[1];
					if(sharename.indexOf('$') < 0) {
						sharesjson.nas[e].shares.push({"sharename": sharename, "path": sharename});
					}
				}
			}
		}
		if (progress === num) {
			defer.resolve(sharesjson);
		}
	}


	return defer.promise;
};

ControllerNetworkfs.prototype.shareCredentialCheck = function (data) {
	var self = this;

	//TODO FINISH

	var sharename = config.get('NasMounts.' + shareid + '.name');

	var shares = execSync("/bin/echo volumio | echo volumio | smbclient //DISKSTATION/flac", { uid: 1000, gid: 1000, encoding: 'utf8' });
}

ControllerNetworkfs.prototype.loadI18NStrings = function (code) {
    this.logger.info('NETWORK FS I18N LOAD FOR LOCALE '+code);

    this.i18nString=fs.readJsonSync(__dirname+'/i18n/strings_'+code+".json");
}


ControllerNetworkfs.prototype.getI18NString = function (key) {
    return this.i18nString[key];
}
