#!/usr/bin/env python3
# taxonomy/map_tags.py — systematic 293 rekt mechanism_tag → 12 detectable class mapping.
# Reads the vendored taxonomy/rekt-tags.json (portable; no external dependency).
import json, re, pathlib

SRC = pathlib.Path(__file__).with_name("rekt-tags.json")
data = json.load(open(SRC))

RULES = [
    (
        "bridge-sig-bypass",
        r"(zero.?hash|sigset|signature.?spoof|forged.*(proof|merkle|sig|deposit|withdrawal|burn)|quorum|verifier.*accept|mmr.*bound|ibc.*(forged|precompile)|crosschain.*(manager|create)|address.?collision|spv.*proof|finalize.*withdrawal|deposit.*msg.*unvalidated|3of.*multisig.*forged)",
    ),
    (
        "replay-missing-idempotency",
        r"(replay|duplicate.?call|double.*(withdraw|claim|spend)|no.?epoch.?replay|emergencyBurn|position.?lock.*unlock|claim.*multiple|refund.*attacker)",
    ),
    ("verify-gated-by-position", r"(batch.?position|%.*==.*0.*verify)"),
    (
        "oracle-spot-no-twap",
        r"(oracle|twap|vwap|flashloan.*(manipulat|misprice|price|inflate)|spot.*(pump|price|reserve|amm)|collateral.*inflat|price.?(feed|manipulat)|chainlink|misprice|stale.*price|perp.*oracle|thin.*liquidity|reserve.*oracle)",
    ),
    (
        "reentrancy-readonly-and-callback",
        r"(reentrancy|read.?only|callback.*(mint|burn|before|reentrant|harvest|collect)|erc77|erc677|erc3525|erc1155|onerc.*received|hook.*reentr|sellshares.*reentr|routeprocessor.*callback|cook.*action.*reset|virtualprice)",
    ),
    (
        "access-control-unprotected",
        r"(unprotected|missing.*(msg.?sender|check|initializer|caller)|unvalidated.*(input|router|calldata|market|origin|signer)|permissionless|forged.*approval|initialize.*(missing|flag|version)|admin.?key|backdoor|owner.*transfer|allowlist|whitelist|grant.*role|public.*callable|publicly.*(set|update)|selfswap|registerallowed|ownable.*transferownership|controllable.*transferfrom|enterprise.*approval)",
    ),
    (
        "infinite-mint-unguarded",
        r"(infinite.?mint|dormant.?minter|deployer.*mint|missing.*burn|mint.*unlimited|no.?debt.*recorded|mint.*(dump|cap|bypass)|unregistered.*supply|cap.*bypass|print.*token|supply.*zero.*mint|bonding.*curve.*mint.*burn|cross.?rate.*mint)",
    ),
    (
        "donation-share-inflation",
        r"(donat|exchangeRate.*round|pricePerShare|share.*inflat|totalSupply.*0|donation.*(recursive|bypass|inflate)|empty.*4626)",
    ),
    (
        "overflow-rounding-invariant",
        r"(overflow|underflow|checked_shlw|rounding|fee.?divisor|k.?invariant|double.?decimal|debt.?share|double.?count|precondition.*violation|stableswap.*newton|solver.*underflow|linear.*pool.*round|near.?zero.*round)",
    ),
    (
        "proxy-upgrade-reinit",
        r"(reinit|proxy.*upgrade|upgradeTo|slot.*collision|initialize.*flag|version.*bump|impl.*upgrade|upgrade.*impl|upgrade.*malicious|metamorphic|selfdestruct|delegatecall.*(malicious|owner)|storage.*overwrite|handler.*overwrite)",
    ),
    (
        "governance-flashloan-vote",
        r"(flashloan.*governance|flashloan.*vote|no.?timelock|low.?vote.?lock|governance.*flash|emergency.*commit|abandoned.*governance)",
    ),
    (
        "logic-invariant-break",
        r"(tokenIn.*tokenOut|self.?transfer.*balance|fee.?on.?transfer.*skew|comp.*scal|single.?token.?pool|cross.?rate|msg.?value.*confusion|order.*mismatch|accounting.*double|extrapolat|weight.?lag|vault.*event.*override|manual.*balance.*inflate)",
    ),
]

