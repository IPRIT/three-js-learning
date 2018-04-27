import { WORLD_MAP_BLOCK_SIZE } from "../../settings";

export class PlayerWorldLight extends THREE.DirectionalLight {

  /**
   * @type {PlayerMe}
   * @private
   */
  _me = null;

  /**
   * @type {THREE.CameraHelper}
   * @private
   */
  _lightHelper = null;

  /**
   * @param {PlayerMe} player
   * @param {number} color
   * @param {number} intensity
   */
  constructor (player, color, intensity) {
    super( color, intensity );
    this._me = player;
  }

  init () {
    this._lightHelper = new THREE.CameraHelper( this.shadow.camera );
    this._addShadows();
    this._attachToMe();
  }

  attachToWorld () {
    this._me.add( this );
    this._me.add( this._lightHelper );
  }

  /**
   * @private
   */
  _addShadows () {
    this.castShadow = true;

    this.shadow.mapSize.width = 1 << 10;
    this.shadow.mapSize.height = 1 << 10;

    const offset = 50 * WORLD_MAP_BLOCK_SIZE;

    this.shadow.camera.top = offset;
    this.shadow.camera.right = offset;
    this.shadow.camera.bottom = -offset;
    this.shadow.camera.left = -offset;

    this.shadow.camera.far = 3500;
    this.shadow.camera.bias = -0.0001;
    this.shadow.camera.darkness = 0.45;
  }

  /**
   * @private
   */
  _attachToMe () {
    this.position.addScalar( 300 );
    const fakeTarget = new THREE.Object3D();
    this._me.add( fakeTarget );
    this.target = fakeTarget;
  }
}
