#!/usr/bin/env python3
"""Local reference CLI for the commands documented in docs/twak-wrap.md.

Responses are sample data stored in this file. They are not live chain,
wallet, or market data, and `swap` never broadcasts a transaction.
"""

from __future__ import annotations

import argparse
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

VERSION = "0.1.0"

SAMPLE_NOTE = (
    "Sample data bundled with twak_wrap.py. Not a live balance, quote, or risk score."
)

UNI = "c60_t0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"

CHAINS = {
    "ethereum": {"coin": 60, "name": "Ethereum"},
    "60": {"coin": 60, "name": "Ethereum"},
}

HOLDINGS = [
    {
        "asset_id": "c60",
        "symbol": "ETH",
        "name": "Ether",
        "amount": "1.25",
        "coin": 60,
    },
    {
        "asset_id": UNI,
        "symbol": "UNI",
        "name": "Uniswap",
        "amount": "40",
        "coin": 60,
    },
    {
        "asset_id": "c60_t0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "symbol": "USDC",
        "name": "USD Coin",
        "amount": "250.00",
        "coin": 60,
    },
]

TRENDING = [
    {"symbol": "ETH", "name": "Ether", "category": "l1", "volume_usd": 8_200_000_000, "market_cap_usd": 400_000_000_000},
    {"symbol": "UNI", "name": "Uniswap", "category": "defi", "volume_usd": 180_000_000, "market_cap_usd": 6_000_000_000},
    {"symbol": "FET", "name": "Artificial Superintelligence Alliance", "category": "ai", "volume_usd": 90_000_000, "market_cap_usd": 2_400_000_000},
    {"symbol": "TAO", "name": "Bittensor", "category": "ai", "volume_usd": 70_000_000, "market_cap_usd": 3_100_000_000},
    {"symbol": "PEPE", "name": "Pepe", "category": "memes", "volume_usd": 410_000_000, "market_cap_usd": 4_200_000_000},
    {"symbol": "DOGE", "name": "Dogecoin", "category": "memes", "volume_usd": 620_000_000, "market_cap_usd": 22_000_000_000},
    {"symbol": "USDC", "name": "USD Coin", "category": "stable", "volume_usd": 5_000_000_000, "market_cap_usd": 32_000_000_000},
]

DAPPS = [
    {"name": "Uniswap", "category": "defi", "url": "https://app.uniswap.org", "chain": "ethereum"},
    {"name": "Aave", "category": "defi", "url": "https://app.aave.com", "chain": "ethereum"},
    {"name": "OpenSea", "category": "nft", "url": "https://opensea.io", "chain": "ethereum"},
    {"name": "Lido", "category": "defi", "url": "https://stake.lido.fi", "chain": "ethereum"},
]

HISTORY = [
    {
        "hash": "0xsample0001",
        "chain": "ethereum",
        "kind": "receive",
        "asset": "ETH",
        "amount": "0.40",
        "status": "confirmed",
    },
    {
        "hash": "0xsample0002",
        "chain": "ethereum",
        "kind": "swap",
        "asset": "ETH→USDC",
        "amount": "0.10",
        "status": "confirmed",
    },
]

RISK = {
    UNI: {
        "asset_id": UNI,
        "symbol": "UNI",
        "score": "low",
        "flags": [],
        "summary": "Well-known governance token. Sample assessment only.",
    }
}

PORTFOLIO = {
    "accounts": [{"label": "sample", "address": "0xYourAddress", "coin": 60}],
    "holdings": HOLDINGS,
}