LANGS = {
    "bridge-sig-bypass": "Go(S+C),Rust(S+C-b.e.),Sol(S)",
    "replay-missing-idempotency": "Go(S+C),Sol(S)",
    "verify-gated-by-position": "Go(S+C)",
    "oracle-spot-no-twap": "Sol(S),Rust(S)",
    "reentrancy-readonly-and-callback": "Sol(S)",
    "access-control-unprotected": "Sol(S),Rust(S),Go(S+C)",
    "infinite-mint-unguarded": "Sol(S),Go(S+C)",
    "donation-share-inflation": "Sol(S)",
    "overflow-rounding-invariant": "Sol(S),Rust(S),Go(S+C)",
    "proxy-upgrade-reinit": "Sol(S)",
    "governance-flashloan-vote": "Sol(S)",
    "logic-invariant-break": "Sol(S),Go(S+C)",
}

# source: rekt = grounded in rekt ledger anchors; audit = found in this audit (Harmony), no rekt anchor.
SOURCE = {c: "rekt" for c, _ in RULES}
SOURCE["verify-gated-by-position"] = "audit"  # Harmony H1 long-range-sync, not in rekt

# one-line detection signatures (human-readable, for exploit-classes.md)
SIG = {
    "bridge-sig-bypass": "verifier accepts a zero/identity/forged signature or forged proof; quorum decides by roster size not signers",
    "replay-missing-idempotency": "credit/withdraw without a spent-marker or nonce guard; idempotency key from an unauthenticated field",
    "verify-gated-by-position": "verification gated by batch index (n % N == 0), not per-item cryptographic check",
    "oracle-spot-no-twap": "spot/flashloan-manipulable price used for valuation; instant-consume; no TWAP/deviation check",
    "reentrancy-readonly-and-callback": "read-only reentrancy (stale virtualPrice) or token-callback reentrancy with a missing guard",
    "access-control-unprotected": "unprotected initialize; missing msg.sender/owner check; permissionless privileged fn; unvalidated input -> forged approval",
    "infinite-mint-unguarded": "mint without consensus/burn/deposit; dormant minter key reachable",
    "donation-share-inflation": "donate -> inflate exchangeRate/totalSupply -> rounding -> drain",
    "overflow-rounding-invariant": "overflow-no-safemath; checked_shlw; fee-divisor k-invariant break; debt-share rounding",
    "proxy-upgrade-reinit": "reinitializable; initialize-missing-flag; slot collision; unguarded upgradeTo",
    "governance-flashloan-vote": "flashloan voting power with no timelock/quorum",
    "logic-invariant-break": "tokenIn==tokenOut self-swap; self-transfer balance doubles; fee-on-transfer skews accounting",
}

out = {
    c: {
        "name": c,
        "source": SOURCE[c],
        "languages": LANGS[c],
        "detection_signature": SIG[c],
        "anchors": [],
    }
    for c, _ in RULES
}
residual = []
for r in data:
    tag, slug = r.get("mechanism_tag", ""), r.get("slug", "")
    cls = next((c for c, rx in RULES if re.search(rx, tag, re.I)), None)
    if cls:
        out[cls]["anchors"].append(slug)
    else:
        residual.append(tag)

json.dump(
    {"classes": list(out.values()), "residual_mechanism_tags": sorted(set(residual))},
    open(pathlib.Path(__file__).with_name("exploit-classes.json"), "w"),
    indent=2,
)
mapped = sum(len(c["anchors"]) for c in out.values())
print(f"mapped={mapped} residual={len(set(residual))}")
for c in out.values():
    print(f"  {c['name']:38} src={c['source']:5} anchors={len(c['anchors'])}")
