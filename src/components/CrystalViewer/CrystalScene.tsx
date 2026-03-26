import { Environment, Float, OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// 1. 修复第一个错误：显式定义接口 CrystalSceneProps
interface CrystalSceneProps {
    positions: Float32Array | null;
    targetSize: [number, number, number];
    pointSize: number;
    pointOpacity: number;
    pointDensity: number;
    backgroundColor: string;
}

export const CrystalScene: React.FC<CrystalSceneProps> = ({
    positions,
    targetSize: _targetSize,
    pointSize,
    pointOpacity,
    pointDensity,
    backgroundColor
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const geometryRef = useRef<THREE.BufferGeometry>(null);
    const materialRef = useRef<THREE.PointsMaterial>(null);

    useFrame((_state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * (Math.PI / 120);
        }
    });

    useEffect(() => {
        return () => {
            if (geometryRef.current) geometryRef.current.dispose();
            if (materialRef.current) materialRef.current.dispose();
        };
    }, []);

    useEffect(() => {
        if (!geometryRef.current || !positions) return;
        const total = positions.length / 3;
        const visible = Math.max(1, Math.floor(total * pointDensity));
        geometryRef.current.setDrawRange(0, visible);
    }, [positions, pointDensity]);

    return (
        <>
            {/* 2. 修复第二个错误：使用 backgroundColor 变量 */}
            <color attach="background" args={[backgroundColor]} />

            <Environment preset="studio" />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />

            <Float speed={1.5} rotationIntensity={0} floatIntensity={0.2} floatingRange={[-0.1, 0.1]}>
                <group ref={groupRef}>

                    {/* 内部白色点云 */}
                    {positions && (
                        <points frustumCulled={false} renderOrder={1}>
                            <bufferGeometry ref={geometryRef}>
                                <bufferAttribute
                                    attach="attributes-position"
                                    count={positions.length / 3}
                                    array={positions}
                                    itemSize={3}
                                />
                            </bufferGeometry>
                            <pointsMaterial
                                ref={materialRef}
                                size={pointSize}
                                color="#ffffff"              // 强烈要求：白色点
                                transparent={true}
                                opacity={pointOpacity}
                                sizeAttenuation={true}

                                // --- 解决“白色不见了”的关键方案 ---
                                blending={THREE.AdditiveBlending} // 加法混合，让点在玻璃内部“发光”
                                depthWrite={false}               // 关闭深度写入，防止遮挡错误
                                toneMapped={false}               // 避免被场景渲染器压暗
                            />
                        </points>
                    )}
                </group>
            </Float>

            <OrbitControls
                enablePan={false}
                enableDamping={true}
                dampingFactor={0.05}
                minDistance={5}
                maxDistance={30}
            />
        </>
    );
};
