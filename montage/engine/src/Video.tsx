import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FontLoader } from "./lib/fonts";
import { PaletteProvider } from "./lib/colors";
import { palette } from "./lib/theme";
import { Captions, Hud, SceneShell } from "./components/Overlay";
import { REGISTRY } from "./scenes";
import type { Project } from "./types";

export const MontageVideo: React.FC<Project> = (project) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const starts = useMemo(() => {
    let cursor = 0;
    return project.scenes.map((scene) => {
      const start = cursor;
      cursor += scene.duration;
      return start;
    });
  }, [project.scenes]);
  const sceneIndex = Math.max(
    0,
    starts.reduce((accumulator, start, index) => (frame >= start ? index : accumulator), 0),
  );
  const tint = palette(project.palette).accent;

  return (
    <PaletteProvider overrides={project.palette}>
      <FontLoader>
        <AbsoluteFill style={{ background: palette(project.palette).bg }}>
          {project.scenes.map((scene, index) => {
            const Component = REGISTRY[scene.type];
            if (!Component) return null;
            return (
              <Sequence
                key={scene.id}
                from={starts[index]}
                durationInFrames={scene.duration}
                name={`${scene.id} ${scene.type}`}
                premountFor={Math.min(fps, starts[index])}
              >
                <SceneShell duration={scene.duration}>
                  <Component scene={scene} index={index} duration={scene.duration} />
                </SceneShell>
              </Sequence>
            );
          })}
          {project.captions && project.captionsData.length > 0 ? <Captions captions={project.captionsData} /> : null}
          {project.hud ? (
            <Hud
              brand={project.brand.name}
              sceneIndex={sceneIndex + 1}
              sceneCount={project.scenes.length}
              totalSeconds={project.totalSeconds}
              accent={project.brand.accent}
            />
          ) : null}
          {project.audio ? <Audio src={staticFile(project.audio)} /> : null}
        </AbsoluteFill>
      </FontLoader>
    </PaletteProvider>
  );
};
