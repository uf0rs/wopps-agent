import React from "react";
import type { SceneProps } from "../types";
import { Title } from "./Title";
import { Statement } from "./Statement";
import { Bullets } from "./Bullets";
import { Terminal } from "./Terminal";
import { Code } from "./Code";
import { AppWindow } from "./AppWindow";
import { Stats } from "./Stats";
import { Compare } from "./Compare";
import { Steps } from "./Steps";
import { Montage } from "./Montage";
import { Quote } from "./Quote";
import { Outro } from "./Outro";

export const REGISTRY: Record<string, React.FC<SceneProps>> = {
  title: Title,
  statement: Statement,
  bullets: Bullets,
  terminal: Terminal,
  code: Code,
  window: AppWindow,
  screenshot: AppWindow,
  stats: Stats,
  compare: Compare,
  steps: Steps,
  montage: Montage,
  quote: Quote,
  outro: Outro,
};
