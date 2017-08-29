FTPimp [![Build Status](https://travis-ci.org/sparkida/ftpimp.svg?branch=master)](https://travis-ci.org/sparkida/ftpimp)
======

FTP client for Windows and OSX / Linux.

FTPimp is an (imp)roved implementation of the FTP service API for NodeJS. It has unique features that you'd otherwise expect an FTP client to have...


#### Supported Node Versions

- 4.x
- 5.x
- 6.x
- 7.x
- 8.x

Upgrading to 3.0 (Feb 28th, 2017)
================

Only one real breaking change for anyone using ftpimp < 3.0, **data returned is now a Buffer**. This may affect methods that try to perform special String methods on a Buffer object (ie String.prototype.split)

Features
--------

FTPimp has several major benefits in comparison to other Node FTP clients:
- Recursively put files, and create directories
- Recursively delete directories
- Optional, automated login
- Overrideable methods
- UNIX and Windows
- Easily work with every step of the event based FTP process
- Propietary queue and helper methods for controlling flow and easily extending FTPimp's functionality
  


API Documentation
-----------------

[Documentation for ftp-imp](https://sparkida.github.io/ftpimp) can be found at the website [&not;https://sparkida.github.io/ftpimp](https://sparkida.github.io/ftpimp)

**Tests provide an example for every (practical) endpoint in the library** [&not;see those here](https://github.com/sparkida/ftpimp/blob/master/test/index.js).


Process flow and Queueing procedures
------------------------------------

**By default, every call is sequential.** To have more granular control, use the [Queue.RunLevels](https://sparkida.github.io/ftpimp/FTP.Queue.html#.RunLevels)

You'll likely only need to use "Queue.RunNext" to prioritize a command over any subsequent commands. In
the example below (**#1**), the sequence is [**mkdir**, **ls**, **put**]

***example #1:***

```javascript
//make a "foo" directory
ftp.mkdir('foo', function (err, dir) { //runs first
	ftp.put(['bar.txt', 'foo/bar.txt'], function (err, filename) { //runs third
	});
});

ftp.ls('foo', function (err, filelist) { //runs second
	...
});
```


While in the next example below(#2) we use [Queue.RunNext](https://sparkida.github.io/ftpimp/FTP.Queueu.html#.RunNext)
to prioritize our "put", over that of the "ls", making our sequence [**mkdir**, **put**, **ls**]

***example #2:***

```javascript
+var Queue = FTP.Queue;
//make a "foo" directory
ftp.mkdir('foo', function (err, dir) { //runs first
	ftp.put(['bar.txt', 'foo/bar.txt'], function (err, filename) { //runs second
-	});
+	}, Queue.RunNext);
});

ftp.ls('foo', function (err, filelist) { //runs third
	...
});
```

Examples
--------

**Default config**

```javascript
var config = {
        host: 'localhost',
        port: 21,
        user: 'root',
        pass: '',
        debug: false
    };
```

**Automatically login to FTP and run callback when ready**

```javascript
var FTP = require('ftpimp'),
    ftp = FTP.create(config),
    connected = function () {
        console.log('connected to remote FTP server');
    };
    
ftp.once('ready', connected);
```

**Setup FTPimp and login whenever**

```javascript
var FTP = require('ftpimp'),
    ftp = FTP.create(config, false);

//do some stuff...
ftp.connect(function () {
    console.log('Ftp connected');
});
```

**Put file to remote server**

```javascript
ftp.put(['path/to/localfile', 'remotepath'], function (err, filename) {
	console.log(err, filename);
});
```

**Get file from remote server**

```javascript
ftp.save(['path/to/remotefile', 'path/to/local/savefile'], function (err, filename) {
	console.log(err, filename);
});
```

**Recursively create directories.**

```javascript
ftp.mkdir('foo/deep/directory', function (err, created) {
	console.log(err, created);
}, true);
```

**Recursively delete directories and their contents**

```javascript
ftp.rmdir('foo', function (err, deleted) {
	console.log(err, deleted);
}, true);
```

**List remote directory contents**

```javascript
ftp.ls('foo', function (err, filelist) {
	console.log(err, filelist);
});
```


FTP Connection Types
--------------------

<h3>Passive vs Active</h3>

By default, FTPimp uses passive connections for security purposes, but **you can override anything** you want pretty quickly to build a very robust FTP application. 




Find a Bug?
-----------

Please let me know so that I can fix it ASAP, cheers 
[&not;Report a Bug](https://github.com/sparkida/ftpimp/issues)




Updates
-------
* Oct 12, 2015 8:11am(PDT) - v2.2.2rc All tests passing;
	- Queueing order is sequential by default, this may break compatability, but resolves a lot of issues and removes barriers in progressive enhancements;	   
	- Readme simplified, more examples, less clutter thanks to ^;
	- Greatly refactored: put, rmdir, mkdir, setType;
	- ls and lsnames now return an empty array instead of false when no files are found
* Sep 10, 2015 7:46am(PDT) - v2.0.0a! Alpha release. Major changes in architecture, documentation updated, testing suite moved to Mocha!
	- FTP.type now returns an error instead of throwing one
	- FTP.save no longer returns filename in the result parameter on error
* May 14, 2015 8:50am(PDT) - v1.3! Addresses issues that occur when working in cross platform environment. This added automated switching between `binary` and `ascii(default)`
* Apr 25, 2015 10:09am(PDT) - v1.2! Linted. Addressed issues that prevented data from transferring completely when using things like `ls` `lsnames` etc...
* Aug 21, 2014 9:56am(PDT) - Fixed an issue where the ftp host and port were hard coded in, connection will now use ftp configuration as intended. Thanks to [broggeri](https://github.com/broggeri)!
* July 9, 2014 8:08am(PDT) - **Major Update** - v1.0.0 - This is the pre-release candidate, everything has passed testing at this point, I will shift my focus to documentation and environment specific testing while tackling active and passive connection concerns. 
* July 8, 2014 3:38am(PDT) - v0.5.42 - The primary Queue **FTP.queue** will now emit a **"queueEmpty"** event when the last item in the queue completes.
* July 8, 2014 3:21am(PDT) - v0.5.4 - **FTP.rename** will return an error if the file is not found
* July 7, 2014 8:46am(PDT) - Fixed a queueing issue that occured when recursively removing directories using **FTP.rmdir**.
* July 7, 2014 6:46am(PDT) - Fixed an issue that occurred when receiving data through ls, lsnames.
* July 5, 2014 8:36am(PDT) - FTP.mkdir will now make recursive directories within the same queue group. Queue groups are a new feature as of **V0.5.0**
* July 4, 2014 9:15pm(PDT) - **Major Update** Beta v0.5.0 **stable**
    - The primary queue that runs all methods - **(FTP.run)** - now provides full control over how you queue your processes with the use of two parameters <br>**runNow** - to run the next command immediately <br>&<br>**queueGroup** - this tells FTP.run that the command belongs to a queue group and which will escape the **endproc** that loads and fires the next queue in line. Queue groups are one level deep and exist until a command is used where the **queueGroup** parameter is false.
* July 1, 2014 6:44am(PDT) - FTP.put method will no longer prioritize put requests. Execution order is now linear.
* Jun 26, 2014 7:41am(PDT) - Methods can now be passed a runNow parameter, to bypass queueing
* Jun 23, 2014 8:24pm(PDT) - Restructured queues to work within FTP.run
* Jun 23, 2014 7:46am(PDT) - Fixed a queueing issue with mkdir
* Jun 22, 2014 5:20am(PDT) - FTP.mkdir and FTP.rmdir both have the option to recursively create and delete directories.
* Jun 21, 2014 3:43pm(PDT) - Fixed regular expression in FTP.ls to grab deep paths
* Jun 21, 2014 12:16pm(PDT) - FTP.put will now return error if the local file is not found
* Jun 20, 2014 6:56am(PDT) - Fixed an issue with errors not being sent to the callback method
* Jun 19, 2014 4:15pm(PDT) - Fixed an issue that occured when 0 bytes are received in data transfers
* Jun 19, 2014 1:35pm(PDT) - **Major Update** Beta v0.4.0 **stable**
    - **FTP.connect has been replaced for FTP.create**
    - Resolved all known issues with the queueing of commands and data transfers. Good to Go!
* Jun 18, 2014 4:35am(PDT) - Fixed an issue with performing multiple data requests
* Jun 18, 2014 10:35am(PDT) - Fixed an issue with the response handler failing at login 
