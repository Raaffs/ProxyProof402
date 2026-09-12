// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // or =0.8.20
interface IHumanRegistry {
    function isHuman(address account) external view returns (bool);
}

contract HumanRegistry is IHumanRegistry {
    
    mapping(address => bool) private _humans;

    event HumanRegistered(address indexed human);

    function registerHuman() external {
        _humans[msg.sender] = true;
        emit HumanRegistered(msg.sender);
    }

    function isHuman(address account) external view returns (bool) {
        return _humans[account];
    }
}