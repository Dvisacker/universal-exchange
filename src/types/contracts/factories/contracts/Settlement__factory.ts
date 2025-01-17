/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../common";
import type {
  Settlement,
  SettlementInterface,
} from "../../contracts/Settlement";

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "string",
        name: "makerOrderId",
        type: "string",
      },
      {
        indexed: true,
        internalType: "string",
        name: "takerOrderId",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "maker",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "taker",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "baseToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "quoteToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "baseAmountFilled",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "quoteAmountFilled",
        type: "uint256",
      },
    ],
    name: "OrderMatched",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DOMAIN_TYPE_HASH",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ORDER_MATCH_TYPE_HASH",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "deposits",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "filledMatches",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "string",
            name: "makerOrderId",
            type: "string",
          },
          {
            internalType: "address",
            name: "maker",
            type: "address",
          },
          {
            internalType: "address",
            name: "baseToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "quoteToken",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "baseAmountFilled",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "quoteAmountFilled",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "makerSignature",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "makerTimestamp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "makerDeadline",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "makerSalt",
            type: "string",
          },
          {
            internalType: "bytes",
            name: "makerSide",
            type: "bytes",
          },
          {
            internalType: "address",
            name: "taker",
            type: "address",
          },
          {
            internalType: "string",
            name: "takerOrderId",
            type: "string",
          },
          {
            internalType: "bytes",
            name: "takerSignature",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "takerTimestamp",
            type: "uint256",
          },
        ],
        internalType: "struct Settlement.OrderMatch",
        name: "orderMatch",
        type: "tuple",
      },
    ],
    name: "getMatchHash",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "string",
            name: "makerOrderId",
            type: "string",
          },
          {
            internalType: "address",
            name: "maker",
            type: "address",
          },
          {
            internalType: "address",
            name: "baseToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "quoteToken",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "baseAmountFilled",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "quoteAmountFilled",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "makerSignature",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "makerTimestamp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "makerDeadline",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "makerSalt",
            type: "string",
          },
          {
            internalType: "bytes",
            name: "makerSide",
            type: "bytes",
          },
          {
            internalType: "address",
            name: "taker",
            type: "address",
          },
          {
            internalType: "string",
            name: "takerOrderId",
            type: "string",
          },
          {
            internalType: "bytes",
            name: "takerSignature",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "takerTimestamp",
            type: "uint256",
          },
        ],
        internalType: "struct Settlement.OrderMatch",
        name: "orderMatch",
        type: "tuple",
      },
    ],
    name: "trade",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "string",
            name: "makerOrderId",
            type: "string",
          },
          {
            internalType: "address",
            name: "maker",
            type: "address",
          },
          {
            internalType: "address",
            name: "baseToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "quoteToken",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "baseAmountFilled",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "quoteAmountFilled",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "makerSignature",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "makerTimestamp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "makerDeadline",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "makerSalt",
            type: "string",
          },
          {
            internalType: "bytes",
            name: "makerSide",
            type: "bytes",
          },
          {
            internalType: "address",
            name: "taker",
            type: "address",
          },
          {
            internalType: "string",
            name: "takerOrderId",
            type: "string",
          },
          {
            internalType: "bytes",
            name: "takerSignature",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "takerTimestamp",
            type: "uint256",
          },
        ],
        internalType: "struct Settlement.OrderMatch",
        name: "orderMatch",
        type: "tuple",
      },
    ],
    name: "verifyMakerSignature",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "string",
            name: "makerOrderId",
            type: "string",
          },
          {
            internalType: "address",
            name: "maker",
            type: "address",
          },
          {
            internalType: "address",
            name: "baseToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "quoteToken",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "baseAmountFilled",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "quoteAmountFilled",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "makerSignature",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "makerTimestamp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "makerDeadline",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "makerSalt",
            type: "string",
          },
          {
            internalType: "bytes",
            name: "makerSide",
            type: "bytes",
          },
          {
            internalType: "address",
            name: "taker",
            type: "address",
          },
          {
            internalType: "string",
            name: "takerOrderId",
            type: "string",
          },
          {
            internalType: "bytes",
            name: "takerSignature",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "takerTimestamp",
            type: "uint256",
          },
        ],
        internalType: "struct Settlement.OrderMatch",
        name: "orderMatch",
        type: "tuple",
      },
    ],
    name: "verifyTakerSignature",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x60a060405234620000365762000014620001a5565b6200001e6200003c565b611dab620004108239608051816101250152611dab90f35b62000042565b60405190565b600080fd5b7f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f90565b60018060a01b031690565b90565b620000926200008c62000098926200006b565b62000076565b6200006b565b90565b620000a69062000079565b90565b620000b4906200009b565b90565b90565b620000c590620000b7565b9052565b90565b620000d790620000c9565b9052565b620000e6906200006b565b90565b620000f490620000db565b9052565b909594926200014e946200013b6200014692620001306080966200012560a088019c6000890190620000ba565b6020870190620000ba565b6040850190620000ba565b6060830190620000cc565b0190620000e9565b565b601f801991011690565b634e487b7160e01b600052604160045260246000fd5b906200017c9062000150565b810190811060018060401b038211176200019557604052565b6200015a565b60200190565b5190565b620001b033620002a0565b620001ba62000047565b620002397f3ee71d50dfa53faef569a5f5cff26b8b0ecce1c12bac5ad0b7279e95a87dd68d91620002297fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6466200021130620000a9565b916200021c6200003c565b96879560208701620000f8565b6020820181038252038262000170565b6200024f6200024882620001a1565b916200019b565b20608052565b90565b620002716200026b620002779262000255565b62000076565b6200006b565b90565b620002859062000258565b90565b91906200029e90600060208501940190620000e9565b565b80620002c2620002bb620002b560006200027a565b620000db565b91620000db565b14620002d557620002d390620003a2565b565b62000306620002e560006200027a565b620002ef6200003c565b918291631e4fbdf760e01b83526004830162000288565b0390fd5b60001c90565b60018060a01b031690565b6200032a62000330916200030a565b62000310565b90565b6200033f90546200031b565b90565b60001b90565b906200035b60018060a01b039162000342565b9181191691161790565b62000370906200009b565b90565b90565b90620003906200038a620003989262000365565b62000373565b825462000348565b9055565b60000190565b620003ae600062000333565b620003bb82600062000376565b90620003f3620003ec7f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09362000365565b9162000365565b91620003fe6200003c565b806200040a816200039c565b0390a356fe60806040526004361015610013575b6107b4565b61001e6000356100fd565b80633644e515146100f857806347e7ef24146100f35780635ea8abe7146100ee578063715018a6146100e95780638b8e72ee146100e45780638da5cb5b146100df5780638f601f66146100da578063c0993eea146100d5578063c6f4e6c1146100d0578063d1664e1c146100cb578063e2f5385b146100c6578063e429ef4d146100c1578063f2fde38b146100bc5763f3fef3a30361000e57610780565b61074d565b6106f9565b6106c4565b61068f565b6105ad565b610549565b6104e4565b6103a8565b610350565b61031d565b6102e8565b61023d565b61016d565b60e01c90565b60405190565b600080fd5b600080fd5b600091031261011e57565b61010e565b7f000000000000000000000000000000000000000000000000000000000000000090565b90565b61015390610147565b9052565b919061016b9060006020850194019061014a565b565b3461019d5761017d366004610113565b610199610188610123565b610190610103565b91829182610157565b0390f35b610109565b600080fd5b60018060a01b031690565b6101bb906101a7565b90565b6101c7816101b2565b036101ce57565b600080fd5b905035906101e0826101be565b565b90565b6101ee816101e2565b036101f557565b600080fd5b90503590610207826101e5565b565b9190604083820312610232578061022661022f92600086016101d3565b936020016101fa565b90565b61010e565b60000190565b3461026c57610256610250366004610209565b90610a0a565b61025e610103565b8061026881610237565b0390f35b610109565b600080fd5b90816101e09103126102855790565b610271565b906020828203126102bb57600082013567ffffffffffffffff81116102b6576102b39201610276565b90565b6101a2565b61010e565b151590565b6102ce906102c0565b9052565b91906102e6906000602085019401906102c5565b565b34610318576103146103036102fe36600461028a565b6112e6565b61030b610103565b918291826102d2565b0390f35b610109565b3461034b5761032d366004610113565b61033561195e565b61033d610103565b8061034781610237565b0390f35b610109565b346103805761037c61036b61036636600461028a565b611968565b610373610103565b918291826102d2565b0390f35b610109565b61038e906101b2565b9052565b91906103a690600060208501940190610385565b565b346103d8576103b8366004610113565b6103d46103c36119a8565b6103cb610103565b91829182610392565b0390f35b610109565b919060408382031261040657806103fa61040392600086016101d3565b936020016101d3565b90565b61010e565b90565b61042261041d610427926101a7565b61040b565b6101a7565b90565b6104339061040e565b90565b61043f9061042a565b90565b9061044c90610436565b600052602052604060002090565b9061046490610436565b600052602052604060002090565b1c90565b90565b61048990600861048e9302610472565b610476565b90565b9061049c9154610479565b90565b6104b96104be926104b4600293600094610442565b61045a565b610491565b90565b6104ca906101e2565b9052565b91906104e2906000602085019401906104c1565b565b34610515576105116105006104fa3660046103dd565b9061049f565b610508610103565b918291826104ce565b0390f35b610109565b7f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f90565b61054661051a565b90565b3461057957610559366004610113565b61057561056461053e565b61056c610103565b91829182610157565b0390f35b610109565b7fe8b79b0bdfc00b71fc372409baca97cf16a10126600e8c1dc7f738994facbd4190565b6105aa61057e565b90565b346105dd576105bd366004610113565b6105d96105c86105a2565b6105d0610103565b91829182610157565b0390f35b610109565b6105eb81610147565b036105f257565b600080fd5b90503590610604826105e2565b565b906020828203126106205761061d916000016105f7565b90565b61010e565b61062e90610147565b90565b9061063b90610625565b600052602052604060002090565b60ff1690565b61065f9060086106649302610472565b610649565b90565b90610672915461064f565b90565b61068c90610687600191600092610631565b610667565b90565b346106bf576106bb6106aa6106a5366004610606565b610675565b6106b2610103565b918291826102d2565b0390f35b610109565b346106f4576106f06106df6106da36600461028a565b6119be565b6106e7610103565b918291826102d2565b0390f35b610109565b346107295761072561071461070f36600461028a565b6119e9565b61071c610103565b91829182610157565b0390f35b610109565b9060208282031261074857610745916000016101d3565b90565b61010e565b3461077b5761076561076036600461072e565b611ac0565b61076d610103565b8061077781610237565b0390f35b610109565b346107af57610799610793366004610209565b90611b73565b6107a1610103565b806107ab81610237565b0390f35b610109565b600080fd5b6107c29061040e565b90565b6107ce906107b9565b90565b6107da9061042a565b90565b6107e69061042a565b90565b601f801991011690565b634e487b7160e01b600052604160045260246000fd5b90610813906107e9565b810190811067ffffffffffffffff82111761082d57604052565b6107f3565b60e01b90565b610841816102c0565b0361084857565b600080fd5b9050519061085a82610838565b565b90602082820312610876576108739160000161084d565b90565b61010e565b6040906108a56108ac949695939661089b60608401986000850190610385565b6020830190610385565b01906104c1565b565b6108b6610103565b3d6000823e3d90fd5b60209181520190565b60007f5472616e73666572206661696c65640000000000000000000000000000000000910152565b6108fd600f6020926108bf565b610906816108c8565b0190565b61092090602081019060008183039101526108f0565b90565b1561092a57565b610932610103565b62461bcd60e51b8152806109486004820161090a565b0390fd5b60001c90565b61095e6109639161094c565b610476565b90565b6109709054610952565b90565b634e487b7160e01b600052601160045260246000fd5b61099861099e919392936101e2565b926101e2565b82018092116109a957565b610973565b60001b90565b906109c1600019916109ae565b9181191691161790565b6109df6109da6109e4926101e2565b61040b565b6101e2565b90565b90565b906109ff6109fa610a06926109cb565b6109e7565b82546109b4565b9055565b610a1b610a16826107c5565b6107d1565b60206323b872dd913390610a4c6000610a33306107dd565b95610a5789610a40610103565b98899788968795610832565b85526004850161087b565b03925af18015610ad557610aa593610a7e610a9092610a9f94600091610aa7575b50610923565b92610a8b60023390610442565b61045a565b91610a9a83610966565b610989565b906109ea565b565b610ac8915060203d8111610ace575b610ac08183610809565b81019061085c565b38610a78565b503d610ab6565b6108ae565b600090565b35610ae9816101e5565b90565b60007f4d616b6572206f72646572206578706972656400000000000000000000000000910152565b610b2160136020926108bf565b610b2a81610aec565b0190565b610b449060208101906000818303910152610b14565b90565b15610b4e57565b610b56610103565b62461bcd60e51b815280610b6c60048201610b2e565b0390fd5b610b7c610b819161094c565b610649565b90565b610b8e9054610b70565b90565b60007f4d6174636820616c72656164792066696c6c6564000000000000000000000000910152565b610bc660146020926108bf565b610bcf81610b91565b0190565b610be99060208101906000818303910152610bb9565b90565b15610bf357565b610bfb610103565b62461bcd60e51b815280610c1160048201610bd3565b0390fd5b60007f496e76616c6964206d616b6572207369676e6174757265000000000000000000910152565b610c4a60176020926108bf565b610c5381610c15565b0190565b610c6d9060208101906000818303910152610c3d565b90565b15610c7757565b610c7f610103565b62461bcd60e51b815280610c9560048201610c57565b0390fd5b60007f496e76616c69642074616b6572207369676e6174757265000000000000000000910152565b610cce60176020926108bf565b610cd781610c99565b0190565b610cf19060208101906000818303910152610cc1565b90565b15610cfb57565b610d03610103565b62461bcd60e51b815280610d1960048201610cdb565b0390fd5b90610d2960ff916109ae565b9181191691161790565b610d3c906102c0565b90565b90565b90610d57610d52610d5e92610d33565b610d3f565b8254610d1d565b9055565b600080fd5b600080fd5b600080fd5b903590600160200381360303821215610db3570180359067ffffffffffffffff8211610dae57602001916001820236038313610da957565b610d6c565b610d67565b610d62565b600080fd5b90610dd0610dc9610103565b9283610809565b565b67ffffffffffffffff8111610df057610dec6020916107e9565b0190565b6107f3565b90826000939282370152565b90929192610e16610e1182610dd2565b610dbd565b93818552602085019082840111610e3257610e3092610df5565b565b610db8565b610e42913691610e01565b90565b60200190565b5190565b67ffffffffffffffff8111610e6d57610e696020916107e9565b0190565b6107f3565b90610e84610e7f83610e4f565b610dbd565b918252565b60007f4255590000000000000000000000000000000000000000000000000000000000910152565b610ebb6003610e72565b90610ec860208301610e89565b565b610ed2610eb1565b90565b60007f53454c4c00000000000000000000000000000000000000000000000000000000910152565b610f076004610e72565b90610f1460208301610ed5565b565b610f1e610efd565b90565b35610f2b816101be565b90565b60207f2900000000000000000000000000000000000000000000000000000000000000917f4d616b65722062616c616e636520697320696e73756666696369656e7420283360008201520152565b610f8960216040926108bf565b610f9281610f2e565b0190565b610fac9060208101906000818303910152610f7c565b90565b15610fb657565b610fbe610103565b62461bcd60e51b815280610fd460048201610f96565b0390fd5b60207f2900000000000000000000000000000000000000000000000000000000000000917f54616b65722062616c616e636520697320696e73756666696369656e7420283460008201520152565b61103360216040926108bf565b61103c81610fd8565b0190565b6110569060208101906000818303910152611026565b90565b1561106057565b611068610103565b62461bcd60e51b81528061107e60048201611040565b0390fd5b611091611097919392936101e2565b926101e2565b82039182116110a257565b610973565b60207f2900000000000000000000000000000000000000000000000000000000000000917f4d616b65722062616c616e636520697320696e73756666696369656e7420283160008201520152565b61110260216040926108bf565b61110b816110a7565b0190565b61112590602081019060008183039101526110f5565b90565b1561112f57565b611137610103565b62461bcd60e51b81528061114d6004820161110f565b0390fd5b60207f2900000000000000000000000000000000000000000000000000000000000000917f54616b65722062616c616e636520697320696e73756666696369656e7420283260008201520152565b6111ac60216040926108bf565b6111b581611151565b0190565b6111cf906020810190600081830391015261119f565b90565b156111d957565b6111e1610103565b62461bcd60e51b8152806111f7600482016111b9565b0390fd5b90359060016020038136030382121561123d570180359067ffffffffffffffff82116112385760200191600182023603831361123357565b610d6c565b610d67565b610d62565b905090565b9091826112578161125e93611242565b8093610df5565b0190565b909161126d92611247565b90565b61128461127b610103565b92839283611262565b03902090565b91946112d36112dd929897956112c960a0966112bf6112e49a6112b560c08a019e60008b0190610385565b6020890190610385565b6040870190610385565b6060850190610385565b60808301906104c1565b01906104c1565b565b6112ee610ada565b506113184261131161130b6113066101008601610adf565b6101e2565b916101e2565b1115610b47565b61137d611324826119e9565b61134961134461133e61133960018590610631565b610b84565b156102c0565b610bec565b61135a611355846119be565b610c70565b61136b61136684611968565b610cf4565b6113786001916001610631565b610d42565b61139561138f82610140810190610d71565b90610e37565b6113a76113a182610e4b565b91610e45565b206113d46113ce6113b6610eca565b6113c86113c282610e4b565b91610e45565b20610147565b91610147565b146000146116a15761143761141361140e6113fc60026113f660208701610f21565b90610442565b61140860608601610f21565b9061045a565b610966565b61143061142a61142560a08601610adf565b6101e2565b916101e2565b1015611128565b61149361146f61146a61145860026114526101608701610f21565b90610442565b61146460408601610f21565b9061045a565b610966565b61148c61148661148160808601610adf565b6101e2565b916101e2565b10156111d2565b6114e66114a260a08301610adf565b6114e06114d16114bf60026114b960208801610f21565b90610442565b6114cb60608701610f21565b9061045a565b916114db83610966565b611082565b906109ea565b6115396114f560808301610adf565b611533611524611512600261150c60208801610f21565b90610442565b61151e60408701610f21565b9061045a565b9161152e83610966565b610989565b906109ea565b61158d61154860a08301610adf565b61158761157861156660026115606101608801610f21565b90610442565b61157260608701610f21565b9061045a565b9161158283610966565b610989565b906109ea565b6115e161159c60808301610adf565b6115db6115cc6115ba60026115b46101608801610f21565b90610442565b6115c660408701610f21565b9061045a565b916115d683610966565b611082565b906109ea565b5b6115f08160008101906111fb565b90611600836101808101906111fb565b93909261169961161260208401610f21565b916116206101608501610f21565b9361162d60408201610f21565b9761168761163d60608401610f21565b9161168161165960a061165260808801610adf565b9601610adf565b957fdbee3a30413bae1e0c2df872181bdd654af3e01528cdc5f78418104a55afef489a611270565b99611270565b98611690610103565b9687968761128a565b0390a3600190565b6116b96116b382610140810190610d71565b90610e37565b6116cb6116c582610e4b565b91610e45565b206116f86116f26116da610f16565b6116ec6116e682610e4b565b91610e45565b20610147565b91610147565b14611703575b6115e2565b61175e61173a611735611723600261171d60208701610f21565b90610442565b61172f60408601610f21565b9061045a565b610966565b61175761175161174c60808601610adf565b6101e2565b916101e2565b1015610faf565b6117ba61179661179161177f60026117796101608701610f21565b90610442565b61178b60608601610f21565b9061045a565b610966565b6117b36117ad6117a860a08601610adf565b6101e2565b916101e2565b1015611059565b61180e6117c960a08301610adf565b6118086117f96117e760026117e16101608801610f21565b90610442565b6117f360608701610f21565b9061045a565b9161180383610966565b611082565b906109ea565b61186261181d60808301610adf565b61185c61184d61183b60026118356101608801610f21565b90610442565b61184760408701610f21565b9061045a565b9161185783610966565b610989565b906109ea565b6118b561187160a08301610adf565b6118af6118a061188e600261188860208801610f21565b90610442565b61189a60608701610f21565b9061045a565b916118aa83610966565b610989565b906109ea565b6119086118c460808301610adf565b6119026118f36118e160026118db60208801610f21565b90610442565b6118ed60408701610f21565b9061045a565b916118fd83610966565b611082565b906109ea565b6116fe565b611915611c74565b61191d61194a565b565b90565b61193661193161193b9261191f565b61040b565b6101a7565b90565b61194790611922565b90565b61195c611957600061193e565b611d07565b565b61196661190d565b565b50611971610ada565b50600190565b600090565b60018060a01b031690565b6119936119989161094c565b61197c565b90565b6119a59054611987565b90565b6119b0611977565b506119bb600061199b565b90565b506119c7610ada565b50600190565b600090565b6119e694926119e092611247565b91611247565b90565b611a3c611a18916119f86119cd565b50611a2d611a0a8260008101906111fb565b9490926101808101906111fb565b90611a21610103565b958694602086016119d2565b60208201810382520382610809565b611a4e611a4882610e4b565b91610e45565b2090565b611a6390611a5e611c74565b611a65565b565b80611a81611a7b611a76600061193e565b6101b2565b916101b2565b14611a9157611a8f90611d07565b565b611abc611a9e600061193e565b611aa6610103565b918291631e4fbdf760e01b835260048301610392565b0390fd5b611ac990611a52565b565b60007f496e73756666696369656e742062616c616e6365000000000000000000000000910152565b611b0060146020926108bf565b611b0981611acb565b0190565b611b239060208101906000818303910152611af3565b90565b15611b2d57565b611b35610103565b62461bcd60e51b815280611b4b60048201611b0d565b0390fd5b916020611b71929493611b6a60408201966000830190610385565b01906104c1565b565b611bad611b94611b8f611b8860023390610442565b849061045a565b610966565b611ba6611ba0856101e2565b916101e2565b1015611b26565b611bbe611bb9826107c5565b6107d1565b602063a9059cbb913390611be660008795611bf1611bda610103565b97889687958694610832565b845260048401611b4f565b03925af18015611c6f57611c3f93611c18611c2a92611c3994600091611c41575b50610923565b92611c2560023390610442565b61045a565b91611c3483610966565b611082565b906109ea565b565b611c62915060203d8111611c68575b611c5a8183610809565b81019061085c565b38611c12565b503d611c50565b6108ae565b611c7c6119a8565b611c95611c8f611c8a611d68565b6101b2565b916101b2565b03611c9c57565b611cc5611ca7611d68565b611caf610103565b91829163118cdaa760e01b835260048301610392565b0390fd5b90611cda60018060a01b03916109ae565b9181191691161790565b90565b90611cfc611cf7611d0392610436565b611ce4565b8254611cc9565b9055565b611d11600061199b565b611d1c826000611ce7565b90611d50611d4a7f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e093610436565b91610436565b91611d59610103565b80611d6381610237565b0390a3565b611d70611977565b50339056fea26469706673582212204faa49867d44c7c68f02cf7e3712304bd66882228c55e1418b8687679d90a50964736f6c63430008180033";

type SettlementConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: SettlementConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class Settlement__factory extends ContractFactory {
  constructor(...args: SettlementConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(overrides || {});
  }
  override deploy(overrides?: NonPayableOverrides & { from?: string }) {
    return super.deploy(overrides || {}) as Promise<
      Settlement & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): Settlement__factory {
    return super.connect(runner) as Settlement__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): SettlementInterface {
    return new Interface(_abi) as SettlementInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): Settlement {
    return new Contract(address, _abi, runner) as unknown as Settlement;
  }
}
