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


router.post('/parse-by-boxes/:url', function (req, res){
  let url = req.params.url;
  let positions = req.body.positions;
  let boxes = ParserLogic.rows2boxes(positions)

  ParserLogic.parseByBoxes(url, boxes).then((newBoxes)=>{
    console.log("newBoxes")
    //console.log(newBoxes)
    let tableData = ParserLogic.boxes2rows(newBoxes)

    console.log("tableData");
    console.log(tableData)
    res.send({ success: true, payload: tableData })
  })

  /*
  console.log("parse-by-boxes");
  url = encodeURIComponent(url);
  console.log(url);

  let ocr_url = process.env.OCR_URL + "/imageboxes2text?url=" + url;
  console.log(ocr_url);

  let data = { positions: boxes }

  console.log("Data to sent")
  console.log(JSON.stringify(data));

  axios.post(ocr_url, data).then(async (response)=>{
    console.log("RESPONSE")

    console.log("=======RESPONSE===========");
    console.log(JSON.stringify(response.data));
    
    let result = ParserLogic.boxes2rows(response.data);
    console.log("result");
    console.log(result);
    res.send({ success: true, payload: result})

  }).catch((err)=>{
    console.log(err)
    res.send({ success: false, error: err })
  })

  */

})


module.exports = router;
