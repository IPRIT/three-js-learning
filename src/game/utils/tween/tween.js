import EventEmitter from 'eventemitter3';
import { TweenState } from "./tween-state";
import * as timingFunctions from './tween-timing-functions';
import { TweenEvents } from "./tween-events";

let TWEEN_ID = 1;

export class Tween extends EventEmitter {

  /**
   * @type {number}
   * @private
   */
  _id = TWEEN_ID++;

  /**
   * @type {*}
   * @private
   */
  _params = {};

  /**
   * @type {number}
   * @private
   */
  _state = TweenState.NOT_STARTED;

  /**
   * @type {number}
   * @private
   */
  _timeScale = Tween.DEFAULT_PARAMS.timeScale;

  /**
   * @type {number}
   * @private
   */
  _timeElapsed = 0;

  /**
   * @type {number}
   * @private
   */
  _duration = Tween.DEFAULT_PARAMS.duration;

  /**
   * @type {string}
   * @private
   */
  _timingFunctionName = Tween.DEFAULT_PARAMS.timingFunction;

  /**
   * @type {Function}
   * @private
   */
  _timingFunction = () => {};

  /**
   * @type {*}
   * @private
   */
  _target = null;

  /**
   * @type {Array<string>}
   * @private
   */
  _properties = [];

  /**
   * @type {Array}
   * @private
   */
  _deltaValues = [];

  /**
   * @type {Array<number>}
   * @private
   */
  _startValues = [];

  /**
   * @type {{timeScale: number, duration: number, timingFunction: string}}
   */
  static DEFAULT_PARAMS = {
    timeScale: 1,
    duration: 500,
    timingFunction: 'linear'
  };

  /**
   * @param {Array<*>} args
   * @returns {Tween}
   */
  static create (...args) {
    return new Tween( ...args );
  }

  /**
   * @param {*} target
   * @param {string|Array<string>} properties
   * @param {number|Array<number>} deltaValues
   * @param {*} params
   */
  constructor (target, properties = [], deltaValues = [], params = {}) {
    super();

    this._target = target;
    this._properties = [].concat( properties ); // can be single value
    this._deltaValues = [].concat( deltaValues ); // --//--
    this._initParams( params );
  }

  /**
   * @param {number} deltaTime
   */
  update (deltaTime) {
    if (!this.isRunning) {
      return;
    }

    deltaTime *= this._timeScale;
    this._timeElapsed += deltaTime * 1000;

    this._updateAnimation( deltaTime );
    this._checkDuration();
  }

  /**
   * Runs animation
   */
  start () {
    if (this.isNotStarted) {
      this._startValues = this._getPropertyValues( this._properties );
    }
    this._state = TweenState.RUNNING;
    this.emit( TweenEvents.STARTED );
  }

  /**
   * Stops animation
   */
  pause () {
    this._state = TweenState.PAUSED;
    this.emit( TweenEvents.PAUSED );
  }

  /**
   * Finish & dispose the tween
   */
  finish () {
    this._state = TweenState.COMPLETED;
    this.emit( TweenEvents.COMPLETE, this._timeElapsed );
    this._dispose();
  }

  /**
   * @param {number} timeScale
   */
  setTimeScale (timeScale = 1) {
    this._timeScale = timeScale;
  }

  /**
   * @returns {number}
   */
  get id () {
    return this._id;
  }

  /**
   * @returns {boolean}
   */
  get isNotStarted () {
    return this._state === TweenState.NOT_STARTED;
  }

  /**
   * @returns {boolean}
   */
  get isRunning () {
    return this._state === TweenState.RUNNING;
  }

  /**
   * @returns {boolean}
   */
  get isPaused () {
    return this._state === TweenState.PAUSED;
  }

  /**
   * @returns {boolean}
   */
  get isCompleted () {
    return this._state === TweenState.COMPLETED;
  }

  /**
   * @returns {number}
   */
  get timeScale () {
    return this._timeScale;
  }

  /**
   * @returns {number}
   */
  get duration () {
    return this._duration;
  }

  /**
   * @returns {string}
   */
  get timingFunctionName () {
    return this._timingFunctionName;
  }

  /**
   * @returns {Function}
   */
  get timingFunction () {
    return this._timingFunction;
  }

  /**
   * @returns {number}
   */
  get timeRemaining () {
    return Math.max( 0, Math.min( this._duration, this._duration - this._timeElapsed ) );
  }

  /**
   * @returns {number}
   */
  get progress () {
    return Math.min( 1, Math.max( 0, this._timeElapsed / this._duration ) );
  }

  /**
   * @param {*} params
   * @private
   */
  _initParams (params) {
    let {
      timeScale,
      duration,
      timingFunction
    } = this._params = Object.assign( {}, Tween.DEFAULT_PARAMS, params );

    this._timeScale = timeScale;
    this._duration = duration;
    this._timingFunctionName = timingFunction;
    this._timingFunction = this._getTimingFunction( timingFunction );
  }

  /**
   * @param {number} deltaTime
   * @private
   */
  _updateAnimation (deltaTime) {
    const progress = this.progress;
    const timingProgress = this._timingFunction( progress );

    for (let i = 0, length = this._properties.length; i < length; ++i) {
      const property = this._properties[ i ];
      this._target[ property ] = this._startValues[ i ] + this._deltaValues[ i ] * timingProgress;
    }
  }

  /**
   * @private
   */
  _checkDuration () {
    if (this._timeElapsed >= this._duration) {
      this.finish();
    }
  }

  /**
   * @param {Array<string>} properties
   * @returns {Array<number>}
   * @private
   */
  _getPropertyValues (properties = []) {
    let values = [];
    for (let i = 0, length = properties.length; i < length; ++i) {
      values[ i ] = this._getPropertyValue( properties[i] );
    }
    return values;
  }

  /**
   * @param {string} property
   * @returns {number}
   * @private
   */
  _getPropertyValue (property) {
    return this._target[ property || '' ] || 0;
  }

  /**
   * @param {string} functionName
   * @returns {Function}
   * @private
   */
  _getTimingFunction (functionName) {
    const defaultFunctionName = Tween.DEFAULT_PARAMS.timingFunction;
    return timingFunctions[ functionName ] || timingFunctions[ defaultFunctionName ];
  }

  /**
   * Disposes the object
   *
   * @private
   */
  _dispose () {
    this._params = null;
    this._timingFunction = null;
    this._deltaValues = null;
    this._startValues = null;
    this._properties = null;
    this._target = null;

    this.removeAllListeners();
  }
}
