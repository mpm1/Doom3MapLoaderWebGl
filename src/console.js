function ConsoleFunction(name, description, functionCall, caller){
    this.name = name;
    this.description = description;
    this.functionCall = functionCall;
    this.caller = caller === undefined ? null : caller;
}
ConsoleFunction.prototype.execute = function(parameters){

    this.functionCall.apply(this.caller == null ? this : this.caller, parameters);
}

function Console(inputElement, outputElement, submitButton){
    this.init(inputElement, outputElement, submitButton);
}
{
    var functions = {
        "help" : new ConsoleFunction("help", "Lists all functions within the system.", function(){
            for(var key in functions){
                Console.current.writeLine(key + " - " + functions[key].description);
            }
        })
    };
    Console.current = null;

    Console.prototype.init = function(inputElement, outputElement, submitButton){
        this.output = $(outputElement);
        this.input = $(inputElement);

        var _this = this;
        Console.current = this;

        $(submitButton).click(function(ev){
            ev.preventDefault();

            var input = _this.input.val().trim();

            if(input.length > 0){
                var params = input.split(/\s+/);
                _this.runFunction(params[0], params.slice[1]);
            }
        })
    }

    Console.prototype.writeLine = function(text){
        var output = $("<p></p>");
        output.text(text);
        
        this.output.append(output);
    }

    Console.prototype.addFunction = function(name, consoleFunction){
        functions[name] = consoleFunction;
    }

    Console.prototype.runFunction = function(name, parameters){
        var f = functions[name];

        if(f){
            f.execute(parameters);
        }else{
            this.writeLine("Function " + name + " does not exist.");
        }
    }


}