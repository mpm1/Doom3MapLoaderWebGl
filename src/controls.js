var KeyControl = function(controlName, multiplier){
    this.multiplier = multiplier;
    this.controlName = controlName;
    this.isDown = false;
    this.value = 0.0; 
    this.rawValue = 0.0;
}
KeyControl.prototype.update = function (time){
    var newValue = this.isDown ? this.multiplier : 0.0;

    if(this.value != newValue){
        this.rawValue = newValue;
        this.value = lerp(this.value, newValue, 0.8);
    }
}

var MouseControlValue = function(multiplier, element){
    this.multiplier = multiplier;
    this.magnitude = 0.0;
    this.deadZone = 0.0001;
    this.normal = new Float32Array([0.0, 0.0]);
    this.value = new Float32Array([0.0, 0.0]);

    var delta = new Float32Array([0.0, 0.0]);
    this.delta = delta;

    var _this = this;

    // Pointer locking
    // Implemented from the tutorial: https://www.html5rocks.com/en/tutorials/pointerlock/intro/
    var havePointerLock = false;
    function lockChange(mouseEvent){
        havePointerLock = !havePointerLock;

        if(havePointerLock){
            delta[0] = 0;
            delta[1] = 0;
        }
    }

    var requestPointerLock = element.requestPointerLock ||
        element.mozRequestPointerLock ||
        element.webkitRequestPointerLock;

    var exitPointerLock = element.exitPointerLock ||
        element.mozExitPointerLock ||
        element.webkitExitPointerLock;

    document.addEventListener("pointerlockchange", lockChange, false);
    document.addEventListener("mozpointerlockchange", lockChange, false);
    document.addEventListener("webkitpointerlockchange", lockChange, false);
    element.requestPointerLock();

    // Mouse Movement
    function mouseMove(mouseEvent){
        if(havePointerLock){
            delta[0] += (mouseEvent.movementX || mouseEvent.mozMovementX || mouseEvent.webkitMovementX || 0);
            delta[1] += (mouseEvent.movementY || mouseEvent.mozMovementY || mouseEvent.webkitMovementY || 0);
        }
    }
    document.addEventListener("mousemove", mouseMove, false);

    // Add the ability to regrab the mouse lock.
    function obtainMouseLock(){
        if(!havePointerLock){
            element.requestPointerLock();
        }
    }
    element.addEventListener("click", obtainMouseLock, false);
}
MouseControlValue.prototype.reset = function(time){
    var value = this.value;
    var normal = this.normal;
    var delta = this.delta;

    normal.fill(0);
    value[0] = delta[0] * this.multiplier;
    value[1] = delta[1] * this.multiplier;

    var magnitude = value[0] * value[0] + value[1] * value[1];
    if(magnitude > this.deadZone){
        magnitude = Math.sqrt(magnitude);
        normal[0] = value[0] / magnitude;
        normal[1] = value[1] / magnitude;
    }else{
        magnitude = 0.0;
    }
    this.magnitude = magnitude;

    delta.fill(0);
}

var ControlValue = function(){
    this.value = 0.0;
    this.rawValue = 0.0;
    this.max = 1.0;
    this.min = -1.0;
}
ControlValue.prototype.reset = function(time){
    this.value = 0.0;
    this.rawValue = 0.0;
}
ControlValue.prototype.addValue = function(value){
    this.rawValue += value.rawValue;
    this.value += value.value;
}
ControlValue.prototype.getValue = function(){
    return Math.min(Math.max(this.value, this.min), this.max);
}
ControlValue.prototype.getRawValue = function(){
    return Math.min(Math.max(this.value, this.min), this.max);
}

var Controls = function(canvas){
    this.init(canvas);
}
{
    Controls.prototype.init = function(canvas){
        this.controls = {
            "Horizontal" : new ControlValue(),
            "Vertical": new ControlValue(),
            "Mouse": new MouseControlValue(1.0, canvas)
        };

        // Keyboard Controls
        var keys = new Array(255);
        keys[87] = new KeyControl("Vertical", 1.0),
        keys[38] = new KeyControl("Vertical", 1.0);

        keys[83] = new KeyControl("Vertical", -1.0);
        keys[40] = new KeyControl("Vertical", -1.0);

        keys[68] = new KeyControl("Horizontal", -1.0);
        keys[39] = new KeyControl("Horizontal", -1.0);

        keys[65] = new KeyControl("Horizontal", 1.0);
        keys[37] = new KeyControl("Horizontal", 1.0);
        this.keys = keys;

        window.addEventListener("keydown", event => {
            var keyControl = keys[event.keyCode];

            if(keyControl){
                keyControl.isDown = true;
            }
        });

        window.addEventListener("keyup", event => {
            var keyControl = keys[event.keyCode];

            if(keyControl){
                keyControl.isDown = false;
            }
        });
    }

    Controls.prototype.update = function(time){
        this.reset(time);

        var control;

        var controls = this.controls;

        // Read the keys
        this.keys.forEach(function(key, index){
            if(key != null){
                key.update(time);
                control = controls[key.controlName];

                if(control){
                    control.addValue(key);
                }
            }
        });
    }

    Controls.prototype.reset = function(time){
        this.controls.Horizontal.reset(time);
        this.controls.Vertical.reset(time);
        this.controls.Mouse.reset(time);
    }
}