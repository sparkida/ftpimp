
FTPimp V0.5.4 - stable!
======
An improved implementation of the FTP service API for NodeJS.
<br>
**Everything has been greatly improved at this point.**
<br>
**Be sure to update as we are in Beta**


API Documentation
-----------------
For a full breakdown of this API, including examples [&not;FTPimp.net](http://ftpimp.net)
<br>
Keep checking back, and don't forget to update to the newest version!


Find a Bug?
-----------
Please let me know so that I can fix it ASAP, cheers 
[&not;Report a Bug](https://github.com/sparkida/ftpimp/issues)


Features
--------
- Recursively put files, and create directories
- Recursively delete directories
- UNIX and Windows
- Optional, automated login
- Overrideable methods
- Node-like, event driven, process chain
- Propietary Cue and helper methods for controlling flow
  


Additional Info
---------------
I have a working implementation of FTPimp in a file synchronization manager, built for developers in rapid release / multi-project scenarios, that I'll be releasing within the week to demonstrate.

* Most issues will likely be the result of a lack in documentation, which I'm working on and will be updating shortly
    - by default, FTPimp uses passive connections, this can be changed; **actually FTPimp is OOP, you can override everything to your liking pretty quickly and easily.**
    - every cue runs on the same level the command was executed in and each cued command has the ability to group a series of commands into a single cue, this allows you to chain methods for building procedures such as the recursive mkdir procedure, which does exactly what it says: recurses through the FTP.mkdir command in a single cue.



Examples
--------

###Default config
```javascript
var config = {
        host: 'localhost',
        port: 21,
        user: 'root',
        pass: '',
        debug: false
    };
```

###Automatically login to FTP and run callback when ready
```javascript
var FTP = require('ftpimp'),
    ftp = FTP.create(config),
    connected = function () {
        console.log('connected to remote FTP server');
    };
    
ftp.events.once('ready', connected);
```

###Setup FTPimp and login whenever
```javascript
var FTP = require('ftpimp'),
    ftp = FTP.create(config, false);

//do some stuff...
ftp.connect(function () {
    console.log('Ftp connected');
});
```

###Recursively create directories...and then delete them for fun!
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




Updates
-------
* July 8, 2014 3:38am(PDT) - v0.5.42 - The primary Cue **FTP.cue** will now emit a **"cueEmpty"** event when the last item in the cue completes.
* July 8, 2014 3:21am(PDT) - v0.5.4 - **FTP.rename** will return an error if the file is not found
* July 7, 2014 8:46am(PDT) - Fixed a cueing issue that occured when recursively removing directories using **FTP.rmdir**.
* July 7, 2014 6:46am(PDT) - Fixed an issue that occurred when receiving data through ls, lsnames.
* July 5, 2014 8:36am(PDT) - FTP.mkdir will now make recursive directories within the same cue group. Cue groups are a new feature as of **V0.5.0**
* July 4, 2014 9:15pm(PDT) - **Major Update** Beta v0.5.0 **stable**
    - The primary cue that runs all methods - **(FTP.run)** - now provides full control over how you cue your processes with the use of two parameters <br>**runNow** - to run the next command immediately <br>&<br>**cueGroup** - this tells FTP.run that the command belongs to a cue group and which will escape the **endproc** that loads and fires the next cue in line. Cue groups are one level deep and exist until a command is used where the **cueGroup** parameter is false.
* July 1, 2014 6:44am(PDT) - FTP.put method will no longer prioritize put requests. Execution order is now linear.
* Jun 26, 2014 7:41am(PDT) - Methods can now be passed a runNow parameter, to bypass cueing
* Jun 23, 2014 8:24pm(PDT) - Restructured cues to work within FTP.run
* Jun 23, 2014 7:46am(PDT) - Fixed a cueing issue with mkdir
* Jun 22, 2014 5:20am(PDT) - FTP.mkdir and FTP.rmdir both have the option to recursively create and delete directories.
* Jun 21, 2014 3:43pm(PDT) - Fixed regular expression in FTP.ls to grab deep paths
* Jun 21, 2014 12:16pm(PDT) - FTP.put will now return error if the local file is not found
* Jun 20, 2014 6:56am(PDT) - Fixed an issue with errors not being sent to the callback method
* Jun 19, 2014 4:15pm(PDT) - Fixed an issue that occured when 0 bytes are received in data transfers
* Jun 19, 2014 1:35pm(PDT) - **Major Update** Beta v0.4.0 **stable**
    - **FTP.connect has been replaced for FTP.create**
    - Resolved all known issues with the cueing of commands and data transfers. Good to Go!
* Jun 18, 2014 4:35am(PDT) - Fixed an issue with performing multiple data requests
* Jun 18, 2014 10:35am(PDT) - Fixed an issue with the response handler failing at login 
