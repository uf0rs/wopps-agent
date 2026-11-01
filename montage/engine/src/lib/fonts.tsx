import React, { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

const FACES = [
  { family: "Unbounded", file: "fonts/Unbounded.ttf", weight: "200 900" },
  { family: "Golos Text", file: "fonts/GolosText.ttf", weight: "400 900" },
  { family: "JetBrains Mono", file: "fonts/JetBrainsMono.ttf", weight: "300 800" },
  { family: "Oswald", file: "fonts/Oswald.ttf", weight: "300 700" },
  { family: "Manrope", file: "fonts/Manrope.ttf", weight: "300 800" },
];

let loaded = false;

/** Blocks the first frame until every face is ready, so text never reflows mid-render. */
export const FontLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => (loaded ? null : delayRender("montage-fonts")));
  const [ready, setReady] = useState(loaded);

  useEffect(() => {
    if (loaded) return;
    (async () => {
      try {
        await Promise.all(
          FACES.map(async (face) => {
            const font = new FontFace(face.family, `url(${staticFile(face.file)})`, {
              weight: face.weight,
            });
            await font.load();
            document.fonts.add(font);
          }),
        );
        await Promise.all(FACES.map((face) => document.fonts.load(`700 64px "${face.family}"`)));
      } catch (error) {
        console.error("font load failed", error);
      }
      loaded = true;
      setReady(true);
      if (handle !== null) continueRender(handle);
    })();
  }, [handle]);

  return ready ? <>{children}</> : null;
};
