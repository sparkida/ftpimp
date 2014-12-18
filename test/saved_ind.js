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
            console.log('test complete-----' + testName);
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
        