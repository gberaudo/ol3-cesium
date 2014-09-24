//Base on http://openlayers.org/en/v3.0.0/examples/wms-custom-proj.js

// By default OpenLayers does not know about the EPSG:21781 (Swiss) projection.
// So we create a projection instance for EPSG:21781 and pass it to
// ol.proj.addProjection to make it available to the library.

var projection = new ol.proj.Projection({
  code: 'EPSG:21781',
  // The extent is used to determine zoom level 0. Recommended values for a
  // projection's validity extent can be found at http://epsg.io/.
  extent: [485869.5728, 76443.1884, 837076.5648, 299941.7864],
  units: 'm'
});
ol.proj.addProjection(projection);

// We also declare EPSG:21781/EPSG:4326 transform functions. These functions
// are necessary for the ScaleLine control and when calling ol.proj.transform
// for setting the view's initial center (see below).

ol.proj.addCoordinateTransforms('EPSG:4326', projection,
    function(coordinate) {
      return [
        WGStoCHy(coordinate[1], coordinate[0]),
        WGStoCHx(coordinate[1], coordinate[0])
      ];
    },
    function(coordinate) {
      return [
        CHtoWGSlng(coordinate[0], coordinate[1]),
        CHtoWGSlat(coordinate[0], coordinate[1])
      ];
    });

var extent = [420000, 30000, 900000, 350000];
var layers = [
  new ol.layer.Tile({
    extent: extent,
    source: new ol.source.TileWMS({
      url: '//api3.geo.admin.ch/mapproxy/service',
      crossOrigin: 'anonymous',
      attributions: [new ol.Attribution({
        html: '&copy; Geoadmin'
      })],
      params: {
        'LAYERS': 'ch.swisstopo.swissimage',
        'FORMAT': 'image/jpeg'
      },
      serverType: 'mapserver'
    })
  }),
  new ol.layer.Tile({
    extent: extent,
    source: new ol.source.TileWMS({
      url: '//mf-chmobil2.dev.bgdi.ch/~ochriste/wms?mynocache',
      attributions: [new ol.Attribution({
        html: '&copy; Geoadmin'
      })],
      params: {
		  //'LAYERS': 'Wanderwegnetz,WanderlandEtappenRegional,WanderlandEtappenLokal,WanderlandEtappenNational'
		  //'LAYERS': 'WanderlandAll',
		  'LAYERS': 'WanderlandEtappenNational',
		  'FORMAT': 'image/png'
		},
      serverType: 'mapserver'
    })
  })
];

var dragAndDropInteraction = new ol.interaction.DragAndDrop({
  formatConstructors: [
    ol.format.GPX,
    ol.format.GeoJSON,
    ol.format.IGC,
    ol.format.KML,
    ol.format.TopoJSON
  ]
});


var map = new ol.Map({
  interactions: ol.interaction.defaults().extend([dragAndDropInteraction]),
  controls: ol.control.defaults({
    attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
      collapsible: false
    })
  }).extend([
    new ol.control.ScaleLine({
      units: 'metric'
    })
  ]),
  layers: layers,
  renderer: 'canvas',
  target: 'map2d',
  view: new ol.View({
    projection: projection,
    center: ol.proj.transform([8.23, 46.86], 'EPSG:4326', 'EPSG:21781'),
    extent: extent,
    zoom: 2
  })
});

dragAndDropInteraction.on('addfeatures', function(event) {
  var vectorSource = new ol.source.Vector({
    features: event.features,
    projection: event.projection
  });
  map.getLayers().push(new ol.layer.Vector({
    source: vectorSource,
    style: styleFunction
  }));
  var view = map.getView();
  view.fitExtent(
      vectorSource.getExtent(), /** @type {ol.Size} */ (map.getSize()));
});


/*
 * Swiss projection transform functions downloaded from
 * http://www.swisstopo.admin.ch/internet/swisstopo/en/home/products/software/products/skripts.html
 */

// Convert WGS lat/long (° dec) to CH y
function WGStoCHy(lat, lng) {

  // Converts degrees dec to sex
  lat = DECtoSEX(lat);
  lng = DECtoSEX(lng);

  // Converts degrees to seconds (sex)
  lat = DEGtoSEC(lat);
  lng = DEGtoSEC(lng);

  // Axiliary values (% Bern)
  var lat_aux = (lat - 169028.66) / 10000;
  var lng_aux = (lng - 26782.5) / 10000;

  // Process Y
  var y = 600072.37 +
      211455.93 * lng_aux -
      10938.51 * lng_aux * lat_aux -
      0.36 * lng_aux * Math.pow(lat_aux, 2) -
      44.54 * Math.pow(lng_aux, 3);

  return y;
}

// Convert WGS lat/long (° dec) to CH x
function WGStoCHx(lat, lng) {

  // Converts degrees dec to sex
  lat = DECtoSEX(lat);
  lng = DECtoSEX(lng);

  // Converts degrees to seconds (sex)
  lat = DEGtoSEC(lat);
  lng = DEGtoSEC(lng);

  // Axiliary values (% Bern)
  var lat_aux = (lat - 169028.66) / 10000;
  var lng_aux = (lng - 26782.5) / 10000;

  // Process X
  var x = 200147.07 +
      308807.95 * lat_aux +
      3745.25 * Math.pow(lng_aux, 2) +
      76.63 * Math.pow(lat_aux, 2) -
      194.56 * Math.pow(lng_aux, 2) * lat_aux +
      119.79 * Math.pow(lat_aux, 3);

  return x;

}


