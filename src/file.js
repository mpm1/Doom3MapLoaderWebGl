const NEW_LINE = "\n";
/**
 * Data for a element file.
 * 
 * @param {string} file 
 */
var FileLexer = function(file){
    this.init(file);
}
{
    // Tokens obtained from Lexer.cpp in the Doom3 source code
    var tokenTypes = [
        "\n",
        ">>=",
        "<<=",
        "...",

        "\"",

        "(",
        ")",
        "{",
         "}",
         "*",
         ","
        ]

    function convertFileToTokens(file){
        var tokens = [];

        // Remove any comments.
        var text = file.replace(/(\/\*(.|\n)*?\*\/)|(\/\/.*$)/gm, "");

        // Split each line.
        var lines = text.split("\n");

        for(var i = 0; i < lines.length; ++i){
            text = lines[i].trim();

            if(text.length > 0){
                tokenize(text, tokens);
                tokens.push(NEW_LINE);
            }
        }

        return tokens;
    }

    function tokenizePiece(piece, outputBuffer){
        if(piece.length == 0){
            return;
        }

        var index;
        var checkType;

        for(var i = 0; i < tokenTypes.length; ++i){
            checkType = tokenTypes[i];
            index = piece.indexOf(checkType);

            if(index == 0){
                outputBuffer.push(checkType);
                tokenizePiece(piece.substring(checkType.length), outputBuffer);

                return;
            }
            if(index >= 0){
                tokenizePiece(piece.substring(0, index), outputBuffer);
                outputBuffer.push(checkType);
                tokenizePiece(piece.substring(index + checkType.length), outputBuffer);

                return;
            }
        }

        outputBuffer.push(piece);
    }

    function tokenize(text, outputBuffer){
        var pieces = text.split(/\s+/g);

        pieces.forEach(function(item, index){
            tokenizePiece(item, outputBuffer);
        });

        return outputBuffer;
    }

    FileLexer.prototype.init = function(file){
        this.tokens = convertFileToTokens(file);
        this.readIndex = -1;
    }

    FileLexer.prototype.next = function(includeNewLine = false){
        var value;

        while(true){
            ++this.readIndex;

            if(this.readIndex >= this.tokens.length){
                return null;
            }

            value = this.tokens[this.readIndex];

            if(includeNewLine || value != NEW_LINE){
                return this.tokens[this.readIndex];
            }
        };

        return null;
    }

    FileLexer.prototype.nextString = function(includeNewLine = false){
        var token = this.next();
        var result = null;

        if(token != '"'){
            return token;
        }

        while((token = this.next()) != null){
            switch(token){
                case '"':
                    return result;
                    break;

                default:
                    if(result === null){
                        result = "" + token;
                    }else{
                        result += " " + token;
                    }
                    break;
            }
        }

        return result;
    }

    FileLexer.prototype.current = function(){
        return this.tokens[this.readIndex];
    }

    FileLexer.prototype.reset = function(){
        this.readIndex = 0;
    }

    FileLexer.prototype.readUntil = function(token){
        var checkVal;

        while((checkVal = this.next()) != null){
            if(checkVal == token){
                return checkVal;
            }
        }

        return null;
    }
}

var PakFile = function(sourceLocation){

}