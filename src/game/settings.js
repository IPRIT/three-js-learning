/* Chunks */
export const WORLD_MAP_CHUNK_SIZE = 1 << 5;
export const WORLD_MAP_CHUNK_HEIGHT = 1 << 5;
export const WORLD_MAP_CHUNK_VIEW_DISTANCE = 3;

export const WORLD_MAP_CHUNK_SIZE_VECTOR = new THREE.Vector3(
  WORLD_MAP_CHUNK_SIZE,
  WORLD_MAP_CHUNK_HEIGHT,
  WORLD_MAP_CHUNK_SIZE
);

/* Map */
export const WORLD_MAP_SIZE = 1 << 12;
export const WORLD_MAP_BLOCK_SIZE = 2;
