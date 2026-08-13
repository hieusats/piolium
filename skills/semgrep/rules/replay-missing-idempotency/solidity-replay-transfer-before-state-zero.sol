contract Replay {
    mapping(uint => uint) public amounts;
    function claim(uint id) public {
        // ruleid: solidity-replay-transfer-before-state-zero
        payable(msg.sender).transfer(amounts[id]);
        amounts[id] = 0;
    }
    function claimSafe(uint id) public nonReentrant {
        // ok: solidity-replay-transfer-before-state-zero
        uint a = amounts[id];
        amounts[id] = 0;
        payable(msg.sender).transfer(a);
    }
}
