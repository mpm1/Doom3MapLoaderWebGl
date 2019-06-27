var Texture = function(){
    this.imageData = null;

    this.glTexture = null;
}
{
    function generateEmptyTexture(gl){
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                        width, height, border, srcFormat, srcType,
                        pixel);

        texture.loaded = false;

        return texture;
    }

    Texture.prototype.loadFromUrl = function(url){
        var img = new Image();
        var _this = this;

        img.onload = function(){
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);

            _this.imageData = context.getImageData(0, 0, img.width, img.height);
        }
    }

    Texture.prototype.load = function(tgaData){
        var tga = new TGA();
        tga.load(tgaData);

        this.imageData = tga.getImageData();
    }

    Texture.prototype.getGlTexture = function(gl){
        var texture = this.glTexture;

        if(texture == null){
            texture = generateEmptyTexture(gl);
            this.glTexture = texture;
        }

        if(!texture.loaded && this.imageData != null){
            var imageData = this.imageData;
            gl.bindTexture(gl.TEXTURE_2D, texture);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,  
                imageData.width, imageData.height, 0, gl.RGBA,
                gl.UNSIGNED_BYTE, new Uint8Array(imageData.data.buffer));

            if(isPositivePower2(imageData.width) && isPositivePower2(imageData.height)){
                gl.generateMipmap(gl.TEXTURE_2D);
            }else{
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }

            texture.loaded = true;
        }

        return texture;
    }

    Texture.prototype.destroyGlTexture = function(gl){
        gl.deleteTexture(this.glTexture);
    }
}

// Basic textures
const DEFAULT_DIFFUSE = new Texture();
DEFAULT_DIFFUSE.loadFromUrl("./imgs/black.png");

const DEFAULT_MAP = new Texture();
DEFAULT_DIFFUSE.loadFromUrl("./imgs/black.png");

const DEFAULT_SPECULAR = new Texture();
DEFAULT_SPECULAR.loadFromUrl("./imgs/black.png");

const DEFAULT_NORMAL = new Texture();
DEFAULT_DIFFUSE.loadFromUrl("./imgs/blue.png");

// Blend modes using webgl values
const BLEND_MODES = {
    "gl_one" : 1,
    "gl_zero" : 0,
    "gl_dst_color" : 774,
    "gl_one_minus_dst_color" : 775,
    "gl_src_alpha" : 770,
    "gl_one_minus_src_alpha" : 771,
    "gl_dst_alpha" : 772,
    "gl_one_minus_dst_alpha" : 773,
    "gl_src_alpha_saturate" : 776,
    "gl_src_color" : 768,
    "gl_one_minus_src_color" : 769,

}

var MaterialStage = function(){
    this.init();
}
{
    function setMapFunction(file, map){
        this.map = map.getTexture(file.next());
    }

    function setBlendFromValue(file, firstToken){
        switch(firstToken){
            case "blend":
                this.blend.src = BLEND_MODES["gl_src_alpha"];
                this.blend.dst = BLEND_MODES["gl_one_minus_src_alpha"];
                break;

            case "add":
                this.blend.src = BLEND_MODES["gl_one"];
                this.blend.dst = BLEND_MODES["gl_one"];
                break;

            case "filter":
                this.blend.src = BLEND_MODES["gl_dst_color"];
                this.blend.dst = BLEND_MODES["gl_zero"];
                break;

            case "none":
                this.blend.src = BLEND_MODES["gl_zero"];
                this.blend.dst = BLEND_MODES["gl_zero"];
                break;

            case "filter":
                this.blend.src = BLEND_MODES["gl_dst_color"];
                this.blend.dst = BLEND_MODES["gl_zero"];
                break;

            case "bumpmap":
            case "diffusemap":
            case "specularmap":
                this.blend.customMode = firstToken;
                break;

            default:
                this.blend.src = BLEND_MODES[firstToken];
                file.next(); // Get the comma
                this.blend.dst = BLEND_MODES[file.next()];
        }
    }

    function setBlendFunction(file){
        var firstToken = file.next();

        setBlendFromValue.call(this, file, firstToken.toLowerCase());
    }

    function createSetNumberFunction(name){
        return function(file){
            this[name] = parseFloat(file.next());
        }
    }

    function createColorMaskFunction(mask){
        return function(file){
            this.maskRed = (mask & 0xFF000000) !== 0;
            this.maskBlue = (mask & 0x00FF0000) !== 0;
            this.maskGreen = (mask & 0x0000FF00) !== 0;
            this.maskAlpha = (mask & 0x000000FF) !== 0;
        }
    }

    function readUpdateFunction(file, setter){
        var token;
        var updateFunc = "";
        var isLookup = false;

        while((token = file.next(true)) != null){
            if(token == ',' || token == '\n'){
                break;
            }

            if(Material.LOOKUP_TABLE.hasOwnProperty(token)){
                isLookup = true;
                updateFunc += ("Material.LOOKUP_TABLE." + token);
            }else{
                updateFunc += token;
            }
        }

        var func = new Function("timeDelta", setter + " = " + updateFunc + ";");
        if(isLookup){
            this.updateFunctions.push(func);
        }else{
            func.call(this, 0);
        }
    }

    function createUpdateFunction(name){
        return function(file){
            readUpdateFunction.call(this, file, "this." + name);
        }
    }

    function createVector2UpdateFunction(name){
        return function(file){
            readUpdateFunction.call(this, file, "this." + name + "[0]");
            readUpdateFunction.call(this, file, "this." + name + "[1]");
        }
    }

    let tokenFunctions = {
        "blend" : setBlendFunction,
        "map" : setMapFunction,
        "maskred" : createColorMaskFunction(0x00FFFFFF),
        "maskgreen" : createColorMaskFunction(0xFF00FFFF),
        "maskblue" : createColorMaskFunction(0xFFFF00FF),
        "maskalpha" : createColorMaskFunction(0xFFFFFF00),
        "maskcolor" : createColorMaskFunction(0x000000FF),
        "alphatest" : createUpdateFunction("alphaTest"),
        "translate" : createVector2UpdateFunction("translate"),
        "scroll" : createVector2UpdateFunction("translate"),
        "scale" : createVector2UpdateFunction("scale"),
        "rotate" : createUpdateFunction("rotate")
    }

    MaterialStage.prototype.init = function(){
        this.map = DEFAULT_MAP;
        this.blend = {
            customMode: null,
            src: BLEND_MODES["gl_one"],
            dst: BLEND_MODES["gl_zero"]
        }

        this.maskRed = true;
        this.maskGreen = true;
        this.maskBlue = true;
        this.maskAlpha = true;
        this.alphaTest = 0.0;

        this.translate = new Float32Array([0, 0]);
        this.scale = new Float32Array([1.0, 1.0]);
        this.rotate = 0.0;

        this.updateFunctions = [];
    }

    MaterialStage.prototype.parse = function(file, map){
        var token;

        while((token = file.next()) != null){
            if(token == "}"){
                return;
            }
            else{
                token = token.toLowerCase();
                if(tokenFunctions[token]){
                    tokenFunctions[token].call(this, file, map)
                }else{
                    Console.current.writeLine("Function " + token + " not found.");
                }
            }
        }
    }

    MaterialStage.prototype.update = function(timeDelta){
        for(var i = 0; i < this.updateFunctions.length; ++i){
            this.updateFunctions[i].call(this, timeDelta);
        }
    }
}

