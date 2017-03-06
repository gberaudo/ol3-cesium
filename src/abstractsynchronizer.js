goog.module('olcs.AbstractSynchronizer');

goog.require('goog.asserts');

goog.require('ol');
goog.require('ol.Observable');
goog.require('ol.events');
goog.require('ol.layer.Group');



/**
 * @param {!ol.Map} map
 * @param {!Cesium.Scene} scene
 * @constructor
 * @template T
 * @struct
 * @abstract
 * @api
 */
exports = function(map, scene) {
  /**
   * @type {!ol.Map}
   * @protected
   */
  this.map = map;

  /**
   * @type {ol.View}
   * @protected
   */
  this.view = map.getView();

  /**
   * @type {!Cesium.Scene}
   * @protected
   */
  this.scene = scene;

  /**
   * @type {ol.Collection.<ol.layer.Base>}
   * @protected
   */
  this.olLayers = map.getLayerGroup().getLayers();

  /**
   * @type {ol.layer.Group}
   */
  this.mapLayerGroup = map.getLayerGroup();

  /**
   * Map of OpenLayers layer ids (from ol.getUid) to the Cesium ImageryLayers.
   * Null value means, that we are unable to create equivalent layers.
   * @type {Object.<string, ?Array.<T>>}
   * @protected
   */
  this.layerMap = {};

  /**
   * Map of listen keys for OpenLayers layer layers ids (from ol.getUid).
   * @type {!Object.<string, ol.EventsKey>}
   * @private
   */
  this.olLayerListenKeys_ = {};

  /**
   * Map of listen keys for OpenLayers layer groups ids (from ol.getUid).
   * @type {!Object.<string, !Array.<ol.EventsKey>>}
   * @private
   */
  this.olGroupListenKeys_ = {};
};


/**
 * Destroy all and perform complete synchronization of the layers.
 * @api
 */
exports.prototype.synchronize = function() {
  this.destroyAll();
  this.addLayers_(this.mapLayerGroup);
};


/**
 * Order counterparts using the same algorithm as the Openlayers renderer:
 * z-index then original sequence order.
 * @protected
 */
exports.prototype.orderLayers = function() {
  // Ordering logics is handled in subclasses.
};


/**
 * Add a layer hierarchy.
 * @param {ol.layer.Base} root
 * @private
 */
exports.prototype.addLayers_ = function(root) {
  /** @type {Array.<!ol.layer.Base>} */
  const fifo = [root];
  while (fifo.length > 0) {
    const olLayer = fifo.splice(0, 1)[0];
    const olLayerId = ol.getUid(olLayer).toString();
    goog.asserts.assert(!this.layerMap[olLayerId]);

    let cesiumObjects = null;
    if (olLayer instanceof ol.layer.Group) {
      this.listenForGroupChanges_(olLayer);
      cesiumObjects = this.createSingleLayerCounterparts(olLayer);
      if (!cesiumObjects) {
        olLayer.getLayers().forEach((l) => {
          if (l) {
            fifo.push(l);
          }
        });
      }
    } else {
      cesiumObjects = this.createSingleLayerCounterparts(olLayer);
    }

    // add Cesium layers
    if (cesiumObjects) {
      this.layerMap[olLayerId] = cesiumObjects;
      this.olLayerListenKeys_[olLayerId] = ol.events.listen(olLayer,
          'change:zIndex', this.orderLayers, this);
      cesiumObjects.forEach(function(cesiumObject) {
        this.addCesiumObject(cesiumObject);
      }, this);
    }
  }

  this.orderLayers();
};


/**
 * Remove and destroy a single layer.
 * @param {ol.layer.Layer} layer
 * @return {boolean} counterpart destroyed
 * @private
 */
exports.prototype.removeAndDestroySingleLayer_ = function(layer) {
  const uid = ol.getUid(layer).toString();
  const counterparts = this.layerMap[uid];
  if (!!counterparts) {
    counterparts.forEach(function(counterpart) {
      this.removeSingleCesiumObject(counterpart, false);
      this.destroyCesiumObject(counterpart);
    }, this);
    ol.Observable.unByKey(this.olLayerListenKeys_[uid]);
    delete this.olLayerListenKeys_[uid];
  }
  delete this.layerMap[uid];
  return !!counterparts;
};


