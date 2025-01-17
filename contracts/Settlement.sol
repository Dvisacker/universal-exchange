// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

/* 
 This is not implemented - just a dummy interface for testing and demonstration purposes.
 In particular, signature verification is not implemented and other function arguments might be needed
 for being able to verify the original signatures. 
*/
contract Settlement is Ownable {
    using ECDSA for bytes32;

    // EIP-712 type hashes
    bytes32 public constant DOMAIN_TYPE_HASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant ORDER_MATCH_TYPE_HASH = keccak256(
        "OrderMatch(string pendingTradeId,string makerOrderId,address maker,address baseToken,address quoteToken,uint256 baseAmountFilled,uint256 quoteAmountFilled,bytes makerSignature,uint256 makerTimestamp,uint256 makerDeadline,string makerSalt,address taker,string takerOrderId,bytes takerSignature,uint256 takerTimestamp)"
    );

    // Domain separator
    bytes32 public immutable DOMAIN_SEPARATOR;

    // Events
    event OrderMatched(
        string indexed makerOrderId,
        string indexed takerOrderId,
        address maker,
        address taker,
        address baseToken,
        address quoteToken,
        uint256 baseAmountFilled,
        uint256 quoteAmountFilled
    );

    // State variables
    mapping(bytes32 => bool) public filledMatches;

    mapping(address => mapping(address => uint256)) public deposits;

    // Structs
    struct OrderMatch {
        string makerOrderId;
        address maker;
        address baseToken;
        address quoteToken;
        uint256 baseAmountFilled;
        uint256 quoteAmountFilled;
        bytes makerSignature;
        uint256 makerTimestamp;
        uint256 makerDeadline;
        string makerSalt;
        bytes makerSide;
        address taker;
        string takerOrderId;
        bytes takerSignature;
        uint256 takerTimestamp;
    }

    constructor() Ownable(msg.sender) {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPE_HASH,
                keccak256("Universal Exchange"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    function deposit(address token, uint256 amount) external {
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        deposits[msg.sender][token] += amount;
    }

    function withdraw(address token, uint256 amount) external {
        require(deposits[msg.sender][token] >= amount, "Insufficient balance");
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        deposits[msg.sender][token] -= amount;
    }

    function trade(OrderMatch calldata orderMatch) external returns (bool) {
        // Verify not expired
        require(block.timestamp <= orderMatch.makerDeadline, "Maker order expired");

        // Verify not already filled
        bytes32 matchHash = getMatchHash(orderMatch);
        require(!filledMatches[matchHash], "Match already filled");

        // I've haven't implemented verifying signatures. Probably need to also update which data is being sent 
        // to the contract to everything needed to verify the signatures.
        require(verifyMakerSignature(orderMatch), "Invalid maker signature");
        require(verifyTakerSignature(orderMatch), "Invalid taker signature");

        // Mark as filled
        filledMatches[matchHash] = true;


        // maker is buying the base token with the quote token
        if (keccak256(orderMatch.makerSide) == keccak256(bytes("BUY"))) {    
            require(deposits[orderMatch.maker][orderMatch.quoteToken] >= orderMatch.quoteAmountFilled, "Maker balance is insufficient (1)");
            require(deposits[orderMatch.taker][orderMatch.baseToken] >= orderMatch.baseAmountFilled, "Taker balance is insufficient (2)");

            // maker exchanges the quote token for the base token
            deposits[orderMatch.maker][orderMatch.quoteToken] -= orderMatch.quoteAmountFilled;
            deposits[orderMatch.maker][orderMatch.baseToken] += orderMatch.baseAmountFilled;
            // taker exchanges the base token for the quote token
            deposits[orderMatch.taker][orderMatch.quoteToken] += orderMatch.quoteAmountFilled;
            deposits[orderMatch.taker][orderMatch.baseToken] -= orderMatch.baseAmountFilled;

        // maker is selling the base token for the quote token
        } else if (keccak256(orderMatch.makerSide) == keccak256(bytes("SELL"))) { 
            require(deposits[orderMatch.maker][orderMatch.baseToken] >= orderMatch.baseAmountFilled, "Maker balance is insufficient (3)");
            require(deposits[orderMatch.taker][orderMatch.quoteToken] >= orderMatch.quoteAmountFilled, "Taker balance is insufficient (4)");

            // taker exchanges the quote token for the base token
            deposits[orderMatch.taker][orderMatch.quoteToken] -= orderMatch.quoteAmountFilled;
            deposits[orderMatch.taker][orderMatch.baseToken] += orderMatch.baseAmountFilled;
            // // maker exchanges the base token for the quote token
            deposits[orderMatch.maker][orderMatch.quoteToken] += orderMatch.quoteAmountFilled;
            deposits[orderMatch.maker][orderMatch.baseToken] -= orderMatch.baseAmountFilled;
        }



        emit OrderMatched(
            orderMatch.makerOrderId,
            orderMatch.takerOrderId,
            orderMatch.maker,
            orderMatch.taker,
            orderMatch.baseToken,
            orderMatch.quoteToken,
            orderMatch.baseAmountFilled,
            orderMatch.quoteAmountFilled
        );

        return true;
    }

    function getMatchHash(OrderMatch calldata orderMatch) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                orderMatch.makerOrderId,
                orderMatch.takerOrderId
            )
        );
    }

    function verifyMakerSignature(OrderMatch calldata orderMatch) public view returns (bool) {
        return true;
    }

    function verifyTakerSignature(OrderMatch calldata orderMatch) public view returns (bool) {
        return true;
    }
}
