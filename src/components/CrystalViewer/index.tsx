import { Canvas } from '@react-three/fiber';
import React, { useEffect, useRef, useState } from 'react';
import { checkWebGLSupport } from '../../utils/webglChecker';
import { CrystalScene } from './CrystalScene';
import { DxfWorkerInput, DxfWorkerOutput } from './dxfParser.worker';
import DxfWorker from './dxfParser.worker?worker';

interface CrystalViewerProps {
    dxfUrl: string;
    fallbackImgUrl: string;
    targetSize?: [number, number, number];
    zIndex?: number;
}

const DEFAULT_TARGET_SIZE: [number, number, number] = [5, 8, 5];
const DEFAULT_POINT_SIZE = 0.06;
const DEFAULT_POINT_OPACITY = 0.35;
const DEFAULT_POINT_DENSITY = 1;
const DEFAULT_BACKGROUND = '#000000';

export const CrystalViewer: React.FC<CrystalViewerProps> = ({
    dxfUrl,
    fallbackImgUrl,
    targetSize = DEFAULT_TARGET_SIZE,
    zIndex = 1
}) => {
    const [webGLSupported, setWebGLSupported] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);
    const [errorObj, setErrorObj] = useState<string | null>(null);
    const [positions, setPositions] = useState<Float32Array | null>(null);
    const [pointSize, setPointSize] = useState<number>(DEFAULT_POINT_SIZE);
    const [pointOpacity, setPointOpacity] = useState<number>(DEFAULT_POINT_OPACITY);
    const [pointDensity, setPointDensity] = useState<number>(DEFAULT_POINT_DENSITY);

    const workerRef = useRef<Worker | null>(null);

    // 1. 初始化检测 WebGL 兼容性 (Rule 4.3)
    useEffect(() => {
        const isSupported = checkWebGLSupport();
        setWebGLSupported(isSupported);
    }, []);

    // 2. Web Worker 处理 DXF 点云解析 (Rule 4.1)
    useEffect(() => {
        if (!webGLSupported) return;
        if (!dxfUrl) {
            setErrorObj('模型数据缺失');
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setErrorObj(null);

        // Defensive check: ensure worker only initialized once per url
        try {
            workerRef.current = new DxfWorker();

            workerRef.current.onmessage = (e: MessageEvent<DxfWorkerOutput>) => {
                if (!isMounted) return;
                const result = e.data;
                console.log("[CrystalViewer] Worker returned result type:", result.type);
                if (result.type === 'PARSE_SUCCESS' && result.payload) {
                    console.log("[CrystalViewer] Points received:", result.payload.pointCount);
                    setPositions(result.payload.positions);
                    setLoading(false);
                } else {
                    console.error('[CrystalViewer] Worker error:', result.error);
                    setErrorObj(result.error || '解析失败');
                    setLoading(false);
                }
            };

            workerRef.current.onerror = (e) => {
                if (!isMounted) return;
                console.error('[CrystalViewer] Worker critical failure:', e);
                setErrorObj(e.message || '解析线程异常');
                setLoading(false);
            };

            // 发送解析任务
            console.log("[CrystalViewer] Sending DXF URL to worker:", dxfUrl);
            const payload: DxfWorkerInput = {
                type: 'PARSE_DXF',
                payload: { url: dxfUrl, targetSize }
            };
            workerRef.current.postMessage(payload);

        } catch (err: any) {
            if (!isMounted) return;
            console.error('[CrystalViewer] Error initializing Worker:', err);
            setErrorObj(err.message);
            setLoading(false);
        }

        return () => {
            isMounted = false;
            // Rule 4.2 显存与线程回收
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, [dxfUrl, webGLSupported, targetSize]);

    // 3. Fallback 渲染 (WebGL 不支持 或 Context Lost)
    if (!webGLSupported || errorObj) {
        return (
            <div
                style={{ zIndex, position: 'absolute', inset: 0, backgroundColor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
            >
                {fallbackImgUrl ? (
                    <img
                        src={fallbackImgUrl}
                        alt="3D 水晶回退预览"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                            // 防御性：如果连静态图都加载失败
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div style={{ color: '#666', fontSize: '1.2rem', padding: '20px' }}>预览内容不可用</div>
                )}
                {errorObj && (
                    <div style={{ position: 'absolute', bottom: 20, color: 'red', fontSize: '12px', background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: 4 }}>
                        3D 预览错误：{errorObj}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex }}>
            {/* Rule 3.1: 骨架屏加载期 (Loading State) */}
            {loading && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(224, 224, 224, 0.5)',
                    backdropFilter: 'blur(10px)',
                    color: '#333',
                    fontSize: '1.2rem',
                    letterSpacing: '2px'
                }}>
                    {/* 优雅的 Loading 动效 */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div className="spinner" style={{ width: 40, height: 40, border: '3px solid #ccc', borderTopColor: '#333', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span>模型解析中...</span>
                    </div>
                    <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
                </div>
            )}

            {/* Rule 3.2: 顺滑的渐现 (通过 R3F Canvas 挂载) */}
            <Canvas
                camera={{ position: [0, 0, 17], fov: 45 }}
                onCreated={({ gl }) => {
                    // Rule 4.3: WebGL Context Lost 致命错误降级
                    gl.domElement.addEventListener('webglcontextlost', (e) => {
                        e.preventDefault();
                        console.warn('[CrystalViewer] WebGL Context Lost! Initiating graceful fallback.');
                        setWebGLSupported(false);
                    }, false);
                }}
            >
                <CrystalScene
                    positions={positions}
                    targetSize={targetSize}
                    pointSize={pointSize}
                    pointOpacity={pointOpacity}
                    pointDensity={pointDensity}
                    backgroundColor={DEFAULT_BACKGROUND}
                />
            </Canvas>
            {!loading && (
                <div
                    style={{
                        position: 'absolute',
                        top: 14,
                        right: 16,
                        zIndex: 12,
                        color: '#aaa',
                        fontSize: 12,
                        lineHeight: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        pointerEvents: 'auto',
                        userSelect: 'none'
                    }}
                >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        点透明度
                        <input
                            type="range"
                            min={0.02}
                            max={1}
                            step={0.01}
                            value={pointOpacity}
                            onChange={(e) => setPointOpacity(parseFloat(e.target.value))}
                            style={{ width: 120, cursor: 'pointer', accentColor: '#888' }}
                        />
                        <span style={{ width: 44, display: 'inline-block', textAlign: 'right' }}>
                            {pointOpacity.toFixed(2)}
                        </span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        点大小
                        <input
                            type="range"
                            min={0.01}
                            max={0.12}
                            step={0.005}
                            value={pointSize}
                            onChange={(e) => setPointSize(parseFloat(e.target.value))}
                            style={{ width: 120, cursor: 'pointer', accentColor: '#888' }}
                        />
                        <span style={{ width: 44, display: 'inline-block', textAlign: 'right' }}>
                            {pointSize.toFixed(3)}
                        </span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        点密度
                        <input
                            type="range"
                            min={0.05}
                            max={1}
                            step={0.05}
                            value={pointDensity}
                            onChange={(e) => setPointDensity(parseFloat(e.target.value))}
                            style={{ width: 120, cursor: 'pointer', accentColor: '#888' }}
                        />
                        <span style={{ width: 44, display: 'inline-block', textAlign: 'right' }}>
                            {Math.round(pointDensity * 100)}%
                        </span>
                    </label>
                </div>
            )}
        </div>
    );
};
