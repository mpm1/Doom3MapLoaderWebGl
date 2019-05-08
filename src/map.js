var Transform = function(position, rotation, scale){
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
}

var Material = function(){
    this.init();
}
{
    function parseElement(file, tokenBuffer){
        var token;

        while((token = file.next()) != null){
            if(token == "{"){
                var child = new Material();

                if(parseElement.call(child, file, tokenBuffer)){
                    this.stages.push(child);
                }
            }else if(token == "}"){
                return true;
            }
            else{
                // TODO
            }
        }

        return false;
    }

    Material.prototype.init = function(){
        this.stages = [];
        this.name = null;
    }

    Material.prototype.parse = function(file){
        var token;

        // This will only obtain the first material element it finds.
        do{
            token = file.current();

            if(token == "{"){
                return parseElement.call(this, file);
            }else{
                this.name = token;
            }
        }while(file.next() != null);

        return false;
    }
}

var Actor = function(position, rotation, scale){
    init(position, rotation, scale);
}
Actor.prototype.init = function(position, rotation, scale){
    this.transform = new Transform();
    this.children = [];
}
Actor.prototype.draw = function(display){
    display.pushTransform(this.transform);

    this.children.forEach(function(child){
        child.draw(display);
    });

    display.popTransform();
}

var Room = function(){
    this.init(Vector3.zero, Quaternion.zero, Vector3.one);
}
Room.prototype = Object.create(Actor.prototype);

var Brush = function(vertecies, material){
    this.init(vertecies, material);
}
Brush.prototype.init = function(vertecies, polygons, material){
    this.vertecies = new Float32Array(vertecies);
    this.polygons = new Uint16Array(polygons);
    this.bounds = Float32Array(6); //TODO: plan the bounds for light clustering.
    this.material = material;
}
Brush.prototype.draw = function(display){
    display.draw(this.vertecies, this.polygons, this.material)
}

function Map(mapName, pakFile){
    this.init(mapName, pakFile);
}
{

    /**
     * Loads the map into memory.
     * 
     * @param {FileLexer} materialFile 
     */
    function loadMaterials(materialFile){
        this.line = 0;
        var materialIndex = 0;
        var materialCount = 0;

        Console.current.writeLine("Loading materials...");

        while(materialFile.next() != null){
            var material = new Material();

            if(material.parse(materialFile)){
                this.materials[material.name] = material;
                ++materialCount;
            }else{
                Console.current.writeLine("Failed to load material " + material.name + " index " + materialIndex);
            }

            ++materialIndex;
        }

        Console.current.writeLine(materialCount + " materials loaded.");
    }

    Map.prototype.init = function(mapName, pakFile){
        this.isLoaded = false;
        this.name = mapName;
        this.pakFile = pakFile;
        this.materials = {};
    }

    /**
     * Loads the map into memory.
     * 
     * @returns {Promise} Stating if the map was resolved or rejected.
     */
    Map.prototype.load = function(){
        if(this.isLoaded){
            return;
        }

        var map = this;
        var pak = this.pakFile;

        return new Promise(function(resolve, reject){
            pak.file("materials/" + map.name + ".mtr").async("string").then(function(text){
                loadMaterials.call(map, new FileLexer(text));
                resolve(map);
            }, reject);
        });
    }

    /**
     * Unloads the map from memory.
     */
    Map.prototype.unload = function(){

    }
}