var LOOP_RESOLUTION=384,LOOP_DELTA_PH=2*Math.PI/LOOP_RESOLUTION,CAM_RADIUS=4,DASH_LENGTH=.1,SPHERE_ALPHA=.5,SPHERE_SUBDIVISIONS=8,MASK;(function(a){a[a.INVISIBLE=0]="INVISIBLE";a[a.LEFT=1]="LEFT";a[a.RIGHT=2]="RIGHT"})(MASK||(MASK={}));
var unitVecToFibre=function(a,b){var c=Math.sqrt(.5*(1+a.z)),e=-Math.sqrt(.5*(1-a.z)),f=Math.atan2(-a.x,a.y)-b,d=c*Math.cos(f);d=Math.acos(d)/(Math.PI*Math.sqrt(1-Math.pow(d,2)));return new BABYLON.Vector3(e*Math.cos(b)*d,e*Math.sin(b)*d,c*Math.sin(f)*d)},createPath=function(a){for(var b=[],c=0,e=0;e<=LOOP_RESOLUTION;e++)b.push(unitVecToFibre(a,c)),c+=LOOP_DELTA_PH;return b},pointToColor=function(a){return new BABYLON.Color4(.5*(1-a.x),.5*(1-a.y),.5*(1-a.z),1)},createLoop=function(a,b,c){for(var e=
createPath(a),f=pointToColor(a),d=[],g=0;g<e.length;g++)d.push(f);a=BABYLON.MeshBuilder.CreateLines("lines",{points:createPath(a),useVertexAlpha:!1,colors:d},b);a.layerMask=c;a.isPickable=!1;return a},createCamera=function(a,b){var c=new BABYLON.ArcRotateCamera(a,0,0,CAM_RADIUS,BABYLON.Vector3.Zero(),scene);c.viewport=b==MASK.LEFT?new BABYLON.Viewport(0,0,.5,1):new BABYLON.Viewport(.5,0,.5,1);c.layerMask=b;c.noRotationConstraint=!0;c.lowerRadiusLimit=c.upperRadiusLimit=c.radius=CAM_RADIUS;c.panningAxis=
BABYLON.Vector3.Zero();c.angularSensibilityX*=-1;c.angularSensibilityY*=-1;return c},createDash=function(a,b,c){var e=[a.scale(1-DASH_LENGTH),a.scale(1+DASH_LENGTH)];a=pointToColor(a);b=BABYLON.MeshBuilder.CreateLines("dash",{points:e,colors:[a,a],useVertexAlpha:!1},b);b.layerMask=c;return b},createSphere=function(a){var b=createCamera("leftCamera",MASK.LEFT);b.attachControl(canvas,!0);a.activeCameras.push(b);b=new BABYLON.StandardMaterial("material",a);b.alpha=SPHERE_ALPHA;b.emissiveColor=BABYLON.Color3.White();
a=BABYLON.MeshBuilder.CreateIcoSphere("sphere",{subdivisions:SPHERE_SUBDIVISIONS,flat:!1},a);a.material=b;a.layerMask=MASK.LEFT;return a},draw=function(a){createDash(a,scene,MASK.LEFT);createLoop(a,scene,MASK.RIGHT)},createScene=function(){var a=new BABYLON.Scene(engine);a.clearColor=new BABYLON.Color4(0,0,0,1);var b=createCamera("rightCamera",MASK.RIGHT);b.attachControl(canvas,!0);a.activeCameras.push(b);var c=createSphere(a),e=!1;a.onPointerObservable.add(function(b){var d=a.pick(a.pointerX,a.pointerY,
function(a){return a==c});switch(b.type){case BABYLON.PointerEventTypes.POINTERUP:e=!1;break;case BABYLON.PointerEventTypes.POINTERDOWN:e=!0;case BABYLON.PointerEventTypes.POINTERMOVE:d&&d.pickedMesh==c&&e&&d.pickedPoint&&draw(d.pickedPoint)}});return a},canvas=document.getElementById("renderCanvas"),engine=new BABYLON.Engine(canvas,!0),scene=createScene();engine.runRenderLoop(function(){scene.render()});window.addEventListener("resize",function(){engine.resize()});