import { Canvas } from "@react-three/fiber";
import { PresentationControls, Environment, ContactShadows } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { Book3D } from "./Book3D";
import { X, BookOpen, Edit3 } from "lucide-react";
import { Button } from "./ui/button";

interface BookViewerOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    bookData: {
        title: string;
        author: string;
        color: string;
        spineText: string;
        decorType: 'none' | 'simple' | 'heavy' | 'lines';
        isPaper?: boolean;
        id?: number;
    } | null;
}

export function BookViewerOverlay({ isOpen, onClose, bookData }: BookViewerOverlayProps) {
    return (
        <AnimatePresence>
            {isOpen && bookData && (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    transition={{ duration: 0.4 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/80"
                >
                    {/* Close Area */}
                    <div className="absolute inset-0 z-0 cursor-pointer" onClick={onClose} />

                    <div className="absolute top-6 right-6 z-20">
                        <Button variant="outline" size="icon" onClick={onClose} className="rounded-full bg-background/50 backdrop-blur border-border/50">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <motion.div
                        initial={{ scale: 0.8, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 30 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="w-full h-[70vh] flex flex-col md:flex-row items-center justify-center relative z-10 max-w-6xl mx-auto"
                    >
                        {/* 3D Canvas Area */}
                        <div className="w-full md:w-2/3 h-full cursor-grab active:cursor-grabbing relative">
                            <Canvas shadows camera={{ position: [0, 0, 6], fov: 45 }}>
                                <ambientLight intensity={0.5} />
                                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
                                <Environment preset="city" />

                                <PresentationControls
                                    global
                                    rotation={[0.13, 0.1, 0]}
                                    polar={[-0.4, 0.2]}
                                    azimuth={[-1, 0.75]}
                                    snap={true}
                                >
                                    <Book3D
                                        color={bookData.color}
                                        spineText={bookData.spineText}
                                        decorType={bookData.decorType}
                                        isPaper={bookData.isPaper}
                                    />

                                    <ContactShadows position={[0, -2, 0]} opacity={0.6} scale={20} blur={2} far={4} />
                                </PresentationControls>
                            </Canvas>

                            <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none">
                                <p className="text-sm font-semibold text-muted-foreground bg-background/40 backdrop-blur-md px-3 py-1 rounded-full inline-block border border-border/30">
                                    Drag to rotate book
                                </p>
                            </div>
                        </div>

                        {/* Book Info Panel */}
                        <div className="w-full md:w-1/3 p-8 flex flex-col justify-center space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold tracking-tight text-foreground">{bookData.title}</h2>
                                <p className="text-lg text-primary font-semibold">by {bookData.author}</p>
                            </div>

                            <div className="h-px bg-border/50 w-full" />

                            <div className="flex flex-col gap-3">
                                <Button className="w-full rounded-xl gap-2 font-semibold shadow-lg shadow-primary/20">
                                    <BookOpen className="w-4 h-4" />
                                    Read Story
                                </Button>
                                {bookData.id && (
                                    <Button variant="secondary" className="w-full rounded-xl gap-2">
                                        <Edit3 className="w-4 h-4" />
                                        Edit Chapters
                                    </Button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
