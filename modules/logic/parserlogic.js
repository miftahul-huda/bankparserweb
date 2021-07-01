class ParserLogic {

    static async parse(payload)
    {
        //console.log(payload);
        let newBoxes = [];

       

        payload.forEach((item)=>{
            if(item.y > 400 && item.x > 80)
            {
                newBoxes.push(item);
            }
        })

        newBoxes = ParserLogic.clear(newBoxes);
        newBoxes = ParserLogic.sort(newBoxes);
        newBoxes = ParserLogic.process(newBoxes);



        //newBoxes = ParserLogic.merge(newBoxes);
        /*
        let lowestX = 800;
        let minX = 0;
        let lowestXItem = null;
        let lowestXItems = [];
        let previousLowestXItem = null;

        for(var i = 0; i < 10; i ++)
        {
            lowestXItem = null;
            lowestX = 800;
            newBoxes.forEach((item)=>{
                if(item.x < lowestX && item.x >= minX)
                {
                    lowestX = item.x;
                    lowestXItem = item;
                }
            });

            if(lowestXItem != null)
            {
                minX = lowestXItem.x + lowestXItem.w + 30;

                //if(previousLowestXItem == null)
                //    lowestXItems.push(lowestXItem);
                //else if(previousLowestXItem != null && lowestXItem.x - (previousLowestXItem.x + previousLowestXItem.w) > 20 )
                lowestXItems.push(lowestXItem);
                
                previousLowestXItem = lowestXItem;
            }

        }
        */

        return newBoxes;
    }

    static sort(boxes)
    {
        let smallestX = 0;
        boxes.sort(function(a,b){
            return a.x - b.x;
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

    static process(boxes)
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


}

module.exports = ParserLogic;