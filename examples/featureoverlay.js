
var image = new ol.style.Circle({
  radius: 5,
  fill: null,
  stroke: new ol.style.Stroke({color: 'red', width: 1})
});

var styles = {
  'Point': [new ol.style.Style({
    image: image
  })],
  'LineString': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'green',
      lineDash: [4],
      width: 1
    })
  })],
  'MultiLineString': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'green',
      width: 1
    })
  })]
};

var styleFunction = function(feature, resolution) {
  var geo = feature.getGeometry();
  // always assign a style to prevent feature skipping
  return geo ? styles[geo.getType()] : styles['Point'];
};

var vectorSource = new ol.source.GeoJSON(
    /** @type {olx.source.GeoJSONOptions} */ ({
      object: {
        'type': 'FeatureCollection',
        'crs': {
          'type': 'name',
          'properties': {
            'name': 'EPSG:3857'
          }
        },
        'features': [
          {
            'type': 'Feature',
            'geometry': {
              'type': 'Point',
              'coordinates': [0, 0, 1e5]
            }
          },
          {
            'type': 'Feature',
            'geometry': {
              'type': 'LineString',
              'coordinates': [
                [1e5, 1e5, 1],
                [2e5, 2e5, 100000],
                [3e5, 3e5, 1000],
                [4e5, 4e5, 100000],
                [5e5, 5e5, 100],
                [6e5, 6e5, 100000],
                [7e5, 7e5, 1]
              ]
            }
          },
          {
            'type': 'Feature',
            'geometry': {
              'type': 'MultiLineString',
              'coordinates': [
                [[-1e6, -7.5e5], [-1e6, 7.5e5]],
                [[1e6, -7.5e5], [1e6, 7.5e5]],
                [[-7.5e5, -1e6], [7.5e5, -1e6]],
                [[-7.5e5, 1e6], [7.5e5, 1e6]]
              ]
            }
          }
        ]
      }
    }));


var map = new ol.Map({
  layers: [
    new ol.layer.Tile({
      source: new ol.source.BingMaps({
        key: 'Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3',
        imagerySet: 'Aerial'
      })
    })
  ],
  target: 'map2d',
  controls: ol.control.defaults({
    attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
      collapsible: false
    })
  }),
  view: new ol.View({
    center: [0, 0],
    zoom: 2
  })
});


var featureoverlay = new ol.FeatureOverlay({
  features: vectorSource.getFeatures(),
  style: styleFunction,
  map: map
});



var ol3d = new olcs.OLCesium({map: map, target: 'map3d'});
var scene = ol3d.getCesiumScene();
var terrainProvider = new Cesium.CesiumTerrainProvider({
  url: '//cesiumjs.org/stk-terrain/tilesets/world/tiles'
});
scene.terrainProvider = terrainProvider;
ol3d.setEnabled(true);


(function(scene, featureoverlay) {
  var primitives = new Cesium.PrimitiveCollection();
  var billboards = new Cesium.BillboardCollection();
  primitives.add(billboards);
  scene.primitives.add(primitives);

  var context = {
    projection: vectorSource.getProjection() || map.getView().getProjection(),
    billboards: billboards,
    featureToCesiumMap: {},
    primitives: primitives
  };
  
  var featurePrimitiveMap = {};

  function addFeature(feature) {
    console.log('feature added', feature);
    var resolution = 0;
    var style = olcs.core.computePlainStyle(feature, styleFunction, resolution);
    var csPrim = olcs.core.olFeatureToCesium(feature, style, context);
    if (csPrim) {
      var id = goog.getUid(feature);
      featurePrimitiveMap[id] = csPrim;
      primitives.add(csPrim);
    }
  } 

  featureoverlay.getFeatures().on('add', function(evt) {
    var feature = evt.element;
    addFeature(feature);
  });
 
  featureoverlay.getFeatures().on('remove', function(evt) {
    var feature = evt.element;
    var geometry = feature.getGeometry();
    var id = goog.getUid(feature);
    var csPrim = featurePrimitiveMap[id];
    if (geometry && geometry.getType() == 'Point') {
      var bbs = context.billboards;
      var bb = context.featureToCesiumMap[id];
      delete context.featureToCesiumMap[id];
      if (bb) {
        goog.asserts.assertInstanceof(bb, Cesium.Billboard);
        bbs.remove(bb);
      }
    }

    if (csPrim) {
      delete featurePrimitiveMap[id];
      primitives.remove(csPrim);
    }
  });

   featureoverlay.getFeatures().forEach(function(feature) {
    addFeature(feature);
  });
})(scene, featureoverlay);

//featureoverlay.getFeatures().extend(vectorSource.getFeatures());

var featurePointer = vectorSource.getFeatures().length -1;
function addFeature() {
  var features = vectorSource.getFeatures();
  if (featurePointer < features.length -1) {
    featureoverlay.getFeatures().push(features[++featurePointer]);
  }
}

function removeFeature() {
  var features = vectorSource.getFeatures();
  if (featurePointer >= 0) {
    featureoverlay.getFeatures().pop();
    --featurePointer;
  }
}
