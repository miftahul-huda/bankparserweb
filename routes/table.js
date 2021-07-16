var express = require('express');
var router = express.Router();
const axios = require('axios');
const ParserLogic = require('../modules/logic/parserlogic')




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


module.exports = router;
