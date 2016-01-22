// FIXME: box style
goog.provide('olcs.DragBox');
goog.provide('olcs.DragBoxEventType');

goog.require('goog.asserts');
goog.require('goog.events.EventTarget');


/**
 * @enum {string}
 */
olcs.DragBoxEventType = {
  /**
   * Triggered upon drag box start.
   */
  BOXSTART: 'boxstart',
  /**
   * Triggered upon drag box end.
   */
  BOXEND: 'boxend'
};



/**
 * @constructor
 * @extends {goog.events.EventTarget}
 * @param {Object=} opt_options Options.
 * @api
 * @struct
 */
olcs.DragBox = function(opt_options) {

  var options = goog.isDef(opt_options) ? opt_options : {};

  goog.base(this);

  /**
   * @private
   * @type {Cesium.Scene}
   */
  this.scene_ = options['scene'];
  goog.asserts.assert(this.scene_.canvas);

  /**
   * @private
   * @type {Cesium.ScreenSpaceEventHandler}
   */
  this.handler_ = null;

  /**
   * @private
   * @type {Cesium.Rectangle}
   */
  this.rectangle_ = Cesium.Rectangle.fromDegrees(-140.0, 30.0, -100.0, 40.0);
  /**
   * @private
   * @type {Cesium.Primitive}
   */
  this.box_ = this.createRectanglePrimitive(this.rectangle_);
  this.scene_.primitives.add(this.box_);

  this.handler_ = new Cesium.ScreenSpaceEventHandler(this.scene_.canvas);
  this.handler_.setInputAction(this.handleMouseDown.bind(this),
        Cesium.ScreenSpaceEventType.LEFT_DOWN, this.modifier_);

  /**
   * @private
   * @type {Cesium.KeyboardEventModifier|undefined}
   */
  this.modifier_ = goog.isDef(options.modifier) ?
      options.modifier : Cesium.KeyboardEventModifier.SHIFT;

  /**
   * @private
   * @type {Cesium.Cartographic}
   */
  this.startPosition_ = null;

};
goog.inherits(olcs.DragBox, goog.events.EventTarget);


/**
 * @param {Cesium.Rectangle} rectangle
 * @return {Cesium.Primitive}
 */
olcs.DragBox.prototype.createRectanglePrimitive = function(rectangle) {
  var rectangleInstance = new Cesium.GeometryInstance({
    geometry : new Cesium.RectangleGeometry({
      rectangle : rectangle,
      vertexFormat : Cesium.PerInstanceColorAppearance.VERTEX_FORMAT
    }),
    id : 'rectangle',
    attributes : {
      color : new Cesium.ColorGeometryInstanceAttribute(0.0, 0.0, 1.0, 0.5)
    }
  });

  return new Cesium.Primitive({
    asynchronous: false,
    allowPicking: false,
    cull: false,
    releaseGeometryInstances: false,
    geometryInstances : [rectangleInstance],
    appearance : new Cesium.PerInstanceColorAppearance()
  });
}


/**
 * @param {Object} event Mouse down event.
 */
olcs.DragBox.prototype.handleMouseDown = function(event) {
  var ellipsoid = this.scene_.globe.ellipsoid;
  var ray = this.scene_.camera.getPickRay(event.position);
  var intersection = this.scene_.globe.pick(ray, this.scene_);
  if (goog.isDef(intersection)) {
    this.handler_.setInputAction(this.handleMouseMove.bind(this),
        Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    this.handler_.setInputAction(this.handleMouseUp.bind(this),
        Cesium.ScreenSpaceEventType.LEFT_UP);

    if (goog.isDef(this.modifier_)) {
      // listen to the event with and without the modifier to be able to start
      // a box with the key pressed and finish it without.
      this.handler_.setInputAction(this.handleMouseMove.bind(this),
          Cesium.ScreenSpaceEventType.MOUSE_MOVE, this.modifier_);
      this.handler_.setInputAction(this.handleMouseUp.bind(this),
          Cesium.ScreenSpaceEventType.LEFT_UP, this.modifier_);
    }
    var cartographic = ellipsoid.cartesianToCartographic(intersection);
    var rectangle = this.rectangle_;
    rectangle.north = rectangle.south = cartographic.latitude;
    rectangle.east = rectangle.west = cartographic.longitude;
    this.box_.show = true;

    this.dispatchEvent({
      type: olcs.DragBoxEventType.BOXSTART,
      position: cartographic
    });

    this.scene_.screenSpaceCameraController.enableInputs = false;

    this.startPosition_ = cartographic;
  }
};


/**
 * @param {Object} event Mouse move event.
 */
olcs.DragBox.prototype.handleMouseMove = function(event) {
  var ellipsoid = this.scene_.globe.ellipsoid;
  var ray = this.scene_.camera.getPickRay(event.endPosition);
  var intersection = this.scene_.globe.pick(ray, this.scene_);
  if (goog.isDef(intersection)) {
    var rectangle = this.rectangle_;
    var cartographic = ellipsoid.cartesianToCartographic(intersection);

    if (cartographic.latitude < this.startPosition_.latitude) {
      rectangle.south = cartographic.latitude;
    } else {
      rectangle.north = cartographic.latitude;
    }
    if (cartographic.longitude < this.startPosition_.longitude) {
      rectangle.west = cartographic.longitude;
    } else {
      rectangle.east = cartographic.longitude;
    }
  }
};


/**
 * @param {Object} event Mouse up event.
 */
olcs.DragBox.prototype.handleMouseUp = function(event) {
  var ellipsoid = this.scene_.globe.ellipsoid;
  var ray = this.scene_.camera.getPickRay(event.position);
  var intersection = this.scene_.globe.pick(ray, this.scene_);
  if (goog.isDef(intersection)) {
    var cartographic = ellipsoid.cartesianToCartographic(intersection);

    this.box_.show = false;

    this.dispatchEvent({
      type: olcs.DragBoxEventType.BOXEND,
      position: cartographic
    });

    this.handler_.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
    this.handler_.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    if (goog.isDef(this.modifier_)) {
      this.handler_.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP,
          this.modifier_);
      this.handler_.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE,
          this.modifier_);
    }
  }
  this.scene_.screenSpaceCameraController.enableInputs = true;
};


/**
 * Adds an event listener. A listener can only be added once to an
 * object and if it is added again the key for the listener is
 * returned. Note that if the existing listener is a one-off listener
 * (registered via listenOnce), it will no longer be a one-off
 * listener after a call to listen().
 *
 * @param {string|!goog.events.EventId.<EVENTOBJ>} type The event type id.
 * @param {function(this:SCOPE, EVENTOBJ):(boolean|undefined)} listener Callback
 *     method.
 * @param {boolean=} opt_useCapture Whether to fire in capture phase
 *     (defaults to false).
 * @param {SCOPE=} opt_listenerScope Object in whose scope to call the
 *     listener.
 * @return {goog.events.ListenableKey} Unique key for the listener.
 * @template SCOPE,EVENTOBJ
 * @api
 */
olcs.DragBox.prototype.listen;
