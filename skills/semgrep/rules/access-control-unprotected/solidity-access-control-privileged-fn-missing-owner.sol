contract AccessVuln {
    // ruleid: solidity-access-control-privileged-fn-missing-owner
    function mint(address to, uint amt) public { _mint(to, amt); }
    // ok: solidity-access-control-privileged-fn-missing-owner
    function mintSafe(address to, uint amt) public onlyOwner { _mint(to, amt); }
    function _mint(address a, uint b) internal {}
}
