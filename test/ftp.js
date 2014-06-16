/*
 * The FTPimp testing suite
 * (c) 2014 Nicholas Riley, Sparkida. All Rights Reserved.
 * @module test/ftp
 */

//TODO - change to main
var FTP = require('../ftpimp-app'),
    config = require('./config.json'),
    ftp = FTP.connect(config),
    launch;


launch = function () {
    console.log('++ ftp.events.on fired ready ++');

    
    
    /*
    ftp.size('main/e1.txt', function (err, data) {
        console.log(err, data);
    });
    */
    
    /*
    ftp.put(['test/testfile1.txt','main/t1.txt'], function (err, data) {
        ftp.put(['test/testfile2.txt','main/testfile1.txt'], function (err, data) {
            ftp.rename(['main/t1.txt', 'main/e1.txt'], function (err, data) {

            });
            ftp.rename(['main/testfile1.txt', 'main/21.txt'], function (err, data) {

            });l
        });
    });
    */

    /*ftp.ls('main2', function (err, data) {
        console.log(err, data);
        ftp.ls('main2', function (err, data) {
            console.log(err, data);
        });
    });*/
    
    /* Test recursive directory delete
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
    */

    /*
       ftp.quit(function (err, data) {
       console.log(err, data);
       });
       */

    //ftp.pass(

    /*
    ftp.lsnames('main', function (err, data) {
        console.log(err, data);
    });
    */

    /*
    ftp.filemtime('main/testfile2.txt', function (err, data) {
        console.log(err, data);
    });

    ftp.filemtime('main2/t1.txt', function (err, data) {
        console.log(err, data);
    });
    */

    /*
    ftp.ls('main', function (err, data) {
        console.log(err, data);
    });
    */

    /*
    ftp.get('main/testfile2.txt', function (err, file) {
        console.log(err, file);
    });
    ftp.get('main/testfile1.txt', function (err, file) {
        console.log(err, file);
    });
    */

    /*
    ftp.save(['main/testfile2.txt', 'test/t2.txt'], function (err, filepath) {
        console.log(err, filepath);
    });

    ftp.save(['main/testfile1.txt', 'test/t1.txt'], function (err, filepath) {
        console.log(err, filepath);
    });
    */

    /*
    ftp.put(['tests/testfile1.txt', 'main/testfile1.txt'], function (err, data) {
        console.log(err, data);
    });
    */

    /*
    ftp.abort(function (err, data) {
        console.log(1412412);
        console.log(err, data);
        ftp.exit();
    });
    */

    /*
    var abort = function () {
            ftp.abort(function (err, data) {
                console.log(err, data);
                ftp.put(['tests/testfile2.txt', 'main/testfile2.txt'], function (err, data) {
                    console.log(err, data);
                });
            });
        };

    setTimeout(abort, 30);
    */

    /*ftp.unlink('main/tester/t2.txt', function (err, data) {
        ftp.rmdir('main/tester', function (err, data) {
            console.log(err, data);
        });
    });*/

    /*ftp.mkdir('tester', function () {
        
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
            ftp.sys(function (err, data) {
                console.log(err, data);
            }); 
        });

    });*/
    /*
    ftp.mkdir('tester2', function (err, data) {
    if (err) {
            console.log(err);
            return;
        }
        console.log('directory created:' + data);
       
    });
    /*
    ftp.put(['tests/testfile2.txt', 't2.txt'], function (err, data) {
        if(err) {
            console.log(err);
            return;
        }
        console.log('file 2 put to server');
    });
    ftp.put(['tests/testfile3.txt', 't3.txt'], function (err, data) {
        if(err) {
            console.log(err);
            return;
        }
        console.log('file 3 put to server');
    });
    ftp.put(['tests/testfile4.txt', 't4.txt'], function (err, data) {
        if(err) {
            console.log(err);
            return;
        }
        console.log('file 4 put to server');
    });
    ftp.events.once('fileCueEmpty', function () {
        console.log('now whwat do you want from me');
    });
            
    ftp.put('testfile3.txt', function (err, data) {
        if(err) {
            console.log(err);
            return;
        }
        console.log('file put to server');
        console.log(data);
    });
    /*
    ftp.run('PWD', function (err, data) {
        console.log(err);
        console.log(data);
    });*/
    /*
    ftp.run('MKD main/temp' + Math.floor((Math.random() * 100000) - 1), function (err, data) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('directory created: ' + data);
    });*/

    /*ftp.run('CWD wdqm', function (err, data) {
        if (err) {
            console.log('could not change working directory');
            console.log(err);
            return;
        }
        console.log('directory changed');
        console.log(data);
    });
ftp.run('SIZE main/ftp.json', function (err, data) {
    if (err) {
        console.log('there was an error receiving the file');
    }
    console.log('size is: ' + data);
});

ftp.run('LIST main', function (err, data) {
    if (err) {
        console.log('error with listing directory');
        console.log(err);
        return;
    }
    console.log('listing directory...');
    console.log(data);
    //console.log(data);
});*/

};

ftp.events.on('ready', launch);


