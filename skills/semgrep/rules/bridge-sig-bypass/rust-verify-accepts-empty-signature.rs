fn verify_signature(sig: &[u8], msg: &[u8]) -> bool {
    // ruleid: rust-verify-accepts-empty-signature
    if sig.is_empty() { return true; }
    bls_verify(sig, msg)
}
fn verify_signature_safe(sig: &[u8], msg: &[u8]) -> bool {
    // ok: rust-verify-accepts-empty-signature
    if sig.is_empty() { return false; }
    bls_verify(sig, msg)
}
fn verify_sig_result(sig: &[u8]) -> Result<bool, ()> {
    // ruleid: rust-verify-accepts-empty-signature
    if sig.is_empty() { return Ok(true); }
    Ok(true)
}
fn bls_verify(_s: &[u8], _m: &[u8]) -> bool { true }