/**
 * Unlisten a single layer group.
 * @param {ol.layer.Group} group
 * @private
 */
exports.prototype.unlistenSingleGroup_ = function(group) {
  if (group === this.mapLayerGroup) {
    return;
  }
  const uid = ol.getUid(group).toString();
  const keys = this.olGroupListenKeys_[uid];
  keys.forEach((key) => {
    ol.Observable.unByKey(key);
  });
  delete this.olGroupListenKeys_[uid];
  delete this.layerMap[uid];
};


/**
 * Remove layer hierarchy.
 * @param {ol.layer.Base} root
 * @private
 */
exports.prototype.removeLayer_ = function(root) {
  if (!!root) {
    const fifo = [root];
    while (fifo.length > 0) {
      const olLayer = fifo.splice(0, 1)[0];
      const done = this.removeAndDestroySingleLayer_(olLayer);
      if (olLayer instanceof ol.layer.Group) {
        this.unlistenSingleGroup_(olLayer);
        if (!done) {
          // No counterpart for the group itself so removing
          // each of the child layers.
          olLayer.getLayers().forEach((l) => {
            fifo.push(l);
          });
        }
      }
    }
  }
};


/**
 * Register listeners for single layer group change.
 * @param {ol.layer.Group} group
 * @private
 */
exports.prototype.listenForGroupChanges_ = function(group) {
  const uuid = ol.getUid(group).toString();

  goog.asserts.assert(this.olGroupListenKeys_[uuid] === undefined);

  const listenKeyArray = [];
  this.olGroupListenKeys_[uuid] = listenKeyArray;

  // only the keys that need to be relistened when collection changes
  let contentKeys = [];
  const listenAddRemove = (function() {
    const collection = group.getLayers();
    if (collection) {
      contentKeys = [
        collection.on('add', function(event) {
          this.addLayers_(event.element);
        }, this),
        collection.on('remove', function(event) {
          this.removeLayer_(event.element);
        }, this)
      ];
      listenKeyArray.push(...contentKeys);
    }
  }).bind(this);

  listenAddRemove();

  listenKeyArray.push(group.on('change:layers', (e) => {
    contentKeys.forEach((el) => {
      const i = listenKeyArray.indexOf(el);
      if (i >= 0) {
        listenKeyArray.splice(i, 1);
      }
      ol.Observable.unByKey(el);
    });
    listenAddRemove();
  }));
};


/**
 * Destroys all the created Cesium objects.
 * @protected
 */
exports.prototype.destroyAll = function() {
  this.removeAllCesiumObjects(true); // destroy
  let objKey;
  for (objKey in this.olGroupListenKeys_) {
    const keys = this.olGroupListenKeys_[objKey];
    keys.forEach(ol.Observable.unByKey);
  }
  for (objKey in this.olLayerListenKeys_) {
    const key = this.olLayerListenKeys_[objKey];
    ol.Observable.unByKey(key);
  }
  this.olGroupListenKeys_ = {};
  this.olLayerListenKeys_ = {};
  this.layerMap = {};
};


/**
 * Adds a single Cesium object to the collection.
 * @param {!T} object
 * @abstract
 * @protected
 */
exports.prototype.addCesiumObject = function(object) {};


/**
 * @param {!T} object
 * @abstract
 * @protected
 */
exports.prototype.destroyCesiumObject = function(object) {};


/**
 * Remove single Cesium object from the collection.
 * @param {!T} object
 * @param {boolean} destroy
 * @abstract
 * @protected
 */
exports.prototype.removeSingleCesiumObject = function(object, destroy) {};


/**
 * Remove all Cesium objects from the collection.
 * @param {boolean} destroy
 * @abstract
 * @protected
 */
exports.prototype.removeAllCesiumObjects = function(destroy) {};


/**
 * @param {!ol.layer.Base} olLayer
 * @return {?Array.<T>}
 * @abstract
 * @protected
 */
exports.prototype.createSingleLayerCounterparts = function(olLayer) {};
