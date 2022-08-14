/* jshint expr: true */

function isElement(obj) {
    try {
        return obj instanceof HTMLElement;
    } catch (e) {
        return (typeof obj === "object") && (obj.nodeType === 1) && (typeof obj.style === "object") && (typeof obj.ownerDocument === "object");
    }
}

var AbstractSpeedometer = function(data,loadingManager,scripts){
    var _this = this;
    var container = data.container;
    var twoPi = Math.PI * 2;
    var _global = {
        data                : data,
        sceneReady          : false,
        ultraHD             : false,
        keydown             : false,
        time                : new Date()
    };

    if (container) {
        if (!isElement(container)) {
            this.container = document.getElementById(container);
            if(this.container == null){
                container = document.createElement('div');
                document.body.appendChild(container);
                this.container = container;
            }

        } else {
            this.container = container;
        }
    } else {
         container = document.createElement('div');
         document.body.appendChild(container);
         this.container = container;
    }

    this.setting = {

        //initial values
        nearCamLimit            : 200,      // from car's outer bounding radius
        farCamLimit             : 200,      // from car's outer bounding radius
        extendedFarCamLimit     : 0,        // for mobile portrait mode screens
        userControlledAimation  : false,    // set true to enable continuos rendering   **rework needed**
      
        //render engine
        antialias               : true,     // antialiasing 
        postprocessing          : false,

        //physics
        accelaration            : 1.2,
        brakingForce            : 0.3,
        initialVelocity         : 0,
        currentVelocity         : 0
        
    };

    var tracker = {
        exportScene : true,
        pan: false
    };

    this.initSceneSetup = function() {
        _setup().then(_init);
    };
 
    function _setup(){
         var scriptLoader = new ScriptLoader();
         return new Promise(function(resolve, reject) {
             scriptLoader.load(data.cdn,scripts).then(function(){
                 console.log('scripts are loaded');
                 resolve();
             }).catch(function(){
                 console.log("Error");
             });
         });
    }

    function _init(){
        THREE.Cache.enabled = true;
        _initScene();
        _initRenderer();
        _initCssRenderer();
        _initCamera();
        _initControls();
        _createSpeedGauge();
        _initDomElements();
        _createHelpers();
        _initPostProcessing();
        _registerEventListeners();
		_refreshRenderFrame();
    }

    function _initScene() {
        _global.scene             = new THREE.Scene();
        _global.scene.name        = "Scene";
        _global.scene.background  = new THREE.Color(0x303037);
        _global.scene.fog         = new THREE.Fog(0, 0.1, 0);
        if(tracker.exportScene == true ) window.scene = _global.scene;
    }

    function _initRenderer() {

        _global.renderer = new THREE.WebGLRenderer({
            antialias: _this.setting.antialias,
            alpha: false,
        });

        _global.renderer.setPixelRatio(window.devicePixelRatio);

        _global.canvas                    = _global.renderer.domElement;
        _global.canvas.style.position     = "absolute";
        _global.canvas.style.top          = "0px";
        _global.canvas.style.zIndex       = 0;
        _global.canvas.height             = _this.container.clientHeight;
        _global.canvas.width              = _this.container.clientWidth;
        
        _global.renderer.setSize(_global.canvas.width, _global.canvas.height);
        
        _this.container.appendChild(_global.canvas);
        
    }

    function _initCssRenderer() {
        var rect = _global.canvas.getBoundingClientRect();

        _global.renderer2 = new THREE.CSS3DRenderer();
        _global.renderer2.setSize(rect.width, rect.height);

        _global.renderer2.domElement.style.position = 'absolute';
        _global.renderer2.domElement.style.top = 0;
        _this.container.appendChild(_global.renderer2.domElement);
    }

    function _initCamera() {
        _this.camera = new THREE.PerspectiveCamera(45, _global.canvas.width / _global.canvas.height, 1, 5000);
        _this.camera.lookAt(0, 0, 0);
        _this.camera.position.set(0,0,200);
    }

    function _initDomElements() {;

        var speed = document.createElement( 'div' );
        speed.id = 'speed';

        var speedValue = document.createElement( 'p' );
        speedValue.innerText = "0";
        speed.appendChild( speedValue );
        _global.speedValue = speedValue;

        var speedUnit = document.createElement( 'p' );
        speedUnit.id = 'speed-unit';
        speedUnit.innerText = "MPH";
        speed.appendChild( speedUnit );

        var milage = document.createElement( 'div' );
        milage.id = 'milage';
        
        var Hline = document.createElement( 'div' );
        Hline.style.height = '0.5px';
        Hline.style.transform = "scale(1, 0.3)";

        Hline.style.width = '100%';
        Hline.style.backgroundImage = 'linear-gradient(-90deg, #303037, #cacaca, #303037)';
        milage.appendChild( Hline );

        var leafDiv = document.createElement( 'div' );
        leafDiv.style.width = '20%';
        leafDiv.style.paddingTop = "1px";
        // leafDiv.style.fontSize = '30px';
        milage.appendChild( leafDiv );

        var leafIcon = document.createElement( 'i' );
        leafIcon.className = 'fa fa-leaf';
        leafIcon.setAttribute("aria-hidden", true);
        leafDiv.appendChild( leafIcon );

        var milageValueDiv = document.createElement( 'div' );
        milageValueDiv.style.width = '40%';
        milageValueDiv.style.paddingTop = "1px";
        milageValueDiv.style.fontSize = '8px';
        milage.appendChild( milageValueDiv );

        var milageValue = document.createElement( 'p' );
        milageValue.innerText = "34";
        milageValueDiv.appendChild( milageValue );

        var milageValueUnit = document.createElement( 'div' );
        milageValueUnit.style.width = '40%';
        milageValueUnit.style.fontSize = '4px';
        milageValueUnit.style.paddingTop = '3px';
        milageValueUnit.innerText = 'MPH';
        milage.appendChild( milageValueUnit );

        var speed3d = new THREE.CSS3DSprite( speed );
        speed3d.position.y = 5;
        _global.scene.add( speed3d );

        var milage3d = new THREE.CSS3DSprite( milage );
        milage3d.position.y = -35;
        _global.scene.add( milage3d );
    }

    function _createSpeedGauge() {

        var gutterGeometry = new THREE.BufferGeometry();
        gutterGeometry.addAttribute('position', new THREE.Float32BufferAttribute([], 3));
        var gutterMaterial = new THREE.MeshBasicMaterial({ color: 0x404045 });
        var gutter = new THREE.Mesh(gutterGeometry, gutterMaterial);
        gutter.name = 'gutter';
        _circleGeometry( gutter );

        _global.indicatorData = {
            radius: 50,
            segments: 50,
            thetaStart: -THREE.Math.degToRad(45),
            thetaLength: THREE.Math.degToRad(0)
        };
        var indicatorGeometry = new THREE.BufferGeometry();
        indicatorGeometry.addAttribute('position', new THREE.Float32BufferAttribute([], 3));
        var indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xd0e0f3, side: THREE.BackSide });
        _global.indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        _global.indicator.position.z = 1;
        _global.indicator.name = 'indicator';
        _global.indicator.rotateY(THREE.Math.degToRad(180))

        _updateGroupGeometry(_global.indicator,
            new THREE.CircleBufferGeometry(
                _global.indicatorData.radius, _global.indicatorData.segments, _global.indicatorData.thetaStart, _global.indicatorData.thetaLength
            )
        );

        var data = {
            radius: 50 - 5,
            segments: 100,
            thetaStart: 0,
            thetaLength: twoPi
        };
        var innerCircleGeo = new THREE.CircleBufferGeometry(
            data.radius, data.segments, data.thetaStart, data.thetaLength
        );
        
        var bgMat = new THREE.MeshBasicMaterial({ color: 0x303037 });
        var innerCircle = new THREE.Mesh(innerCircleGeo, bgMat);
        innerCircle.name = 'inner circle';
        innerCircle.position.z = 2;

        var data1 = {
            radius: 50 + 5,
            segments: 10,
            thetaStart: THREE.Math.degToRad(49),
            thetaLength: THREE.Math.degToRad(2)
        };
        var limitIndicatorGeo = new THREE.CircleBufferGeometry(
            data1.radius, data1.segments, data1.thetaStart, data1.thetaLength
        );
        
        var limitIndicator = new THREE.Mesh(limitIndicatorGeo, bgMat);
        limitIndicator.position.z = 3;
        limitIndicator.name = 'limit indicator';

        var tipMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry(1, 4.75), new THREE.MeshBasicMaterial() );
        tipMesh.position.set(0, 47, 4);

        tip = new THREE.Group();
        tip.rotateZ( THREE.Math.degToRad(135) );
        tip.add(tipMesh);

        _global.tipMain = new THREE.Group();
        _global.tipMain.add(tip);

        _global.scene.add(gutter);
        _global.scene.add(_global.indicator);
        _global.scene.add(innerCircle);
        _global.scene.add(limitIndicator);
        _global.scene.add(_global.tipMain);
    }

    function _createHelpers() {
        var config = [
            { name: "speed limit indicator",    angle: 45, position:  { x:  1, y: 1  }, offsetHeight:  10, offsetLength:  50,  distanceFromOrigin: 45 },
            { name: "speed indicator",          angle: 45, position:  { x: -1, y: 1  }, offsetHeight:  10, offsetLength: -50, distanceFromOrigin: 45 },
            { name: "fuel efficiency indicator", angle: 90, position:  { x:  1, y: -1 }, offsetHeight: -10, offsetLength:  80, distanceFromOrigin: 45 },
        ]

        var lineMaterial = new THREE.LineDashedMaterial({ color: 0x787887, dashSize: 1,  gapSize: 0.3, });

        config.forEach(function(element, i){
            var x = ( element.distanceFromOrigin + ( i !== 2 ? 2 :  0 ))  * parseFloat(Math.cos(THREE.Math.degToRad(element.angle)).toFixed(6)) * element.position.x;
            var y = ( element.distanceFromOrigin + ( i !== 2 ? 15 : 0 ) ) * parseFloat(Math.sin(THREE.Math.degToRad(element.angle)).toFixed(6)) * element.position.y;

            var limitIndicatorLineGeo = new THREE.Geometry();
            limitIndicatorLineGeo.vertices.push(
                new THREE.Vector3( x, y, 0 ),
                new THREE.Vector3( x, y + element.offsetHeight, 0 ),
                new THREE.Vector3( x + element.offsetLength + element.offsetHeight, y + element.offsetHeight, 0 )
            );
            
            var limitIndicatorLine = new THREE.Line( limitIndicatorLineGeo, lineMaterial );
            limitIndicatorLine.computeLineDistances()
            _global.scene.add( limitIndicatorLine );

            var dom = document.createElement( 'p' );
            dom.style.fontSize = "2px";
            dom.style.color = "#848c98";
            dom.innerText = element.name.toLocaleUpperCase();


            var object = new THREE.CSS3DSprite( dom );
            object.position.set(x + element.offsetLength + element.offsetHeight, y + element.offsetHeight, 0)
            _global.scene.add( object );


        });   
        
    };

    function _initPostProcessing() {
        var passes = [
            {   
                type: "bloom",
                config: {
                    threshold: 0,
                    strength: 2,
                    radius: 2
                }
            }
        ];
        if ( _this.setting.postprocessing && passes.length > 0){
            _this.postProcessor = new PostProcessingManager( data, _global.scene, _this.camera, _global.renderer, _this.container.clientWidth, _this.container.clientHeight, passes);
        } 
        
        _global.sceneReady =true;
        _animateFrame() ;       
    }

    function _circleGeometry(mesh) {

        var data = {
            radius: 50,
            segments: 100,
            thetaStart: THREE.Math.degToRad(-45),
            thetaLength: (3 / 4) * twoPi
        };
    
        function generateGeometry() {
    
            _updateGroupGeometry(mesh,
                new THREE.CircleBufferGeometry(
                    data.radius, data.segments, data.thetaStart, data.thetaLength
                )
            );
    
        }
    
        generateGeometry();
    
    }
    
    function _updateGroupGeometry(mesh, geometry) {

        if (geometry.isGeometry) {
    
            geometry = new THREE.BufferGeometry().fromGeometry(geometry);
    
            console.warn('THREE.GeometryBrowser: Converted Geometry to BufferGeometry.');
    
        }
    
        mesh.geometry.dispose();
        mesh.geometry = geometry;
    
    }

    function _initControls() {

        _this.controls                  = new THREE.OrbitControls(_this.camera, _global.canvas);
        _this.controls.maxPolarAngle    = Math.PI / 2;
        _this.controls.enablePan        = tracker.pan;
        _this.controls.maxDistance      = _this.setting.farCamLimit
        _this.controls.minDistance      = _this.setting.nearCamLimit
        
        _this.controls.addEventListener('change', function(e) {
            _refreshRenderFrame();
        });  
    }

    function _render() {
        // _global.scene.updateMatrix();
        _this.camera.updateProjectionMatrix();
        if(_this.setting.postprocessing && _this.postProcessor && _this.postProcessor.composer ) {
            _this.postProcessor.update();
            _global.renderer2.render(_global.scene, _this.camera);

        } else {
            _global.renderer.render(_global.scene, _this.camera);
            _global.renderer2.render(_global.scene, _this.camera);

        }
    }
   
    function _animate (doAnimate,timeout){
        _global.doAnimate = doAnimate;
        if(timeout){
            return new Promise(function(resolve,reject){  
                setTimeout(function(){
                    resolve();
                },timeout);
            });
        }
    }

    function _startAnimate() {
        if(!_global.doAnimate){
            _global.doAnimate = true;
        }
    }

    function _stopAnimate() {
        _global.doAnimate = false;
    }

    function _animateFrame() {
        requestAnimationFrame(_animateFrame);
        if (_global.sceneReady && (_global.doAnimate == true || _this.setting.userControlledAimation == true)) {
            // if (tracker.analysis) _this.rendererStats.update(_global.renderer), _this.stats.update();\
            if( !_global.keydown ) {

                if( _this.setting.currentVelocity < 0 ) return

                var endTime = new Date();
                var timeDiff = endTime - _global.time; //in ms

                _this.setting.currentVelocity = _this.setting.initialVelocity - ( _this.setting.brakingForce * (timeDiff/1000) );

                if( _this.setting.currentVelocity > 0 && _this.setting.currentVelocity < 270 ) {

                    var angle = THREE.Math.degToRad(_this.setting.currentVelocity);

                    _this.setting.initialVelocity = _this.setting.currentVelocity;
                    Math.round((_this.setting.currentVelocity*100)/270) > 65 ? _global.indicator.material.color.set(0xFFFF00) : _global.indicator.material.color.set(0xd0e0f3);
                    
                    _global.indicatorData.thetaLength = angle;
                    _global.tipMain.rotation.set(0,0,-angle)

                    _updateGroupGeometry(_global.indicator,
                        new THREE.CircleBufferGeometry(
                            _global.indicatorData.radius, _global.indicatorData.segments, _global.indicatorData.thetaStart, _global.indicatorData.thetaLength
                        )
                    );
                    _global.speedValue.innerText = Math.round((_this.setting.currentVelocity*100)/270);
                }
                
            }
            _render();
        }
    }


    function _refreshRenderFrame(){
        _startAnimate();
        
        clearTimeout(_global.canvas.renderFrameTimeoutObj);
        _global.canvas.renderFrameTimeoutObj = setTimeout(function() {
            _stopAnimate();
        }, 15000);
    }

    function _registerEventListeners(){

        window.focus();
        window.addEventListener('resize', _onWindowResize, false);
        window.addEventListener('keydown', _keyDownActive, false);
        window.addEventListener('keyup', _keyUpActive, false);
        window.addEventListener("orientationchange", _onOrientationChange, false);
        
    }

    function _keyDownActive() {
        if ( !_global.keydown ) _global.time = new Date();
        if ( event.keyCode == 32 ) _global.keydown = true;
        var endTime = new Date();
        var timeDiff = endTime - _global.time; //in ms\
        // v1 = v0 + at
        _this.setting.currentVelocity = _this.setting.initialVelocity + ( _this.setting.accelaration * (timeDiff/1000) );

        if( _this.setting.currentVelocity > 0 && _this.setting.currentVelocity < 270 ) {
            
            _this.setting.initialVelocity = _this.setting.currentVelocity;
            var angle = THREE.Math.degToRad(_this.setting.currentVelocity);
            _global.indicatorData.thetaLength = angle;
                Math.round((_this.setting.currentVelocity*100)/270) > 65 ? _global.indicator.material.color.set(0xFFFF00) : _global.indicator.material.color.set(0xd0e0f3);
                    _global.tipMain.rotation.set(0,0,-angle)
                _updateGroupGeometry(_global.indicator,
                new THREE.CircleBufferGeometry(
                    _global.indicatorData.radius, _global.indicatorData.segments, _global.indicatorData.thetaStart, _global.indicatorData.thetaLength
                )
            );
            _global.speedValue.innerText = Math.round((_this.setting.currentVelocity*100)/270);
                    // _this.onSpeedUpdate && _this.onSpeedUpdate(Math.floor( _this.setting.currentVelocity ));
        }

        _refreshRenderFrame();
          
    }

    function _keyUpActive() {
        if ( event.keyCode == 32 ) _global.keydown = false;
        _global.time = new Date();
    }

    function _onOrientationChange() {
        _adjustCameraPosition(_this.setting.cameraAngle1);
        _startAnimate();
        setTimeout(function() {
           _stopAnimate();
        }, 1000);
    }

    function _onWindowResize() {
        _global.canvas.height = _this.container.clientHeight;
        _global.canvas.width  = _this.container.clientWidth;
        _global.postProcessor && _global.postProcessor.composer.setSize(_global.canvas.width, _global.canvas.height);
        _global.renderer.setSize(_global.canvas.width, _global.canvas.height);
        _global.renderer2.setSize(_global.canvas.width, _global.canvas.height);
        _this.camera.aspect   = _global.canvas.width / _global.canvas.height;
        
        _refreshRenderFrame();
    }
};

