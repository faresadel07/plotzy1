import { useState } from "react";
import { useAudio } from "@/hooks/use-audio";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Volume2, VolumeX, CloudRain, Wind, Coffee, Bird, Pause } from "lucide-react";

// Using highly stable wikimedia commons public domain ogg files
const TRACKS = [
    { id: 'rain', name: 'Rainstorm', icon: CloudRain, url: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Rain_sounds.ogg' },
    { id: 'birds', name: 'Forest Birds', icon: Bird, url: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Bird_sounds_in_spring.ogg' },
    { id: 'cafe', name: 'Coffee Shop', icon: Coffee, url: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Ambience_-_Coffee_Shop_-_01.ogg' },
    { id: 'wind', name: 'Soft Wind', icon: Wind, url: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Wind_noise.ogg' },
];

export function AmbientSoundscape() {
    const { isPlaying, volume, setVolume, currentTrack, toggle } = useAudio();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-full border-border/50 bg-background/50 backdrop-blur-md transition-all hover:bg-background/80">
                    {isPlaying ? <Volume2 className="w-4 h-4 text-primary animate-pulse" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                    <span className="hidden sm:inline font-medium tracking-tight">{isPlaying ? "Atmosphere On" : "Atmosphere"}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-5 rounded-2xl border-border/50 bg-background/80 backdrop-blur-2xl shadow-2xl" align="end" sideOffset={10}>
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold tracking-tight text-foreground">Ambient Soundscapes</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {TRACKS.map(track => {
                            const Icon = track.icon;
                            const isActive = isPlaying && currentTrack === track.url;
                            return (
                                <Button
                                    key={track.id}
                                    variant={isActive ? "default" : "outline"}
                                    className={`flex flex-col items-center justify-center gap-2 h-20 transition-all ${isActive ? 'shadow-lg shadow-primary/20 scale-105 border-primary/50' : 'hover:border-primary/30 hover:bg-primary/5'}`}
                                    onClick={() => toggle(track.url)}
                                >
                                    {isActive ? <Pause className="w-6 h-6" /> : <Icon className="w-6 h-6 text-muted-foreground" />}
                                    <span className="text-xs font-medium">{track.name}</span>
                                </Button>
                            )
                        })}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-border/40">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Volume</span>
                            <span className="text-xs font-bold text-foreground bg-secondary/50 px-2 py-0.5 rounded-full">{Math.round(volume * 100)}%</span>
                        </div>
                        <Slider
                            value={[volume]}
                            min={0}
                            max={1}
                            step={0.01}
                            onValueChange={([v]) => setVolume(v)}
                            className="py-1 cursor-grab active:cursor-grabbing"
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
