var express = require('express');
var router = express.Router();
const path = require('path');

const fs = require('fs');
const https = require('https');

var download = function(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = https.get(url, function(response) {
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
    config.GCS_PDF_FOLDER = process.env.GCS_PDF_FOLDER;
    config.GCS_IMAGE_FOLDER = process.env.GCS_IMAGE_FOLDER;
    config.GCS_JSON_FOLDER = process.env.GCS_JSON_FOLDER;
    config.GCS_CSV_FOLDER = process.env.GCS_CSV_FOLDER;
    config.UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL;
    config.OCR_URL = process.env.OCR_URL;
    return config;
}

router.get('/download/:url', function(req,res){
    var url = req.params.url;
    console.log(url)
    url = decodeURIComponent(url);
    console.log(url)
    let temp = url.split("/")
    temp = temp[temp.length - 1];

    let ext = path.extname(temp);
    console.log(ext);

    download(url, "/tmp/temp" + ext, ()=>{
        var data =fs.readFileSync('/tmp/temp' + ext);
        let sdata = new Buffer(data).toString('ascii');
        //console.log(sdata);
        //res.contentType("application/" + ext);
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
    let totalFiles = req.query.totalFiles;
    var p = path.resolve( dir, "../public/pages/", "excel2");
    res.render(p, { totalFiles: totalFiles, config: getConfig() } )
});

router.get("", function(req, res){
    var dir = __dirname;
    var p = path.resolve( dir, "../public/pages/", "page1");
    res.render(p, { config: getConfig() } )
});

router.get("/page2", function(req, res){
    var uri = req.query.uri;
    var headers = req.query.headers;
    var type = req.query.type;
    var year = req.query.year;

    var dir = __dirname;
    var p = path.resolve( dir, "../public/pages/", "page2");
    res.render(p, { uri: uri, type: type, headers: headers, year: year, config: getConfig() } )
});

router.get("/page3", function(req, res){
    var uri = req.query.uri;
    var headers = req.query.headers;
    var type = req.query.type;
    var totalPage = req.query.totalpage;
    var year = req.query.year;

    var dir = __dirname;
    var p = path.resolve( dir, "../public/pages/", "page3");
    res.render(p, { uri: uri, type: type, headers: headers, totalPage: totalPage, year: year, config: getConfig() } )
});

router.get("/analytic", function(req, res){

    var dir = __dirname;
    var p = path.resolve( dir, "../public/pages/", "analytic");
    res.render(p, {  config: getConfig() } )
});


module.exports = router;