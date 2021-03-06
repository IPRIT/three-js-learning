import { isVectorZero } from "../../utils";

export class DomLabel {

  /**
   * @type {THREE.Object3D}
   * @private
   */
  _object3D = null;

  /**
   * @type {*}
   * @private
   */
  _options = {};

  /**
   * @type {string}
   * @private
   */
  _containerSelector = '.game-labels';

  /**
   * @type {string}
   * @private
   */
  _contentClass = '';

  /**
   * @type {number}
   * @private
   */
  _maxScale = 1;

  /**
   * @type {number}
   * @private
   */
  _minScale = 1;

  /**
   * @type {Element}
   * @private
   */
  _domContainer;

  /**
   * @type {Element}
   * @private
   */
  _domElement;

  /**
   * @type {boolean}
   * @private
   */
  _domElementInserted = false;

  /**
   * @type {boolean}
   * @private
   */
  _needsUpdate = true;

  /**
   * @type {number}
   * @private
   */
  _labelWidth = 0;

  /**
   * @type {number}
   * @private
   */
  _labelHeight = 0;

  /**
   * @type {THREE.Vector3}
   * @private
   */
  _old2DPosition = new THREE.Vector3();

  /**
   * @param {THREE.Object3D|*} object3D
   */
  constructor (object3D) {
    this._object3D = object3D;
    this._domContainer = document.querySelector( this._containerSelector );
    if (!this._domContainer) {
      this._domContainer = document.createElement( 'div' );
      this._domContainer.characterTypeName = this._containerSelector;
      document.body.appendChild( this._domContainer );
    }
  }

  /**
   * @param {string} text
   * @param {*} options
   * @returns {Element}
   */
  create (text, options = {}) {
    this._initOptions( options );
    this._domElement = document.createElement( 'div' );
    this._domElement.characterTypeName = `living-object-label ${this._contentClass || ''}`.trim();
    this._domElement.innerHTML = text;

    return this._domElement;
  }

  /**
   * Attaches label to DOM
   */
  attach () {
    if (this._domContainer) {
      this._domContainer.appendChild( this._domElement );
      this._domElementInserted = true;
    }
  }

  /**
   * Detaches label to the dom
   */
  detach () {
    if (this._domContainer) {
      this._domContainer.removeChild( this._domElement );
      this._domElementInserted = false;
    }
  }

  hide () {
    this._setStyles(this._domElement, { opacity: 0 });
  }

  show () {
    this._setStyles(this._domElement, { opacity: 1 });
  }

  /**
   * Update cycle
   *
   * @param {PerspectiveCamera} camera
   * @param {THREE.Vector3} offset
   */
  update ( camera, offset ) {
    this.updatePosition( camera, offset );
  }

  /**
   * @param {string} content
   */
  updateContent (content) {
    this._domElement.innerHTML = content;
    this._needsUpdate = true;
  }

  /**
   * Updates position of the label
   *
   * @param {PerspectiveCamera} camera
   * @param {THREE.Vector3} offset
   */
  updatePosition (camera, offset) {
    let objectPosition = this._object3D.position.clone();
    let labelPosition = objectPosition.add( offset );
    let position = this._compute2DPosition( camera, labelPosition );

    if (isVectorZero( this._old2DPosition.clone().sub( position ), 1 )) {
      return;
    }
    this._old2DPosition = position;
    let label = this._domElement;
    let transform = `translate3d(${position.x - this.width / 2}px, ${position.y - this.height * 1.5}px, 0)`;
    this._setStyles(label, { transform });
  }

  /**
   * Destroys and detaches dom element from DOM
   */
  destroy () {
    if (this._domElementInserted) {
      this.detach();
    }
    if (this._domElement && this._domElement.remove) {
      this._domElement.remove();
    }
  }

  /**
   * @returns {number}
   */
  get width () {
    if (this._needsUpdate) {
      this._computeStyles();
    }
    return this._labelWidth;
  }

  /**
   * @returns {number}
   */
  get height () {
    if (this._needsUpdate) {
      this._computeStyles();
    }
    return this._labelHeight;
  }

  /**
   * @param {*} options
   * @private
   */
  _initOptions (options) {
    this._options = options;

    let { contentClass, maxScale = 50, minScale = .5 } = options;
    this._contentClass = contentClass;
    this._maxScale = maxScale;
    this._minScale = minScale;
  }

  /**
   * @param {PerspectiveCamera} camera
   * @param {THREE.Vector3} position
   * @returns {THREE.Vector3}
   * @private
   */
  _compute2DPosition (camera, position) {
    position = position.clone();
    let vector = position.project( camera );
    vector.x = (vector.x + 1) / 2 * game._screenWidth;
    vector.y = -(vector.y - 1) / 2 * game._screenHeight;
    return vector;
  }

  /**
   * @private
   */
  _computeStyles () {
    this._labelWidth = this._domElement.offsetWidth;
    this._labelHeight = this._domElement.offsetHeight;
    this._needsUpdate = false;
  }

  /**
   * @param {Element} element
   * @param {*} styles
   * @private
   */
  _setStyles (element, styles = {}) {
    for (let styleProp in styles) {
      element.style[ styleProp ] = styles[ styleProp ];
    }
  }
}
