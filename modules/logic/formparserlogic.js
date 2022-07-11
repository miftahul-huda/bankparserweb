 
const {DocumentUnderstandingServiceClient} = require('@google-cloud/documentai').v1beta2;
const client = new DocumentUnderstandingServiceClient();

class FormParserLogic
{

    static getText(text, textAnchor) 
    {
        // First shard in document doesn't have startIndex property
        if(textAnchor != null)
        {
            const startIndex = textAnchor.textSegments[0].startIndex || 0;
            const endIndex = textAnchor.textSegments[0].endIndex;
    
            return text.substring(startIndex, endIndex);
        }
        else
        {
            return "";
        }

    }

    static async parseForm(url)
    {
        let promise = new Promise((resolve, reject)=>{

            try
            {
                url = url.replace("https://storage.cloud.google.com/", "gs://")
                url = url.replace("https://storage.googleapis.com/", "gs://")
                console.log(url)    
                let projectId = process.env.PROJECT;
                let location = process.env.DOCAILOCATION;
                
                // Configure the request for processing the PDF
                const parent = `projects/${projectId}/locations/${location}`;
                const request = {
                    parent,
                    inputConfig: {
                        gcsSource: {
                            uri: url,
                        },
                        mimeType: 'application/pdf',
                    },
                    formExtractionParams: {
                        enabled: true,
                        keyValuePairHints: [
                            {
                            key: 'Phone',
                            valueTypes: ['PHONE_NUMBER'],
                            },
                            {
                            key: 'Contact',
                            valueTypes: ['EMAIL', 'NAME'],
                            },
                        ],
                    },
                };
        
                // Recognizes text entities in the PDF document
                client.processDocument(request).then(([result])=>{
                    // Get all of the document text as one big string
                    const {text} = result;
                    
                    // Process the output
                    const [page1] = result.pages;
                    const {formFields} = page1;

                    //console.log("RESSULT")
                    //console.log(result)

                    //console.log("pages")
                    //console.log(result.pages)

                    //console.log("formFields")
                    //console.log(formFields)
    
                    let formResult = [];
    
                    for (const field of formFields) {
                        console.log("field.fieldname")
                        let sjson = JSON.stringify(field.fieldName);
                        console.log(sjson)

                        const fieldName = FormParserLogic.getText(text, field.fieldName.textAnchor);
                        const fieldValue = FormParserLogic.getText(text, field.fieldValue.textAnchor);
    
                        formResult.push({ field: fieldName, value: fieldValue, 
                            fieldBox: field.fieldName.boundingPoly.normalizedVertices,
                            fieldValueBox: field.fieldValue.boundingPoly.normalizedVertices, 
                            fieldConfidence: field.fieldName.confidence,
                            fieldValueConfidence: field.fieldValue.confidence  })
                        
                    }
    
                    resolve({ success: true, payload: formResult })
                })        
            }
            catch(err)
            {
                reject(err);
            }


        });

        return promise;

    }
}

module.exports = FormParserLogic;