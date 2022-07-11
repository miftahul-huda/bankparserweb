const sharp = require('sharp');
const fs = require('fs');
const https = require('https');
const vision = require('@google-cloud/vision');
const csvparse = require('csv-parse')
const zip = require("zip-lib");
var FormData = require('form-data');
const { resolve } = require('path');
const { create } = require('domain');

class ParserLogic {

    static async parse(payload)
    {
        //console.log(payload);
        let newBoxes = [];
        payload.forEach((item)=>{
            if(item.y > 390 && item.x > 80)
            {
                newBoxes.push(item);
            }
        })

        let newBoxesY = ParserLogic.processY(newBoxes);

        newBoxes = ParserLogic.clear(newBoxes);
        newBoxes = ParserLogic.sortX(newBoxes);
        let newBoxesX = ParserLogic.processX(newBoxes);
        
        return { xBoxes: newBoxesX, yBoxes: newBoxesY } ;
    }

    static sortX(boxes)
    {
        boxes.sort(function(a,b){
            return a.x - b.x;
        })

        return boxes;
    }

    static sortY(boxes)
    {
        boxes.sort(function(a,b){
            return a.y - b.y;
        })

        return boxes;
    }



    static clear(boxes)
    {
        for(var i = boxes.length - 1; i >= 0; i--)
        {
            if(boxes[i].text.indexOf("_") > -1 || boxes[i].text.replace(/ /gi, "").length == 0 
                || boxes[i].text.indexOf("~") > -1 || ParserLogic.hasUnicode(boxes[i].text) ||
                ParserLogic.containsAlphanumeric(boxes[i].text) == false || boxes[i].w < 20 
                || boxes[i].h > 15 || boxes[i].text.toLowerCase().indexOf("bersambung") > -1)
            {
                boxes.splice(i, 1)
            }
        }
        return boxes;
    }

