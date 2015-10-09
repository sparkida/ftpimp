FTPimp V2.0.1 :: stable
=====================

FTP client for Windows and OSX / Linux.

FTPimp is an (imp)roved implementation of the FTP service API for NodeJS. It has unique features that you'd otherwise expect an FTP client to have...


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

[Documentation for ftp-imp](http://ftpimp.net) can be found at the website [&not;http://ftpimp.net](http://ftpimp.net)

Tests provide an example for every (practical) endpoint in the library [&not;see those here](https://github.com/sparkida/ftpimp/blob/master/test/index.js).



Default config
--------------

```javascript
var config = {
        host: 'localhost',
        port: 21,
        user: 'root',
        pass: '',
        debug: false
    };
```


Running pure FTP commands
-------------------------

**FTPimp's API exposes two main commands** to enable you full control over the flow of your application:

1. [FTP.raw](http://ftpimp.net/FTP.html#raw) - allows you to immediately issue any FTP command; does not enqueue items;
2. [FTP.run](http://ftpimp.net/FTP.html#run) - allows you to issue any FTP command; will add items at the end of the queue by default, but also has a [runLevel](file:///home/nick/ftpimp/docs/FTP.Queue.html#.RunLevels) for more granular control; also see helpers [FTP.runNow](http://ftpimp.net/FTP.html#runNow) and [FTP.runNext](http://ftpimp.net/FTP.html#runNext);
	
***NOTE: FTP.raw commands run outside of the queue and typically must be called when the queue is empty.***


Callbacks
---------

Almost every method allows for a callback to be passed as a parameter and almost every
callback will follow the general parameter form of 
```javascript
function (error, result) {...
```
The only exception will be in the cases where no parameters are passed to the callback
such as in `FTP.connect(callback)`.




Examples
--------

**Tests provide an example for every (practical) endpoint in the library,** [see those here](https://github.com/sparkida/ftpimp/blob/master/test/index.js).

- Automatically login to FTP and run callback when ready

```javascript
var FTP = require('ftpimp'),
    ftp = FTP.create(config),
    connected = function () {
        console.log('connected to remote FTP server');
    };
    
ftp.events.once('ready', connected);
```

- Setup FTPimp and login whenever

```javascript
var FTP = require('ftpimp'),
    ftp = FTP.create(config, false);

//do some stuff...
ftp.connect(function () {
    console.log('Ftp connected');
});
```

- Recursively create directories and delete them.

```javascript
//create a temporary directory name
var tempDir = 'foo' + String(new Date().getTime()),
    recursive = true;

ftp.mkdir(tempDir + '/some/deep/directory', function (err, data) {
    if (err) {
        console.log(err);
    } else {
        console.log('directories created: ', data);
        //recursively delete our temporary directory
        ftp.rmdir(tempDir, function (err, data) {
            console.log(err, data);   
        });
    }
}, recursive);
```



Process Flow
------------

<h3>Understanding FTPimp's proprietary Queue</h3>

- Every queue runs on the same level the command was executed in and each queued command has the ability to group a series of commands into a single queue, this allows you to chain methods for building procedures such as the recursive mkdir procedure, which does exactly what it says: recurses through the FTP.mkdir command in a single queue.

***...TL;DR...***

- Each call with ftp is sequential, if you make calls inside of calls, they are considered children.

- Nested calls will run in the order they were issued. Encapsulated methods will only complete once all nested calls have completed.

	- right way

	```javascript
	ftp.put('foo.js', function (err, res) {
		if (!err) {
			ftp.raw('MDTM foo.js', function (err, res) {
				//...
			});
		}
	});
	```

	- wrong way

	```javascript

	ftp.put('foo.js', function (err, res) {
		//...
	});
	ftp.raw('MDTM foo.js', function (err, res) {
		//...
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

* Sep 10, 2015 7:46am(PDT) - v2.0.0a! Alpha release. Major changes in architecture, 100% backwards compatible with v1.0+, documentation updated, testing suite moved to Mocha!
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
