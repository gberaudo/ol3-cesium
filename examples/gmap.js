//Base on http://openlayers.org/en/v3.0.0/examples/wms-custom-proj.js


var layerName = 'Wanderwegnetz,WanderlandEtappenRegional,WanderlandEtappenLokal';
var layerNamePOI = 'Train,Bus,Hotel';
//var layerName = 'Wanderwegnetz,WanderlandEtappenRegional,WanderlandEtappenLokal,WanderlandEtappenNational';
//var layerNamePOI = 'Train,Bus,Trambus,Boat,Cableway,Funicular,Hotel,Bedbreakfast,Youthhostel,Backpacker,Groupaccom,Sleepingstraw,Farmaccom,Vacationapptmt,Campingsite,Mountainhut,Sightseeing,Taxi,Rufbus,Seilbahn,Place,Velorental,Ebike,Cycleservice,Canoeclub,Shopping';
var useCustomSynchronizer = false;
var displayOverlay = true;

var extent = [420000, 30000, 900000, 350000];
var grid = new ol.tilegrid.TileGrid({
    resolutions: [4000,3750,3500,3250,3000,2750,2500,2250,2000,1750,1500,1250,1000,750,650,500,250,100,50,20,10,5,2.5,2,1.5,1],
    tileSize: 256,
    origin: [420000, 30000]
});
var olOverlayWander = new ol.layer.Tile({
    extent: extent,
    source: new ol.source.TileWMS({
      url: '//mf-chmobil2.dev.bgdi.ch/~fredj/mapproxy/service/',
      tileGrid: grid,
      attributions: [new ol.Attribution({
        html: '&copy; Geoadmin'
      })],
      params: {
       'LAYERS': layerName,
       'FORMAT': 'image/png'
    },
      serverType: 'mapserver'
    })
  });

var olPOIOverlay = new ol.layer.Tile({
    extent: extent,
    source: new ol.source.TileWMS({
      tileGrid: grid,
      url: '//mf-chmobil2.dev.bgdi.ch/~fredj/mapproxy/service/',
      attributions: [new ol.Attribution({
        html: '&copy; Geoadmin'
      })],
      params: {
       'LAYERS': layerNamePOI,
       'FORMAT': 'image/png'
    },
      serverType: 'mapserver'
    })
  });

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
  })
];

if (displayOverlay) {
  layers.push(olOverlayWander);
//  layers.push(olPOIOverlay);
}



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
    image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({color: 'red'}),
        stroke: new ol.style.Stroke({color: 'blue', width: 1})
    }),
    stroke: new ol.style.Stroke({
      color: 'yellow',
      width: 4

    })
  })],
  'MultiLineString': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'green',
      width: 1
    })
  })],
  'MultiPoint': [new ol.style.Style({
    image: image,
    text: new ol.style.Text({
      text: 'MP',
      stroke: new ol.style.Stroke({
        color: 'purple'
      })
    })
  })],
  'MultiPolygon': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'yellow',
      width: 1
    }),
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 0, 0.1)'
    })
  })],
  'Polygon': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'blue',
      lineDash: [4],
      width: 3
    }),
    fill: new ol.style.Fill({
      color: 'rgba(0, 0, 255, 0.1)'
    })
  })],
  'GeometryCollection': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'magenta',
      width: 2
    }),
    fill: new ol.style.Fill({
      color: 'magenta'
    }),
    image: new ol.style.Circle({
      radius: 10, // pixels
      fill: null,
      stroke: new ol.style.Stroke({
        color: 'magenta'
      })
    })
  })],
  'Circle': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'red',
      width: 2
    }),
    fill: new ol.style.Fill({
      color: 'rgba(255,0,0,0.2)'
    })
  })]
};


var styleFunction = function(feature, resolution) {
    return styles[feature.getGeometry().getType()];
};


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
    center: ol.proj.transform([8.234, 46.86], 'EPSG:4326', 'EPSG:21781'),
    extent: extent,
    zoom: 8
  })
});

dragAndDropInteraction.on('addfeatures', function(event) {
  var vectorSource = new ol.source.Vector({
    features: event.features,
    projection: event.projection
  });
  fixTrackInsideTerrain(vectorSource.getFeatures());
  map.getLayers().push(new ol.layer.Vector({
    source: vectorSource,
    style: styleFunction
  }));
  var view = map.getView();
  view.fitExtent(
      vectorSource.getExtent(), /** @type {ol.Size} */ (map.getSize()));
});



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
  url: '//mf-chmobil2.dev.bgdi.ch/~fredj/mapproxy/service/',
  layers: layerName,
  rectangle: rectangle,
  minimumRetrievingLevel: 13,
  parameters: {
    format: 'image/png'
  },
  credit: 'Schweizmobil Wanderland'
});