var Material = function(){
    this.init();
}
{
    Material.LOOKUP_TABLE = {
        time: 0,

    }
    function createSetStringFunction(name){
        return function(file){
            this[name] = file.next();
        }
    }

    function createSetFloatFunction(name){
        return function(file){
            this[name] = parseFloat(file.next());
        }
    }

    function createMapFunction(blendFunc){
        return function(file, map){
            this.map = map.getTexture(file.next());
            setBlendFromValue.call(this, file, blendFunc);
        }
    }

    function createSetBoolFunction(name, value){
        return function(file){
            this[name] = value;
        }
    }
    
    function setDiffuseMapFunction(file, map){
        var stage = new MaterialStage();
        stage.blend.customMode = "diffusemap";
        stage.map = map.getTexture(file.next());

        this.diffuseStage = stage;

        if(this.specularStage == null){
            var spec = new MaterialStage();
            spec.blend.customMode = "specularmap";

            this.specularStage = spec;
        }
    }

    function setSpecularMapFunction(file, map){
        var stage = new MaterialStage();
        stage.blend.customMode = "specularmap";
        stage.map = map.getTexture(file.next());

        this.specularStage = stage;

        if(this.specularStage == null){
            var diff = new MaterialStage();
            diff.blend.customMode = "diffusemap";

            this.diffuseStage = diff;
        }
    }

    function setNormalMapFunction(file, map){
        var stage = map.normalStage;
        stage.map = map.getTexture(file.next());
    }

    let tokenFunctions = {
        "qer_editorimage" : createSetStringFunction("editorImage"),
        "description" : createSetStringFunction("description"),
        "polygonOffset": createSetFloatFunction("polygonOffset"),
        "diffusemap" : setDiffuseMapFunction,
        "specularmap" : setSpecularMapFunction,
        "bumpmap" : setNormalMapFunction,     
        "translucent" : createSetBoolFunction("translucent", true),
        "nonsolid" : createSetBoolFunction("solid", false),
        "alphatest" : createSetBoolFunction("alphaTest", true),
        "noshadows" : createSetBoolFunction("shadows", false),
        "noselfshadow" : createSetBoolFunction("selfShadow", false)

    }

    Material.prototype.init = function(){
        this.name = null;
        this.description = null;
        this.editorImage = null;

        this.diffuseStage = null;
        this.specularStage = null;

        this.normalStage = new MaterialStage();
        this.normalStage.blend.customMode = "bumpmap";
        this.normalStage.map = DEFAULT_NORMAL;

        this.stages = [];
        this.map = null;
        
        this.polygonOffset = 0.0;
        this.translucent = false;
        this.solid = true;
        this.alphaTest = false;
        this.shadows = true;
        this.selfShadows = true;
    }

    Material.prototype.update = function(timeDelta){
        this.stages.forEach(function(stage){
            stage.update(timeDelta);
        });
    }

    Material.prototype.parse = function(file, map){
        var token;

        while((token = file.next()) != null){

            if(token == "{"){
                var stage = new MaterialStage();
                stage.parse(file, map);

                switch(stage.blend.customMode){
                    case "diffusemap":
                        this.diffuseStage = stage;

                        if(stage.specularStage == null){
                            var spec = new MaterialStage();
                            spec.blend.customMode = "specularmap";
                
                            this.specularStage = spec;
                        }
                        break;

                    case "specularmap":
                        this.specularStage = stage;

                        if(stage.diffuseStage == null){
                            var diff = new MaterialStage();
                            diff.blend.customMode = "diffusemap";
                
                            this.specularStage = diff;
                        }
                        break;

                    case "bumpmap":
                        this.normalStage = stage;
                        break;

                    default:
                        this.stages.push(stage);
                }
            }else if(token == "}"){
                return true;
            }else{
                token = token.toLowerCase();
                if(tokenFunctions[token]){
                    tokenFunctions[token].call(this, file, map)
                }else{
                    Console.current.writeLine("Function " + token + " not found.");
                }
            }
        };

        return false;
    }
}