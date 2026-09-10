# Compatibility

## Declared target

Infra public alpha targets:

- Node.js 22 LTS and Node.js 24 LTS;
- Windows, Linux, and macOS;
- x64 and arm64 processors;
- local loopback networking and a writable project directory.

Node.js 20 and odd-numbered Node.js releases are not supported. Infra intentionally follows maintained LTS lines rather than accepting every newer runtime by default.

## Verified evidence

The complete local suite currently passes on Windows x64 with Node.js 24.19.0. The compatibility contract also tests acceptance and rejection of declared Node.js majors, platforms, and processor architectures.

The repository includes a GitHub Actions matrix for Windows x64, Linux x64, Linux arm64, and macOS arm64 on Node.js 22 and 24. On 9 September 2026, all eight combinations completed successfully in [CI run #4](https://github.com/caelancarmer/infra/actions/runs/34296942147). Every job ran the package suite and then reconstructed, tested, installed, and removed a manifest-only clean-room package.

The package uses only Node.js built-in modules and no operating-system-specific shell scripts. GitHub-hosted runners provide native execution evidence for Windows x64, Linux x64, Linux arm64, macOS arm64, Node.js 22, and Node.js 24. Windows arm64 has not yet been independently exercised, so compatibility claims should name the verified operating-system and architecture combinations rather than imply every cross-product is covered.

Run the environment check:

```bash
npm run compatibility
```

Run the complete package suite:

```bash
npm test
```

Rehearse from a clean manifest-only package:

```bash
npm run clean-room
```

## Deliberate limitations

- The local runtime binds only to loopback addresses.
- The local store is JSONL and is not a production database.
- Containers, managed databases, high availability, backup automation, and production orchestration are outside this public alpha.
- Compatibility outside the declared target is unsupported even when it happens to work.
