{
  lib,
  stdenvNoCC,
  callPackage,
  bun,
  nodejs,
  sysctl,
  makeBinaryWrapper,
  models-dev,
  ripgrep,
  wayland,
  installShellFiles,
  versionCheckHook,
  writableTmpDirAsHomeHook,
  node_modules ? callPackage ./node_modules.nix { },
}:
stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "uf0rs";
  inherit (node_modules) version src;
  inherit node_modules;

  nativeBuildInputs = [
    bun
    nodejs # for patchShebangs node_modules
    installShellFiles
    makeBinaryWrapper
    models-dev
    writableTmpDirAsHomeHook
  ];

  postPatch = ''
    # NOTE: Relax Bun version check to be a warning instead of an error
    substituteInPlace packages/script/src/index.ts \
      --replace-fail 'throw new Error(`This script requires bun@''${expectedBunVersionRange}' \
                     'console.warn(`Warning: This script requires bun@''${expectedBunVersionRange}'
  '';

  configurePhase = ''
    runHook preConfigure

    cp -R ${finalAttrs.node_modules}/. .
    patchShebangs node_modules
    patchShebangs packages/*/node_modules

    runHook postConfigure
  '';

  env.MODELS_DEV_API_JSON = "${models-dev}/dist/_api.json";
  env.UF0RS_DISABLE_MODELS_FETCH = true;
  env.UF0RS_VERSION = finalAttrs.version;
  env.UF0RS_CHANNEL = "prod";
  env.NODE_OPTIONS = "--max-old-space-size=4096";

  buildPhase = ''
    runHook preBuild

    cd ./packages/cli
    bun --bun ./script/build.ts --single --skip-install

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    install -Dm755 dist/cli-*/bin/uf0rs $out/bin/uf0rs

    # OpenTUI dlopens Wayland for clipboard images.
    wrapProgram $out/bin/uf0rs \
      --prefix PATH : ${
        lib.makeBinPath (
          [
            ripgrep
          ]
          # bun runs sysctl to detect if running on rosetta2
          ++ lib.optional stdenvNoCC.hostPlatform.isDarwin sysctl
        )
      } ${lib.optionalString stdenvNoCC.hostPlatform.isLinux ''
        --prefix LD_LIBRARY_PATH : ${lib.makeLibraryPath [ wayland ]}
      ''}

    ln -s uf0rs $out/bin/uf0rs2

    runHook postInstall
  '';

  postInstall = lib.optionalString (stdenvNoCC.buildPlatform.canExecute stdenvNoCC.hostPlatform) ''
    # v2 dropped the `completion` subcommand; --completions is the global flag.
    # --completions also accepts sh, which emits the same script as bash.
    # staged to files, substitute below rejects anything that is not a regular file
    $out/bin/uf0rs --completions bash > uf0rs.bash
    $out/bin/uf0rs --completions zsh > _uf0rs
    $out/bin/uf0rs --completions fish > uf0rs.fish

    installShellCompletion --cmd uf0rs \
      --bash uf0rs.bash \
      --fish uf0rs.fish \
      --zsh _uf0rs

    # UF0RS_CLI_NAME is a build-time define, so the uf0rs2 copies are
    # renamed rather than regenerated. --replace-fail is a global literal
    # substitution, so any lowercase uf0rs that later appears in a
    # description or help text ships as uf0rs2 in the uf0rs2 copy.
    substitute uf0rs.bash uf0rs2.bash --replace-fail uf0rs uf0rs2
    substitute _uf0rs _uf0rs2 --replace-fail uf0rs uf0rs2
    substitute uf0rs.fish uf0rs2.fish --replace-fail uf0rs uf0rs2

    installShellCompletion --cmd uf0rs2 \
      --bash uf0rs2.bash \
      --fish uf0rs2.fish \
      --zsh _uf0rs2
  '';

  nativeInstallCheckInputs = [
    versionCheckHook
    writableTmpDirAsHomeHook
  ];
  doInstallCheck = true;
  versionCheckKeepEnvironment = [ "HOME" "UF0RS_DISABLE_MODELS_FETCH" ];
  versionCheckProgramArg = "--version";

  passthru = {
    env = finalAttrs.env;
  };

  meta = {
    description = "The open source coding agent";
    homepage = "https://wopps.ai";
    license = lib.licenses.mit;
    mainProgram = "uf0rs";
    inherit (node_modules.meta) platforms;
  };
})
