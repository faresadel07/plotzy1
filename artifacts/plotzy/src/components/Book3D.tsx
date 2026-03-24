import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";

interface Book3DProps {
    color?: string;
    spineText?: string;
    width?: number; // scale
    height?: number;
    depth?: number;
    decorType?: 'none' | 'simple' | 'heavy' | 'lines';
    isPaper?: boolean;
}

export function Book3D({
    color = "#4a1c20",
    spineText = "",
    width = 0.5,
    height = 3.5,
    depth = 2.5,
    decorType = 'none',
    isPaper = false
}: Book3DProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);
    useCursor(hovered);

    // Slowly rotate for display if not interacted with
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1 - Math.PI / 8;
        }
    });

    // Materials
    const materials = useMemo(() => {
        // 0: right, 1: left (spine), 2: top, 3: bottom, 4: front (cover), 5: back

        const coverMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            roughness: 0.8,
            metalness: 0.1,
        });

        const pageMaterial = new THREE.MeshStandardMaterial({
            color: "#d1c1a3",
            roughness: 1,
            metalness: 0,
        });

        if (isPaper) {
            return [coverMaterial, pageMaterial, coverMaterial, coverMaterial, pageMaterial, pageMaterial];
        }

        return [
            pageMaterial, // right edge (pages)
            coverMaterial, // left (spine)
            pageMaterial, // top (pages)
            pageMaterial, // bottom (pages)
            coverMaterial, // front cover
            coverMaterial  // back cover
        ];
    }, [color, isPaper]);

    // Handle spine text via a simple canvas texture
    const textTexture = useMemo(() => {
        if (!spineText) return null;
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#d4a953"; // Gold
            ctx.font = "bold 80px 'Times New Roman'";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Math.PI / 2); // Rotate text for spine
            ctx.fillText(spineText, 0, 0);
            ctx.restore();

            // Add fake spine decorations
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            if (decorType === 'simple' || decorType === 'heavy') {
                ctx.fillRect(0, 50, canvas.width, 10);
                ctx.fillRect(0, canvas.height - 50, canvas.width, 10);
            }
            if (decorType === 'heavy') {
                ctx.fillRect(0, 150, canvas.width, 10);
                ctx.fillRect(0, canvas.height - 150, canvas.width, 10);
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        return tex;
    }, [spineText, color, decorType]);

    // Clone materials to apply spine text
    const meshMaterials = useMemo(() => {
        if (!textTexture || isPaper) return materials;
        const mats = [...materials];
        mats[1] = new THREE.MeshStandardMaterial({
            map: textTexture,
            roughness: 0.7,
            metalness: 0.2
        });
        return mats;
    }, [materials, textTexture, isPaper]);

    return (
        <mesh
            ref={meshRef}
            castShadow
            receiveShadow
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            position={[0, 0, 0]}
        >
            <boxGeometry args={[width, height, depth]} />
            {meshMaterials.map((mat, i) => (
                <primitive object={mat} attach={`material-${i}`} key={i} />
            ))}
        </mesh>
    );
}
