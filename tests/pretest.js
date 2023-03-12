const path = require('path');
const fs = require('fs');

fs.readdir(__dirname, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }
    //listing all files using forEach
    files.forEach(function (file) {
        // Do whatever you want to do with the file
        if (file.indexOf('.js') === file.length - 3) {
            if (file === 'pretest.js') return;

            const name = file.slice(0, -3);
            try {
                fs.unlinkSync(path.join(__dirname, name + '.json'));
            }
            catch (e) {
                //File didn't exist
            }

            const content = fs.readFileSync(path.join(__dirname, file), {encoding:'utf8', flag:'r'});

            fs.writeFileSync(path.join(__dirname, name + '.json'), JSON.stringify({"script": content}));
        }
    });
});