/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
  TypedContractMethod,
} from "../common";

export declare namespace Settlement {
  export type OrderMatchStruct = {
    makerOrderId: string;
    maker: AddressLike;
    baseToken: AddressLike;
    quoteToken: AddressLike;
    baseAmountFilled: BigNumberish;
    quoteAmountFilled: BigNumberish;
    makerSignature: BytesLike;
    makerTimestamp: BigNumberish;
    makerDeadline: BigNumberish;
    makerSalt: string;
    makerSide: BytesLike;
    taker: AddressLike;
    takerOrderId: string;
    takerSignature: BytesLike;
    takerTimestamp: BigNumberish;
  };

  export type OrderMatchStructOutput = [
    makerOrderId: string,
    maker: string,
    baseToken: string,
    quoteToken: string,
    baseAmountFilled: bigint,
    quoteAmountFilled: bigint,
    makerSignature: string,
    makerTimestamp: bigint,
    makerDeadline: bigint,
    makerSalt: string,
    makerSide: string,
    taker: string,
    takerOrderId: string,
    takerSignature: string,
    takerTimestamp: bigint
  ] & {
    makerOrderId: string;
    maker: string;
    baseToken: string;
    quoteToken: string;
    baseAmountFilled: bigint;
    quoteAmountFilled: bigint;
    makerSignature: string;
    makerTimestamp: bigint;
    makerDeadline: bigint;
    makerSalt: string;
    makerSide: string;
    taker: string;
    takerOrderId: string;
    takerSignature: string;
    takerTimestamp: bigint;
  };
}

