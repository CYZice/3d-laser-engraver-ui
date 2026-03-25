import { Environment, Float, OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CrystalSceneProps {
    positions: Float32Array | null;
    targetSize: [number, number, number]; // e.g. [5, 8, 5]
    pointSize: number;
    pointOpacity: number;
    pointDensity: number;
    backgroundColor: string;
}

export const CrystalScene: React.FC<CrystalSceneProps> = ({
    positions,
    targetSize,
    pointSize,
    pointOpacity,
    pointDensity,
    backgroundColor
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const geometryRef = useRef<THREE.BufferGeometry>(null);
    const materialRef = useRef<THREE.PointsMaterial>(null);

    // 待机自转动画 (Idle state interaction)
    useFrame((_state, delta) => {
        if (groupRef.current) {
            // 1.5 degrees per second = approx 0.026 rad/sec
            groupRef.current.rotation.y += delta * (Math.PI / 120);
        }
    });

    // 显存回收治理 (Performance & Fallback - Rule 4.2)
    useEffect(() => {
        return () => {
            if (geometryRef.current) {
                geometryRef.current.dispose();
            }
            if (materialRef.current) {
                materialRef.current.dispose();
            }
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
            <color attach="background" args={[backgroundColor]} />

            {/* 光影映射: 高光展柜风格的 HDRI (Rule 2.2) */}
            <Environment preset="studio" />

            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 10, 5]} intensity={2} />

            {/* 配合极微弱的上下悬浮动效 */}
            <Float speed={1.5} rotationIntensity={0} floatIntensity={0.2} floatingRange={[-0.1, 0.1]}>
                <group ref={groupRef}>
                    {/* 玻璃外部模型 (Rule 2.1) */}
                    <mesh>
                        <boxGeometry args={targetSize} />
                        <meshPhysicalMaterial
                            transmission={1}   // 物理级透射
                            ior={1.5}          // 玻璃折射率 (IOR)
                            roughness={0.1}    // 清漆感，略微的粗糙度呈现质感
                            thickness={2}      // 透射体积厚度
                            clearcoat={1}      // 表层高光
                            clearcoatRoughness={0.1}
                            color="#ffffff"
                        />
                    </mesh>

                    {/* 内部点云实体 */}
                    {positions && (
                        <points frustumCulled={false}>
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
                                color="#ffffff"
                                transparent={true}
                                opacity={pointOpacity}
                                blending={THREE.AdditiveBlending}
                                depthWrite={false}
                                sizeAttenuation={true} // 保持近大远小的透视感
                                toneMapped={false}
                            />
                        </points>
                    )}
                </group>
            </Float>

            {/* 用户干预检视 (Active Inspect - Rule 3.4) */}
            <OrbitControls
                enablePan={false}     // 强制禁用平移 (绝对不允许模型被拖出视口)
                enableDamping={true}  // 开启阻尼惯性
                dampingFactor={0.05}
                minDistance={10}      // 距离钳制 (最近距离)
                maxDistance={25}      // 距离钳制 (最远距离)
            />
        </>
    );
};
