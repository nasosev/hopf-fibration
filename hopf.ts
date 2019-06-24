/// <reference path="../node_modules/babylonjs/babylon.module.d.ts" />

const loopResolution = 384;
const loopDeltaPh = ( 2 * Math.PI ) / loopResolution;
const camRadius = 4;
const dashLength = 0.1;
const sphereAlpha = 0.5;
const sphereSubdivisions = 8;

enum Mask { Invisible, Left, Right }

let unitVecToFibre = ( point: BABYLON.Vector3, ph: number ) =>
{
    const al = Math.sqrt( 0.5 * ( 1 + point.z ) );
    const be = -Math.sqrt( 0.5 * ( 1 - point.z ) );
    const th = Math.atan2( -point.x, point.y ) - ph;
    const w = al * Math.cos( th );
    const x = be * Math.cos( ph );
    const y = be * Math.sin( ph );
    const z = al * Math.sin( th );
    const r = Math.acos( w ) / ( Math.PI * Math.sqrt( 1 - w ** 2 ) );

    return new BABYLON.Vector3( x * r, y * r, z * r );
};

let pointToColor = ( point: BABYLON.Vector3 ) =>
{
    const color = new BABYLON.Color4( 0.5 * ( 1 - point.x ), 0.5 * ( 1 - point.y ), 0.5 * ( 1 - point.z ), 1 );

    return color;
};

let createPath = ( point: BABYLON.Vector3 ) =>
{
    const points: BABYLON.Vector3[] = [];
    let ph = 0;
    for ( let i = 0; i <= loopResolution; i++ )
    {
        points.push( unitVecToFibre( point, ph ) );
        ph += loopDeltaPh;
    }
	
    return points;
};

let createLoop = ( point: BABYLON.Vector3, scene: BABYLON.Scene, mask: number ) =>
{
    const points = createPath( point );
    const color = pointToColor( point );
    const colors = Array( points.length ).fill( color );
    const loop = BABYLON.MeshBuilder.CreateLines( "lines", { points: points, useVertexAlpha: false, colors: colors }, scene );
    loop.layerMask = mask;
    loop.isPickable = false;

    return loop;
};

let createCamera = ( name: string, mask: number, scene: BABYLON.Scene ) =>
{
    const camera = new BABYLON.ArcRotateCamera( name, 0, 0, camRadius, BABYLON.Vector3.Zero(), scene );
    camera.viewport = mask === Mask.Left ? new BABYLON.Viewport( 0, 0, 0.5, 1 ) : new BABYLON.Viewport( 0.5, 0, 0.5, 1 );
    camera.layerMask = mask;
    camera.noRotationConstraint = true;
    camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius = camRadius; // disable zooming
    camera.panningAxis = BABYLON.Vector3.Zero(); // disable panning
    camera.angularSensibilityX *= -1; // invert x-axis
    camera.angularSensibilityY *= -1; // invert y-axis

    return camera;
};

let createDash = ( point: BABYLON.Vector3, scene: BABYLON.Scene, mask: number ) =>
{
    const points = [ point.scale( 1 - dashLength ), point.scale( 1 + dashLength ) ];
    const color = pointToColor( point );
    const colors = [ color, color ];
    const dash = BABYLON.MeshBuilder.CreateLines( "dash", { points: points, colors: colors, useVertexAlpha: false }, scene );
    dash.layerMask = mask;

    return dash;
};

let createSphere = ( scene: BABYLON.Scene ) =>
{
    const camera = createCamera( "leftCamera", Mask.Left, scene );
    camera.attachControl( canvas, true );
    scene.activeCameras.push( camera );

    const material = new BABYLON.StandardMaterial( "material", scene );
    material.alpha = sphereAlpha;
    material.emissiveColor = BABYLON.Color3.White();

    const sphere = BABYLON.MeshBuilder.CreateIcoSphere( "sphere", { subdivisions: sphereSubdivisions, flat: false }, scene );
    sphere.material = material;
    sphere.layerMask = Mask.Left;

    return sphere;
};

let draw = ( point: BABYLON.Vector3 ) =>
{
    createDash( point, scene, Mask.Left );
    createLoop( point, scene, Mask.Right );
};

let createScene = () =>
{
    const scene = new BABYLON.Scene( engine );
    scene.clearColor = new BABYLON.Color4( 0, 0, 0, 1 );

    const camera = createCamera( "rightCamera", Mask.Right, scene );
    camera.attachControl( canvas, true );
    scene.activeCameras.push( camera );

    const sphere = createSphere( scene );

    let isPointerDown = false;
    scene.onPointerObservable.add( pointerInfo =>
    {
        const pickInfo = scene.pick( scene.pointerX, scene.pointerY, mesh => mesh === sphere );
        switch ( pointerInfo.type )
        {
            case BABYLON.PointerEventTypes.POINTERUP:
                isPointerDown = false;
                break;
            case BABYLON.PointerEventTypes.POINTERDOWN: // fallthrough
                isPointerDown = true;
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if ( pickInfo && pickInfo.pickedMesh === sphere && isPointerDown && pickInfo.pickedPoint )
                {
                    draw( pickInfo.pickedPoint );
                }
                break;
        }
    } );

    return scene;
};

let canvas = document.getElementById( "renderCanvas" ) as HTMLCanvasElement;
let engine = new BABYLON.Engine( canvas, true );
let scene = createScene();
engine.runRenderLoop( () => { scene.render(); } );
window.addEventListener( "resize", () => { engine.resize(); } );