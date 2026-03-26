import DxfParser from 'dxf-parser';

export interface DxfWorkerInput {
    type: 'PARSE_DXF';
    payload: {
        url: string;
        targetSize: [number, number, number];
    };
}

export interface DxfWorkerOutput {
    type: 'PARSE_SUCCESS' | 'PARSE_ERROR';
    payload?: {
        positions: Float32Array;
        pointCount: number;
        boundingSize: [number, number, number];
    };
    error?: string;
}

export const processDxfData = async (url: string, targetSize: [number, number, number]): Promise<DxfWorkerOutput> => {
    if (!url || typeof url !== 'string') {
        return { type: 'PARSE_ERROR', error: 'Invalid or missing DXF URL.' };
    }

    if (!Array.isArray(targetSize) || targetSize.length !== 3 || targetSize.some(v => typeof v !== 'number' || isNaN(v) || v <= 0)) {
        return { type: 'PARSE_ERROR', error: 'Invalid target size definition. Must be an array of three positive numbers.' };
    }

    try {
        console.log("[Worker] Fetching URL:", url);
        let dxfContent = '';
        if (url.startsWith('mock:')) {
            // For tests
            return { type: 'PARSE_SUCCESS', payload: { positions: new Float32Array(), pointCount: 0, boundingSize: [0, 0, 0] } };
        } else {
            const response = await fetch(url);
            console.log("[Worker] Fetch response ok?", response.ok);
            if (!response.ok) {
                throw new Error(`Failed to fetch DXF file: ${response.statusText}`);
            }
            dxfContent = await response.text();
            console.log("[Worker] Fetched content length:", dxfContent.length);
        }

        console.log("[Worker] Parsing DXF...");
        const parser = new DxfParser();
        const dxf = parser.parseSync(dxfContent);

        if (!dxf || !dxf.entities || dxf.entities.length === 0) {
            throw new Error('No entities found in DXF file.');
        }
        console.log("[Worker] DXF parsed, entities count:", dxf.entities.length);

        // Collect points from the various entities
        const rawPoints: number[] = [];

        for (const entity of dxf.entities) {
            if (entity.type === 'POINT') {
                rawPoints.push(entity.position.x || 0, entity.position.y || 0, entity.position.z || 0);
            } else if (entity.type === 'LINE') {
                rawPoints.push(entity.vertices[0].x || 0, entity.vertices[0].y || 0, entity.vertices[0].z || 0);
                rawPoints.push(entity.vertices[1].x || 0, entity.vertices[1].y || 0, entity.vertices[1].z || 0);
            } else if (entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE') {
                for (const vertex of entity.vertices) {
                    rawPoints.push(vertex.x || 0, vertex.y || 0, vertex.z || 0);
                }
            } else if (entity.type === '3DFACE' || entity.type === 'SOLID') {
                for (const vertex of entity.vertices) {
                    rawPoints.push(vertex.x || 0, vertex.y || 0, vertex.z || 0);
                }
            }
        }

        const pointCount = rawPoints.length / 3;
        if (pointCount === 0) {
            throw new Error('No points generated or parsed from DXF.');
        }

        const positions = new Float32Array(rawPoints);

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (let i = 0; i < pointCount; i++) {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];

            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (z < minZ) minZ = z;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            if (z > maxZ) maxZ = z;
        }

        if (minX === Infinity || maxX === -Infinity) {
            throw new Error('No points generated or parsed.');
        }

        const currentWidth = maxX - minX;
        const currentHeight = maxY - minY;
        const currentDepth = maxZ - minZ;

        const centerX = minX + currentWidth / 2;
        const centerY = minY + currentHeight / 2;
        const centerZ = minZ + currentDepth / 2;

        const targetWidth = targetSize[0] * 0.9;
        const targetHeight = targetSize[1] * 0.9;
        const targetDepth = targetSize[2] * 0.9;

        const scaleX = currentWidth > 0 ? targetWidth / currentWidth : 1;
        const scaleY = currentHeight > 0 ? targetHeight / currentHeight : 1;
        const scaleZ = currentDepth > 0 ? targetDepth / currentDepth : 1;

        let uniformScale = Math.min(scaleX, scaleY, scaleZ);
        if (!isFinite(uniformScale) || uniformScale <= 0) {
            uniformScale = 1;
        }

        for (let i = 0; i < pointCount; i++) {
            const idx = i * 3;
            positions[idx] = (positions[idx] - centerX) * uniformScale;
            positions[idx + 1] = (positions[idx + 1] - centerY) * uniformScale;
            positions[idx + 2] = (positions[idx + 2] - centerZ) * uniformScale;
        }

        // Shuffle points to allow uniform density adjustment (Rule: reference gen_3d_html.py logic)
        // Fisher-Yates shuffle on the indices
        const indices = new Uint32Array(pointCount);
        for (let i = 0; i < pointCount; i++) indices[i] = i;

        for (let i = pointCount - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        const shuffledPositions = new Float32Array(pointCount * 3);
        for (let i = 0; i < pointCount; i++) {
            const oldIdx = indices[i] * 3;
            const newIdx = i * 3;
            shuffledPositions[newIdx] = positions[oldIdx];
            shuffledPositions[newIdx + 1] = positions[oldIdx + 1];
            shuffledPositions[newIdx + 2] = positions[oldIdx + 2];
        }

        return {
            type: 'PARSE_SUCCESS',
            payload: {
                positions: shuffledPositions,
                pointCount: pointCount,
                boundingSize: [currentWidth * uniformScale, currentHeight * uniformScale, currentDepth * uniformScale]
            }
        };
    } catch (err: any) {
        return {
            type: 'PARSE_ERROR',
            error: err.message || 'Unknown parsing error occurred.'
        };
    }
};

// 判断是在 Web Worker 环境中才挂载 onmessage
if (typeof self !== 'undefined') {
    self.onmessage = async (event: MessageEvent<DxfWorkerInput>) => {
        const { data } = event;

        if (!data || data.type !== 'PARSE_DXF' || !data.payload) {
            self.postMessage({
                type: 'PARSE_ERROR',
                error: 'Invalid message format received by Web Worker.',
            } as DxfWorkerOutput);
            return;
        }
        // 模拟网络和解析延迟，确保 loading 阶段可见
        await new Promise(resolve => setTimeout(resolve, 500));
        const result = await processDxfData(data.payload.url, data.payload.targetSize);

        if (result.type === 'PARSE_SUCCESS' && result.payload?.positions) {
            (self as any).postMessage(result, [result.payload.positions.buffer]);
        } else {
            (self as any).postMessage(result);
        }
    };
}
