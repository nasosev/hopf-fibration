
const LOOP_RESOLUTION = 384;
const LOOP_DELTA_PH = ( 2 * Math.PI ) / LOOP_RESOLUTION;
const CAM_RADIUS = 4;
const DASH_LENGTH = 0.1;
const SPHERE_ALPHA = 0.5;
const SPHERE_SUBDIVISIONS = 8;

enum MASK { INVISIBLE, LEFT, RIGHT }

let unitVecToFibre = function ( point: BABYLON.Vector3, ph: number )
{
  let al = Math.sqrt( 0.5 * ( 1 + point.z ) );
  let be = -Math.sqrt( 0.5 * ( 1 - point.z ) );
  let th = Math.atan2( -point.x, point.y ) - ph;
  let w = al * Math.cos( th );
  let x = be * Math.cos( ph );
  let y = be * Math.sin( ph );
  let z = al * Math.sin( th );
  let r = Math.acos( w ) / ( Math.PI * Math.sqrt( 1 - w ** 2 ) );

  return new BABYLON.Vector3( x * r, y * r, z * r );
};

let createPath = function ( point: BABYLON.Vector3 )
{
  let points = [];
  let ph = 0;
  for ( let i = 0; i <= LOOP_RESOLUTION; i++ )
  {
    points.push( unitVecToFibre( point, ph ) );
    ph += LOOP_DELTA_PH;
  }
  return points;
};

let pointToColor = function ( point: BABYLON.Vector3 )
{
  let color = new BABYLON.Color4( 0.5 * ( 1 - point.x ), 0.5 * ( 1 - point.y ), 0.5 * ( 1 - point.z ), 1 );

  return color;
};

let createLoop = function ( point: BABYLON.Vector3, scene: BABYLON.Scene, mask: number )
{
  let points = createPath( point );
  let color = pointToColor( point );
  let colors = [];
  for ( let i = 0; i < points.length; i++ ) { colors.push( color ); }
  let loop = BABYLON.MeshBuilder.CreateLines( 'lines', { points: createPath( point ), useVertexAlpha: false, colors: colors }, scene );
  loop.layerMask = mask;
  loop.isPickable = false;

  return loop;
};

let createCamera = function ( name: string, mask: number )
{
  let camera = new BABYLON.ArcRotateCamera( name, 0, 0, CAM_RADIUS, BABYLON.Vector3.Zero(), scene );
  camera.viewport = mask == MASK.LEFT ? new BABYLON.Viewport( 0, 0, 0.5, 1 ) : new BABYLON.Viewport( 0.5, 0, 0.5, 1 );
  camera.layerMask = mask;
  camera.noRotationConstraint = true;
  camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius = CAM_RADIUS; // disable zooming
  camera.panningAxis = BABYLON.Vector3.Zero(); // disable panning
  camera.angularSensibilityX *= -1; // invert x-axis
  camera.angularSensibilityY *= -1; // invert y-axis
  return camera;
};

let createDash = function ( point: BABYLON.Vector3, scene: BABYLON.Scene, mask: number )
{
  let points = [ point.scale( 1 - DASH_LENGTH ), point.scale( 1 + DASH_LENGTH ) ];
  let color: BABYLON.Color4 = pointToColor( point );
  let colors = [ color, color ];
  let dash = BABYLON.MeshBuilder.CreateLines( 'dash', { points: points, colors: colors, useVertexAlpha: false }, scene );
  dash.layerMask = mask;
  return dash;
};

let createSphere = function ( scene: BABYLON.Scene )
{
  let camera = createCamera( 'leftCamera', MASK.LEFT );
  camera.attachControl( canvas, true );
  scene.activeCameras.push( camera );

  let material = new BABYLON.StandardMaterial( 'material', scene );
  material.alpha = SPHERE_ALPHA;
  material.emissiveColor = BABYLON.Color3.White();

  let sphere = BABYLON.MeshBuilder.CreateIcoSphere( 'sphere', { subdivisions: SPHERE_SUBDIVISIONS, flat: false }, scene );
  sphere.material = material;
  sphere.layerMask = MASK.LEFT;

  return sphere;
};


let draw = function ( point: BABYLON.Vector3 )
{
  createDash( point, scene, MASK.LEFT );
  createLoop( point, scene, MASK.RIGHT );
}

let createScene = function ()
{
  let scene = new BABYLON.Scene( engine );
  scene.clearColor = new BABYLON.Color4( 0, 0, 0, 1 );

  let camera = createCamera( 'rightCamera', MASK.RIGHT );
  camera.attachControl( canvas, true );
  scene.activeCameras.push( camera );

  let sphere = createSphere( scene );

  let isPointerDown = false;
  scene.onPointerObservable.add( pointerInfo =>
  {

    let pickInfo = scene.pick( scene.pointerX, scene.pointerY, function ( mesh ) { return mesh == sphere; } );
    switch ( pointerInfo.type )
    {
      case BABYLON.PointerEventTypes.POINTERUP:
        isPointerDown = false;
        break;
      case BABYLON.PointerEventTypes.POINTERDOWN: // fallthrough
        isPointerDown = true;
      case BABYLON.PointerEventTypes.POINTERMOVE:
        if ( pickInfo && pickInfo.pickedMesh == sphere && isPointerDown && pickInfo.pickedPoint )
        {
          draw( pickInfo.pickedPoint );
        }
        break;
    }
  } );
  return scene;
};

let canvas = <HTMLCanvasElement> document.getElementById( 'renderCanvas' );
let engine = new BABYLON.Engine( canvas, true );
let scene = createScene();
engine.runRenderLoop( function () { scene.render(); } );
window.addEventListener( 'resize', function () { engine.resize(); } );