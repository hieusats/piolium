// solidity-verify-accepts-empty-signature.sol
contract C {
    function verify(bytes memory sig, bytes32 msgHash) public pure returns (bool) {
        // ruleid: solidity-verify-accepts-empty-signature
        if (sig.length == 0) { return true; }
        return true;
    }
    function verifySafe(bytes memory sig, bytes32 msgHash) public pure returns (bool) {
        // ok: solidity-verify-accepts-empty-signature
        if (sig.length == 0) { return false; }
        return true;
    }
    function verifyNoElse(bytes memory sig) public pure returns (bool) {
        // ruleid: solidity-verify-accepts-empty-signature
        if (sig.length == 0) return true;
        return true;
    }
}
