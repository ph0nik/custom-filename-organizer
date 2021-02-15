const fs = require('fs');
const fsprom = require('fs/promises')
const config = require('./config');
const request = require('./request_and_queue');

const symLinkFolder = config.dirs.symLinkFolder;
const filesList = config.files.filesList;
const queueFolder = config.dirs.queueFolder;
const linksFolder = config.dirs.links;

// shortens reference to console object
const log = console.log.bind(console);

// Name (Year) [tmdbid=xxxx]
// n - result object
// {id: id, index: index}
var testId = 'u8SlTMytFM';
var index = 0;
var testObj = {
    "id": testId,
    "index": index
}


// creates file with information about current symlink
function saveSymlinkInfo(objectPath, linkPath, objectId) {
    const writePath = linksFolder + objectId + '.json';
    const symLinkObj = { 'file': objectPath, 'link': linkPath };
    fs.writeFile(writePath, JSON.stringify(symLinkObj), (err) => {
        if (err) {
            log(err);
        } else {
            log(new Date(Date.now()), 'Symlink info saved for [', objectPath, ']');
        }
    })
}

// creates symlink absolute path
function createSymLinkPath(n, fileExt) {
    return symLinkFolder + n.title + '\\' + n.title + ' [tmbdid=' + n.link + ']' + fileExt;
}

// delete position from existing queue
function deleteQueueElement(queueFileName) {
    fs.unlink(queueFileName, (err) => {
        if (err) log(err);
        log(new Date(Date.now()), '[', queueFileName, '] deleted');
    })
}

// creates symlink folder absolute path
function createSymLinkFolder(n) {
    return symLinkFolder + n.title
}

// promise wrapper around read file function
fs.readfileAsync = (filename) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf8', (err, data) => {
            if (err) {
                // check if file is present
                if (err.code == 'ENOENT') {
                    log(`${filesList} file not found!`);
                }
                reject(err);
            } else {
                try {
                    output = JSON.parse(data);
                } catch (err) {
                    reject(err);
                }
                resolve(output);
            }
        })
    })
};

// delete existing symlink > send request > add to queue
const deleteSymLink = async function(elementId) {
    const linksDir = config.dirs.links;
    const linkFile = `${linksDir}${elementId}.json`;
    try {
        const data = await fsprom.readFile(linkFile, 'utf8');
        const parsed = JSON.parse(data);
        const extractedFolderPath = parsed.link.slice(0, parsed.link.lastIndexOf('\\'));
        const extractedFilePath = parsed.link;
        const originalFilePath = parsed.file;
        // delete symlink
        await fsprom.unlink(extractedFilePath);
        // delete symlink folder
        await fsprom.rmdir(extractedFolderPath);
        // delete file containing information about link
        await fsprom.unlink(linkFile);
        // create look up object
        const lookUpObject = {
            id: elementId,
            path: originalFilePath
        }
        // get results for given object
        request.titlesLookUp(lookUpObject);
    } catch (err) {
        log(err);
    }
}

// deleteSymLink('-lckiv7nQf');

// TODO change to promise based
// function createSymLink(elementId, queueElementIndex) {
//     fs.readfileAsync(filesList)
//         .then((diskData) => {
//             // check if object with given id is present on the list retrieved from a file
//             let objectById = diskData.filter(x => {
//                 return x.id === elementId;
//             });
//             if (objectById.length === 0) {
//                 log(`${new Date(Date.now())} No matching objects found in file: ${filesList}`);
//             } else {
//                 // get file path
//                 objectPath = objectById[0].path;
//                 // extract file extension
//                 objectExtension = objectPath.slice(objectPath.lastIndexOf('.'), objectPath.length);
//             }
//             const queueFileName = `${queueFolder}${elementId}.json`;
//             return fs.readfileAsync(queueFileName);
//         })
//         .then((queueElementResults) => {
//             const symLinkFolder = createSymLinkFolder(queueElementResults[queueElementIndex]);
//         })
// }

function createSymLink(elementId, queueElementIndex) {
    // get file path by id
    fs.readFile(filesList, 'utf8', (err, fileData) => {
        if (err) {
            // check if file is present
            if (err.code == 'ENOENT') {
                log(`file-service -> ${filesList}file does not exsist!`);
                return;
            }
            return log(err);
        }
        try {
            diskData = JSON.parse(fileData);
        } catch (err) {
            log(err.toString());
            return;
        }
        // check if object with given id is present on the list retrieved from a file
        let objectById = diskData.filter(x => {
            return x.id === elementId;
        });
        if (objectById.length === 0) {
            log(`${new Date(Date.now())} No matching objects found in file: ${filesList}`);
        } else {
            // get file path
            objectPath = objectById[0].path;
            // extract file extension
            objectExtension = objectPath.slice(objectPath.lastIndexOf('.'), objectPath.length);
        }

        // relative path
        const queueFileName = `${queueFolder}${elementId}.json`;
        // get result values from file with matching id
        fs.readFile(queueFileName, 'utf8', (err, qdata) => {
            if (err) {
                if (err.code == 'ENOENT') {
                    log(`${queueFileName} file does not exsist!`);
                    return;
                }
                return log(err);
            }
            try {
                queueElementResults = JSON.parse(qdata);
                // singleResult = JSON.parse(qdata);
            } catch (err) {
                log(err.toString());
                return;
            }
            // create symlink path with given element index

            const symLinkFolder = createSymLinkFolder(queueElementResults[queueElementIndex]);
            // create folder
            fs.mkdir(symLinkFolder, (err) => {
                if (!err || err.code === 'EEXIST') {
                    const symLinkPath = createSymLinkPath(queueElementResults[queueElementIndex], objectExtension);
                    // create symlink
                    fs.symlink(objectPath, symLinkPath, (err) => {
                        if (err && err.code === 'EEXIST') {
                            log('Symlink already exists!');
                        } else if (err) {
                            log(err);
                        } else {
                            // save symlink info - operation id, original file path and symlink path
                            saveSymlinkInfo(objectPath, symLinkPath, elementId);
                            log(new Date(Date.now()), objectPath, ' -> ', symLinkPath, '| symlink created.');
                            // delete queue file
                            deleteQueueElement(queueFileName);
                        }
                    })
                } else {
                    log(err);
                }
            });
        })
    })
};

// createSymLink(testObj);
module.exports = { createSymLink, deleteSymLink }