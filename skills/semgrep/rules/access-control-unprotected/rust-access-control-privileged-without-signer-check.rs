// skills/semgrep/rules/access-control-unprotected/rust-access-control-privileged-without-signer-check.rs
// Incident-rooted (drift-protocol): privileged instruction w/o signer/owner check.

struct AccountInfo {
    is_signer: bool,
}
struct MintAccounts<'a> {
    admin: &'a AccountInfo,
}

fn mint_to(_a: &MintAccounts) {}

// ruleid: rust-access-control-privileged-without-signer-check
pub fn mint_authority(accounts: &MintAccounts) -> Result<(), ()> {
    mint_to(accounts);
    Ok(())
}

// ok: rust-access-control-privileged-without-signer-check
pub fn mint_authority_guarded(accounts: &MintAccounts) -> Result<(), ()> {
    require!(accounts.admin.is_signer, ());
    mint_to(accounts);
    Ok(())
}

#[macro_export]
macro_rules! require {
    ($cond:expr, $err:expr) => {
        if !$cond {
            return Err($err);
        }
    };
}
