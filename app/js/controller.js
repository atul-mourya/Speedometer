function isMobile() {
    return window.innerWidth <= 768 && window.innerHeight <= 600;
}
function getContextPath() {
    return window.context || "" === window.context ? window.context : window.location.pathname.substring(0, window.location.pathname.indexOf("/", 2));
}

var baseUrl = null;
window.location.origin || (window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ":" + window.location.port : "")),
baseUrl = window.location.origin + getContextPath();

var speedometerObject = {
    settings:{
        container: document.getElementById('container')
    }
};

speedometerObject.loadSpeedometer = function() {
    var a = new LoadingManager();
    a.onLoad = function() {
        //onLoad
    };

    a.onProgress = function(a, t, r) {
        //onProgress};
    }
    
    // var t = baseUrl + "/resources/models/model_lookups.json";
    var r = new Speedometer({
        url: null,
        container: speedometerObject.settings.container,
        cdn: baseUrl
    },a);
    r.initSceneSetup(),
    speedometerObject.visualizer = r;
};

speedometerObject.loadSpeedometer();


    
