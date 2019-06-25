/// <reference path="babylon.module.d.ts" />

enum LayerMask { Invisible, Left, Right, }

class Demo
{
    doRender (): void
    {
        // Run the render loop.
        this._engine.runRenderLoop( () => { this._scene.render(); } );

        // The canvas/window resize event handler.
        window.addEventListener( "resize", () => { this._engine.resize(); } );
    }

    setupDemo (): void
    {
        this._scene.clearColor = new BABYLON.Color4( 0, 0, 0, 1 );

        const camera = this._createCamera( "rightCamera", LayerMask.Right );
        camera.attachControl( this._canvas, true );
        this._scene.activeCameras.push( camera );

        const sphere = this._createSphere();

        let isPointerDown = false;
        this._scene.onPointerObservable.add( pointerInfo =>
        {
            const pickInfo = this._scene.pick( this._scene.pointerX, this._scene.pointerY, mesh => mesh === sphere );
            switch ( pointerInfo.type )
            {
                case BABYLON.PointerEventTypes.POINTERUP:
                    isPointerDown = false;
                    break;
                case BABYLON.PointerEventTypes.POINTERDOWN: // Fallthrough.
                    isPointerDown = true;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    if ( pickInfo && pickInfo.pickedMesh === sphere && isPointerDown && pickInfo.pickedPoint )
                    {
                        this._draw( pickInfo.pickedPoint );
                    }
                    break;
            }
        } );
    }

    private _loopResolution: number;
    private _loopDeltaPh: number;
    private _camRadius: number;
    private _dashLength: number;
    private _sphereAlpha: number;
    private _sphereSubdivisions: number;
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;

    constructor ( canvasElement: string, loopResolution: number, camRadius: number, dashLength: number, sphereAlpha: number, sphereSubdivisions: number )
    {
        this._canvas = document.getElementById( canvasElement ) as HTMLCanvasElement;
        this._engine = new BABYLON.Engine( this._canvas, true );
        this._scene = new BABYLON.Scene( this._engine );

        this._loopResolution = loopResolution;
        this._loopDeltaPh = ( 2 * Math.PI ) / this._loopResolution;
        this._camRadius = camRadius;
        this._dashLength = dashLength;
        this._sphereAlpha = sphereAlpha;
        this._sphereSubdivisions = sphereSubdivisions;
    }

    private _unitVectorToFibre ( point: BABYLON.Vector3, ph: number ): BABYLON.Vector3
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
    }

    private _pointToColor ( point: BABYLON.Vector3 ): BABYLON.Color4
    {
        return new BABYLON.Color4( 0.5 * ( 1 - point.x ), 0.5 * ( 1 - point.y ), 0.5 * ( 1 - point.z ), 1 );
    }

    private _createPath ( point: BABYLON.Vector3 ): BABYLON.Vector3[]
    {
        const points: BABYLON.Vector3[] = [];
        let ph = 0;
        for ( let i = 0; i <= this._loopResolution; i++ )
        {
            points.push( this._unitVectorToFibre( point, ph ) );
            ph += this._loopDeltaPh;
        }

        return points;
    }

    private _createLoop ( point: BABYLON.Vector3, mask: number ): BABYLON.Mesh
    {
        const points = this._createPath( point );
        const color = this._pointToColor( point );
        const colors = Array( points.length ).fill( color );
        const loop = BABYLON.MeshBuilder.CreateLines( "lines", { points: points, useVertexAlpha: false, colors: colors }, this._scene );
        loop.layerMask = mask;
        loop.isPickable = false;

        return loop;
    }

    private _createCamera ( name: string, mask: number ): BABYLON.Camera
    {
        const camera = new BABYLON.ArcRotateCamera( name, 0, 0, this._camRadius, BABYLON.Vector3.Zero(), this._scene );
        camera.viewport = mask === LayerMask.Left ? new BABYLON.Viewport( 0, 0, 0.5, 1 ) : new BABYLON.Viewport( 0.5, 0, 0.5, 1 );
        camera.layerMask = mask;
        camera.noRotationConstraint = true;
        camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius = this._camRadius; // Disable zooming.
        camera.panningAxis = BABYLON.Vector3.Zero(); // Disable panning.
        camera.angularSensibilityX *= -1; // Invert x-axis.
        camera.angularSensibilityY *= -1; // Invert y-axis.

        return camera;
    }

    private _createDash ( point: BABYLON.Vector3, mask: number ): BABYLON.Mesh
    {
        const points = [ point.scale( 1 - this._dashLength ), point.scale( 1 + this._dashLength ) ];
        const color = this._pointToColor( point );
        const colors = [ color, color ];
        const dash = BABYLON.MeshBuilder.CreateLines( "dash", { points: points, colors: colors, useVertexAlpha: false }, this._scene );
        dash.layerMask = mask;

        return dash;
    }

    private _createSphere (): BABYLON.Mesh
    {
        const camera = this._createCamera( "leftCamera", LayerMask.Left );
        camera.attachControl( this._canvas, true );
        this._scene.activeCameras.push( camera );

        const material = new BABYLON.StandardMaterial( "material", this._scene );
        material.alpha = this._sphereAlpha;
        material.emissiveColor = BABYLON.Color3.White();

        const sphere = BABYLON.MeshBuilder.CreateIcoSphere( "sphere", { subdivisions: this._sphereSubdivisions, flat: false }, this._scene );
        sphere.material = material;
        sphere.layerMask = LayerMask.Left;

        return sphere;
    }

    private _draw ( point: BABYLON.Vector3 ): void
    {
        this._createDash( point, LayerMask.Left );
        this._createLoop( point, LayerMask.Right );
    }
}

window.addEventListener( "DOMContentLoaded",
    () =>
    {
        const loopResolution = 384;
        const camRadius = 4;
        const dashLength = 0.1;
        const sphereAlpha = 0.5;
        const sphereSubdivisions = 8;

        // Create the demo using the 'renderCanvas'.
        const demo = new Demo( "renderCanvas", loopResolution, camRadius, dashLength, sphereAlpha, sphereSubdivisions );

        // Create the scene.
        demo.setupDemo();

        // Start render loop.
        demo.doRender();
    } );