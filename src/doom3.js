function Game(canvasPath, consoleOutputPath, consoleInputPath, consoleButtonPath){
    this.console = new Console($(consoleInputPath)[0], $(consoleOutputPath)[0], $(consoleButtonPath)[0]);
    
    this.pak = null;
    this.map = null;
    this.display = new Display($(canvasPath)[0]);

    this.console.addFunction("loadpak", new ConsoleFunction("loadpak", "Loads a pk4 file from a url into memory.", this.loadPk4, this));
    this.console.addFunction("loadmap", new ConsoleFunction("loadmap", "Loads a map from the currently loaded pk4 file.", this.loadMap, this));
    this.console.addFunction("viewtexture", new ConsoleFunction("viewtexture", "Draws a specified texture to a canvas on the bottom of the screen.", this.viewTexture, this));

    var _this = this;
    this.loadPk4("./test/q3dm2.pk4").then(function(pak){ _this.loadMap("q3dm2"); });
}
{
    Game.prototype.viewTexture = function(texturename){
        if(!(this.map)){
            return;
        }

        canvas = $("#viewTextureCanvas");

        if(canvas.length == 0){
            canvas = $("<canvas></canvas>");
            canvas.attr("id", "viewTextureCanvas");
            $("body").append(canvas);
        }

        var texture = this.map.getTexture(texturename).imageData;

        if(texture != null){
            canvas[0].width = texture.width;
            canvas[0].height = texture.height;

            var context = canvas[0].getContext('2d');
            context.putImageData(texture, 0, 0);
        }
    }

    Game.prototype.loadPk4 = function(url){
        this.console.writeLine("Loading pak file: " + url);
        var game = this;

        return new Promise(function(resolve, reject){
            var pak = new JSZip();
            var console = game.console;
            var loadMap = game.loadMap;
    
            var oReq = new XMLHttpRequest();
            oReq.open("GET", url, true);
            oReq.responseType = "arraybuffer";
    
            oReq.onload = function(oEvent){
                var arrayBuffer = oReq.response;
    
                if(arrayBuffer){
                    pak.loadAsync(arrayBuffer, {}).then(function(result){
                        console.writeLine("Pak file loaded.");
    
                        resolve(pak);
                    }, function(){ reject(pak); });
                }else{
                    console.writeLine("Error loading pak: " + url);
                    reject(pak);
                }
            }
            oReq.send(null);
    
            if(this.pak != null){
                //TODO: Close this file.
            }
    
            game.pak = pak;
        });
    }

    Game.prototype.loadMap = function(mapName){
        var console = this.console;
        console.writeLine("Loading map: " + mapName);

        if(this.map != null){
            this.map.unload();
            this.map = null;
        }

        this.map = new Map(mapName, this.pak);
        this.map.load().then(function(map){
            console.writeLine("Map " + mapName + " loaded successfully.");
        }, function(message){
            console.writeLine("An error occured while loading the map.");
            console.writeLine("Error: " + message);
        });
    }

    Game.prototype.updateMaterialLookup = function(deltaTime){
        Material.LOOKUP_TABLE.time += deltaTime;
    }

    Game.prototype.loop = function(deltaTime){
        var map = this.map;
        var deltaSeconds = deltaTime / 1000.0;
        if(map != null){
            if(map.isLoaded){
                this.updateMaterialLookup(deltaSeconds);
                map.update(deltaSeconds);

                map.calculateDrawBuffer(map.camera);

                this.display.draw(map.drawBuffer, map.camera);
            }
        }
    }
}