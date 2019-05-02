var Transform = function(position, rotation, scale){
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
}

var Actor = function(position, rotation, scale){
    init(position, rotation, scale);
}
Actor.prototype.init = function(position, rotation, scale){
    this.transform = new Transform();
    this.children = [];
}
Actor.prototype.draw = function(display){
    display.setTransform(this.transform);
}

var Room = function(){
    this.init(Vector3.zero, Quaternion.zero, Vector3.one);
}
Room.prototype = Object.create(Actor.prototype);

var Brush = function(vertecies){
    this.vertecies = new Float32Array(vertecies);
}