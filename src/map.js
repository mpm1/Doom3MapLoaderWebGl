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

var Box = function(material){
    // TODO: add the normals
    this.init([
        -0.5, 0.5, -0.5,
        0.5, 0.5, -0.5,
        0.5, -0.5, -0.5,
        -0.5, -0.5, -0.5,
        -0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, -0.5, 0.5,
        -0.5, -0.5, 0.5
    ],[
        0, 1, 3,
        1, 2, 3,
        7, 5, 2,
        5, 6, 2,
        5, 4, 6,
        4, 7, 6,
        4, 0, 7,
        0, 3, 7,
        4, 6, 0,
        6, 7, 0,
        3, 2, 7,
        2, 6, 7
    ], material);
}
Box.prototype = Object.create(Brush.prototype);