Speedometer = function(data, loadingManager, overrides) {
    var scripts = [
        [   
            "/app/js/vendors/threejs/r105/three.js",       
        ],
        [
            "/app/js/OrbitControls.js",  
            "/app/js/vendors/threejs/r105/CSS3DRenderer.js",

        ],
        [
            "/app/js/PostProcessor.js",
        ]
    ];
    AbstractSpeedometer.call(this, data, loadingManager,scripts);
    if (overrides) {
        for (var key in overrides) {
            this[key] = overrides[key];
        }
    }
};

Speedometer.prototype = Object.create(AbstractSpeedometer.prototype);
Speedometer.prototype.constructor = Speedometer;

function LoadingManager( onLoad, onProgress, onError ) {
    
    var scope = this;

    var isLoading = false;
    var itemsLoaded = 0;
    var itemsTotal = 0;
    var urlModifier;

    this.onStart = undefined;
    this.onLoad = onLoad;
    this.onProgress = onProgress;
    this.onError = onError;
    this.itemsStart = function ( numberOfItems ) {
        
                itemsTotal += numberOfItems;
                isLoading = true;
        
    };

    this.itemStart = function ( url ) {

        itemsTotal ++;

        if ( isLoading === false ) {

            if ( scope.onStart !== undefined ) {

                scope.onStart( url, itemsLoaded, itemsTotal );

            }

        }

        isLoading = true;

    };

    this.itemEnd = function ( url ) {

        itemsLoaded ++;

        if ( scope.onProgress !== undefined ) {

            scope.onProgress( url, itemsLoaded, itemsTotal );

        }

        if ( itemsLoaded === itemsTotal ) {

            isLoading = false;

            if ( scope.onLoad !== undefined ) {

                scope.onLoad();

            }

        }

    };

    this.itemError = function ( url ) {

        if ( scope.onError !== undefined ) {

            scope.onError( url );

        }

    };

    this.resolveURL = function ( url ) {

        if ( urlModifier ) {

            return urlModifier( url );

        }

        return url;

    };

    this.setURLModifier = function ( transform ) {

        urlModifier = transform;
        return this;

    };   
}