var csWMSPOIOverlay = new Cesium.WebMapServiceImageryProvider({
  url: '//mf-chmobil2.dev.bgdi.ch/~fredj/mapproxy/service/',
  layers: layerNamePOI,
  rectangle: rectangle,
  minimumRetrievingLevel: 13,
  parameters: {
    format: 'image/png'
  },
  credit: 'Schweizmobil Wanderland'
});


if (useCustomSynchronizer) {
  var viewer = new Cesium.CesiumWidget('map3d', {
    scene3DOnly: true,
    imageryProvider: csWMSBase
  });
  var scene = viewer.scene;
  var vectorSynchronizer = new olcs.VectorSynchronizer(map, scene);
  vectorSynchronizer.synchronize();
} else {
  var map3d; // = 'map3d';
  var ol3d = new olcs.OLCesium({
    map: map,
    target: map3d
  });
  var scene = ol3d.getCesiumScene();
  scene.imageryLayers.removeAll();
  scene.imageryLayers.addImageryProvider(csWMSBase);
}

if (displayOverlay) {
  scene.imageryLayers.addImageryProvider(csWMSOverlay);
//  scene.imageryLayers.addImageryProvider(csWMSPOIOverlay);
}
//scene.terrainProvider = terrainProvider;
scene.globe.depthTestAgainstTerrain = true;
scene.screenSpaceCameraController.minimumZoomDistance = 50;

var camera = scene.camera;


function pickBottom(id) {
  var point = olcs.core.pickBottomPoint(scene);
  var carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(point);
  carto.longitude *= 180 / Math.PI;
  carto.latitude *= 180 / Math.PI;
  document.getElementById(id).innerHTML = carto;
}

function zenitalAngle(id) {
  var point = olcs.core.pickBottomPoint(scene);
  var angle = olcs.core.computeAngleToZenith(scene, point);
  angle *= 180 / Math.PI;
  document.getElementById(id).innerHTML = angle;
}

function center() {
  var position = map.getView().getCenter();
  position = ol.proj.transform(position, 'EPSG:21781', 'EPSG:4326');
  position[2] = 3000;
  camera.flyTo({
    'destination': Cesium.Cartesian3.fromDegrees.apply(this, position),
    'duration': 0
  });
}

function loadGpx(name) {
  var source = new ol.source.GPX({
    projection: projection,
    url: 'data/' + name + '.gpx'
  });
  var vector = new ol.layer.Vector({
    source: source,
    style: styleFunction
  });
  map.getLayers().push(vector);
  var key = source.on('change', function() {
    if (!source.getState() == 'ready') return;
    source.unByKey(key);
    fixTrackInsideTerrain(source.getFeatures());
    map.getView().fitExtent(source.getExtent(), map.getSize());
  });
}

/**
 * @param {!ol.Collection.<!ol.Feature>} features
 */
function fixTrackInsideTerrain(features) {
  var geometry = features[0].getGeometry();
  olcs.core.applyHeightOffsetToGeometry(geometry, 51);
}

var toggleOngoing = false;
function toggle2D3D(ol3d) {
  var scene = ol3d.getCesiumScene();
  var terrainProvider = scene.terrainProvider;
  var camera = scene.camera;

  if (toggleOngoing) return;
  if (!ol3d.getEnabled()) {
    ol3d.setEnabled(true);
  }

  toggleOngoing = true;
  var pivot = olcs.core.pickBottomPoint(scene);
  // FIXME handle undefined case
  var angleToZenith = olcs.core.computeAngleToZenith(scene, pivot);

  var epsilon = Cesium.Math.toRadians(5);
  var middleAngle = Cesium.Math.toRadians(30);
  var bottomAngle = Cesium.Math.toRadians(80);
  var tiltOnGlobe = olcs.core.computeSignedTiltAngleOnGlobe(scene);

  var cb = function() {toggleOngoing = false;};

  var angle;
  if (typeof tiltOnGlobe === undefined) {
    // When direction points the sky, going back to zenith.
    pointNorth(ol3d);
    cb = function() {toggleOngoing = false; ol3d.setEnabled(false);};
  } else if (epsilon - tiltOnGlobe < middleAngle) {
    angle = middleAngle + angleToZenith;
  } else if (epsilon - tiltOnGlobe < bottomAngle) {
    angle = bottomAngle + angleToZenith;
  } else {
    pointNorth(ol3d);
    cb = function() {toggleOngoing = false; ol3d.setEnabled(false);};
    angle = angleToZenith;
  }

  /** @type {olcs.core.RotateAroundAxisOption} */
  var options = {
    callback: cb
  };
  var transform = Cesium.Matrix4.fromTranslation(pivot);
  var axis = camera.right;
  var rotateAroundAxis = olcs.core.rotateAroundAxis;
  rotateAroundAxis(camera, -angle, axis, transform, options);
}

