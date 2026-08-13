interface IPair { function getReserves() external view returns (uint, uint, uint); }
contract OracleVuln {
    IPair pair;
    function badPrice() public view returns (uint) {
        // ruleid: solidity-oracle-spot-reserve-as-price
        (uint r0, uint r1,) = pair.getReserves();
        return r0 * 1e18 / r1;
    }
}
interface IChainlink { function latestAnswer() external view returns (uint); }
contract OracleSafe {
    IChainlink feed;
    // ok: solidity-oracle-spot-reserve-as-price
    function goodPrice() public view returns (uint) { return feed.latestAnswer(); }
}
