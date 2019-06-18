"use strict";
var LOOP_RESOLUTION = 384;
var LOOP_DELTA_PH = (2 * Math.PI) / LOOP_RESOLUTION;
var CAM_RADIUS = 4;
var DASH_LENGTH = 0.1;
var SPHERE_ALPHA = 0.5;
var SPHERE_SUBDIVISIONS = 8;
var MASK;
(function (MASK) {
    MASK[MASK["INVISIBLE"] = 0] = "INVISIBLE";
    MASK[MASK["LEFT"] = 1] = "LEFT";
    MASK[MASK["RIGHT"] = 2] = "RIGHT";
})(MASK || (MASK = {}));
var unitVecToFibre = function (point, ph) {
    var al = Math.sqrt(0.5 * (1 + point.z));
    var be = -Math.sqrt(0.5 * (1 - point.z));
    var th = Math.atan2(-point.x, point.y) - ph;
    var w = al * Math.cos(th);
    var x = be * Math.cos(ph);
    var y = be * Math.sin(ph);
    var z = al * Math.sin(th);
    var r = Math.acos(w) / (Math.PI * Math.sqrt(1 - Math.pow(w, 2)));
    return new BABYLON.Vector3(x * r, y * r, z * r);
};
var createPath = function (point) {
    var points = [];
    var ph = 0;
    for (var i = 0; i <= LOOP_RESOLUTION; i++) {
        points.push(unitVecToFibre(point, ph));
        ph += LOOP_DELTA_PH;
    }
    return points;
};
var pointToColor = function (point) {
    var color = new BABYLON.Color4(0.5 * (1 - point.x), 0.5 * (1 - point.y), 0.5 * (1 - point.z), 1);
    return color;
};
var createLoop = function (point, scene, mask) {
    var points = createPath(point);
    var color = pointToColor(point);
    var colors = [];
    for (var i = 0; i < points.length; i++) {
        colors.push(color);
    }
    var loop = BABYLON.MeshBuilder.CreateLines('lines', { points: createPath(point), useVertexAlpha: false, colors: colors }, scene);
    loop.layerMask = mask;
    loop.isPickable = false;
    return loop;
};
var createCamera = function (name, mask) {
    var camera = new BABYLON.ArcRotateCamera(name, 0, 0, CAM_RADIUS, BABYLON.Vector3.Zero(), scene);
    camera.viewport = mask == MASK.LEFT ? new BABYLON.Viewport(0, 0, 0.5, 1) : new BABYLON.Viewport(0.5, 0, 0.5, 1);
    camera.layerMask = mask;
    camera.noRotationConstraint = true;
    camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius = CAM_RADIUS;
    camera.panningAxis = BABYLON.Vector3.Zero();
    camera.angularSensibilityX *= -1;
    camera.angularSensibilityY *= -1;
    return camera;
};
var createDash = function (point, scene, mask) {
    var points = [point.scale(1 - DASH_LENGTH), point.scale(1 + DASH_LENGTH)];
    var color = pointToColor(point);
    var colors = [color, color];
    var dash = BABYLON.MeshBuilder.CreateLines('dash', { points: points, colors: colors, useVertexAlpha: false }, scene);
    dash.layerMask = mask;
    return dash;
};
var createSphere = function (scene) {
    var camera = createCamera('leftCamera', MASK.LEFT);
    camera.attachControl(canvas, true);
    scene.activeCameras.push(camera);
    var material = new BABYLON.StandardMaterial('material', scene);
    material.alpha = SPHERE_ALPHA;
    material.emissiveColor = BABYLON.Color3.White();
    var sphere = BABYLON.MeshBuilder.CreateIcoSphere('sphere', { subdivisions: SPHERE_SUBDIVISIONS, flat: false }, scene);
    sphere.material = material;
    sphere.layerMask = MASK.LEFT;
    return sphere;
};
var draw = function (point) {
    createDash(point, scene, MASK.LEFT);
    createLoop(point, scene, MASK.RIGHT);
};
var createScene = function () {
    var scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    var camera = createCamera('rightCamera', MASK.RIGHT);
    camera.attachControl(canvas, true);
    scene.activeCameras.push(camera);
    var sphere = createSphere(scene);
    var isPointerDown = false;
    scene.onPointerObservable.add(function (pointerInfo) {
        var pickInfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) { return mesh == sphere; });
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERUP:
                isPointerDown = false;
                break;
            case BABYLON.PointerEventTypes.POINTERDOWN:
                isPointerDown = true;
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if (pickInfo && pickInfo.pickedMesh == sphere && isPointerDown && pickInfo.pickedPoint) {
                    draw(pickInfo.pickedPoint);
                }
                break;
        }
    });
    return scene;
};
var canvas = document.getElementById('renderCanvas');
var engine = new BABYLON.Engine(canvas, true);
var scene = createScene();
engine.runRenderLoop(function () { scene.render(); });
window.addEventListener('resize', function () { engine.resize(); });
