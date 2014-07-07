
FTPimp V0.5.2 - stable!
======
An improved implementation of the FTP service API for NodeJS.
**Everything has been greatly improved at this point.**

I have a working implementation of FTPimp in a file synchronization manager, built for developers in rapid release / multi-project scenarios, that I'll be releasing within the week to demonstrate.

* Most issues will likely be the result of a lack in documentation, which I'm working on and will be updating shortly
    - by default, FTPimp uses passive connections, this can be changed; **actually FTPimp is OOP, you can override everything to your liking pretty quickly and easily.**
    - every cue runs on the same level the command was executed in and each cued command has the ability to group a series of commands into a single cue, this allows you to chain methods for building procedures such as the recursive mkdir procedure, which does exactly what it says: recurses through the FTP.mkdir command in a single cue.

**Be sure to update as we are in Beta**

Updates
-------
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


API Documentation
-----------------
For a full breakdown of this API, including examples: [FTPimp.net](http://ftpimp.net)
Keep checking back, and don't forget to update to the newest version!


Find a Bug?
-----------
Please let me know so that I can fix it ASAP, cheers. 
[Report a Bug](https://github.com/sparkida/ftpimp/issues)


Quick Start
-----------


```
var FTP = require('ftpimp'),
    ftp = FTP.create({
        host: 'localhost',
        port: 21,
        user: 'root',
        pass: '',
        debug: false
    }),
    connected = function () {
        console.log('connected to remote FTP server');
    };
    
ftp.events.once('ready', connected);
```


Examples
--------

### Recursively delete a directory
```
var recursive = true;
ftp.rmdir('foo', function (err,data) {
    if (!err) {
        console.log('entire directory deleted');
    }
}, recursive);

```

### Get the size of a remote file
```
ftp.size('main/e1.txt', function (err, data) {
    console.log(err, data);
});
```

### Put multiple files to server
```
ftp.put(['test/testfile1.txt','main/t1.txt'], function (err, data) {
    if ( ! err) {
        console.log('file transfered: ' + data);
    }
});

ftp.put(['test/testfile2.txt','main/testfile1.txt'], function (err, data) {
    if ( ! err) {
        console.log('file transfered: ' + data);
    }
});

//Since files are cued asynchronously, use this event to detect
//when all cued files have been transferred
ftp.events.once('fileCueEmpty', function () {
    console.log('All files transferred');
});
```

### Put files to server and then rename both of them 
```
ftp.put(['test/testfile1.txt','main/t1.txt'], function (err, data) {
    ftp.put(['test/testfile2.txt','main/testfile1.txt'], function (err, data) {
        ftp.rename(['main/t1.txt', 'main/e1.txt'], function (err, data) {
            if ( ! err) {
                console.log('file renamed: ' + data);
            }
        });
        ftp.rename(['main/testfile1.txt', 'main/21.txt'], function (err, data) {
            if ( ! err) {
                console.log('file renamed: ' + data);
            }
        });
    });
});
```

### Return an array of StatObjects listing files and directories
```
ftp.ls('main2', function (err, data) {
    console.log(err, data);
    ftp.ls('main2', function (err, data) {
        console.log(err, data);
    });
});
```

### Return an array of file and directorie names found
```
ftp.lsnames('main', function (err, data) {
    console.log(err, data);
});

```

### Recursively delete directory and all files
```
ftp.mkdir('main2', function () {
    ftp.mkdir('main2/test', function (err, data) {
        ftp.put(['test/testfile1.txt','main2/t1.txt'], function (err, data) {
            ftp.rmdir('main2', function (err, data) {
                if (err) {
                    console.log('+++++'.yellow);
                    console.log(err.red);
                } else { 
                    console.log(data);
                }
            }, true);
        });
    });
});

```

### Force Quit the FTP instance
```
ftp.quit(function (err, data) {
   console.log(err, data);
});
```

### Get the file's modification time
```
ftp.filemtime('main/testfile2.txt', function (err, data) {
    console.log(err, data);
});

ftp.filemtime('main2/t1.txt', function (err, data) {
    console.log(err, data);
});

```

### Fetch a remote file from the server
```
ftp.get('main/testfile2.txt', function (err, file) {
    console.log(err, file);
});
ftp.get('main/testfile1.txt', function (err, file) {
    console.log(err, file);
});

```

### Fetch a remote file from the server and save locally
```
ftp.save(['main/testfile2.txt', 'test/t2.txt'], function (err, filepath) {
    console.log(err, filepath);
});

ftp.save(['main/testfile1.txt', 'test/t1.txt'], function (err, filepath) {
    console.log(err, filepath);
});

```

### Abort the current file transfer
```
ftp.abort(function (err, data) {
    ftp.exit();
});

```

### Delete file from the remote directory
```
ftp.unlink('main/tester/t2.txt', function (err, data) {
    ftp.rmdir('main/tester', function (err, data) {
        console.log(err, data);
    });
});
```

### Make a directory on the remote server
```
ftp.mkdir('tester', function () {
    
    ftp.put(['tests/testfile1.txt', 'tester/t1.txt'], function (err, data) {
        if(err) {
            console.log(err);
            return;
        }
        console.log('######################---------------file 1 put to server'.green);
    });
    ftp.put(['tests/testfile2.txt', 'tester/t2.txt'], function (err, data) {
        if (err) {
            console.log('there was an error with file2');
            return; 
        }
        console.log('######################---------------file 2 put to server'.green);
        console.log(data);
    });

});
```

### Show FTP system information
```
ftp.sys(function (err, data) {
    console.log(err, data);
}); 
```

### Print working directory
```
ftp.run('PWD', function (err, data) {
    console.log(err, data);
});
```

### Run raw commands in a generic cue
```
ftp.run('CWD foo', function (err, data) {
        if (err) {
            console.log('could not change working directory');
            console.log(err);
            return;
        }
        console.log('directory changed');
        console.log(data);
    });

ftp.run('SIZE main/foo', function (err, data) {
    if (err) {
        console.log('there was an error receiving the file');
    }
    console.log('size is: ' + data);
});
```
