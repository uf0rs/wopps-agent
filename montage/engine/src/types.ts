export type Background =
  | "flat"
  | "grid"
  | "particles"
  | "glow"
  | "floor"
  | "nebula";

export type Palette = {
  bg: string;
  bgSoft: string;
  accent: string;
  accent2: string;
  white: string;
  dim: string;
  panel: string;
  line: string;
  green: string;
  amber: string;
  red: string;
  violet: string;
};

export type SceneBase = {
  id: string;
  type: string;
  duration: number;
  vo?: string;
  bg?: Background;
  accent?: string;
  hud?: boolean;
};

export type TitleScene = SceneBase & {
  type: "title";
  kicker?: string;
  headline: string;
  sub?: string;
};

export type StatementScene = SceneBase & {
  type: "statement";
  lines: string[];
  sub?: string;
};

export type BulletsScene = SceneBase & {
  type: "bullets";
  title?: string;
  kicker?: string;
  items: { title: string; text?: string }[];
};

export type TerminalScene = SceneBase & {
  type: "terminal";
  title?: string;
  cwd?: string;
  commands: { cmd: string; out?: string[]; pause?: number }[];
};

export type CodeScene = SceneBase & {
  type: "code";
  file?: string;
  lines: { text: string; kind?: "add" | "del" | "dim" | "accent" }[];
};

export type WindowScene = SceneBase & {
  type: "window";
  title?: string;
  url?: string;
  screenshot?: string;
  cards?: { title: string; text?: string; meta?: string }[];
  callouts?: string[];
};

export type StatsScene = SceneBase & {
  type: "stats";
  kicker?: string;
  title?: string;
  items: { label: string; value: number; suffix?: string; prefix?: string; color?: string }[];
};

export type CompareScene = SceneBase & {
  type: "compare";
  title?: string;
  left: { title: string; items: string[]; tone?: "bad" | "good" };
  right: { title: string; items: string[]; tone?: "bad" | "good" };
};

export type StepsScene = SceneBase & {
  type: "steps";
  title?: string;
  items: { title: string; text?: string }[];
};

export type MontageScene = SceneBase & {
  type: "montage";
  cards: { tag?: string; title: string; text?: string; color?: string }[];
};

export type QuoteScene = SceneBase & {
  type: "quote";
  text: string;
  author?: string;
};

export type OutroScene = SceneBase & {
  type: "outro";
  headline: string;
  sub?: string;
  cta?: string;
  brand?: string;
};

export type Scene =
  | TitleScene
  | StatementScene
  | BulletsScene
  | TerminalScene
  | CodeScene
  | WindowScene
  | StatsScene
  | CompareScene
  | StepsScene
  | MontageScene
  | QuoteScene
  | OutroScene;

export type Caption = { start: number; end: number; text: string };

export type Project = {
  slug: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  brand: { name: string; accent?: string; tagline?: string };
  palette?: Partial<Palette>;
  hud: boolean;
  captions: boolean;
  audio?: string;
  totalFrames: number;
  totalSeconds: number;
  scenes: Scene[];
  captionsData: Caption[];
};

export type SceneProps = { scene: Scene; index: number; duration: number };
