/* eslint googshift/valid-provide-and-module: 0 */

goog.provide('examples.source');

goog.require('ol.geom.Point');
goog.require('ol.Feature');
goog.require('ol.proj');
goog.require('ol.View');
goog.require('ol.control');
goog.require('ol.source.OSM');
goog.require('ol.source.Vector');
goog.require('ol.layer.Tile');
goog.require('ol.layer.Vector');
goog.require('ol.Map');

goog.require('olcs.contrib.Manager');
goog.require('olcs.source.Cluster');

const center = ol.proj.transform([25, 20], 'EPSG:4326', 'EPSG:3857');

var projection = ol.proj.get('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = ol.extent.getWidth(projectionExtent) / 256;
var resolutions = new Array(14);
for (var z = 0; z < 14; ++z) {
  // generate resolutions and matrixIds arrays for this WMTS
  resolutions[z] = size / Math.pow(2, z);
}

// 5 at resolution 0, 40 at resolution 3000
var clusterDistanceFactors = [1 / 4, 2];

const createFeature = function(dx, dy) {
  return new ol.Feature({
    geometry: new ol.geom.Point([center[0] + dx, center[1] + dy])
  })
};

const clusterSource = new ol.source.Vector({
    features: [
			createFeature(0, 0),
			createFeature(0, 100),
			createFeature(0, 1000),
			createFeature(0, 10000),
    ]
  });
const cluster = new olcs.source.Cluster({
  source: clusterSource
}, resolutions, clusterDistanceFactors);

const ol2d = new ol.Map({
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    }),
    new ol.layer.Vector({
      source: cluster
    })
  ],
  controls: ol.control.defaults({
    attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
      collapsible: false
    })
  }),
  target: 'map',
  view: new ol.View({
    center,
    zoom: 3
  })
});


// eslint-disable-line no-unused-vars
window.manager = new olcs.contrib.Manager(window.CESIUM_URL, {map: ol2d});
clusterSource.changed();
