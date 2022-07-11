var express = require('express');
var router = express.Router();
const axios = require('axios');
let FormParserLogic = require('../modules/logic/formparserlogic')

router.get("/parse/:url",  (req, res) => {
    let url = req.params.url;

    FormParserLogic.parseForm(url).then((result) => {
        res.send(result)
    }).catch((err)=>{
        res.send({ success: false, payload: err })
    })
})

module.exports = router;