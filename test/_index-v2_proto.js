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
    Test = function (args) {
        var i = 0,
            args = [],
            argLength = arguments.length,
            testName;

        for(i; i < argLength; i++) {
            args.push(arguments[i]);
        }
        testName = args.shift();
        //cue registered tests until connected
        cue[testName] = args;
        cueIndex.push(testName);
        tests.push(testName);
        console.log('Test created: ' + testName);
    },
    cue = {},
    cueIndex = [],
    tests = [];



Test.run = function () {
    if (cueIndex.length === 0) {
        console.log('--- Testing Complete ---');
        var i = 0;
        for (i; i < tests.length; i++) {
            console.log(tests[i] + ': ', cue[tests[i]].results);
        }
        return;
    }
    console.log('Test module loaded, ftp connected...running tests.');
    var testName = cueIndex.shift(),
        args = cue[testName];
    cue[testName] = Test.create(testName, args);
};


Test.create = function () { 
    return new Test(arguments);
};


Test.prototype.testError = function (err) {
    console.log(this.testName, 'error', err);
    this.results.error = (null !== err);
};


Test.prototype.testSuccess = function (err, data) {
    console.log(this.testName, 'success', err, data);
    this.results.success = (null === err && null !== data);
};

/*
//test success, then error when applicable
register('chdir', '', 'fooError');
register('getcwd');
//will fail at making root
register('mkdir', 'foo' + String(new Date().getTime()), '');
register('ls', '', 'fooError');
register('lsnames', '', 'fooError');
*/

var chdir = Test.create('put', 't1.txt', function () {
});



ftp.connect(Test.run);
ftp.on('testComplete', Test.run);


