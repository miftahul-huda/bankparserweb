var HudaTableEditor = {
    apply: function(tbl, onchange, onSelect)
    {
        let trs = $(tbl).children("tr");

        trs.each(function() {

            let tds = $(this).find("TD");

            tds.each( function() {
                let td = this;
                $(td).on("click", function()
                {
                    //alert("here")
                    let child = $(td).html();
                    
                    let tag = null;
                    try
                    {
                        tag = $(child).prop("tagName")
                    }
                    catch(e)
                    {
                        tag = null
                    }
                    if(tag == undefined)
                        tag = null;

                   
                    if(tag == null || $(child).prop("tagName").toLowerCase() != "input")
                    {
                        let inp = document.createElement("input")

                        $(inp).on("blur", function(){
                            $(td).html("")
                            $(td).html($(inp).val());
                            if(onchange != null)
                                onchange(HudaTableEditor.getTableValues(tbl))
                        })

                        $(inp).on("keypress", function(e)
                        {
                            if(e.which == 13)
                            {
                                $(inp).blur()
                            }
                        })

                        $(inp).attr("type", "text")
                        $(inp).attr("style", "width: 100%; height: 100%; border: solid 1px #ccc")
                        $(inp).val( $(td).text())
                        
                        $(td).html("")
                        $(td).append(inp);
                        $(inp).focus();
                    }
                    
                    if(onSelect != null)
                        onSelect(td)
                })

            })
        })
    }

    ,
    getTableValues: function(tbl)
    {
        let data = [];
        let trs = $(tbl).children("tr");

        trs.each(function() {
            let row = [];
            let tds = $(this).find("TD");
            tds.each( function() {
                row.push($(this).text())
            });
            data.push(row);
        })

        return data;
    }
}