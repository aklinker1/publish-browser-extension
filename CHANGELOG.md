# Changelog

## v4.0.5

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v4.0.4...v4.0.5)

### 🩹 Fixes

- **cws:** Add handling of errors in 200 response from CWS ([#63](https://github.com/aklinker1/publish-browser-extension/pull/63))
- Fix invalid chrome zips ([#66](https://github.com/aklinker1/publish-browser-extension/pull/66))

### 🏡 Chore

- Fix formatting ([b6d4ae5](https://github.com/aklinker1/publish-browser-extension/commit/b6d4ae5))

### ❤️ Contributors

- Aaron ([@aklinker1](https://github.com/aklinker1))
- Rolf Erik Lekang ([@relekang](https://github.com/relekang))

## v4.0.4

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v4.0.3...v4.0.4)

### 🩹 Fixes

- Better typings & make windows development available ([#60](https://github.com/aklinker1/publish-browser-extension/pull/60))
- Use `default` instead of `import` for bundler exports ([08feb89](https://github.com/aklinker1/publish-browser-extension/commit/08feb89))

### 🤖 CI

- Enable CI on PRs ([b27d581](https://github.com/aklinker1/publish-browser-extension/commit/b27d581))
- Fix validation workflow ([49796be](https://github.com/aklinker1/publish-browser-extension/commit/49796be))

### ❤️ Contributors

- Aaron ([@aklinker1](https://github.com/aklinker1))
- Julien <julienconstant190@gmail.com>

## v4.0.3

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v4.0.2...v4.0.3)

### 🤖 CI

- Add pkg.pr.new to test unreleased commits and PRs ([d9bf2ec](https://github.com/aklinker1/publish-browser-extension/commit/d9bf2ec))
- Rename workflow ([654df5e](https://github.com/aklinker1/publish-browser-extension/commit/654df5e))
- Rename job ([cc63e3e](https://github.com/aklinker1/publish-browser-extension/commit/cc63e3e))

### ❤️ Contributors

- Aaron ([@aklinker1](https://github.com/aklinker1))

## v4.0.2

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v4.0.1...v4.0.2)

### 🩹 Fixes

- **init:** Improve UX when not selecting a store ([#57](https://github.com/aklinker1/publish-browser-extension/pull/57))

### ❤️ Contributors

- Aaron ([@aklinker1](https://github.com/aklinker1))

## v4.0.1

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v4.0.0...v4.0.1)

### 🩹 Fixes

- **firefox:** Remove unnecessary brackets ([#52](https://github.com/aklinker1/publish-browser-extension/pull/52))
- **Edge:** Catch errors instead of checking response.ok ([#54](https://github.com/aklinker1/publish-browser-extension/pull/54))
- Strip curly braces from firefox URL if present ([#56](https://github.com/aklinker1/publish-browser-extension/pull/56))
- Add missing import for `publish-web-extension/cli` for WXT #2076 ([#2076](https://github.com/aklinker1/publish-browser-extension/issues/2076))

### 📖 Documentation

- Update contributor setup to use bun ([#49](https://github.com/aklinker1/publish-browser-extension/pull/49))

### 🏡 Chore

- Add back `engines` to package.json ([735e152](https://github.com/aklinker1/publish-browser-extension/commit/735e152))
- Update checks ([f1f735e](https://github.com/aklinker1/publish-browser-extension/commit/f1f735e))
- Remove tsup dev dep ([d41ff0f](https://github.com/aklinker1/publish-browser-extension/commit/d41ff0f))
- Load env vars from `.env.submit` in scripts ([783c8d2](https://github.com/aklinker1/publish-browser-extension/commit/783c8d2))

### ❤️ Contributors

- Aaron ([@aklinker1](https://github.com/aklinker1))
- Sachit Vithaldas ([@sachitv](https://github.com/sachitv))
- Julien <julienconstant190@gmail.com>
- MengXi <z1219202167@outlook.com>

## v4.0.0

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v3.0.3...v4.0.0)

### 🩹 Fixes

- Require selecting at least one store during init command ([e6469de](https://github.com/aklinker1/publish-browser-extension/commit/e6469de))
- Add `oxlint` and handle uncaught API error for Edge ([#44](https://github.com/aklinker1/publish-browser-extension/pull/44))

### 🏡 Chore

- Use `bun:test` instead of `vitest` ([#43](https://github.com/aklinker1/publish-browser-extension/pull/43))
- ⚠️ Drop CJS support and build package with `tsdown` ([#45](https://github.com/aklinker1/publish-browser-extension/pull/45))

#### ⚠️ Breaking Changes

- ⚠️ Drop CJS support and build package with `tsdown` ([#45](https://github.com/aklinker1/publish-browser-extension/pull/45))

### ❤️ Contributors

- Aaron ([@aklinker1](https://github.com/aklinker1))

## v3.0.3

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v3.0.2...v3.0.3)

### 🏡 Chore

- Migrate to bun for development + NPM OIDC publish flow ([#42](https://github.com/aklinker1/publish-browser-extension/pull/42))

## v3.0.2

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v3.0.1...v3.0.2)

## v3.0.1

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v3.0.0...v3.0.1)

### 🩹 Fixes

- Upgrade package version ([30cc59f](https://github.com/aklinker1/publish-browser-extension/commit/30cc59f))
- Remove unused CLI flags ([f59eef9](https://github.com/aklinker1/publish-browser-extension/commit/f59eef9))
- **cws:** Properly provide the `deployPercentage` and `reviewExemption` options ([#37](https://github.com/aklinker1/publish-browser-extension/pull/37))

### 🏡 Chore

- Update changelog ([1d4b579](https://github.com/aklinker1/publish-browser-extension/commit/1d4b579))

## v3.0.0

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v2.3.0...v3.0.0)

#### ⚠️ Breaking Changes

- ⚠️ **edge**: Drop support for v1.0 API authentication ([#32](https://github.com/aklinker1/publish-browser-extension/pull/32))

  Re-run `publish-extension init` or `wxt submit init` and select the "Edge" store. Follow instructions to get new API key required for the Edge API v1.1.

## v2.3.1

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v2.3.0...v2.3.1)

### 🩹 Fixes

- **init:** Trim whitespace ([#31](https://github.com/aklinker1/publish-browser-extension/pull/31))

### 🤖 CI

- Fix validate workflow triggers ([c7f8508](https://github.com/aklinker1/publish-browser-extension/commit/c7f8508))

### ❤️ Contributors

- Gabriel Miranda ([@gabrielmfern](http://github.com/gabrielmfern))

## v2.3.0

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v2.2.2...v2.3.0)

### 🚀 Enhancements

- Add Edge API v1.1 support ([#29](https://github.com/aklinker1/publish-browser-extension/pull/29))

### 🩹 Fixes

- **edge:** Remove new X-ClientID header from v1.0 requests ([5446ac0](https://github.com/aklinker1/publish-browser-extension/commit/5446ac0))

### 🤖 CI

- Fix workflow for forks ([9c305a9](https://github.com/aklinker1/publish-browser-extension/commit/9c305a9))
- Fix workflow for forks ([c7bc76d](https://github.com/aklinker1/publish-browser-extension/commit/c7bc76d))

### ❤️ Contributors

- Mezannic ([@mezannic](http://github.com/mezannic))

## v2.2.2

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v2.2.1...v2.2.2)

### 🩹 Fixes

- Trim spaces from secret values ([70d8aa0](https://github.com/aklinker1/publish-browser-extension/commit/70d8aa0))

### 🏡 Chore

- Upgrade to node 20 ([8a4cfaf](https://github.com/aklinker1/publish-browser-extension/commit/8a4cfaf))

### 🤖 CI

- Upgrade github actions and fix failing release flow ([460a475](https://github.com/aklinker1/publish-browser-extension/commit/460a475))
- Fix validation workflow ([9cc260c](https://github.com/aklinker1/publish-browser-extension/commit/9cc260c))

## v2.2.1

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v2.2.0...v2.2.1)

### 🩹 Fixes

- Add missing CLI flags for new chrome features ([ebf32d6](https://github.com/aklinker1/publish-browser-extension/commit/ebf32d6))

### 🤖 CI

- Log git status for debugging ([af90e4d](https://github.com/aklinker1/publish-browser-extension/commit/af90e4d))

## v2.2.0

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v2.1.3...v2.2.0)

### 🚀 Enhancements

- Support chrome's new `deployPercentage` and `reviewExemption` options ([#27](https://github.com/aklinker1/publish-browser-extension/pull/27))

### 🩹 Fixes

- Report specific missing configurations ([#19](https://github.com/aklinker1/publish-browser-extension/pull/19))
- Fetch error typo ([#20](https://github.com/aklinker1/publish-browser-extension/pull/20))

### 🏡 Chore

- Upgrade repo setup ([#25](https://github.com/aklinker1/publish-browser-extension/pull/25))
- Upgrade repo setup ([#26](https://github.com/aklinker1/publish-browser-extension/pull/26))

### ❤️ Contributors

- Uncenter ([@uncenter](http://github.com/uncenter))
- Stephen Zhou ([@hyoban](http://github.com/hyoban))

## v2.1.3

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v2.1.2...v2.1.3)

### 🩹 Fixes

- Include cli in export paths ([42c356a](https://github.com/aklinker1/publish-browser-extension/commit/42c356a))

## v2.1.2

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v2.1.1...v2.1.2)

### 🩹 Fixes

- Support node 20 in `engines` field in `package.json` ([#17](https://github.com/aklinker1/publish-browser-extension/pull/17))

## v2.1.1

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v2.1.0...v2.1.1)

### 🩹 Fixes

- Remove log ([d0a4723](https://github.com/aklinker1/publish-browser-extension/commit/d0a4723))
- Don't require all config to run `init` command ([89bfe5d](https://github.com/aklinker1/publish-browser-extension/commit/89bfe5d))

## v2.1.0

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v2.0.0...v2.1.0)

### 🚀 Enhancements

- Read variables from `.env.submit` automatically ([#15](https://github.com/aklinker1/publish-browser-extension/pull/15))

## v2.0.0

[compare changes](https://github.com/aklinker1/publish-browser-extension/compare/v1.4.1...v2.0.0)

### 🚀 Enhancements

- ⚠️ Refactor CLI to add `init` command ([#13](https://github.com/aklinker1/publish-browser-extension/pull/13))

### 📖 Documentation

- Add env section to README ([ff62b9b](https://github.com/aklinker1/publish-browser-extension/commit/ff62b9b))

### 🤖 CI

- Standardize github actions with my other repos ([795cb05](https://github.com/aklinker1/publish-browser-extension/commit/795cb05))
- Fix release environment variables ([6572f61](https://github.com/aklinker1/publish-browser-extension/commit/6572f61))
- Fix release setup ([407de24](https://github.com/aklinker1/publish-browser-extension/commit/407de24))

#### ⚠️ Breaking Changes

- ⚠️ Refactor CLI to add `init` command ([#13](https://github.com/aklinker1/publish-browser-extension/pull/13))

### ❤️ Contributors

- Aaron Klinker
