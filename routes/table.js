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


module.exports = router;
