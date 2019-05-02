function Console(inputElement, outputElement){
    this.output = $(outputElement);
    this.input = $(inputElement);
}
{
    Console.prototype.writeLine = function(text){
        var output = $("<p></p>");
        output.text(text);
        
        this.output.append(output);
    }
}