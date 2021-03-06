import Promise from 'bluebird';
import { DamageText } from "./damage-text";
import { Game } from "../../../game";
import { Tween } from "../../../utils/tween";
import { TweenEvents } from "../../../utils/tween/tween-events";

export class DamageQueue {

  /**
   * @type {DamageQueue}
   * @private
   */
  static _instance = null;

  /**
   * @type {number}
   * @private
   */
  _queueRate = 5;

  /**
   * @type {number}
   * @private
   */
  _queueProgress = 0;

  /**
   * @type {number}
   * @private
   */
  _queueDoneElements = 0;

  /**
   * @type {Array<*>}
   * @private
   */
  _queue = [];

  /**
   * @type {Array<Tween>}
   * @private
   */
  _activeAnimations = [];

  /**
   * @returns {DamageQueue}
   */
  static getQueue () {
    if (this._instance) {
      return this._instance;
    }
    return ( this._instance = new DamageQueue() );
  }

  /**
   * @param {number} deltaTime
   */
  update (deltaTime) {
    this._queueTick( deltaTime );
    this._updateAnimations( deltaTime );
  }

  /**
   * @param {*} damageOptions
   * @param {THREE.Object3D} target
   * @param {*} options
   */
  add (damageOptions = {}, target, options = {}) {
    let targetPosition;
    if (target && target.position) {
      // remember object position for the future object destruction
      targetPosition = target.position.clone();
    }
    this._queue.push( [ damageOptions, target, targetPosition, options ] );
  }

  /**
   * @returns {THREE.Scene}
   */
  get scene () {
    return Game.getInstance().scene;
  }

  /**
   * @param {number} deltaTime
   * @private
   */
  _queueTick (deltaTime) {
    if (!this._queue || !this._queue.length) {
      return;
    }

    this._queueProgress += deltaTime * this._queueRate;

    const nextElements = ( this._queueProgress | 0 ) - this._queueDoneElements;
    const needToSpawn = Math.min( nextElements, this._queue.length );
    for (let i = 0; i < needToSpawn; ++i) {
      let animations = this._createAnimations( ...this._queue.shift() );
      this._activeAnimations.push( ...[].concat( animations ) );
      animations.forEach( animation => animation.start() );
    }

    this._queueDoneElements += nextElements;
  }

  /**
   * @param {*} damageOptions
   * @param {THREE.Object3D} target
   * @param {THREE.Vector3} targetPosition - saved position
   * @param {*} options
   * @returns {Tween[]}
   * @private
   */
  _createAnimations (damageOptions, target, targetPosition, options) {
    let {
      verticalOffset = 0,
      maxVerticalOffset = 0
    } = options;

    let isObjectAttached = true;
    if (!target || !target.parent) {
      isObjectAttached = false;
    }

    // create fake object
    let fakeTarget = new THREE.Object3D();

    if (!isObjectAttached) {
      try {
        fakeTarget.position.copy( targetPosition );
      } catch (e) {
        fakeTarget.position.copy( new THREE.Vector3() );
      }
      this.scene.add( fakeTarget );
    } else {
      target.add( fakeTarget );
    }

    let damageText = new DamageText( damageOptions );
    damageText.setOffsetPosition( new THREE.Vector3(0, verticalOffset, 0) );
    damageText.setVerticalOffset( verticalOffset, maxVerticalOffset );
    fakeTarget.add( damageText );

    damageText.material.transparent = true;
    damageText.material.opacity = .2;

    const opacityAnimation = new Tween(damageText.material, 'opacity', 1, {
      duration: 300,
      timingFunction: 'linear'
    });

    const verticalAnimation = new Tween(fakeTarget.position, 'y', 6, {
      duration: 600,
      timingFunction: 'linear'
    });

    let once = false;
    function onBothFinished () {
      if (once) {
        return;
      }
      once = true;
      damageText.dispose();

      if (fakeTarget && fakeTarget.parent) {
        fakeTarget.parent.remove( fakeTarget );
      }
    }

    verticalAnimation.on(TweenEvents.COMPLETE, _ => {
      if (opacityAnimation.isCompleted) {
        setTimeout( onBothFinished, 300 );
      }
      this._deleteAnimation( verticalAnimation );
    });

    opacityAnimation.on(TweenEvents.COMPLETE, _ => {
      if (verticalAnimation.isCompleted) {
        setTimeout( onBothFinished, 300 );
      }
      this._deleteAnimation( opacityAnimation );
    });

    return [ verticalAnimation, opacityAnimation ];
  }

  /**
   * @param {number} deltaTime
   * @private
   */
  _updateAnimations (deltaTime) {
    if (this._activeAnimations) {
      this._activeAnimations.forEach( animation => animation.update( deltaTime ) );
    }
  }

  /**
   * @param {Tween} animation
   * @private
   */
  _deleteAnimation (animation) {
    const indexToDelete = this._activeAnimations.findIndex(activeAnimation => {
      return activeAnimation.id === animation.id;
    });
    if (indexToDelete >= 0) {
      this._activeAnimations.splice( indexToDelete, 1 );
    }
  }
}
