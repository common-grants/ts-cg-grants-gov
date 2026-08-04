# Changelog

## [0.3.1](https://github.com/common-grants/ts-cg-grants-gov/compare/v0.3.0...v0.3.1) (2026-08-04)


### Bug Fixes

* bump brace-expansion to 5.0.8 for CVE-2026-14257 ([#26](https://github.com/common-grants/ts-cg-grants-gov/issues/26)) ([91983ca](https://github.com/common-grants/ts-cg-grants-gov/commit/91983caaccb341f2686c88c54a8ba489978a9ccd))
* bump brace-expansion to 5.0.9 for CVE-2026-69152 ([#28](https://github.com/common-grants/ts-cg-grants-gov/issues/28)) ([c1ad139](https://github.com/common-grants/ts-cg-grants-gov/commit/c1ad139adb29007f2452b8411fd904435e732bee))
* declare zod as a runtime dependency ([#24](https://github.com/common-grants/ts-cg-grants-gov/issues/24)) ([8f108a2](https://github.com/common-grants/ts-cg-grants-gov/commit/8f108a2b8176cf63c89148b8d43bb3e8a8d239d0))
* make published package importable in Node ([#22](https://github.com/common-grants/ts-cg-grants-gov/issues/22)) ([9438763](https://github.com/common-grants/ts-cg-grants-gov/commit/943876395f4323897657f549e8f021fc3f66512f))

## [0.3.0](https://github.com/common-grants/ts-cg-grants-gov/compare/v0.2.0...v0.3.0) (2026-07-17)


### Features

* register Simpler.Grants.gov custom filters on opportunities.search ([#18](https://github.com/common-grants/ts-cg-grants-gov/issues/18)) ([2c575e9](https://github.com/common-grants/ts-cg-grants-gov/commit/2c575e9c5959127e6d2ac3b616f87aaa00a10cce))

## [0.2.0](https://github.com/common-grants/ts-cg-grants-gov/compare/v0.1.0...v0.2.0) (2026-06-24)


### ⚠ BREAKING CHANGES

* Adding transforms to plugin ([#11](https://github.com/common-grants/ts-cg-grants-gov/issues/11))

#### Plugin Shape change

Old:
```
plugin.extensions.Opportunity
```

New:
```
plugin.schemas.Opportunity.commonSchema
plugin.schemas.Opportunity.toCommon
plugin.schemas.Opportunity.fromCommon
```

### Features

* Adding transforms to plugin ([#11](https://github.com/common-grants/ts-cg-grants-gov/issues/11)) ([bfa881d](https://github.com/common-grants/ts-cg-grants-gov/commit/bfa881dcc0214bc2ca6788fdd16a96838a7db71f))

## 0.1.0 (2026-04-08)


### Features

* Creates `@common-grants/cg-grants-gov` plugin ([#2](https://github.com/common-grants/ts-cg-grants-gov/issues/2)) ([1a258fe](https://github.com/common-grants/ts-cg-grants-gov/commit/1a258fececaa6f9d3f7df153a3e4014e910a797b))


### Documentation

* Adds README and .gitignore ([c253ccb](https://github.com/common-grants/ts-cg-grants-gov/commit/c253ccb65e7926298e1c382f78da6b9bf8503367))
* Improves package metadata and docstrings ([#9](https://github.com/common-grants/ts-cg-grants-gov/issues/9)) ([3a30e94](https://github.com/common-grants/ts-cg-grants-gov/commit/3a30e94962bf6666ae5cdfdfb02a36f8edd3397e))
* Sets up repo ([fdfec68](https://github.com/common-grants/ts-cg-grants-gov/commit/fdfec686d2a77819e8209e9f8ff8185016992e39))