function ScriptLoader() {
    function _add(basepath,urls,loadingManager) {
        var promises = [];
        if(urls && urls.length>0){
            for(var i in urls){
                
                (function(url){
                    var promise = new Promise(function(resolve, reject) {
                        loadingManager && urls && loadingManager.itemStart(url);
                        var script = document.createElement('script');
                        script.src = url;
            
                        script.addEventListener('load', function() {
                            loadingManager && loadingManager.itemEnd(url);
                            console.log("Loaded: "+url);
                            resolve(url);
                        }, false);
            
                        script.addEventListener('error', function() {
                            console.log("Error: "+url);
                            loadingManager && loadingManager.itemEnd(url);
                            reject(url);
                        }, false);
            
                        document.body.appendChild(script);
                    });
            
                    promises.push(promise);
            })(basepath+urls[i]);
            }
        }
        return promises;
    }

    this.load = function(basepath,urls,loadingManager) {

        var promise = null;
        basepath = !basepath?"":basepath;
        if(urls && urls.length>0){
            for(var i in urls){
                (function(basepath,item){
                    if(promise){
                        promise = promise.then(function(){
                            console.log('loaded');
                            return Promise.all(_add(basepath,item,loadingManager)); 
                        });
                    }else{
                        promise = Promise.all(_add(basepath,item,loadingManager));
                    }
                })(basepath,urls[i]);
            }
        }
        console.log(promise);
        return promise;
    };
}