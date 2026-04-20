import { useAudio } from "@/hooks/use-audio";
import type { AmbientPresetId } from "@/lib/procedural-ambient";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Volume2, VolumeX, Pause,
  CloudRain, Wind, Coffee, Bird,
  Flame, Waves, Zap, Moon, Snowflake, TrainFront, Radio, Cloud,
} from "lucide-react";

interface Preset {
  id: AmbientPresetId;
  name: string;
  icon: typeof CloudRain;
}

const TRACKS: Preset[] = [
  { id: "rain",         name: "Rainstorm",      icon: CloudRain  },
  { id: "wind",         name: "Soft Wind",      icon: Wind       },
  { id: "ocean",        name: "Ocean Waves",    icon: Waves      },
  { id: "thunderstorm", name: "Thunderstorm",   icon: Zap        },
  { id: "fireplace",    name: "Fireplace",      icon: Flame      },
  { id: "crickets",     name: "Night Crickets", icon: Moon       },
  { id: "birds",        name: "Forest Birds",   icon: Bird       },
  { id: "cafe",         name: "Coffee Shop",    icon: Coffee     },
  { id: "snow",         name: "Snow Storm",     icon: Snowflake  },
  { id: "train",        name: "Train Journey",  icon: TrainFront },
  { id: "white-noise",  name: "White Noise",    icon: Radio      },
  { id: "brown-noise",  name: "Brown Noise",    icon: Cloud      },
];

export function AmbientSoundscape() {
  const { isPlaying, volume, setVolume, currentTrack, toggle } = useAudio();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`rounded-xl transition-colors ${
            isPlaying
              ? "text-foreground bg-white/10"
              : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
          }`}
          title={isPlaying ? "Atmosphere On" : "Atmosphere"}
        >
          {isPlaying ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[340px] p-5 rounded-2xl border-border/50 bg-background/90 backdrop-blur-2xl shadow-2xl"
        align="end"
        sideOffset={10}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold tracking-tight text-foreground">Ambient Soundscapes</h4>
            {isPlaying && currentTrack && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Now: {TRACKS.find(t => t.id === currentTrack)?.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {TRACKS.map(track => {
              const Icon = track.icon;
              const isActive = isPlaying && currentTrack === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => toggle(track.id)}
                  className={`group flex flex-col items-center justify-center gap-1.5 h-[72px] rounded-xl border transition-all ${
                    isActive
                      ? "border-white/30 bg-white/10 shadow-inner"
                      : "border-border/40 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  {isActive ? (
                    <Pause className="w-4 h-4 text-foreground" />
                  ) : (
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                  <span className="text-[10px] font-semibold text-foreground/80 leading-tight text-center px-1">
                    {track.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Volume
              </span>
              <span className="text-[10px] font-bold text-foreground bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                {Math.round(volume * 100)}%
              </span>
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
