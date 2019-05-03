var FileLexer = function(file){
}
{
    function convertFileToLines(file){
        var lines = file.split("\n");
        
        for(var i = 0; i < lines.length; ++i){
            lines[i] = lines[i].trim();
        }
    }

    FileLexer.prototype.init = function(file){
        this.lines = convertFileToLines(file);
        this.line = 0;
    }

    FileLexer.prototype.readLine = function(includeComments = false){
        if(this.line >= this.lines.length){
            return null;
        }

        var result = this.lines[this.line];
        ++this.lines;

        if(!includeComments){
            result = result.replace(/(\/\*.*\*\/)|(\/\/.*)/g, "");
        }

        return result;
    }


}

var PakFile = function(sourceLocation){

}