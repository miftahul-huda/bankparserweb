var express = require('express');
var router = express.Router();
const axios = require('axios');
var fs = require('fs');
const https = require('https');
const AdmZip = require("adm-zip");
const converter = require('json-2-csv');
const { convertArrayToCSV } = require('convert-array-to-csv');




const ParserLogic = require('../modules/logic/parserlogic')

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


router.get('/parse/:url', function (req, res){
  let url = req.params.url;
  console.log(url);
  url = encodeURIComponent(url);
  console.log(url);
  let ocr_url = process.env.OCR_URL + "/ocr?url=" + url;
  console.log(ocr_url);
  axios.get(ocr_url).then(async (response)=>{
    //console.log(response.data);
    let result = await ParserLogic.parse(response.data);

    res.send({ success: true, payload: result})

  }).catch((err)=>{
    console.log(err)
    res.send({ success: false, error: err })
  })

})

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


router.post('/parse-by-boxes/:url', function (req, res){
  let url = req.params.url;
  let positions = req.body.positions;
  let boxes = ParserLogic.rows2boxes(positions)
  let year = req.body.year;

  ParserLogic.parseByBoxes(url, boxes, year).then((newBoxes)=>{
    console.log("newBoxes")
    //console.log(newBoxes)
    let tableData = ParserLogic.boxes2rows(newBoxes)

    console.log("tableData");
    console.log(tableData)
    res.send({ success: true, payload: tableData })
  })

})

router.post("/analytic", function(req, res){
  
  let data = req.body;
  console.log(data);
  ParserLogic.analyze(data).then((result)=>{
    res.send({ success: true, payload: result})
  }).catch((err)=>{
    res.send({ success: false, error: err})
  })
  
});

router.post("/analytic/no-analytic", function(req, res){
  
  let data = req.body;
  console.log(data);
  ParserLogic.analyze(data, true).then((result)=>{
    res.send({ success: true, payload: result})
  }).catch((err)=>{
    res.send({ success: false, error: err})
  })
  
});

router.get('/pdf-files', function(req, res){
  let config = getConfig();
  let url = config.UPLOAD_BASE_URL + "/upload/gcs-list-public/" + config.PROJECT + "/" + config.GCS_BUCKET + "/" + config.GCS_PDF_FOLDER;
  let ff = [];
  axios.get(url).then( (response) => 
  {
    
    if(response.data.success)
    {
      let files = response.data.payload;
      files.forEach((file)=>{
        if( file.name != null && file.name.substr( file.name.length - 1 ) != "/")
        {
          ff.push(file.name);
        }
      })
      res.send({ success: true, payload: ff })
    }
    else
      res.send({ success: false, error: response.error })
  }).catch((err)=>
  {
    res.send({ success: false, error: err })
  })
});

router.get("/download-json-results/:basefilename/:totalpage", function(req, res){
  
  let basefilename = req.params.basefilename;
  let totalpages = req.params.totalpage;
  let fileResults = [];

  getFilesByPrefix(basefilename, function(files){

    downloadResultFile(files, 0, fileResults, function(fileRes){
      let mergedArray = [];
      console.log(fileRes)
      readFormAndTable(fileRes, 0, [], [], function(formCsvFiles, tableCsvFiles){

          console.log(formCsvFiles)
          console.log(tableCsvFiles)
          let arr = formCsvFiles.concat(tableCsvFiles);
          let zipFile = "/tmp/" + basefilename + ".zip";
          createZipArchive(arr, zipFile);
          res.download(zipFile, null, function(err){
            //CHECK FOR ERROR
            console.log("delete " + zipFile)
            fs.unlink(zipFile, function(){});
          })

          fileRes.map((file)=>{
            fs.unlink(file, function(){});
          })

          arr.map((file)=>{
            fs.unlink(file, function(){});
          })

          
          //fs.unlink(zipFile, function(){})
          

      })
    });
  
  })

});


function getFileSize(path)
{
  var stats = fs.statSync(path)
  var fileSizeInBytes = stats.size; 
  return fileSizeInBytes;
}

function getFilesByPrefix(prefix, callback)
{
  let config = getConfig();
  let url = config.UPLOAD_BASE_URL + "/upload/gcs-list-public/" + config.PROJECT +  "/" +  config.GCS_BUCKET + "/" + config.GCS_JSON_FOLDER + "%2F"  + prefix;
  axios.get(url).then((response)=>{
    if(response.data.success)
    {
      let files = response.data.payload;
      if(callback != null)
        callback(files)
    }
  })

}

function downloadResultFile(files, idx, fileResults, callback)
{
  

  if(idx <  files.length)
  {
    let config = getConfig();
    let savedfile = "/tmp/" + files[idx].name.replace("/", "-");
    let file2download = encodeURIComponent(files[idx].name);
    let url = config.UPLOAD_BASE_URL + "/upload/gcs/download/" + config.PROJECT +  "/" +  config.GCS_BUCKET + "/" + file2download;
    console.log(url)
    download(url, savedfile, function(err){
      
      fileResults.push(savedfile)
      downloadResultFile(files, idx + 1, fileResults, callback)
      
      //res.download(savedfile);
    })
  }
  else 
  {
      if(callback != null)
        callback(fileResults) 
  }
}

function readFormAndTable(files, idx, formCsvFiles, tableCsvFiles, callback)
{
  if(idx < files.length)
  {
    console.log("Reading ...")
    console.log(files[idx])
    let content = fs.readFileSync(files[idx], {encoding:'utf8', flag:'r'})
    let json  = JSON.parse(content)
    json = JSON.parse(json)
   
    let form = json.form;
    let table = json.table;
  
    form = jsonForm2array(form, files[idx])
    table = addType2Table(table, files[idx])
  
    let fname = files[idx].replace("json-", "")
    fname = fname.replace("/tmp/", "");
    let newSavedFormFile = "/tmp/form-" + fname.replace(".json", ".csv")
    let newSavedTableFile = "/tmp/table-" + fname.replace(".json", ".csv")

    let csvForm = convertArrayToCSV(form);
    let csvTable = convertArrayToCSV(table);

    fs.writeFileSync(newSavedFormFile, csvForm);
    fs.writeFileSync(newSavedTableFile, csvTable);

    formCsvFiles.push(newSavedFormFile);
    tableCsvFiles.push(newSavedTableFile);

    readFormAndTable(files, idx + 1, formCsvFiles, tableCsvFiles, callback)

  }
  else
  {
    if(callback != null)
      callback(formCsvFiles, tableCsvFiles)

  }


}

function jsonForm2array(forms, file)
{
  let header = [];
  let content = [];
  forms.map((form)=>{
    header.push(form[0])
    content.push(form[2])
  })


  return content;
}

function addType2Table(table, file)
{
  let tbl = [];
  return table;
}


async function createZipArchive(files, outputFile) {
  const zip = new AdmZip();
  //zip.addLocalFolder("./test");
  files.map((file)=>{
    let content = fs.readFileSync(file);

    let fpath = outputFile.replace(".zip", "")
    fpath = fpath.replace("/tmp/", "")
    fpath = fpath + "/" + file.replace("/tmp/", "")
    console.log(fpath)
    zip.addFile( fpath, content)
  })
  zip.writeZip(outputFile);
  console.log(`Created ${outputFile} successfully`);
}



module.exports = router;