def emit(payload: dict[str, Any], exit_code: int = 0) -> int:
    payload = {"source": "sample", "note": SAMPLE_NOTE, **payload}
    json.dump(payload, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return exit_code


def resolve_coin(coin: str | None, chain: str | None) -> dict[str, Any] | None:
    if chain:
        return CHAINS.get(chain.lower())
    if coin is not None:
        return CHAINS.get(str(coin))
    return None


def cmd_version(_: argparse.Namespace) -> int:
    return emit({"command": "version", "version": VERSION})


def cmd_balance(args: argparse.Namespace) -> int:
    chain = resolve_coin(args.coin, None)
    if chain is None:
        return emit({"command": "balance", "error": f"unsupported coin {args.coin}"}, 2)
    eth = next(item for item in HOLDINGS if item["symbol"] == "ETH")
    return emit(
        {
            "command": "balance",
            "address": args.address,
            "coin": chain["coin"],
            "chain": chain["name"],
            "symbol": eth["symbol"],
            "amount": eth["amount"],
        }
    )


def cmd_holdings(args: argparse.Namespace) -> int:
    chain = resolve_coin(args.coin, None)
    if chain is None:
        return emit({"command": "holdings", "error": f"unsupported coin {args.coin}"}, 2)
    rows = [item for item in HOLDINGS if item["coin"] == chain["coin"]]
    return emit(
        {
            "command": "holdings",
            "address": args.address,
            "coin": chain["coin"],
            "chain": chain["name"],
            "holdings": rows,
        }
    )


def cmd_trending(args: argparse.Namespace) -> int:
    rows = TRENDING
    if args.category:
        rows = [item for item in rows if item["category"] == args.category.lower()]
    sort_key = "volume_usd" if args.sort == "volume" else "market_cap_usd"
    rows = sorted(rows, key=lambda item: item[sort_key], reverse=True)
    if args.limit is not None:
        rows = rows[: args.limit]
    return emit(
        {
            "command": "trending",
            "category": args.category,
            "sort": args.sort,
            "limit": args.limit,
            "assets": rows,
        }
    )


def cmd_dapps(args: argparse.Namespace) -> int:
    rows = DAPPS
    if args.category:
        rows = [item for item in rows if item["category"] == args.category.lower()]
    return emit({"command": "dapps", "category": args.category, "dapps": rows})


def cmd_search(args: argparse.Namespace) -> int:
    needle = args.query.lower()
    assets = [
        item
        for item in TRENDING
        if needle in item["symbol"].lower() or needle in item["name"].lower()
    ]
    dapps = [
        item
        for item in DAPPS
        if needle in item["name"].lower() or needle in item["category"].lower()
    ]
    return emit({"command": "search", "query": args.query, "assets": assets, "dapps": dapps})


def cmd_history(args: argparse.Namespace) -> int:
    chain = resolve_coin(None, args.chain)
    if chain is None:
        return emit({"command": "history", "error": f"unsupported chain {args.chain}"}, 2)
    rows = [item for item in HISTORY if item["chain"] == args.chain.lower()]
    return emit(
        {
            "command": "history",
            "address": args.address,
            "chain": args.chain.lower(),
            "transactions": rows,
        }
    )


def cmd_risk(args: argparse.Namespace) -> int:
    record = RISK.get(args.asset_id.lower()) or RISK.get(args.asset_id)
    if record is None:
        return emit(
            {
                "command": "risk",
                "asset_id": args.asset_id,
                "score": "unknown",
                "flags": ["not_in_sample_set"],
                "summary": "No sample risk record for this asset id.",
            }
        )
    return emit({"command": "risk", **record})


def cmd_portfolio(_: argparse.Namespace) -> int:
    return emit({"command": "portfolio", **PORTFOLIO})


def cmd_swap(args: argparse.Namespace) -> int:
    chain = resolve_coin(None, args.chain)
    if chain is None:
        return emit({"command": "swap", "error": f"unsupported chain {args.chain}"}, 2)
    try:
        amount = float(args.amount)
    except ValueError:
        return emit({"command": "swap", "error": "amount must be a number"}, 2)
    if amount <= 0:
        return emit({"command": "swap", "error": "amount must be positive"}, 2)
    # Fixed sample rate so the documented example is stable: 1 ETH = 3500 USDC.
    rate = 3500.0 if args.from_asset.upper() == "ETH" and args.to_asset.upper() == "USDC" else 1.0
    quote = {
        "command": "swap",
        "chain": args.chain.lower(),
        "amount_in": args.amount,
        "from": args.from_asset.upper(),
        "to": args.to_asset.upper(),
        "amount_out": f"{amount * rate:.2f}" if rate != 1.0 else f"{amount:.6f}",
        "rate": rate,
        "quote_only": True if args.quote_only else False,
        "submitted": False,
    }
    if not args.quote_only:
        quote["error"] = "live submission is disabled; pass --quote-only"
        return emit(quote, 2)
    return emit(quote)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="twak_wrap.py",
        description="Sample CLI for wallet, market, and dapp lookups. See docs/twak-wrap.md.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    version = sub.add_parser("version", help="Print the wrapper version.")
    version.set_defaults(func=cmd_version)

    balance = sub.add_parser("balance", help="Native balance for an address and SLIP-44 coin.")
    balance.add_argument("address")
    balance.add_argument("--coin", required=True, help="SLIP-44 coin type. Sample data supports 60 (Ethereum).")
    balance.set_defaults(func=cmd_balance)

    holdings = sub.add_parser("holdings", help="Token holdings for an address and SLIP-44 coin.")
    holdings.add_argument("address")
    holdings.add_argument("--coin", required=True)
    holdings.set_defaults(func=cmd_holdings)

    trending = sub.add_parser("trending", help="Trending assets from the sample set.")
    trending.add_argument("--limit", type=int, default=None)
    trending.add_argument("--category", default=None, help="Filter, for example ai, memes, defi, l1, stable.")
    trending.add_argument("--sort", choices=("market_cap", "volume"), default="market_cap")
    trending.set_defaults(func=cmd_trending)

    dapps = sub.add_parser("dapps", help="List sample dapps.")
    dapps.add_argument("--category", default=None, help="Filter, for example defi or nft.")
    dapps.set_defaults(func=cmd_dapps)

    search = sub.add_parser("search", help="Search sample assets and dapps.")
    search.add_argument("query")
    search.set_defaults(func=cmd_search)

    history = sub.add_parser("history", help="Recent sample transactions.")
    history.add_argument("address")
    history.add_argument("--chain", required=True, help="Chain name. Sample data supports ethereum.")
    history.set_defaults(func=cmd_history)

    risk = sub.add_parser("risk", help="Sample risk record for an asset id (c{coin}_t{address}).")
    risk.add_argument("asset_id")
    risk.set_defaults(func=cmd_risk)

    portfolio = sub.add_parser("portfolio", help="Sample portfolio.")
    portfolio.set_defaults(func=cmd_portfolio)

    swap = sub.add_parser("swap", help="Sample quote. Does not submit a transaction.")
    swap.add_argument("amount")
    swap.add_argument("from_asset")
    swap.add_argument("to_asset")
    swap.add_argument("--chain", required=True)
    swap.add_argument(
        "--quote-only",
        action="store_true",
        help="Return a quote and do not attempt submission.",
    )
    swap.set_defaults(func=cmd_swap)

    serve = sub.add_parser("serve", help="Serve JSON for the same commands over HTTP.")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8765)
    serve.set_defaults(func=cmd_serve)

    return parser


