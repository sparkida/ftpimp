/*
 * The FTPimp testing suite
 * (c) 2014 Nicholas Riley, Sparkida. All Rights Reserved.
 * @module test/index
 */

//TODO - change to main
var FTP = require('../ftpimp-app'),
    config = require('./config.json'),
    /**create new FTP instance connection
     * and login are automated */
    ftp = FTP.create(config, false),
    Test = function (testName, args) {
        var test = this;
        test.testName = testName;
        test.args = args;
        test.pass = {
            success: false

        };
        test.results = {
            success: null
        };
                
    },
    cue = {},
    cueIndex = [],
    tests = [],
    //pool of created test instances
    pool = {};


Test.exe = function () {
    var test = this,
        errFunc, 
        successFunc = function (err, data) {
            test.testSuccess.call(test, err, data);
            ftp.emit('testComplete');
        },
        args = test.args,
        testName = test.testName,
        argLength = args.length;

    //for commands that don't have directly correlated errors
    console.log('Executing Test: ' + testName);
    if (undefined === args || argLength === 0) {
        ftp[testName].call(ftp, successFunc);
    } else {
        if (argLength > 1) {
            test.results.error = null;
            test.pass.error = false;
            successThenErr = function (err, data) {
                test.testSuccess.call(test, err, data);
                ftp[testName].call(ftp, args[1], function (err) { 
                    test.testError.call(test, err);
                    ftp.emit('testComplete');
                });
            };
            //one for success, one for fail
            ftp[testName].call(ftp, args[0], successThenErr);
        }
    }
};


Test.run = function () {
    if (cueIndex.length === 0) {
        console.log('--- Testing Complete ---');
        var i = 0,
            str = '';
        for (i; i < tests.length; i++) {
            str = '\n' + tests[i] + '\n' + 'Success: ' 
                    + (cue[tests[i]].pass.success ? 'pass'.green : 'fail'.red);
            if (undefined !== cue[tests[i]].pass.error) {
                str += '\nError: ' + (cue[tests[i]].pass.error ? 'pass'.green : 'fail'.red);
            }
            console.log(str);
            //console.log(tests[i] + ': ', cue[tests[i]].results);
        }
        return;
    }
    var testName = cueIndex.shift(),
        args = cue[testName];
    console.log('Running Test: ' + testName);
    pool[testName] = Test.exe.call(cue[testName]);
};


Test.create = function () { 
    var i = 0,
        args = [],
        argLength = arguments.length,
        testName;
    for(i; i < argLength; i++) {
        args.push(arguments[i]);
    }
    testName = args.shift();
    //cue registered tests until connected
    cue[testName] = Test.build(testName, args);
    cueIndex.push(testName);
    tests.push(testName);
    console.log('Test Created: ' + testName, args);
};


Test.build = function (testName, args) {
    return new Test(testName, args);
};


Test.prototype.testError = function (err) {
    this.results.error = /*[this.testName, 'error',*/ err/*]*/;
    this.pass.error = (null !== err);
};


Test.prototype.testSuccess = function (err, data) {
    this.results.success = /*[this.testName, 'success', err,*/ data/*]*/;
    this.pass.success = (null === err && null !== data);
};

Test.end = function () {
    Test.create = function(){};
    Test.run();
    Test.run = function () {};
};


Test.buildTests = function () {


    Test.create('ls', '', 'fooError');
    Test.create('lsnames', '', 'fooError');
    //test success, then error when applicable
    Test.create('chdir', '', 'fooError');
    //will fail at making root
    var testDir = 'foo' + String(new Date().getTime());
    Test.create('mkdir', testDir, '');
    Test.create('ls', '', 'fooError');
    Test.create('lsnames', '', 'fooError');
    Test.create('rmdir', testDir, 'fooError');
    Test.create('put', 'index.js', 'foo');
    Test.create('rename', ['index.js', 'ind.js'], ['index.js', 'foo.js']);
    Test.create('get', 'ind.js', 'fooError');
    Test.create('save', ['ind.js', 'saved_ind.js'], 'fooError');
    Test.create('filemtime', 'ind.js', 'fooError');
    Test.create('unlink', 'ind.js', 'fooError');
    Test.create('run', 'NOOP');

    //stops the test immediately
    //Test.end();

    Test.create('root');
    Test.create('getcwd');
    Test.create('site');
    Test.create('stat');
    Test.create('info');
    Test.create('ping');


    Test.create('quit');
    Test.run();
};




ftp.connect(Test.buildTests);
ftp.on('testComplete', Test.run);


