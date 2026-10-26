.PHONY: install build test

# A fresh clone does not contain Foundry library checkouts.
# `forge install` fetches the submodules listed in .gitmodules (forge-std).
install:
	forge install

build: install
	forge build

test: install
	forge test
