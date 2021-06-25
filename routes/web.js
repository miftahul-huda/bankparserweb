var express = require('express');
var router = express.Router();
const path = require('path');

const fs = require('fs');
const http = require('http');

var download = function(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = http.get(url, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        file.close(cb);  // close() is async, call cb after close completes.
      });
    }).on('error', function(err) { // Handle errors
      fs.unlink(dest); // Delete the file async. (But we don't check the result)
      if (cb) cb(err.message);
    });
};

function getConfig()
{
    var config = {};
    config.PROJECT = process.env.PROJECT;
    config.GCS_BUCKET = process.env.GCS_BUCKET;
    config.GCS_FOLDER = process.env.GCS_FOLDER;
    config.UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL;
    return config;
}

router.get('/download/:url', function(req,res){
    var url = req.params.url;
    download(url, "/tmp/temp.pdf", ()=>{
        var data =fs.readFileSync('/tmp/temp.pdf');
        res.contentType("application/pdf");
        res.send(data);
    });

})

router.get('web/index', function (req, res){


    var dir = __dirname;
    var p = path.resolve( dir, "../public/pages/", "index");
    res.render(p, { config: getConfig() } )


})

router.get("/excel1", function(req, res){
    var dir = __dirname;
    var p = path.resolve( dir, "../public/pages/", "excel1");
    res.render(p, { config: getConfig() } )
});

router.get("/excel2", function(req, res){
    var dir = __dirname;
    var p = path.resolve( dir, "../public/pages/", "excel2");
    res.render(p, { config: getConfig() } )
});

router.get("", function(req, res){
    var dir = __dirname;
    var p = path.resolve( dir, "../public/pages/", "page1");
    res.render(p, { config: getConfig() } )
});

router.get("/page2", function(req, res){
    var uri = req.query.uri;

    var dir = __dirname;
    var p = path.resolve( dir, "../public/pages/", "page2");
    res.render(p, { uri: uri, config: getConfig() } )
});

router.get("/page3", function(req, res){
    var uri = req.query.uri;

    var dir = __dirname;
    var p = path.resolve( dir, "../public/pages/", "page3");
    res.render(p, { uri: uri, config: getConfig() } )
});


module.exports = router;