// Convert CH y/x to WGS lat
function CHtoWGSlat(y, x) {

  // Converts militar to civil and  to unit = 1000km
  // Axiliary values (% Bern)
  var y_aux = (y - 600000) / 1000000;
  var x_aux = (x - 200000) / 1000000;

  // Process lat
  var lat = 16.9023892 +
      3.238272 * x_aux -
      0.270978 * Math.pow(y_aux, 2) -
      0.002528 * Math.pow(x_aux, 2) -
      0.0447 * Math.pow(y_aux, 2) * x_aux -
      0.0140 * Math.pow(x_aux, 3);

  // Unit 10000" to 1 " and converts seconds to degrees (dec)
  lat = lat * 100 / 36;

  return lat;

}

// Convert CH y/x to WGS long
function CHtoWGSlng(y, x) {

  // Converts militar to civil and  to unit = 1000km
  // Axiliary values (% Bern)
  var y_aux = (y - 600000) / 1000000;
  var x_aux = (x - 200000) / 1000000;

  // Process long
  var lng = 2.6779094 +
      4.728982 * y_aux +
      0.791484 * y_aux * x_aux +
      0.1306 * y_aux * Math.pow(x_aux, 2) -
      0.0436 * Math.pow(y_aux, 3);

  // Unit 10000" to 1 " and converts seconds to degrees (dec)
  lng = lng * 100 / 36;

  return lng;

}


// Convert SEX DMS angle to DEC
function SEXtoDEC(angle) {

  // Extract DMS
  var deg = parseInt(angle, 10);
  var min = parseInt((angle - deg) * 100, 10);
  var sec = (((angle - deg) * 100) - min) * 100;

  // Result in degrees sex (dd.mmss)
  return deg + (sec / 60 + min) / 60;

}

// Convert DEC angle to SEX DMS
function DECtoSEX(angle) {

  // Extract DMS
  var deg = parseInt(angle, 10);
  var min = parseInt((angle - deg) * 60, 10);
  var sec = (((angle - deg) * 60) - min) * 60;

  // Result in degrees sex (dd.mmss)
  return deg + min / 100 + sec / 10000;

}

// Convert Degrees angle to seconds
function DEGtoSEC(angle) {

  // Extract DMS
  var deg = parseInt(angle, 10);
  var min = parseInt((angle - deg) * 100, 10);
  var sec = (((angle - deg) * 100) - min) * 100;

  // Avoid rounding problems with seconds=0
  var parts = String(angle).split('.');
  if (parts.length == 2 && parts[1].length == 2) {
    min = Number(parts[1]);
    sec = 0;
  }

  // Result in degrees sex (dd.mmss)
  return sec + min * 60 + deg * 3600;

}



var rectangle = Cesium.Rectangle.fromDegrees.apply(this,
  ol.proj.transform(extent, 'EPSG:21781', 'EPSG:4326')
);

var terrainProvider = new Cesium.CesiumTerrainProvider({
  url: '//ec2-54-220-242-89.eu-west-1.compute.amazonaws.com/stk-terrain/tilesets/swisseudem/tiles',
  credit: 'Swisstopo terrain'
});


var csWMSBase = new Cesium.WebMapServiceImageryProvider({
  url: '//api3.geo.admin.ch/mapproxy/service',
  layers: 'ch.swisstopo.swissimage',
  rectangle: rectangle,
  credit: 'GeoAdmin Swissimage'
});

var csWMSOverlay = new Cesium.WebMapServiceImageryProvider({
  url: '//mf-chmobil2.dev.bgdi.ch/~ochriste/wms?mynocache',
  layers: 'WanderlandEtappenNational',
  rectangle: rectangle,
  parameters: {
	 format: 'image/png'
  },
  credit: 'Schweizmobil Wanderland'
});

var viewer = new Cesium.CesiumWidget('map3d', {
  scene3DOnly: true,
  imageryProvider: csWMSBase,
  //imageryProvider: csWMSOverlay,
 // terrainProvider: terrainProvider
  // Use https://addons.mozilla.org/en-US/firefox/addon/referrer-control/
});


var scene = viewer.scene;
scene.imageryLayers.addImageryProvider(csWMSOverlay);
scene.terrainProvider = terrainProvider;
scene.globe.depthTestAgainstTerrain = true;

var position = map.getView().getCenter();
position = ol.proj.transform(position, 'EPSG:21781', 'EPSG:4326');
position.push(4000);

var camera = scene.camera;
camera.frustum.fov = Cesium.Math.toRadians(20);
camera.flyTo({
  'destination': Cesium.Cartesian3.fromDegrees.apply(this, position),
  'duration': 0
});
camera.lookUp(0.9);


function pickBottom(id) {
  var element = document.getElementById(id);
  var point = olcs.core.pickBottomPoint(scene);
  var carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(point);
  carto.longitude *= 180 / Math.PI;
  carto.latitude *= 180 / Math.PI;
  element.innerHTML = carto;
}
