
FTPimp
======
An improved implementation of the FTP service API for NodeJS.
**Be sure to update as we our in Beta** and for the next week or
so every update will address important fixes.

I'm in the process of adding automation to this FTP module,
certain functions like get, put, save, rmdir already exist,
and I will continue adding / improving them. For the next few
updates I will be more focused on the control of the connection,
things like KeepAlive and cue rescheduling option on failure.


Updates
-------
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
