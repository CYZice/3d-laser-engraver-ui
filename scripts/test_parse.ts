import { processDxfData } from '../src/components/CrystalViewer/dxfParser.worker';
async function run() {
    const result = await processDxfData('http://localhost:5173/output.dxf', [5, 8, 5]);
    console.log(result.type);
    if (result.payload) {
        console.log("Points:", result.payload.pointCount, "Bounds:", result.payload.boundingSize);
    } else console.log("Error:", result.error);
}
run();