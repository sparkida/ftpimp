/**
 * Build jsdocs and make github wiki pages
 * TODO may cancel this
 */

var conf = require('./jsdoc.json'),
    fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    color = require('colors'),
    child,
    bodyRegex = /<body>[\s\S]*<\/body>/,
    isHTML = /\.html$/,
    destination = conf.opts.destination,
    openHandles = 0,
    i = 0,
    jsRegex = /\.js$/,
    filterHTML = function (filepath) {
        return isHTML.test(filepath);
    },
    parse = function (filepath) {
        var matches;
        console.log('parsing filepath ' + filepath);
        fs.readFile(filepath, function (err, data) {
            if (err) {
                console.log(err);
            } else {
                matches = data.toString().match(bodyRegex);
                if (null !== matches && matches.length > 0) {
                    //sloppy scrunch
                    //matches = matches[1].replace(/[\n\r]+/gm, '').replace(/ +/gm, ' ');
                    matches = matches[0].replace(/\.html/gm, ''); 
                    filepath = path.basename(filepath, '.html');
                    if (filepath === 'index') {
                        var homepath = path.join(
                                destination,
                                'wiki',
                                'Home.textile'
                                );
                        fs.writeFile(homepath, matches, function (err) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log('wiki home file saved: ' + homepath.green);
                            }
                        });
                    } else {
                        filepath = path.join(
                            destination,
                            'wiki',
                            filepath + '.textile'
                            );
                        console.log('creating wiki file: ' + filepath.cyan);
                        fs.writeFile(filepath, matches, function (err) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log('wiki file saved: ' + filepath.green);
                            }
                        });
                    }
                }
            }
        });
    },
    parseDirectory = function (filepaths) {
        console.log('parsing directory'.green, filepaths);
        filepaths = filepaths.filter(filterHTML);
        if (filepaths.length > 0) {
            var i = 0;
            for (i; i < filepaths.length; i++) {
                parse(path.join(destination, filepaths[i]));
            }
        }
    },
    readDestination = function () {
        var read = function (err, filepaths) {
                if (err) {
                    console.log(err);
                } else {
                    parseDirectory(filepaths);
                }
            };
        fs.readdir(destination, read);
    };

/**
for (i; i < paths.length; i++) {
    statFile(paths[i]);
}*/
            
var buildDocs = './node_modules/jsdoc/jsdoc.js -c jsdoc.json',
    execHandler = function (err, stdout, stderr) {
        if (err) {
            console.log(err);
        } else {
            //make sure wiki directory exists
            fs.mkdir(path.join(destination, 'wiki'), readDestination);
        }
    };
child = exec(buildDocs, execHandler);
//EOF build-docs.js
