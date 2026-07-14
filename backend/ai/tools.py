TOOLS = [

{
    "type":"function",

    "function":{

        "name":"create_invoice",

        "description":"Create an invoice",

        "parameters":{

            "type":"object",

            "properties":{

                "client_name":{
                    "type":"string"
                },

                "items":{
                    "type":"array"
                },

                "due_date":{
                    "type":"string"
                }

            },

            "required":[
                "client_name",
                "items"
            ]

        }

    }

},

{
    "type":"function",

    "function":{

        "name":"search_invoice",

        "description":"Search invoices",

        "parameters":{

            "type":"object",

            "properties":{

                "query":{
                    "type":"string"
                }

            },

            "required":[
                "query"
            ]

        }

    }

},

{
    "type":"function",

    "function":{

        "name":"record_payment",

        "description":"Record invoice payment",

        "parameters":{

            "type":"object",

            "properties":{

                "invoice_number":{
                    "type":"string"
                },

                "amount":{
                    "type":"number"
                }

            },

            "required":[
                "invoice_number"
            ]

        }

    }

}

]