def dispatch(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send(self, code: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, indent=2).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        routes = {
            "/": {
                "service": "twak_wrap",
                "version": VERSION,
                "note": SAMPLE_NOTE,
                "routes": [
                    "/version",
                    "/balance?address=&coin=60",
                    "/holdings?address=&coin=60",
                    "/trending?limit=5&category=ai&sort=volume",
                    "/dapps?category=defi",
                    "/search?q=uniswap",
                    "/history?address=&chain=ethereum",
                    "/risk?asset_id=",
                    "/portfolio",
                    "/swap?amount=0.1&from=ETH&to=USDC&chain=ethereum",
                ],
            },
            "/version": {"command": "version", "version": VERSION, "source": "sample", "note": SAMPLE_NOTE},
            "/portfolio": {"command": "portfolio", "source": "sample", "note": SAMPLE_NOTE, **PORTFOLIO},
        }
        if path in routes:
            self._send(200, routes[path])
            return
        self._send(404, {"error": "not found", "path": path})


def cmd_serve(args: argparse.Namespace) -> int:
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    sys.stderr.write(f"twak_wrap sample server on http://{args.host}:{args.port}\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


def main(argv: list[str] | None = None) -> int:
    return dispatch(sys.argv[1:] if argv is None else argv)


if __name__ == "__main__":
    raise SystemExit(main())
