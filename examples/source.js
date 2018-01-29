/* eslint googshift/valid-provide-and-module: 0 */

goog.provide('examples.source');

goog.require('ol.geom.Point');
goog.require('ol.Feature');
goog.require('ol.proj');
goog.require('ol.View');
goog.require('ol.control');
goog.require('ol.source.OSM');
goog.require('olcs.source.CompactClusterizer');
goog.require('ol.layer.Tile');
goog.require('ol.layer.Vector');
goog.require('ol.Map');

goog.require('olcs.contrib.Manager');
goog.require('olcs.source.StaticCluster');
const center = ol.proj.transform([6.56418, 46.51684], 'EPSG:4326', 'EPSG:3857');

const resolutions = [0, 1.2951225179231978, 7.567177306156176, 500];

// 5 at resolution 0, 40 at resolution 3000
const clusterDistanceFactors = [1 / 4, 2];

const createFeature = function(x, y) {
  return new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.transform([x, y], 'EPSG:4326', 'EPSG:3857'))
  });
};

const rawFeatures = [
  createFeature(6.56363, 46.51604),
  createFeature(6.56425, 46.51637),
  createFeature(6.56278, 46.51752)
];

const clusterizer = new olcs.source.CompactClusterizer(
    rawFeatures, resolutions, clusterDistanceFactors, 20);

const clusterizedFeatures = clusterizer.clusterize().exportClusterHierarchy();


const clusterSource = new olcs.source.StaticCluster({}, clusterizedFeatures);

const ol2d = new ol.Map({
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    }),
    new ol.layer.Vector({
      altitudeMode: 'clampToGround',
      source: clusterSource
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
    zoom: 14
  })
});


// eslint-disable-line no-unused-vars
window.manager = new olcs.contrib.Manager(window.CESIUM_URL, {map: ol2d});
clusterSource.changed();
