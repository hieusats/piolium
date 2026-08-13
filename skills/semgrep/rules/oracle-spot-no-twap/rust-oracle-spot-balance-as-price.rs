// skills/semgrep/rules/oracle-spot-no-twap/rust-oracle-spot-balance-as-price.rs
// Incident-rooted (mango-markets): spot AMM/Mango price used to value collateral.

struct Pool {
    lamports: u64,
}
struct Oracle {
    twap: u64,
}
impl Pool {
    pub fn lamports(&self) -> u64 {
        self.lamports
    }
}
impl Oracle {
    pub fn twap(&self) -> u64 {
        self.twap
    }
}

fn price_from_spot_balance(pool: &Pool, supply: u64) -> u64 {
    // ruleid: rust-oracle-spot-balance-as-price
    let reserve = pool.lamports();
    reserve / supply
}

fn price_from_twap_oracle(oracle: &Oracle) -> u64 {
    // ok: rust-oracle-spot-balance-as-price
    oracle.twap()
}
