# twak_wrap.py

`twak/twak_wrap.py` is a dependency-free Python CLI. Every command prints JSON sample data so the examples below are runnable without a wallet, RPC, or API key. The `source` field is always `"sample"`. Nothing here reads a live balance or submits a transaction.

Run it from the repository:

```bash
python3 twak/twak_wrap.py --help
```

The ticket examples use `/workspace/twak/twak_wrap.py`. That path is the same file when the workspace links `twak/` at the workspace root. From this repo the equivalent path is `twak/twak_wrap.py`.

## Commands

| Command | Purpose |
| --- | --- |
| `version` | Print the wrapper version. |
| `balance ADDRESS --coin COIN` | Native balance. Sample data supports coin `60` (Ethereum, SLIP-44). |
| `holdings ADDRESS --coin COIN` | Token holdings for that coin. |
| `trending` | Sample trending assets. Optional `--limit`, `--category`, `--sort`. |
| `dapps` | Sample dapps. Optional `--category`. |
| `search QUERY` | Match assets and dapps by name. |
| `history ADDRESS --chain CHAIN` | Recent sample transactions. Sample data supports `ethereum`. |
| `risk ASSET_ID` | Sample risk record. Asset ids look like `c60_t0x…`. |
| `portfolio` | Sample account and holdings. |
| `swap AMOUNT FROM TO --chain CHAIN` | Sample quote. Requires `--quote-only`. |
| `serve` | HTTP index of the same data on `127.0.0.1:8765`. |

`--sort` is `market_cap` (default) or `volume`. Categories in the sample set include `ai`, `memes`, `defi`, `l1`, `stable`, and `nft`.

## Examples

```bash
python3 twak/twak_wrap.py version
python3 twak/twak_wrap.py balance 0xYourAddress --coin 60
python3 twak/twak_wrap.py holdings 0xYourAddress --coin 60
python3 twak/twak_wrap.py trending --limit 5
python3 twak/twak_wrap.py trending --category ai
python3 twak/twak_wrap.py trending --category memes --sort volume
python3 twak/twak_wrap.py dapps
python3 twak/twak_wrap.py dapps --category defi
python3 twak/twak_wrap.py search uniswap
python3 twak/twak_wrap.py history 0xYourAddress --chain ethereum
python3 twak/twak_wrap.py risk c60_t0x1f9840a85d5af5bf1d1762f925bdaddc4201f984
python3 twak/twak_wrap.py portfolio
python3 twak/twak_wrap.py swap 0.1 ETH USDC --chain ethereum --quote-only
python3 twak/twak_wrap.py serve
```

`swap` without `--quote-only` exits with status 2 and does not submit. Unknown coins and chains also exit with status 2.

`serve` blocks until you stop it (Ctrl-C). It answers `GET /` with the route list and `GET /version` and `GET /portfolio` with the same JSON as the CLI. Other lookups stay on the CLI.

## Swap quote

For the documented pair the sample rate is fixed: 1 ETH = 3500 USDC. `swap 0.1 ETH USDC --chain ethereum --quote-only` therefore reports `amount_out` of `350.00`.

## Risk ids

`c60_t0x1f9840a85d5af5bf1d1762f925bdaddc4201f984` is the Uniswap (UNI) token on Ethereum in `c{slip44}_t{address}` form. That id is the one record in the sample risk set. Any other id returns `score: "unknown"`.
