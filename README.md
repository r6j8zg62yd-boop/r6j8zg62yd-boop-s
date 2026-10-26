# Note board

A small static web app and a dependency-free text library.

- `lib/textkit.js` exports `titleCase`, `slugify`, and `summarize`.
- `web/` is the note board. It formats each note with that library.
- `contracts/MyToken.sol` is MyToken (`MTK`, 18 decimals). The constructor mints `1000e18` to the deployer.

## Contracts

A fresh clone does not include the Foundry libraries. Install them, then compile. `forge install` with no arguments reads `.gitmodules` and checks out `lib/forge-std` (used by `test/MyToken.t.sol`).

```bash
# Foundry: https://book.getfoundry.sh/getting-started/installation
forge install
forge build
```

The same steps are `make build`. Tests:

```bash
forge test
# or
make test
```

Scan lines that earlier commits inserted into code and scripts (shell downloads piped to a shell, `authorized_keys` appends, private-key blocks, and dynamic `eval`):

```bash
make scan
# or
node scripts/scan-previous-inserts.mjs
node scripts/scan-previous-inserts.mjs --json
```

The command exits with status 1 when it reports a high-severity finding.

To add another library, install it once and commit the submodule pointer:

```bash
forge install foundry-rs/forge-std
```

Serve the repository root so the page can import the library:

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/web/`.
