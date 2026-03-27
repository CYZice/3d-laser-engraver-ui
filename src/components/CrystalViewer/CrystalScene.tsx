import { Environment, Float, OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

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
    targetSize,
    pointSize,
    pointOpacity,
    pointDensity,
    backgroundColor
}) => {
    const crystalScale = 1.35;
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
            <color attach="background" args={[backgroundColor]} />
            <Environment preset="studio" />
            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 10, 5]} intensity={1.2} />
            <pointLight position={[-8, 6, 8]} intensity={0.9} />

            <Float speed={1.5} rotationIntensity={0} floatIntensity={0.2} floatingRange={[-0.1, 0.1]}>
                <group ref={groupRef}>
                    <mesh renderOrder={2}>
                        <boxGeometry
                            args={[
                                Math.max(targetSize[0] * crystalScale, 1.6),
                                Math.max(targetSize[1] * crystalScale, 2.0),
                                Math.max(targetSize[2] * crystalScale, 1.3)
                            ]}
                        />
                        <meshPhysicalMaterial
                            transmission={1}
                            ior={1.5}
                            roughness={0.1}
                            thickness={2}
                            metalness={0}
                            clearcoat={1}
                            clearcoatRoughness={0.1}
                            color="#ffffff"
                        />
                    </mesh>
                    {positions && (
                        <points frustumCulled={false} renderOrder={3}>
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
                                sizeAttenuation={true}
                                blending={THREE.AdditiveBlending}
                                depthWrite={false}
                                depthTest={false}
                                toneMapped={false}
                            />
                        </points>
                    )}
                    <mesh renderOrder={4}>
                        <boxGeometry
                            args={[
                                Math.max(targetSize[0] * crystalScale, 1.6),
                                Math.max(targetSize[1] * crystalScale, 2.0),
                                Math.max(targetSize[2] * crystalScale, 1.3)
                            ]}
                        />
                        <meshPhysicalMaterial
                            transparent={true}
                            opacity={0.16}
                            roughness={0}
                            metalness={0.08}
                            clearcoat={1}
                            clearcoatRoughness={0.1}
                            depthWrite={false}
                            side={THREE.DoubleSide}
                            color="#dff8ff"
                        />
                    </mesh>
                </group>
            </Float>

            <OrbitControls
                enablePan={false}
                enableDamping={true}
                dampingFactor={0.05}
                minDistance={7}
                maxDistance={30}
            />
        </>
    );
};
