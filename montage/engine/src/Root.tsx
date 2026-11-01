import React from "react";
import { Composition, getInputProps } from "remotion";
import { MontageVideo } from "./Video";
import { DEMO } from "./demo";
import type { Project } from "./types";

/** Union of the built-in demo and whatever the CLI passes through `--props`. */
const resolve = (): Project => {
  const input = getInputProps() as Partial<Project>;
  if (!input || !Array.isArray(input.scenes) || input.scenes.length === 0) return DEMO;
  return {
    ...DEMO,
    ...input,
    brand: { ...DEMO.brand, ...input.brand },
    captionsData: input.captionsData ?? [],
  };
};

const project = resolve();

export const Root: React.FC = () => (
  <>
    <Composition
      id="Montage"
      component={MontageVideo}
      durationInFrames={project.totalFrames}
      fps={project.fps}
      width={project.width}
      height={project.height}
      defaultProps={project}
    />
  </>
);
