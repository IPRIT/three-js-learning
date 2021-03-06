import WebworkerPromise from "webworker-promise";
import MesherWorker from './vertices/compute-vertices.worker';
import { computeVertices } from "./vertices/compute-vertices";

const isWorkersSupported = !!window.Worker;
const workersNumber = 3;

let workerPool = [];
let workerIndex = 0;

if (isWorkersSupported) {
  /*workerPool = WorkerPool.create({
    create: () => new MesherWorker(),
    maxThreads: workersNumber,
    maxConcurrentPerWorker: 1
  });*/

  workerPool = Array( workersNumber ).fill( 0 ).map(_ => {
    return new WebworkerPromise( new MesherWorker() );
  });
}

export class VoxMesher {

  /**
   * @type {WorldObjectVox}
   * @private
   */
  _worldObject = null;

  /**
   * @param {WorldObjectVox} worldObject
   */
  constructor (worldObject) {
    this._worldObject = worldObject;
  }

  /**
   * @returns {THREE.Mesh}
   */
  async createOrUpdateMesh (bs) {
    const worldObject = this._worldObject;

    this.resetFaces();
    const { vertices, colors } = await this.computeVertices( bs );
    let geometry = this.createOrUpdateGeometry( vertices, colors );

    let mesh = worldObject.mesh;
    if (!mesh) {
      mesh = new THREE.Mesh( geometry, worldObject.material );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    } else {
      mesh.geometry = geometry;
    }

    return ( this._worldObject.mesh = mesh );
  }

  /**
   * @param {number[][]} vertices
   * @param {number[][]} colors
   * @returns {THREE.BufferGeometry}
   */
  createOrUpdateGeometry (vertices, colors) {
    const worldObject = this._worldObject;
    const chunk = this._worldObject.chunk;

    chunk.triangles = vertices.length / 3;

    if (!worldObject.mesh) {
      let startingBlocks = 0;

      for (let i = 0; i < chunk.buffer.length; i++) {
        if (chunk.buffer[ i ] !== 0) {
          startingBlocks++;
          chunk.buffer[ i ] &= 0xFFFFFFE0; // why 0xFFFFFFE0? why not 0xFFFFFFC0?
        }
      }

      chunk.startingBlocks = startingBlocks;
      chunk.currentBlocks = startingBlocks;
    }

    let verticesAttribute, colorsAttribute, geometry;

    if (worldObject.mesh && chunk.previousVerticesLength === vertices.length) {
      verticesAttribute = worldObject.vertices;
      colorsAttribute = worldObject.colors;
      geometry = worldObject.geometry;

      for (let i = 0; i < vertices.length; i++) {
        verticesAttribute.setXYZ(i, vertices[i][0], vertices[i][1], vertices[i][2]);
        colorsAttribute.setXYZW(i, colors[i][0], colors[i][1], colors[i][2], 1);
      }
      geometry.setDrawRange(0, vertices.length);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.computeVertexNormals();
    } else {
      verticesAttribute = new THREE.BufferAttribute(new Float32Array(vertices.length * 3), 3);
      colorsAttribute = new THREE.BufferAttribute(new Float32Array(colors.length * 3), 3);

      for (let i = 0; i < vertices.length; i++) {
        verticesAttribute.setXYZ(i, vertices[i][0], vertices[i][1], vertices[i][2]);
        colorsAttribute.setXYZW(i, colors[i][0], colors[i][1], colors[i][2], 1);
      }
      geometry = new THREE.BufferGeometry();
      geometry.dynamic = true;
      geometry.addAttribute('position', verticesAttribute);
      geometry.addAttribute('color', colorsAttribute);
      geometry.attributes.position.dynamic = true;
      geometry.attributes.color.dynamic = true;
      geometry.computeBoundingBox();
      geometry.computeVertexNormals();
    }

    worldObject.geometry = geometry;
    worldObject.vertices = verticesAttribute;
    worldObject.colors = colorsAttribute;

    chunk.previousVerticesLength = vertices.length;
    chunk.needsUpdate = false;

    return geometry;
  }

  /**
   * Resets faces of block
   */
  resetFaces () {
    const chunk = this._worldObject.chunk;
    chunk && chunk.resetFaces();
  }

  /**
   * @returns {{vertices: number[][], colors: number[][]}}
   * @private
   */
  async computeVertices (bs) {
    const chunk = this._worldObject.chunk;
    const { x, y, z } = chunk.size;
    const context = {
      heavyBuffer: chunk.buffer,
      lightBuffer: chunk.lightChunk.buffer,
      chunkSize: { x, y, z },
      bs,
      renderBottomY: true
    };

    if (isWorkersSupported && workerPool.length) {
      const worker = workerPool[ workerIndex++ % workerPool.length ];
      return worker.postMessage( context );
    }
    return computeVertices( context );
  }
}
