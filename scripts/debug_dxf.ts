import DxfParser from 'dxf-parser';
import fs from 'fs';

const file = fs.readFileSync('public/output.dxf', 'utf8');
const parser = new DxfParser();

try {
    console.log("Parsing...");
    const dxf = parser.parseSync(file);
    console.log("Entities count:", dxf.entities?.length);

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let nanFound = false;

    if (dxf.entities) {
        for (const entity of dxf.entities) {
            if (entity.type === 'POINT') {
                const x = entity.position.x || 0;
                const y = entity.position.y || 0;
                const z = entity.position.z || 0;
                if (isNaN(x) || isNaN(y) || isNaN(z)) nanFound = true;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (z < minZ) minZ = z;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                if (z > maxZ) maxZ = z;
            }
        }
    }
    console.log("Bounds:", { minX, maxX, minY, maxY, minZ, maxZ }, "NaNs?", nanFound);
} catch (e) {
    console.error("Error parsing:", e);
}