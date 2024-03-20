const path = require('path');
const fs = require('fs');

const dirPath = __dirname + '/scenarios';
fs.readdir(dirPath, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }
    //listing all files using forEach
    files.forEach(function (file) {
        //Skip if not a js file
        if (!file.includes('.js')) {
            return;
        }

        //Ignore json files (its an options)
        if (file.includes('.json')) {
            return;
        }

        const name = file.slice(0, -3);

        //Read the file content
        const content = fs.readFileSync(path.join(dirPath, file), {encoding: 'utf8', flag: 'r'});
        let options = {};

        //Check if the file exists in the same directory
        if (fs.existsSync(path.join(dirPath, name + '.json'))) {
            options = JSON.parse(fs.readFileSync(path.join(dirPath, name + '.json'), {encoding: 'utf8', flag: 'r'}))
        }

        //TODO: Run the scenarios, in single thread
    });
});