
var Page2 = {

    json: {},
    PDF : null,
    CUR_PAGE : 1,
    PAGE :  null,
    PDFJS : null,
    TABLELEFT:207,
    TABLETOP:586,
    ocr: function(page, callback)
    {
        console.log("OCR")
        Page2.imageBox2Text(page, function(response)
        {
            console.log("RESPONSE FROM PARSE");
            console.log(response);


            let data =  response.payload;

            //

            data = Page2.toTable(data);

            Page2.json.table = data;

            $("#json-area").text(JSON.stringify(Page2.json))

            console.log(data);
            Page2.displayTableResult(data);
            
            if(callback != null)
                callback();

        })
    }
    ,
    toTable: function(data)
    {
        let rows = [];
        let totalRows = data.length;
        let totalCols = data[0].length;
    
        for(var i = 0; i < totalRows; i++)
        {
            let row = [];
            for(var j = 0; j < totalCols; j++)
            {
                row.push(data[i][j].text);
            }
    
            rows.push(row);
        }
        return rows;
    }
    ,
    displayTableResult: function(data)
    {
        console.log("display result")
        let tbl = document.createElement("table")
        $(tbl).attr("style", "width: 100%; border: solid 1px #ccc")
        $("#table-content").html("");

        let rowIdx = 0;
        data.forEach((row)=>{
            
            let colIdx = 0;
            let tr = document.createElement("tr")
            row.forEach((cell)=>{
            
                let td = document.createElement("td");
                $(td).attr("style", "border: solid 1px #ccc; padding: 2px")
                $(td).attr("col", colIdx)
                $(td).attr("row", rowIdx)
                $(td).html(cell);
                $(tr).append(td);
                colIdx++;
            })

            $(tbl).append(tr);
            rowIdx++;
        })

        $("#table-content").append(tbl);
        HudaTableEditor.apply(tbl, function(data){
            Page2.json.table = data
            $("#json-area").text(JSON.stringify(Page2.json))
        });
    }
    ,
    getImageFilename: function(page)
    {
        let filename = decodeURIComponent(Page2.FILE_URI).split("/");
            filename = filename[filename.length - 1];
            filename = filename.replace(".pdf", "");
            filename += "-page-" + page;
            filename += ".png";
        return filename;
    }
    
    , 
    getOriJsonFilename: function(page)
    {
        let filename = decodeURIComponent(Page2.FILE_URI).split("/");
            filename = filename[filename.length - 1];
            filename = filename.replace(".pdf", "");
            filename += "-page-ori-" + page;
            filename += ".json";
        return filename;
    }
    , 
    getResultJsonFilename: function(page)
    {
        let filename = decodeURIComponent(Page2.FILE_URI).split("/");
            filename = filename[filename.length - 1];
            filename = filename.replace(".pdf", "");
            filename += "-result-" + page;
            filename += ".json";
        return filename;
    }
    , 
    getResultJsonBaseFilename: function(page)
    {
        let filename = decodeURIComponent(Page2.FILE_URI).split("/");
            filename = filename[filename.length - 1];
            filename = filename.replace(".pdf", "");
            filename += "-result-";
        return filename;
    }
    ,
    getCsvFilename: function(page)
    {
        let filename = decodeURIComponent(Page2.FILE_URI).split("/");
            filename = filename[filename.length - 1];
            filename = filename.replace(".pdf", "");
            filename += "-page-" + page;
            filename += ".csv";
            filename = TYPE + "_" + filename;
        return filename;
    }
    ,
    getOriJsonUrl: function(page)
    {
        let filename = Page2.getOriJsonFilename(page);
        return Page2.getBaseFileUri() + "/" + Page2.GCS_BUCKET + "/" + Page2.GCS_JSON_FOLDER + "/" +  filename;
    }
    ,
    getImageFilename: function(page)
    {
        let filename = decodeURIComponent(FILE_URI).split("/");
            filename = filename[filename.length - 1];
            filename = filename.replace(".pdf", "");
            filename += "-page-" + page;
            filename += ".png";
        return filename;
    }
    ,
    getImageUrl: function(page)
    {
        let filename = Page2.getImageFilename(page);
        return Page2.getBaseFileUri() + "/" + Page2.GCS_BUCKET + "/" + Page2.GCS_IMAGE_FOLDER + "/" +  filename;
    }
    ,
    getBaseFileUri: function()
    {
        let uri = decodeURIComponent(FILE_URI);
        uri = uri.replace("http://", "");
        uri = uri.replace("https://", "");
    
        uri = uri.split("/");
        let host = uri[0];
        uri = "https://" + host;
        return uri;
    }
    ,
    downloadJson: function(jsonFilename, callback)
    {
        $.get("/web/download/" + jsonFilename, function(response){
            if(callback != null)
                callback(response)
        })
    }
    ,
    imageBox2Text: function(page, callback)
    {
    
        let jsonFileUrl = Page2.getOriJsonUrl(page);
        console.log(jsonFileUrl)
        jsonFileUrl = encodeURIComponent(jsonFileUrl);
    
        let imagefileUrl = Page2.getImageUrl(page);
        imagefileUrl =  encodeURIComponent(imagefileUrl);
    
        console.log("imageBox2Text Download Json")
        console.log(jsonFileUrl);
    
        Page2.downloadJson(jsonFileUrl, function(json){
            console.log("JSON " + jsonFileUrl);
            
    
            if(typeof json == 'object')
                json = JSON.stringify(json);
    
            if(json.indexOf("<?xml") == -1)
            {
                json = JSON.parse(json);
                console.log("json1");
                let headers = json.headers;

                json = { positions: json.rows }
                json.positions.unshift(headers)
                

                console.log("json2");
                console.log(json);
            
                json = JSON.stringify(json)
                console.log("Json to send to parse")
                console.log(json);

                
    
                let url = "/table/parse-by-boxes/" + imagefileUrl;
                $.post(url, json, function(response){
                    
                    if(callback != null)
                        callback(response);
                }).fail(function(){
                    //run(CUR_PAGE);
                    //alert("Parsing failed. Please fix the table for this page.")
                })
                

            }
            else
            {
                //CUR_PAGE = PREV_PAGE;
                $.notify("The pdf page " + page + " does not have table defined. If you have defined the table, please save first", "error")
                $("#processgif").hide();
            }
    
    
        })
    }
    ,
    parseForm: function(callback, callbackError)
    {
        let url = "/formparser/parse/" + encodeURIComponent(Page2.FILE_URI);
        console.log("url")
        console.log(url);

        $.get(url, function(result){
            console.log("parseForm result");
            console.log(result);
            
            Page2.json.form = result.payload;
            $("#json-area").text(JSON.stringify(Page2.json))
            if(callback != null)
                callback(result.payload)
        })
    }
    ,
    createBox: function(points)
    {
        let x1 = points[0].x;
        let y1 = points[0].y;
        let w = points[1].x - points[0].x;
        let h = points[2].y - points[1].y;

        let imgWidth = $("#pdf-canvas").width();
        let imgHeight = $("#pdf-canvas").height();


        let tbl = document.createElement("div");
        $(tbl).css("width", w * imgWidth);
        $(tbl).css("height", h * imgHeight);
        $(tbl).css("border", "solid 2px red");
        $(tbl).css("position", "absolute");
        $(tbl).css("left", x1 * imgWidth);
        $(tbl).css("top", y1 * imgHeight);
        $(tbl).attr("class", "bbox")

        return tbl;
    }
    ,
    displayFormBoundingBox: function(forms)
    {
        let x = $("#right-displayer").position().left;
        let y = $("#right-displayer").position().top;

        $("#form-boxes").css("position", "absolute");
        $("#form-boxes").css("left", x);
        $("#form-boxes").css("top", y);

        forms.map((form)=>{
            let fieldBox = Page2.createBox(form.fieldBox);
            let fieldValueBox = Page2.createBox(form.fieldValueBox);

            $(fieldBox).attr("data", form.field)
            $(fieldValueBox).attr("data", form.fieldValueBox)

            $(fieldBox).attr("box-id", form.fieldId);
            $(fieldValueBox).attr("box-id", form.fieldValueId)

            $(fieldBox).on("click", function(){
                let boxId = $(this).attr("box-id");
                $("td[box-id]").css("background-color", "transparent")
                $("div[box-id]").css("border-color", "red")
                $("td[box-id=" + boxId + "]").css("background-color", "#ccc")
            })

            $(fieldValueBox).on("click", function(){
                let boxId = $(this).attr("box-id");
                $("td[box-id]").css("background-color", "transparent")
                $("div[box-id]").css("border-color", "red")
                $("td[box-id=" + boxId + "]").css("background-color", "#ccc")
            })

            $("#form-boxes").append(fieldBox)
            $("#form-boxes").append(fieldValueBox)
        })
    }
    ,
    makeid: function(length) {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
          result += characters.charAt(Math.floor(Math.random() * 
            charactersLength));
       }
       return result;
    }
    ,
    createFormIds: function(forms)
    {
        forms.map((form)=>{
            form.fieldId  = Page2.makeid(10);
            form.fieldValueId = Page2.makeid(10);
        })
        return forms;
    }
    ,
    displayForm: function(forms)
    {
        forms = Page2.createFormIds(forms)
        
        $("#form-content").html("")
        let tbl = document.createElement("table")
        forms.map((form)=>{

            let tr = document.createElement("tr")
            let td1 = document.createElement("td")
            if(form.fieldConfidence < 0.9)
                $(td1).attr("style", "color: red")
            $(td1).html(form.field);
            let td2 = document.createElement("td")

            $(td2).html("&nbsp;&nbsp;:&nbsp;&nbsp;");
            let td3 = document.createElement("td")

            if(form.fieldValueConfidence < 0.5)
                $(td3).attr("style", "color: red")
            $(td3).html(form.value);

            
            $(td1).attr("box-id", form.fieldId)
            $(td3).attr("box-id", form.fieldValueId)

            $(tr).append(td1);
            $(tr).append(td2);
            $(tr).append(td3);
            $(tbl).append(tr);
        })

        $("#form-content").append(tbl);
        HudaTableEditor.apply(tbl, function(data){
            Page2.json.form = data;
            $("#json-area").text(JSON.stringify(Page2.json))
        }, function(td){
            $("td[box-id]").css("background-color", "transparent")
            let boxId = $(td).attr("box-id");
            $("div[box-id]").css("border-color", "red")
            $("div[box-id=" + boxId + "]").css("border-color", "green")

        });

        Page2.displayFormBoundingBox(Page2.json.form)

    }
    ,
    uploadJsonFile: function(filename, content, callback)
    {
        let filepath = Page2.GCS_JSON_FOLDER + "/" + filename;
        filepath = encodeURIComponent(filepath);

        var url = Page2.UPLOAD_BASE_URL + "/upload/gcs-create-file/" + Page2.PROJECT + "/" + Page2.GCS_BUCKET + "/" + filepath;
        console.log("create file url");
        console.log(url);

        let sJson = JSON.stringify({
            content: JSON.stringify(content)
        });

        $.post(url, sJson, function(response){
            console.log(response);
            if(callback != null)
                callback(response);
        })

    }
    ,
    savePDFImage: function(callback)
    {
    
        var page  = Page2.PAGE;

        var canvas = document.getElementsByTagName("canvas")[0];
        let imageData = canvas.toDataURL('image/png');

        let filename = Page2.getCurrentImageFilename();
        let originalFilename = filename;
    

        var ImageURL = imageData;
        // Split the base64 string in data and contentType
        var block = ImageURL.split(";");
        // Get the content type of the image
        var contentType = block[0].split(":")[1];// In this case "image/gif"
        // get the real base64 content of the file
        var realData = block[1].split(",")[1];// In this case "R0lGODlhPQBEAPeoAJosM...."

        // Convert it to a blob to upload
        var blob = Page2.b64toBlob(realData, contentType);

        let form  = document.createElement("form");

        // Create a FormData and append the file with "image" as parameter name
        var formDataToUpload = new FormData(form);
        formDataToUpload.append("file", blob, originalFilename);

        var url = Page2.UPLOAD_BASE_URL + "/upload/gcs/" + Page2.PROJECT + "/" + Page2.GCS_BUCKET + "/" + Page2.GCS_IMAGE_FOLDER;

        // Submit Form and upload file
        $.ajax({
                    url:url,
                    data: formDataToUpload,// the formData function is available in almost all new browsers.
                    type:"POST",
                    contentType:false,
                    processData:false,
                    cache:false,
                    dataType:"json", // Change this according to your response from the server.
                    error:function(err){
                        console.error(err);
                    },
                    success:function(data){
                        console.log(data);
                        if(callback != null)
                            callback(data);
                    },
                    complete:function(){
                        
                        console.log("Request finished.");
                    }
                });
        
        //console.log(imageData);
    }
    ,
    getCurrentImageFilename: function()
    {
        let filename = decodeURIComponent(Page2.FILE_URI).split("/");
            filename = filename[filename.length - 1];
            filename = filename.replace(".pdf", "");
            filename += "-page-" + Page2.CUR_PAGE;
            filename += ".png";
        return filename;
    }
    ,
    showPDF2: function(url, callback)
    {
        // If absolute URL from the remote server is provided, configure the CORS
        // header on that server.
        //var url = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf';


        // Loaded via <script> tag, create shortcut to access PDF.js exports.
        var pdfjsLib = window['pdfjs-dist/build/pdf'];

        // The workerSrc property shall be specified.
        pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';

        Page2.PDFJS = pdfjsLib;

        // Asynchronous download of PDF
        var loadingTask = pdfjsLib.getDocument(url);
        
        loadingTask.promise.then(function(pdf) {
            console.log('PDF loaded');
            Page2.PDF = pdf;
            Page2.openPage(Page2.PDF, 1, callback);

            $("#page-info").html("Page : " + Page2.CUR_PAGE + " of " + Page2.PDF.numPages);

        }, function (reason) {
        // PDF loading error
            console.error(reason);
            $.notify(reason.message, "error")
        });
    }
    ,
    openPage: function(pdf, pageNumber, callback)
    {
        // Fetch the first page
        //var pageNumber = 1;
        pdf.getPage(pageNumber).then(function(page) {
            console.log('Page loaded');
            Page2.PAGE = page;
            
            var scale = 1;
            var viewport = page.getViewport({scale: scale});

            // Prepare canvas using PDF page dimensions
            var canvas = document.getElementById('pdf-canvas');
            var context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render PDF page into canvas context
            var renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            var renderTask = page.render(renderContext);
            renderTask.promise.then(function () {
                console.log(canvas.toDataURL('image/jpeg'));
                console.log('Page rendered');
                if(callback != null)
                    callback();
            });
        });
    }
    ,
    retrieveResultJson: function( callback, callbackError)
    {
        let jsonFilename =  Page2.getResultJsonFilename(Page2.CUR_PAGE);
        let downloadUrl = Page2.getBaseFileUri() + "/" + Page2.GCS_BUCKET + "/" + Page2.GCS_JSON_FOLDER + "/" + jsonFilename;
        downloadUrl = encodeURIComponent(downloadUrl);
    
        let uri = "/web/download/" + downloadUrl;
    
        console.log("retrieveResultJson")
        console.log(uri);
    
        $.get(uri, function(response){
            let isJson = false;
            console.log(response)
    
            try
            {
                response = JSON.parse(response);
                isJson = true;
            }
            catch(err)
            {
                isJson = false;
                console.log("Json parse error ")
                //console.log(err);
            }
    
            if( typeof response == 'object')
                isJson = true;
            else
                isJson = false;
            
            //alert(res)
            if(response != null && isJson)
            {
                console.log("here")
                if(callback != null)
                    callback(response)

            }
            else
            {
                if(callbackError != null)
                    callbackError();
            }

        });
    }
    ,
    retrieveJson: function( callback)
    {
        let jsonFilename =  Page2.getJsonFilename(Page2.CUR_PAGE);
        let downloadUrl = Page2.getBaseFileUri() + "/" + Page2.GCS_BUCKET + "/" + Page2.GCS_JSON_FOLDER + "/" + jsonFilename;
        downloadUrl = encodeURIComponent(downloadUrl);
    
        TableResizer.clearTable("divPdfTable")
        let uri = "/web/download/" + downloadUrl;
    
        console.log("retrieveJson")
        console.log(uri);
    
        $.get(uri, function(response){
            let isJson = false;
            console.log(response)
    
            try
            {
                response = JSON.parse(response);
                isJson = true;
            }
            catch(err)
            {
                isJson = false;
                console.log("Json parse error ")
                console.log(err);
            }
    
            if( typeof response == 'object')
                isJson = true;
            else
                isJson = false;
            
            
            if(response != null && isJson)
            {
                console.log(response)
                TableResizer.createResizedTableByInfo("divPdfTable", response);
                if(callback != null)
                    callback();
            }
            else
            {
                TableResizer.clearTable("divPdfTable");
                if(callback != null)
                    callback();
                //TableResizer.createResizedTable("divPdfTable", 5, 5);
            }
        });
    }
    ,
    autoDetect: function(callback)
    {
        $("#processgif").show();
        Page2.savePDFImage(function(response)
        {
            console.log(response);
            let imageurl = response.payload;
            imageurl = imageurl.replace("gs://", "https://storage.googleapis.com/");
            console.log(imageurl);
            
            let url = "/table/parse/" + encodeURIComponent(imageurl);
            console.log(url);
            $.get(url, function(response){
                console.log(response);

                if(response.success)
                {
                    Page2.resizeTableColumns(response.payload.xBoxes, response.payload.yBoxes)
                    Page2.resizeTableRows(response.payload.xBoxes, response.payload.yBoxes)

                    $("#divPdfTable").css("left", Page2.TABLELEFT)
                    $("#divPdfTable").css("top", Page2.TABLETOP)
                }
                else
                {
                    $.notify("Autodetect fail")
                    TableResizer.createResizedTable("divPdfTable", 7, 10);
                    $("#divPdfTable").css("left", Page2.TABLELEFT)
                    $("#divPdfTable").css("top", Page2.TABLETOP)
                }


                $("#processgif").hide();
            });
            
        });
    }
    ,
    resizeTableColumns: function(xBoxes, yBoxes)
    {
        let rowcount = yBoxes.length;
        let prevItem = null;
        let colWidths = [];
        xBoxes.forEach((item)=>{
            if(prevItem != null)
            {
                colWidths.push( item.boundaryX - prevItem.boundaryX )
            }
            prevItem = item;
        })
        colWidths.push( xBoxes[xBoxes.length - 1].w + 30 );
        console.log(colWidths);
        TableResizer.createResizedTable("divPdfTable", colWidths.length, rowcount);
        TableResizer.resizeColumns("divPdfTable", colWidths);
    }
    ,
    resizeTableRows: function(xBoxes, yBoxes)
    {
        let rowcount = yBoxes.length;
        let prevItem = null;
        let rowHeights = [];
        yBoxes.forEach((item)=>{
            if(prevItem != null)
            {
                rowHeights.push( item.y - prevItem.y - 5)
            }
            prevItem = item;
        })
        //rowHeights.push( items[items.length - 1].w + 30 );
        console.log(rowHeights);
        TableResizer.resizeRows("divPdfTable", rowHeights);
    }
    ,
    getJsonFilename: function()
    {
        let filename = decodeURIComponent(Page2.FILE_URI).split("/");
        filename = filename[filename.length - 1];
        filename = filename.replace(".pdf", ".json");
        let tmpfilename = filename.replace(".json", "");
        tmpfilename += "-page-" + Page2.CUR_PAGE;
        tmpfilename += ".json";
        filename = tmpfilename;

        return filename;
    }
    ,
    getTableInformationOriginal: function(divId)
    {
        let canvasX = $("#pdf-canvas").position().left;
        let canvasY = $("#pdf-canvas").position().top;
    
        console.log("X: " + canvasX + ", Y: " + canvasY)
        //let containerWidth = $("#pdf-main-container").width();
        //canvasX = 11/100 * $(document).width();
    
        let info2 = TableResizer.getTableInformation(divId, { marginLeft: canvasX, marginTop: canvasY});
        return info2;
    
    }
    ,
    saveResult: function(callback)
    {
        let filename = Page2.getResultJsonFilename(Page2.CUR_PAGE);
        let sJson = JSON.stringify(Page2.json);
        Page2.uploadJsonFile(filename, sJson, callback )
    }
    ,
    displayResultJson(json)
    {
        json = JSON.parse(json);
        Page2.json = json;
        $("#json-area").text(JSON.stringify(Page2.json))
        
        let forms = json.form;
        //console.log(forms)
        //alert("here")
        let table = json.table;
        if(forms != null)
        {
            //alert("here 2")
            forms = Page2.createFormIds(forms);
            console.log("FOMRS")
            console.log(forms);
            Page2.displayForm(forms);
        }
            

        if(table != null)
            Page2.displayTableResult(table);
    }
    ,
    saveTable: function(divId, callback)
    {
        if($("#" + divId).html() != "")
        {
    
            //$("#processgif").show();
            let info = TableResizer.getTableInformation(divId);
            let info2 = Page2.getTableInformationOriginal(divId);
    
            console.log("========Info========")
            console.log(info2)
            console.log("============End of Info===========")
    
            //let boxes = rowsToBoxes(info2.rows);
            //let headers = rowsToBoxes(info2.headers)
            //boxes.unshift(headers)
    
            console.log("========BOXES START==========")
            //console.log(JSON.stringify(boxes));
            console.log("========BOXES END ==========")
    
            let filename = Page2.getJsonFilename();
            Page2.uploadJsonFile(filename, info, function()
            {
                filename = Page2.getOriJsonFilename(Page2.CUR_PAGE);
                Page2.uploadJsonFile(filename, info2, function(){
                    //$("#processgif").hide();
                    
                    if(callback != null)
                        callback();
                });
                
            })
        }
        else
        {
            if(callback != null)
                callback();
        }
    }
    ,
    
    b64toBlob: function(b64Data, contentType, sliceSize) {
            contentType = contentType || '';
            sliceSize = sliceSize || 512;
    
            var byteCharacters = atob(b64Data);
            var byteArrays = [];
    
            for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                var slice = byteCharacters.slice(offset, offset + sliceSize);
    
                var byteNumbers = new Array(slice.length);
                for (var i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
    
                var byteArray = new Uint8Array(byteNumbers);
    
                byteArrays.push(byteArray);
            }
    
          var blob = new Blob(byteArrays, {type: contentType});
          return blob;
    }
    ,
    rowsToBoxes: function(rows)
    {
        let boexes = [];
        rows.forEach((row)=>{
            row.forEach((cell)=>{
                boexes.push({ x: cell.x, y: cell.y, w: cell.width, h: cell.height })
            })
        })
    
        return boexes;
    }
    ,
    downloadResults: function()
    {
        let baseResultFilename = Page2.getResultJsonBaseFilename(Page2.FILE_URI);
        let url  = "/table/download-json-results/" + baseResultFilename + "/" + Page2.PDF.numPages;

        window.open(url)

    }
}