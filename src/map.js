var Transform = function(position, rotation, scale){
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
}

var Material = function(){

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

function Map(mapName){
    this.isLoaded = false;
}