var raster = new ol.layer.Tile({
  source: new ol.source.MapQuest({layer: 'sat'})
});

var vector = new ol.layer.Vector({
  source: new ol.source.GeoJSON({
    projection: 'EPSG:3857',
    url: 'data/geojson/countries.geojson'
  })
});

var key = vector.getSource().on('addfeature', function(event) {
  var source = vector.getSource();
  event.feature.getGeometry()['height'] =  700000;
});

vector.on('change', function() {
  console.log('Vector change');
});

var map = new ol.Map({
  layers: [raster, vector],
  target: 'map2d',
  view: new ol.View({
    center: [0, 0],
    zoom: 2
  })
});


var ol3d = new olcs.OLCesium({map: map, target: 'map3d'});
var scene = ol3d.getCesiumScene();
ol3d.setEnabled(true);



var selectionStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: [255, 255, 255, 0.6]
  }),
  stroke: new ol.style.Stroke({
    color: [0, 153, 255, 1],
    width: 3
  })
});

var selectedFeature;
map.on('click', function(e) {
  if (selectedFeature) {
    selectedFeature.setStyle(null);
  }
  selectedFeature = map.forEachFeatureAtPixel(
      e.pixel,
      function(feature, layer) {
        return feature;
      });
  if (selectedFeature) {
    selectedFeature.setStyle(selectionStyle);
  }
});

