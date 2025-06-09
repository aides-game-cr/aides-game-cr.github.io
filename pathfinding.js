import * as THREE from 'three';

class PathNode {
    constructor(x, z, walkable = true) {
        this.x = x; this.z = z; this.walkable = walkable;
        this.gCost = 0; this.hCost = 0; this.parent = null;
    }
    get fCost() { return this.gCost + this.hCost; }
}

export class Pathfinder {
    constructor(obstacles, groundSize, gridResolution) {
        this.obstacles = obstacles; this.groundSize = groundSize; this.gridResolution = gridResolution;
        this.gridSize = Math.floor(groundSize / gridResolution); this.grid = [];
        this.initializeGrid();
    }

    initializeGrid() {
        this.grid = [];
        for (let x = 0; x < this.gridSize; x++) {
            this.grid[x] = [];
            for (let z = 0; z < this.gridSize; z++) {
                const worldX = (x - this.gridSize / 2) * this.gridResolution;
                const worldZ = (z - this.gridSize / 2) * this.gridResolution;
                const walkable = !this.isObstacleAt(worldX, worldZ);
                this.grid[x][z] = new PathNode(x, z, walkable);
            }
        }
    }

    isObstacleAt(worldX, worldZ) {
        const nodeSize = new THREE.Vector3(this.gridResolution, 5, this.gridResolution);
        const nodeCenter = new THREE.Vector3(worldX, 2.5, worldZ);
        const nodeBox = new THREE.Box3().setFromCenterAndSize(nodeCenter, nodeSize);
        for (const obstacle of this.obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (nodeBox.intersectsBox(obstacleBox)) return true;
        }
        return false;
    }

    findPath(startPos, targetPos) {
        const startGrid = this.worldToGrid(startPos);
        const targetGrid = this.worldToGrid(targetPos);
        if (!this.isValidGridPos(startGrid) || !this.isValidGridPos(targetGrid)) return [];
        const startNode = this.grid[startGrid.x][startGrid.z];
        const targetNode = this.grid[targetGrid.x][targetGrid.z];
        if (!startNode.walkable || !targetNode.walkable) return [];
        const openSet = [startNode];
        const closedSet = new Set();
        this.grid.forEach(row => row.forEach(node => {
            node.gCost = Infinity; node.hCost = 0; node.parent = null;
        }));
        startNode.gCost = 0;
        startNode.hCost = this.getDistance(startNode, targetNode);
        while (openSet.length > 0) {
            openSet.sort((a, b) => a.fCost - b.fCost || a.hCost - b.hCost);
            let currentNode = openSet.shift();
            if (currentNode === targetNode) return this.retracePath(startNode, targetNode);
            closedSet.add(currentNode);
            for (const neighbor of this.getNeighbors(currentNode)) {
                if (!neighbor.walkable || closedSet.has(neighbor)) continue;
                const newCostToNeighbor = currentNode.gCost + this.getDistance(currentNode, neighbor);
                if (newCostToNeighbor < neighbor.gCost) {
                    neighbor.gCost = newCostToNeighbor;
                    neighbor.hCost = this.getDistance(neighbor, targetNode);
                    neighbor.parent = currentNode;
                    if (!openSet.some(node => node === neighbor)) openSet.push(neighbor);
                }
            }
        }
        return [];
    }

    retracePath(startNode, endNode) {
        const path = []; let currentNode = endNode;
        while (currentNode !== startNode) {
            const worldPos = this.gridToWorld(currentNode);
            path.unshift(new THREE.Vector3(worldPos.x, 1.5, worldPos.z));
            currentNode = currentNode.parent;
        }
        return path;
    }
    
    getNeighbors(node) {
        const neighbors = [];
        const directions = [ {x: -1, z: 0}, {x: 1, z: 0}, {x: 0, z: -1}, {x: 0, z: 1}, {x: -1, z: -1}, {x: 1, z: 1}, {x: -1, z: 1}, {x: 1, z: -1} ];
        for (const dir of directions) {
            const checkX = node.x + dir.x; const checkZ = node.z + dir.z;
            if (this.isValidGridPos({x: checkX, z: checkZ})) neighbors.push(this.grid[checkX][checkZ]);
        }
        return neighbors;
    }

    getDistance(nodeA, nodeB) {
        const dstX = Math.abs(nodeA.x - nodeB.x); const dstZ = Math.abs(nodeA.z - nodeB.z);
        if (dstX > dstZ) return 14 * dstZ + 10 * (dstX - dstZ);
        return 14 * dstX + 10 * (dstZ - dstX);
    }
    predictPlayerPosition(seconds) {
        // Chỉ dự đoán nếu người chơi đang di chuyển
        if (this.playerVelocity.lengthSq() > 0) {
            const prediction = this.player.position.clone().add(this.playerVelocity.clone().multiplyScalar(seconds));
            return prediction;
        }
        return this.player.position.clone();
    }

    findFlankPosition(targetPos) {
        const monsterToTarget = new THREE.Vector3().subVectors(targetPos, this.monster.position);
        
        // Xoay vector 90 độ để có được hướng bọc hậu (trái hoặc phải)
        // Ngẫu nhiên chọn một hướng để AI khó đoán hơn
        const flankDirection = new THREE.Vector3(-monsterToTarget.z, 0, monsterToTarget.x).normalize();
        if (Math.random() < 0.5) {
            flankDirection.negate();
        }

        const flankDistance = 10; // Quái vật sẽ cố gắng đến một điểm cách đường đi của người chơi 10 đơn vị
        const flankPosition = targetPos.clone().add(flankDirection.multiplyScalar(flankDistance));

        // Giới hạn vị trí trong khu vực sân chơi
        const halfSize = this.groundSize / 2;
        flankPosition.x = Math.max(-halfSize, Math.min(halfSize, flankPosition.x));
        flankPosition.z = Math.max(-halfSize, Math.min(halfSize, flankPosition.z));
        
        return flankPosition;
    }
    worldToGrid(worldPos) { return { x: Math.floor((worldPos.x + this.groundSize / 2) / this.gridResolution), z: Math.floor((worldPos.z + this.groundSize / 2) / this.gridResolution) }; }
    gridToWorld(gridPos) { return { x: (gridPos.x - this.gridSize / 2) * this.gridResolution + this.gridResolution / 2, z: (gridPos.z - this.gridSize / 2) * this.gridResolution + this.gridResolution / 2 }; }
    isValidGridPos(gridPos) { return gridPos.x >= 0 && gridPos.x < this.gridSize && gridPos.z >= 0 && gridPos.z < this.gridSize; }
}