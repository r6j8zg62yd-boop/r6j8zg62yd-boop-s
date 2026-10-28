.PHONY: install build test scan recode-error-pages

# A fresh clone does not contain Foundry library checkouts.
# `forge install` fetches the submodules listed in .gitmodules (forge-std).
install:
	forge install

build: install
	forge build

test: install
	forge test

# Review lines previous commits added in code and scripts.
scan:
	node scripts/scan-previous-inserts.mjs
	node --test test/scan-previous-inserts.test.mjs

# Find 4xx/5xx HTML pages and keep a single shared module script on each.
recode-error-pages:
	node scripts/recode-error-pages.mjs --check
	node --test test/recode-error-pages.test.mjs