function printCartesian(msg, point) {
  var carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(point);
  carto.longitude *= 180 / Math.PI;
  carto.latitude *= 180 / Math.PI;
  console.log(msg, carto);
}

function testRotation() {
  //var pivot = olcs.core.pickCenterPoint(scene);
  var pivot = olcs.core.pickBottomPoint(scene);
  printCartesian('rot test', pivot);

  var transform = Cesium.Matrix4.fromTranslation(pivot);
  var oldTransform = new Cesium.Matrix4();
  Cesium.Matrix4.clone(camera.transform, oldTransform);
  camera.setTransform(transform);
  scene.camera.rotate(camera.right, - 5 * Math.PI / 180);
  camera.setTransform(oldTransform);
}

function pointNorth(ol3d) {
  var map = ol3d.getOlMap();
  var scene = ol3d.getCesiumScene();
  var heading = map.getView().getRotation();
  var bottomCenter = olcs.core.pickBottomPoint(scene);
  if (bottomCenter) {
    olcs.core.setHeadingUsingBottomCenter(scene, heading, bottomCenter);
  }
}



// Add some POIs

var center = map.getView().getCenter();
var iconFeature = new ol.Feature({
  geometry: new ol.geom.Point([center[0], center[1], 606.0522788084497])
});

var iconStyle = new ol.style.Style({
  image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
    anchor: [0.5, 46],
    anchorXUnits: 'fraction',
    anchorYUnits: 'pixels',
    opacity: 0.75,
    src: 'data/bus3d_highlighted.png'
  }))
});

iconFeature.setStyle(iconStyle);

var p2 = [
  0.14379175422256824 * 180 / Math.PI,
  0.817949279916317 * 180 / Math.PI];
// transform can not handle 3D coordinates
p2 = ol.proj.transform(p2, 'EPSG:4326', 'EPSG:21781');
p2.push(561.5240360142113);
var iconFeature2 = new ol.Feature({
  geometry: new ol.geom.Point(p2)
});
iconFeature2.setStyle(iconStyle);

var vectorSource2 = new ol.source.Vector({
  features: [iconFeature, iconFeature2]
});
var vectorLayer2 = new ol.layer.Vector({
  source: vectorSource2
});
map.getLayers().push(vectorLayer2);


function viewOlExtent() {
  var extent = ol.proj.transform(map.getView().calculateExtent(
       map.getSize()),
      'EPSG:21781',
      'EPSG:4326');
  cext = Cesium.Rectangle.fromDegrees.apply(null, extent);
  ol3d.scene_.camera.viewRectangle(cext);
};

setTimeout(function() { ol3d.warmUp(75000, 5000); }, 2500);
camera.constrainedAxisAngle = 3 * Math.PI / 8;

map.on('click', function(evt) {
  var pixel = new Cesium.Cartesian2(evt.pixel[0], evt.pixel[1]);
  var target = olcs.core.pickOnTerrainOrEllipsoid(scene, pixel);
  if (!target) return;
  var csExtent = olcs.core.computeBoundingBoxAtTarget(scene, target, 20);
  var olExtent = csExtent.map(function(carto) {
    var coo = [
      Cesium.Math.toDegrees(carto.longitude),
      Cesium.Math.toDegrees(carto.latitude)];
    return ol.proj.transform(coo, 'EPSG:4326', 'EPSG:21781');
  });

  console.log('Boxes:', target, 'cs', csExtent.toString(), 'ol', olExtent.toString());
});


var busSource = new ol.source.GeoJSON({
    url: '../ol3/examples/data/dump_geojson_bus_fragments.json',
    projection: 'EPSG:21781'
});

var clusterSource = new ol.source.StaticCluster({
    distance: 40,
    source: busSource
});

var styleCache = {};
var clusters = new ol.layer.Vector({
  source: clusterSource,
  style: function(feature, resolution) {
    var size = feature.get('features').length;
    var style = styleCache[size];
    if (!style) {
      style = [new ol.style.Style({
        image: new ol.style.Circle({
          radius: 10,
          stroke: new ol.style.Stroke({
            color: '#fff'
          }),
          fill: new ol.style.Fill({
            color: '#3399CC'
          })
        }),
        text: new ol.style.Text({
          text: size.toString(),
          fill: new ol.style.Fill({
            color: '#fff'
          })
        })
      })];
      styleCache[size] = style;
    }
    return style;
  }
});

map.addLayer(clusters);
