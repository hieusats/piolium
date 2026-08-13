interface IERC20 { function transferFrom(address,address,uint) external returns (bool); }
contract ReentrancyVuln {
    mapping(address => uint) public balances;
    function deposit(address t, uint a) public {
        // ruleid: solidity-reentrancy-external-call-before-state-write
        IERC20(t).transferFrom(msg.sender, address(this), a);
        balances[msg.sender] += a;
    }
    function depositSafe(address t, uint a) public nonReentrant {
        // ok: solidity-reentrancy-external-call-before-state-write
        balances[msg.sender] += a;
        IERC20(t).transferFrom(msg.sender, address(this), a);
    }
}
