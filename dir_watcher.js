const chokidar = require('chokidar');
const fs = require('fs');
const request = require('./request_and_queue');
const nanoid = require('nanoid');
const config = require('./config')

// var sourceDirectory = 'G:\\JavaScript\\node-crash-course-ninja\\watchtest';
var sourceDirectory = config.dirs.sourceDirectory;

// defines watcher object
const watcher = chokidar.watch(sourceDirectory, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    awaitWriteFinish: false
});

// shortens reference to console object
const log = console.log.bind(console);

// function check if the file extension matches any that is included in user list of extensions
function isVideoFile(fileName) {
    videoExtensions = config.extensions;
    ext = fileName.slice(fileName.lastIndexOf('.') + 1);
    if (videoExtensions.includes(ext)) {
        return true;
    } else return false;
};

function testFileReader(fileName) {
    fs.readFile(fileName, function (err, data) {
        if (err) {
            return console.log(err);
        }
        var output = getResultsList(data.toString());
        console.log(output);
    })
};

function getPathObject(path) {
    return {
        id: nanoid.nanoid(10),
        path: path
    }
};

var tempArray = [];

function externalTest() {
    filesList = config.files.filesList;
    fs.readFile(filesList, 'utf8', function (err, data) {
        if (err) {
            if (err.code == 'ENOENT') {
                log(`IN: Dir-watcher ${filesList}file does not exsist!`);
                return;
            }
            return log(err);
        }
        // parse json object from a file and write to variable -> create error handling for malformed jason
        try {
            if (data.length == 0) {
                diskData = [{ id: '', path: '' }];
            } else {
                diskData = JSON.parse(data);
            }
        } catch (err) {
            log(err.toString());
            log(new Date(Date.now()), '| element ignored');
            // tempArray = [];
            return;
        }

        tempArray.forEach(x => {
            if (diskData.find(obj => obj.path == x.path)) {
                log(x.path, ' ignored');
                // If element already exists do nothing
            } else {
                // If element is new add it to list stored on disk
                log('Found new element')

                request.titlesLookUp(x);
                diskData = [...diskData, x];
                // diskData.push(x);
                log(new Date(Date.now()), '| File | ', x.path, '| saved')
            }
        })
        fs.writeFile(filesList, JSON.stringify(diskData), function (err) {
            if (err) log(err);

        });
    })
};

// starts the watcher with specified actions on different events
watcher
    .on('add', path => {
        if (isVideoFile(path)) {
            log(new Date(Date.now()), '| File | ', path, '| added');
            // TODO change the way objects are added to array
            tempArray.push(getPathObject(path));
        }
    })
    .on('change', path => {
        if (isVideoFile(path)) {
            log(new Date(Date.now()), '| File | ', path, '| changed');
            tempArray = [];
            tempArray.push(getPathObject(path));
            log('in CHANGE: ', tempArray);
            externalTest();
        } 
    })
    .on('error', error => log('Watcher error:', error))
    .on('ready', () => {
        log(new Date(Date.now()), 'Scanning finished | ready!');
        externalTest();

    });