export interface SettlementInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "DOMAIN_SEPARATOR"
      | "DOMAIN_TYPE_HASH"
      | "ORDER_MATCH_TYPE_HASH"
      | "deposit"
      | "deposits"
      | "filledMatches"
      | "getMatchHash"
      | "owner"
      | "renounceOwnership"
      | "trade"
      | "transferOwnership"
      | "verifyMakerSignature"
      | "verifyTakerSignature"
      | "withdraw"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic: "OrderMatched" | "OwnershipTransferred"
  ): EventFragment;

  encodeFunctionData(
    functionFragment: "DOMAIN_SEPARATOR",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "DOMAIN_TYPE_HASH",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "ORDER_MATCH_TYPE_HASH",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "deposit",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "deposits",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "filledMatches",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getMatchHash",
    values: [Settlement.OrderMatchStruct]
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "renounceOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "trade",
    values: [Settlement.OrderMatchStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "transferOwnership",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "verifyMakerSignature",
    values: [Settlement.OrderMatchStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "verifyTakerSignature",
    values: [Settlement.OrderMatchStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "withdraw",
    values: [AddressLike, BigNumberish]
  ): string;

  decodeFunctionResult(
    functionFragment: "DOMAIN_SEPARATOR",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "DOMAIN_TYPE_HASH",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "ORDER_MATCH_TYPE_HASH",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "deposit", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "deposits", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "filledMatches",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getMatchHash",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "renounceOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "trade", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "transferOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "verifyMakerSignature",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "verifyTakerSignature",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "withdraw", data: BytesLike): Result;
}

export namespace OrderMatchedEvent {
  export type InputTuple = [
    makerOrderId: string,
    takerOrderId: string,
    maker: AddressLike,
    taker: AddressLike,
    baseToken: AddressLike,
    quoteToken: AddressLike,
    baseAmountFilled: BigNumberish,
    quoteAmountFilled: BigNumberish
  ];
  export type OutputTuple = [
    makerOrderId: string,
    takerOrderId: string,
    maker: string,
    taker: string,
    baseToken: string,
    quoteToken: string,
    baseAmountFilled: bigint,
    quoteAmountFilled: bigint
  ];
  export interface OutputObject {
    makerOrderId: string;
    takerOrderId: string;
    maker: string;
    taker: string;
    baseToken: string;
    quoteToken: string;
    baseAmountFilled: bigint;
    quoteAmountFilled: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace OwnershipTransferredEvent {
  export type InputTuple = [previousOwner: AddressLike, newOwner: AddressLike];
  export type OutputTuple = [previousOwner: string, newOwner: string];
  export interface OutputObject {
    previousOwner: string;
    newOwner: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface Settlement extends BaseContract {
  connect(runner?: ContractRunner | null): Settlement;
  waitForDeployment(): Promise<this>;

  interface: SettlementInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  DOMAIN_SEPARATOR: TypedContractMethod<[], [string], "view">;

  DOMAIN_TYPE_HASH: TypedContractMethod<[], [string], "view">;

  ORDER_MATCH_TYPE_HASH: TypedContractMethod<[], [string], "view">;

  deposit: TypedContractMethod<
    [token: AddressLike, amount: BigNumberish],
    [void],
    "nonpayable"
  >;

  deposits: TypedContractMethod<
    [arg0: AddressLike, arg1: AddressLike],
    [bigint],
    "view"
  >;

  filledMatches: TypedContractMethod<[arg0: BytesLike], [boolean], "view">;

  getMatchHash: TypedContractMethod<
    [orderMatch: Settlement.OrderMatchStruct],
    [string],
    "view"
  >;

  owner: TypedContractMethod<[], [string], "view">;

  renounceOwnership: TypedContractMethod<[], [void], "nonpayable">;

  trade: TypedContractMethod<
    [orderMatch: Settlement.OrderMatchStruct],
    [boolean],
    "nonpayable"
  >;

  transferOwnership: TypedContractMethod<
    [newOwner: AddressLike],
    [void],
    "nonpayable"
  >;

  verifyMakerSignature: TypedContractMethod<
    [orderMatch: Settlement.OrderMatchStruct],
    [boolean],
    "view"
  >;

  verifyTakerSignature: TypedContractMethod<
    [orderMatch: Settlement.OrderMatchStruct],
    [boolean],
    "view"
  >;

  withdraw: TypedContractMethod<
    [token: AddressLike, amount: BigNumberish],
    [void],
    "nonpayable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "DOMAIN_SEPARATOR"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "DOMAIN_TYPE_HASH"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "ORDER_MATCH_TYPE_HASH"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "deposit"
  ): TypedContractMethod<
    [token: AddressLike, amount: BigNumberish],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "deposits"
  ): TypedContractMethod<
    [arg0: AddressLike, arg1: AddressLike],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "filledMatches"
  ): TypedContractMethod<[arg0: BytesLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "getMatchHash"
  ): TypedContractMethod<
    [orderMatch: Settlement.OrderMatchStruct],
    [string],
    "view"
  >;
  getFunction(
    nameOrSignature: "owner"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "renounceOwnership"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "trade"
  ): TypedContractMethod<
    [orderMatch: Settlement.OrderMatchStruct],
    [boolean],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "transferOwnership"
  ): TypedContractMethod<[newOwner: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "verifyMakerSignature"
  ): TypedContractMethod<
    [orderMatch: Settlement.OrderMatchStruct],
    [boolean],
    "view"
  >;
  getFunction(
    nameOrSignature: "verifyTakerSignature"
  ): TypedContractMethod<
    [orderMatch: Settlement.OrderMatchStruct],
    [boolean],
    "view"
  >;
  getFunction(
    nameOrSignature: "withdraw"
  ): TypedContractMethod<
    [token: AddressLike, amount: BigNumberish],
    [void],
    "nonpayable"
  >;

  getEvent(
    key: "OrderMatched"
  ): TypedContractEvent<
    OrderMatchedEvent.InputTuple,
    OrderMatchedEvent.OutputTuple,
    OrderMatchedEvent.OutputObject
  >;
  getEvent(
    key: "OwnershipTransferred"
  ): TypedContractEvent<
    OwnershipTransferredEvent.InputTuple,
    OwnershipTransferredEvent.OutputTuple,
    OwnershipTransferredEvent.OutputObject
  >;

  filters: {
    "OrderMatched(string,string,address,address,address,address,uint256,uint256)": TypedContractEvent<
      OrderMatchedEvent.InputTuple,
      OrderMatchedEvent.OutputTuple,
      OrderMatchedEvent.OutputObject
    >;
    OrderMatched: TypedContractEvent<
      OrderMatchedEvent.InputTuple,
      OrderMatchedEvent.OutputTuple,
      OrderMatchedEvent.OutputObject
    >;

    "OwnershipTransferred(address,address)": TypedContractEvent<
      OwnershipTransferredEvent.InputTuple,
      OwnershipTransferredEvent.OutputTuple,
      OwnershipTransferredEvent.OutputObject
    >;
    OwnershipTransferred: TypedContractEvent<
      OwnershipTransferredEvent.InputTuple,
      OwnershipTransferredEvent.OutputTuple,
      OwnershipTransferredEvent.OutputObject
    >;
  };
}
