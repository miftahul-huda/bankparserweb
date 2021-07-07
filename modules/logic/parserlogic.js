const sharp = require('sharp');
const fs = require('fs');
const http = require('http');
const vision = require('@google-cloud/vision');


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

    static download (url, dest, cb) {
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

    static async parseByBoxes(url, boxes)
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
                            console.log("Image cropped and saved === " + files.length + "===" + boxes.length);
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
                            console.log("An error occured");
                            console.log(err);
                            reject(err);
                        });
                    })

                    
            })
        })

        return promise;
    }


}

module.exports = ParserLogic;