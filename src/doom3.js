function Game(canvasPath, consoleOutputPath, consoleInputPath, consoleButtonPath){
    this.console = new Console($(consoleInputPath)[0], $(consoleOutputPath)[0], $(consoleButtonPath)[0]);
    
    this.pak = null;
    this.map = null;
    this.display = new Display($(canvasPath)[0]);

    this.console.addFunction("loadpak", new ConsoleFunction("loadpak", "Loads a pk4 file from a url into memory.", this.loadPk4, this));
    this.console.addFunction("loadmap", new ConsoleFunction("loadmap", "Loads a map from the currently loaded pk4 file.", this.loadMap, this));
    this.console.addFunction("showbounds", new ConsoleFunction("showbounds", "Shows the map object bouundries", this.showBounds, this));
    this.console.addFunction("hidebounds", new ConsoleFunction("hidebounds", "Hides the map object bouundries", this.hideBounds, this));

    var _this = this;
    this.loadPk4("./test/q3dm1.pk4").then(function(pak){ _this.loadMap("q3dm1"); });
}
{
    Game.prototype.showBounds = function(){
        this.display.showBounds = true;
    }
    Game.prototype.hideBounds = function(){
        this.display.showBounds = false;
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

    Game.prototype.loop = function(deltaTime){
        var map = this.map;
        if(map != null){
            if(map.isLoaded){
                map.calculateDrawBuffer(map.camera);

                this.display.draw(map.drawBuffer, map.camera);
            }
        }
    }
}