    static hasUnicode (str) {
        for (var i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) > 127) return true;
        }
        return false;
    }

    static containsAlphanumeric(str) {
        var code, i, len;
      
        for (i = 0, len = str.length; i < len; i++) {
          code = str.charCodeAt(i);
          if ((code > 47 && code < 58) || // numeric (0-9)
              (code > 64 && code < 91) || // upper alpha (A-Z)
              (code > 96 && code < 123)) { // lower alpha (a-z)
            return true;
          }
        }
        return false;
      };

      static processY(boxes)
      {
  
          console.log("processY")
          let newBoxes = [];
          boxes = this.sortX(boxes);
          let smallestX = boxes[0].x;
          let xw = smallestX + boxes[0].w;
          boxes = this.sortY(boxes);
  
          boxes.forEach((box)=>{
              if(box.x >= smallestX && box.x <= xw)
              {
                  newBoxes.push(box);
              }
          })
  
          return newBoxes;
      }

    static processX(boxes)
    {
        let avgx = 10;
        let prevBox = null;
        let xprev = 0;
        let xnow = 0;
        let counter = 0;
        boxes[0].boundaryX = boxes[0].x - 10;
        let boundaryBoxes =  [boxes[0]];
        boxes.forEach((item)=>{
            if(prevBox != null)
            {
                let deltax = item.x - (prevBox.x + prevBox.w);
                if(deltax >  avgx)
                {
                    item.boundaryX = item.x - 10;
                    boundaryBoxes.push(item)
                }
            }
            counter++;
            prevBox = item;
        })

        return boundaryBoxes;
    }

    static merge(boxes)
    {
        let removedBoxes = [];
        boxes.forEach((item)=>{
            boxes.forEach((item2)=>{
                if(item.x != item2.x && item.y != item2.y && item.w != item2.w && item.h != item2.h)
                {
                    let deltax = 1000;
                    let deltay = 1000;
                    let largerX = null;
                    let largerY = null;
                    let smallerX = null;
                    let smallerY = null;
                    if(item2.x > item.x)
                    {
                        let xx = item.x + item.w;
                        deltax = item2.x - xx;
                        largerX = item2;
                        smallerX = item;
                    }
                    if(item2.x <= item.x)
                    {
                        let xx = item2.x + item2.w;
                        deltax = item.x - xx;
                        largerX = item;
                        smallerX = item2;
                    }

                    if(item2.y > item.y)
                    {
                        let yy = item.y + item.h;
                        deltay = item2.y - yy;
                        largerY = item2;
                        smallerY = item;
                    }
                    if(item2.y <= item.y)
                    {
                        let yy = item2.y + item2.h;
                        deltay = item.y - yy;
                        largerY = item;
                        smallerY = item2;
                    }

                    if(deltax < 5 && deltay < 5)
                    {
                        smallerX.text += " " + largerX.text;
                        smallerX.w += largerX.w;
                        largerX.delete = 1;
                    }
                }
            })
        })

        for(var i = boxes.length -1; i >=0; i--)
        {
            if(boxes[i].delete == 1)
            {
                boxes.splice(i, 1);
            }
        }

        return boxes;
    }

    static rows2boxes(rows)
    {
        let boexes = [];
        let rowIdx = 0;
        let colIdx = 0;
        rows.forEach((row)=>{
            colIdx = 0;
            row.forEach((cell)=>{
                boexes.push({ x: cell.x, y: cell.y, w: cell.width, h: cell.height, col: colIdx, row: rowIdx })
                colIdx++;
            })
            rowIdx++;
        })
    
        return boexes;
    }

    static getTotalRowsAndCols(boxes)
    {
        let minCol = -1;
        let minRow = -1;
        boxes.forEach((box)=>{
            if(box.col > minCol)
                minCol = box.col;
            if(box.row > minRow)
                minRow = box.row;
        })  

        return { totalCols: minCol + 1, totalRows: minRow + 1};
    }

    static boxes2rows(boxes)
    {
        let inf = this.getTotalRowsAndCols(boxes);
        let rows = [];
        for(var i = 0; i < inf.totalRows; i++)
        {
            let row = [];
            for(var j = 0; j < inf.totalCols; j++)
            {
                let box = this.searchBox(boxes, i, j)
                if(box != null)
                {
                    row.push(box);
                }
            }
            rows.push(row);
        }
        return rows;
    }

    static searchBox(boxes, row, col)
    {
        for(var i = 0; i < boxes.length; i++)
        {
            if(boxes[i].row == row && boxes[i].col == col)
                return boxes[i];
        }

        return null;
    }

    static download (url, dest, cb, cbErr) {
        var file = fs.createWriteStream(dest);
        var request = https.get(url, function(response) {
          response.pipe(file);
          file.on('finish', function() {
            file.close(cb);  // close() is async, call cb after close completes.
          });
        }).on('error', function(err) { // Handle errors
          fs.unlink(dest, function(){}); // Delete the file async. (But we don't check the result)
          if (cbErr) cbErr(err.message);
        });
    }

    static makeid(length) {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
          result += characters.charAt(Math.floor(Math.random() * 
                charactersLength));
       }
       return result;
    }

    static async visionApiOcr(boxes)
    {
        let newBoxes = [];
        let promise = new Promise((resolve, reject)=>{
            boxes.forEach( async (box)=>{
                // Creates a client
                const client = new vision.ImageAnnotatorClient();

                /**
                 * TODO(developer): Uncomment the following line before running the sample.
                 */

                if(box.error == null)
                {
                    const fileName = box.file;
                    console.log("Local file : " + fileName)

                    // Performs text detection on the local file
                    const [result] = await  client.textDetection(fileName);
                    const detections = result.textAnnotations;
                    console.log('Text for ' + fileName);
                    let ss = "";
                    let counter = 0;
                    detections.forEach((text) => 
                    {
                        if(counter == 0)
                        {
                            //console.log(text)
                            ss += text.description.replace(/\n/gi, " ") + "";
                            ss = ss.replace(/\r/gi, "");
                        }
                        counter++;
                        
                    });

                    fs.unlink(fileName, function(){
                        console.log("Delete " + fileName);
                    })

                    ss = ss.trim();
                    console.log(ss);
                    box.text = ss;
                    box.file = null;

                }
                else
                {
                    box.text = "";
                }
                
                delete box.file;
                newBoxes.push(box);

                if(newBoxes.length == boxes.length)
                {
                    resolve(newBoxes);
                }
            })

            return true;
        })

        return promise;
    }

    static async parseByBoxes(url, boxes, year)
    {
        console.log("BOXES")
        console.log(boxes);

        let promise = new Promise((resolve, reject)=>{

            let rand = ParserLogic.makeid(9);
            let tmpFile = "/tmp/tobecropped-" + rand + ".png";
            
            let files = [];
            this.download(url, tmpFile, function(){ 
                    boxes.forEach((box)=>{
                        let rand2 = ParserLogic.makeid(9);
                        let tmpFileResult = "/tmp/tobecropped-" + rand + "-cropped-" + rand2 + ".png";
                        box.file = tmpFileResult;
                        sharp(tmpFile).extract({ width: parseInt(box.w), height: parseInt(box.h), left: parseInt(box.x), top: parseInt(box.y) })
                        .toFile(tmpFileResult)
                        .then(function(new_file_info) {
                            files.push(box);
                            console.log("Image cropped and saved : "  + tmpFileResult + " === " + files.length + "===" + boxes.length);
                            if(files.length == boxes.length)
                            {
                                
                                ParserLogic.visionApiOcr(files).then((newBoxes)=>{
                                    fs.unlink(tmpFile, function(){
                                        console.log("Delete " + tmpFile);
                                    })
                                    resolve(newBoxes)
                                })
                            }
                            
                        })
                        .catch(function(err) {
                            console.log("An error occured ; " + tmpFileResult);
                            console.log(err);

                            files.push(box);
                            //console.log("Image cropped and saved : "  + tmpFileResult + " === " + files.length + "===" + boxes.length);
                            if(files.length == boxes.length)
                            {
                                ParserLogic.visionApiOcr(files).then((newBoxes)=>{
                                    fs.unlink(tmpFile, function(){
                                        console.log("Delete " + tmpFile);
                                    })
                                    resolve(newBoxes)
                                })
                            }
                            //reject(err);
                        });
                    })

                    
            })
        })

        return promise;
    }

    static deleteCsvs(csvFiles)
    {
        csvFiles.forEach((file)=>{
            fs.unlink(file, function(){

            })
        })
    }

    static linesToString(lines)
    {
        let sLines = "";
        lines.forEach((line)=>{
            if(line.trim().length > 0)
                sLines += line + "\n";
        })
        return sLines;
    }

    static array2csv(lines)
    {
        let sLines = "";
        lines.forEach((line)=>{

            let sLine = "";
            line.forEach((cell)=>{
                sLine += "\"" + cell.trim() + "\",";
            })
            if(sLine.length > 0)
                sLine = sLine.substr(0, sLine.length - 1);
            
            sLines += sLine + "\n";
        })
        return sLines;
    }

    static lineItemsToStr(items)
    {
        let ss = "";
        items.forEach((item)=>{
            console.log("item : " + item)
           
            ss = ss +  item + "\",\"";
        })

        if(ss.length > 0)
            ss = ss.substr(0, ss.length - 1);
        return ss;
    }
    static fixLineNumbers(lines)
    {
        console.log("fixLineNumbers");
        console.log(lines);
        for(var i = 0; i < lines.length; i++)
        {
            
            if(i == 0)
                lines[i].push("Category")
            else
                lines[i].push("")

            if(i > 0)
                lines[i][0] = "" + i + "";
        }

        return lines;
    }

    static sortCsvFiles(csvFiles)
    {
        let ff = [];
        let smaller = 1;

        csvFiles.sort(function(a, b){
                var nameA=a.toLowerCase(), nameB=b.toLowerCase();
                nameA = nameA.replace(".csv", "");
                nameB = nameB.replace(".csv", "");
                nameA = nameA.split("-");
                let ch1 = nameA[nameA.length - 1];
                nameB = nameB.split("-");
                let ch2 = nameB[nameB.length - 1];

                if(parseInt(ch1) < parseInt(ch2))
                    return -1;
                else
                    return 1;
                
           });
        return csvFiles;
    }

    static csv2Array(csvContent)
    {
        let arrLines = [];

        let lines = csvContent.split("\n");
        lines.forEach((line)=>{
            let ss = line.split("\",\"");
            let ssItem = [];
            ss.forEach((cell)=>{
                cell = cell.replace(/\"/gi, "")
                ssItem.push(cell);

            })
            arrLines.push(ssItem);
        })

        return arrLines;
    }

    static async mergeCsvFiles(csvFiles, pdfFilename, tempDir, mergedFolder)
    {


        let promise = new Promise((resolve, reject)=>{
            let counter = 0;
            let header = "";
            let sContent = "";
            
            let basefilename = pdfFilename.replace(".pdf", "");
            let mergedFilename = basefilename + ".csv";

            csvFiles.forEach((file)=>{

                //console.log("Reading " + file)
                let content = fs.readFileSync(tempDir + "/" + file);
                content = content.toString();

                let lines = content.split("\n");
                if(counter > 0)
                {
                    lines.splice(0,1)
                }

                let sContent = ParserLogic.linesToString(lines);
                //console.log(sContent);
                fs.appendFileSync(mergedFolder + "/" + mergedFilename, sContent);
                counter++;
            })

            let allContents = fs.readFileSync(mergedFolder + "/" +  mergedFilename)
            allContents = allContents.toString();

            console.log("allContents")
            console.log(allContents)

            let lines = ParserLogic.csv2Array(allContents);
            console.log("LINES")
            console.log(lines);
            lines = ParserLogic.fixLineNumbers(lines);

            console.log(lines);
            sContent = ParserLogic.array2csv(lines);
            fs.writeFileSync(mergedFolder + "/" +  mergedFilename, sContent);
            
            resolve(mergedFilename);

            /*csvparse(allContents, {columns: true}, function(err, lines) {
                // Your CSV data is in an array of arrys passed to this callback as rows.
                
                
             })*/



        })

        return promise;
    }

    static async processCsvFiles(pdfFiles)
    {


        let mergedFolder = "/tmp/bankparser-merged-" +this.makeid(5);
        fs.mkdirSync(mergedFolder);

        let promise = new Promise((resolve, reject) =>{
            let counter = 1;
            let pdfCounter = 0;
            let mergedFilenames = [];
            let tmpDirs = [];

            pdfFiles.forEach(async (pdfFile)=>{
    
                let csfFiles = await ParserLogic.getCsvFiles(pdfFile);
                csfFiles = ParserLogic.sortCsvFiles(csfFiles);
                let basefilename = pdfFile.replace(".pdf", "");

                let tempDir = "/tmp/backparser_" + this.makeid(5);
                fs.mkdirSync(tempDir)
                tmpDirs.push(tempDir);

                console.log(pdfFile)
                console.log(csfFiles);
                
                let c = 0;
                let header =  "";


                
                csfFiles.forEach((csvFile)=>{
    
                    let url = "https://storage.googleapis.com/" + process.env.GCS_BUCKET + "/" + process.env.GCS_CSV_FOLDER + "/" + csvFile;
                    console.log(url);
                    let destFilename = tempDir + "/" + csvFile;
                    console.log(destFilename);
                    ParserLogic.download(url, destFilename, function()
                    {
                        console.log("Downloaded at " + destFilename);
                        if(c == csfFiles.length - 1)
                        {
                            ParserLogic.mergeCsvFiles(csfFiles, pdfFile, tempDir, mergedFolder).then((mergeFilename)=>{
                                
                                pdfCounter++;
                                console.log("Done merging into : " + mergedFolder + "/" + mergeFilename + ", pdfcounter " + pdfCounter + ", " + pdfFiles.length);
                                mergedFilenames.push(mergeFilename);
                                if(pdfCounter == pdfFiles.length)
                                {
                                    resolve({ mergedFiles: mergedFilenames, mergedFolder: mergedFolder, tmpDirs: tmpDirs })
                                }
                            })
                        }
                        c++;
    
                    }, function(err){
                        console.log("ERRROR")
                        console.log(err)
                        c++;
                    })
                    
    
                })

                
            })
        });

        return promise;
    }

    static async getCsvFiles(pdfFile)
    {
        let promise = new Promise((resolve, reject)=>{
            let files = [];
            let csvbasename = pdfFile.replace(".pdf", "");
            console.log("csvbasename")
            console.log(csvbasename);
            let url = process.env.UPLOAD_BASE_URL + "/upload/gcs-list-public/" + process.env.PROJECT + "/" + process.env.GCS_BUCKET + "/" + process.env.GCS_CSV_FOLDER;
            axios.get(url).then((response) => {

                //console.log(response);

                response.data.payload.forEach((file)=>{
                    if(file.name.indexOf(csvbasename + "-page-" ) > -1)
                    {
                        let filename = file.name.replace("csv/", "");
                        files.push(filename);
                    }
                })
                resolve(files);
            })
        })

        return promise;

        
    }

    static releaseResources(info)
    {
        info.tmpDirs.forEach((dir)=>{
            fs.rmdir(dir, {recursive: true}, function(){});
        })

        fs.rmdir(info.mergedFolder, {recursive: true}, function(){});

        fs.unlink(info.zipFile, function(){})

    }

    static async uploadZip2Gcs(zipfilepath,cb)
    {
        let url = process.env.UPLOAD_BASE_URL + "/upload/gcs/" + process.env.PROJECT + "/" + process.env.GCS_ZIP_BUCKET + "/" + process.env.GCS_ZIP_FOLDER;
        console.log("Upload " + url)
        var form = new FormData();
        form.append('file', fs.createReadStream(zipfilepath));

        form.submit(url, function(err, res) {
            // res – response object (http.IncomingMessage)  //
            //res.resume();
            console.log("Upload is successful");

            if(err != null)
                console.log(err)
            if(cb != null)
                cb()
        });
          
    }

    static async uploadZip2GcsTemporary(zipfilepath,cb)
    {
        let url = process.env.UPLOAD_BASE_URL + "/upload/gcs/" + process.env.PROJECT + "/" + process.env.GCS_TEMP_ZIP_BUCKET + "/" + process.env.GCS_TEMP_ZIP_FOLDER;
        console.log("Upload " + url)
        var form = new FormData();
        form.append('file', fs.createReadStream(zipfilepath));

        form.submit(url, function(err, res) {
            // res – response object (http.IncomingMessage)  //
            //res.resume();
            console.log("Upload is successful");

            if(err != null)
                console.log(err)
            if(cb != null)
                cb()
        });
          
    }

    static createNameFile(data, folder)
    {
        let s = data.names;
        fs.writeFileSync(folder + "/name-master.txt", s);

    }

    static async analyze(data, noanalytic = false)
    {
        let promise = new Promise((resolve, reject)=>{

            this.processCsvFiles(data.files).then((result)=>{

                
                console.log("Merged files : ");
                console.log(result.mergedFiles);

                ParserLogic.createNameFile(data, result.mergedFolder);
    
                let bpfilezip = "bankparser-" + this.makeid(5) + ".zip";
                zip.archiveFolder(result.mergedFolder, "/tmp/" + bpfilezip ).then(function () {

                    if(noanalytic != true)
                    {
                        ParserLogic.uploadZip2Gcs("/tmp/" + bpfilezip, function(){
                            console.log("done");
                            result.zipFile ="/tmp/" + bpfilezip;
                            ParserLogic.releaseResources(result);
                            
                            let res = { PROJECT: process.env.PROJECT, BUCKET: process.env.GCS_ZIP_BUCKET, PATH: process.env.GCS_ZIP_FOLDER + "/" + bpfilezip }
                            
                            console.log(res);
                            resolve(res )
                        });

                    }
                    else
                    {
                        ParserLogic.uploadZip2GcsTemporary("/tmp/" + bpfilezip, function(){
                            console.log("done");
                            result.zipFile ="/tmp/" + bpfilezip;
                            ParserLogic.releaseResources(result);
                            
                            let res = { PROJECT: process.env.PROJECT, BUCKET: process.env.GCS_TEMP_ZIP_BUCKET, PATH: process.env.GCS_TEMP_ZIP_FOLDER + "/" + bpfilezip }
                            
                            console.log(res);
                            resolve(res )
                        });                     
                    }
 
                    
                }, function (err) {
                    console.log(err);
                    reject(err);
                });
            })        
        })

        return promise;
    }

    

    


}

module.exports = ParserLogic;