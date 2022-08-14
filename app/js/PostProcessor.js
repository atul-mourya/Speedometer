var PostProcessingManager = function (data, scene, camera, renderer, width, height, passes) {
    var _this = this;
    window.PostProcesser = _this;
    _initPostProcessing();

    function _initPostProcessing(){
        _loadPPScripts().then( _createPostProcessor );
        _createControllerSideBar();
    }

    function _createPostProcessor(){
        var rtParameters = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            stencilBuffer: true
        };

        var renderTarget = new THREE.WebGLRenderTarget( width, height, rtParameters );

        _this.composer = new THREE.EffectComposer(renderer, renderTarget);
        _this.composer.setSize(width, height);

        var renderPass = new THREE.RenderPass(scene, camera);
        _this.composer.addPass(renderPass);

        var shaderPass = new THREE.ShaderPass(THREE.CopyShader);
        shaderPass.renderToScreen = true;

        passes.forEach(function(element){
            switch(element.type) {
                case "msaa":
                    _this.msaaPass = new THREE.ManualMSAARenderPass(scene, camera);
                    _this.msaaPass.sampleLevel = element.config && element.config.sampleLevel || 2;
                    _this.msaaPass.unbiased = true;
                    _this.msaaPass.enabled = false;
                    _this.composer.addPass(_this.msaaPass);
                    break;
                case "fxaa":
                    _this.fxaaPass = new THREE.ShaderPass( THREE.FXAAShader );
                    _this.fxaaPass.uniforms[ 'resolution' ].value.set( 1 / width, 1 / height );
                    _this.fxaaPass.renderToScreen = false;
                    _this.fxaaPass.enabled = false;
                    _this.composer.addPass(_this.fxaaPass);
                    break;
                case "bloom":
                    _this.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(width, height), 0.15, 0.5, 0.85);
                    var threshold = _this.bloomPass.threshold = element.config && element.config.threshold || 0.85;
                    var strength = _this.bloomPass.strength = element.config && element.config.strength || 2;
                    var radius = _this.bloomPass.radius = element.config && element.config.radius || 0.5;
                    _this.bloomPass.enabled = true;
                    _this.composer.addPass(_this.bloomPass);
                    _createController('Bloom', {threshold: threshold, strength: strength, radius: radius}, _this.bloomPass);

                    break;
                case "vignette":
                    _this.vignettePass = new THREE.ShaderPass(THREE.VignetteShader);
                    var offset = _this.vignettePass.uniforms.offset.value = element.config && element.config.offset || 1.0;
                    var darkness = _this.vignettePass.uniforms.darkness.value = element.config && element.config.darkness || 2.0;
                    _this.vignettePass.enabled = false;
                    _this.composer.addPass(_this.vignettePass);
                    _createController('Vignette', {offset: offset, darkness: darkness}, _this.vignettePass);
                    
                    break;
                case "colorCorrection":
                    _this.colorCorrectionPass = new THREE.ShaderPass(THREE.ColorCorrectionShader);
                    _this.colorCorrectionPass.uniforms.powRGB.value = new THREE.Vector3( element.config && element.config.r || 1.0, element.config && element.config.g || 1.1, element.config && element.config.b || 1.15);
                    _this.colorCorrectionPass.enabled = false;                    
                    _this.composer.addPass(_this.colorCorrectionPass);
                    _createController('Color Correction', {}, _this.colorCorrectionPass);                    
                    break;
                case "sepia":
                    _this.sepia = new THREE.ShaderPass(THREE.SepiaShader);
                    _this.sepia.enabled = false;
                    var amount = _this.sepia.uniforms.amount.value = element.config && element.config.amount || 1;
                    _this.composer.addPass(_this.sepia);
                    _createController('Sepia', {amount: amount}, _this.sepia);
                    break;
                case "bleach":
                    _this.bleach = new THREE.ShaderPass(THREE.BleachBypassShader);
                    _this.bleach.enabled = false;
                    var opacity = _this.bleach.uniforms.opacity.value = element.config && element.config.amount || 1;
                    _this.composer.addPass(_this.bleach);
                    _createController('Bleach', {opacity: opacity}, _this.bleach);
                    break;
                case "hblur":
                    _this.hblur = new THREE.ShaderPass(THREE.HorizontalTiltShiftShader);
                    _this.hblur.enabled = false;
                    var h = _this.hblur.uniforms.h.value = element.config && element.config.h || 0.01;
                    var r = _this.hblur.uniforms.r.value = element.config && element.config.r || 0.5;
                    _this.composer.addPass(_this.hblur);
                    _createController('Horizontal Blur', {h: h, r: r}, _this.hblur);
                    break;
                case "vblur":
                    _this.vblur = new THREE.ShaderPass(THREE.VerticalTiltShiftShader);
                    _this.vblur.enabled = false;
                    var v = _this.vblur.uniforms.v.value = element.config && element.config.v || 0.01;
                    var r = _this.vblur.uniforms.r.value = element.config && element.config.r || 0.5;
                    _this.composer.addPass(_this.vblur);
                    _createController('Verticle Blur', {v: v, r: r}, _this.vblur);
                    break;
                case "rgbShift":
                    _this.rgbShiftPass = new THREE.ShaderPass(THREE.RGBShiftShader);
                    var angle = _this.rgbShiftPass.uniforms.angle.value = element.config && element.config.angle || 1.0 * Math.PI;
                    var amount = _this.rgbShiftPass.uniforms.amount.value = element.config && element.config.amount || 0.007;
                    _this.rgbShiftPass.enabled = false;
                    _this.composer.addPass(_this.rgbShiftPass);
                    _createController('RGB Shift', {angle: angle, amount: amount}, _this.rgbShiftPass);
                    
                    break;
                case "dotScreen":
                    _this.dotScreenPass = new THREE.ShaderPass( THREE.DotScreenShader );
                    var angle = _this.dotScreenPass.uniforms.angle.value = element.config && element.config.angle || 3.14;
                    var scale = _this.dotScreenPass.uniforms.scale.value = element.config && element.config.scale || 1;
                    _this.dotScreenPass.enabled = false;
                    _this.composer.addPass(_this.dotScreenPass);
                    _createController('Dot Screen', {scale: scale, angle :angle}, _this.dotScreenPass);
                    break;
                case "glitch":
                    _this.glitchPass = new THREE.GlitchPass(element.config.intensity || 128.0);
                    _this.glitchPass.goWild = true;
                    _this.glitchPass.enabled = false;
                    _this.composer.addPass(_this.glitchPass);
                    break;
            }
        });
        
        _this.composer.addPass(shaderPass);
        console.log(_this);
    }

    function _loadPPScripts (){
        return new Promise(function(resolve, reject) {
            var filesToLoad = [
                [   
                    "/app/js/vendors/threejs/postprocessing/EffectComposer.js", 
                    "/app/js/vendors/threejs/postprocessing/CopyShader.js",   
                    "/app/js/vendors/threejs/postprocessing/RenderPass.js",   
                    "/app/js/vendors/threejs/postprocessing/ShaderPass.js"   
                ]
            ];

            var dependencyArr   = [];
            var scriptArr       = [];

            var dependencies = 
            {
                bloom_dependency    : ["/app/js/vendors/threejs/postprocessing/LuminosityHighPassShader.js"],
                glitch_dependency   : ["/app/js/vendors/threejs/js/postprocessing/DigitalGlitch.js"]  
            };

            var scripts = 
            {
                msaa            : { url: "/app/js/vendors/wagner/ManualMSAARenderPass.js"},
                mask            : { url: "/app/js/vendors/threejs/postprocessing/MaskPass.js"},
                fxaa            : { url: "/app/js/vendors/threejs/postprocessing/FXAAShader.js"},
                bloom           : { url: "/app/js/vendors/threejs/postprocessing/UnrealBloomPass.js", dependency: "bloom_dependency" },
                vignette        : { url: "/app/js/vendors/threejs/postprocessing/VignetteShader.js"},
                colorCorrection : { url: "/app/js/vendors/threejs/postprocessing/ColorCorrectionShader.js"},
                hblur           : { url: "/app/js/vendors/threejs/postprocessing/HorizontalTiltShiftShader.js"},
                vblur           : { url: "/app/js/vendors/threejs/postprocessing/VerticalTiltShiftShader.js"},
                rgbShift        : { url: "/app/js/vendors/threejs/postprocessing/RGBShiftShader.js"},
                dotScreen       : { url: "/app/js/vendors/threejs/postprocessing/DotScreenShader.js"},
                sepia           : { url: "/app/js/vendors/threejs/postprocessing/SepiaShader.js"},
                bleach           : { url: "/app/js/vendors/threejs/postprocessing/BleachBypassShader.js"},
                glitch          : { url: "/app/js/vendors/threejs/postprocessing/GlitchPass.js", dependency: "glitch_dependency"},
            };

            passes.forEach(function(element){
                if ( scripts[element.type].dependency ) {
                    dependencies[scripts[element.type].dependency].forEach(function(el){
                        dependencyArr.push(el);
                    });
                }
                scriptArr.push(scripts[element.type].url);
            });
            dependencyArr.length > 0 && filesToLoad.push(dependencyArr);
            filesToLoad.push(scriptArr);
            
            var scriptLoader = new ScriptLoader();
            return new Promise(function(resolve, reject) {
                scriptLoader.load( data.cdn, filesToLoad ).then(function(){
                    console.log('PPscripts are loaded');
                    resolve();
                }).catch(function(){
                    console.log("Error");
                });
            }).then(function(){
                resolve();
            });
            
        });
    }

    function _createControllerSideBar(){
        var div = new UI.Panel().setId('sidebar');
        document.body.appendChild(div.dom);
    }

    function _createController(filterName, parameters, pass){

        var span = new UI.Panel().setClass('sidebar-row');
        
        var p = new UI.Text().setClass("effect-name").setValue(filterName);
        
        span.add(p);

        var spanCheckbox = new UI.Span().setClass('effect-enable');
        
        var checkbox = new UI.Checkbox().setValue(pass.enabled).setId(filterName).onClick(toggle);
        checkbox.dom.style.position = 'relative';
        checkbox.dom.style.float = 'left';
        checkbox.dom.name = "active";

        var label = document.createElement('label');
        label.htmlFor = filterName;
        label.appendChild(document.createTextNode('Enabled'));

        span.add(checkbox);
        span.dom.appendChild(label);

        spanCheckbox.add(checkbox);
        spanCheckbox.dom.appendChild(label);
        
        span.add(spanCheckbox);

        for (var i in parameters){
            
            var innerSpan = new UI.Span();
            innerSpan.dom.style.position = 'relative';
            innerSpan.dom.style.float = 'left';
            innerSpan.dom.style.width = '50%';
            innerSpan.dom.innerText = i;
            
            var input =  new UI.Number().setValue(parameters[i]).setWidth('30px').setMarginLeft('10px').setBorder('1px solid grey').setPadding('2px').onChange(update);

            innerSpan.add(input);
            span.add(innerSpan);

        }

        document.getElementById('sidebar').appendChild(span.dom);

        function update(event){
            var key = event.target.parentElement.innerText;
            if( pass.uniforms !== undefined ) {
                pass.uniforms[key].value =  this.value;
            } else if( pass[key] !== undefined ) {
                pass[key] =  this.value;
            } else {
                pass.copyUniforms[key].value =  this.value;
            }
        }

        function toggle(){
            pass.enabled = event.target.checked;
        }
    }

};

PostProcessingManager.prototype.update = function () {
    this.composer.render();
};
PostProcessingManager.prototype.setSize = function (width, height) {
    this.composer.setSize(width, height);
};
PostProcessingManager.prototype.updatePPConfig = function (configurations) {
    this.msaa.sampleLevel = configurations.sampleLevel;
    this.msaa.unbaised = configurations.unbaised;
};