import { DungeonFloor, FogState, TileType } from './types';

export function updateFogOfWar(
  dungeon: DungeonFloor,
  playerX: number,
  playerY: number,
  visionRadius: number
) {
  const { width, height, tiles, fog, rooms } = dungeon;

  // First, downgrade all previously VISIBLE tiles to EXPLORED_HIDDEN
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (fog[y][x] === FogState.VISIBLE) {
        fog[y][x] = FogState.EXPLORED_HIDDEN;
      }
    }
  }

  const pTileX = Math.floor(playerX);
  const pTileY = Math.floor(playerY);

  // Cast rays in 360 degrees
  const rayCount = 180;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i * 2 * Math.PI) / rayCount;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let r = 0; r <= visionRadius; r += 0.4) {
      const rx = Math.floor(playerX + cos * r);
      const ry = Math.floor(playerY + sin * r);

      if (rx < 0 || rx >= width || ry < 0 || ry >= height) break;

      fog[ry][rx] = FogState.VISIBLE;

      // Stop ray if hitting opaque obstacle (WALL or PILLAR)
      const tile = tiles[ry][rx];
      if (tile >= TileType.WALL) {
        break;
      }
    }
  }

  // Check if player is inside a specific room; if so, reveal that room
  const currentRoom = rooms.find(
    (r) =>
      pTileX >= r.x &&
      pTileX < r.x + r.width &&
      pTileY >= r.y &&
      pTileY < r.y + r.height
  );

  if (currentRoom) {
    for (let y = currentRoom.y; y < currentRoom.y + currentRoom.height; y++) {
      for (let x = currentRoom.x; x < currentRoom.x + currentRoom.width; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          // If within reasonable distance to see inside room
          const dist = Math.hypot(x - playerX, y - playerY);
          if (dist <= visionRadius + 2) {
            fog[y][x] = FogState.VISIBLE;
          } else if (fog[y][x] === FogState.UNEXPLORED) {
            fog[y][x] = FogState.EXPLORED_HIDDEN;
          }
        }
      }
    }
  }
}
