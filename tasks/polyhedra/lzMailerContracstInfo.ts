export const lzMailerContractInfo = {
    binanceContractAddress: "0xfd3f4d96378072db0862a6f76cc258c2b7ea36cc",
    polygonContractAddress: "0xdb6fb08dd8ce406da8ff53fae65bd374e3d68681",
    abi: [
        {
            inputs: [
                { internalType: "address", name: "_zkBridgeEntrypoint", type: "address" },
                { internalType: "address", name: "_lzEndpoint", type: "address" },
            ],
            stateMutability: "nonpayable",
            type: "constructor",
        },
        {
            anonymous: false,
            inputs: [
                { indexed: true, internalType: "uint64", name: "sequence", type: "uint64" },
                { indexed: true, internalType: "uint32", name: "dstChainId", type: "uint32" },
                { indexed: true, internalType: "address", name: "dstAddress", type: "address" },
                { indexed: false, internalType: "address", name: "sender", type: "address" },
                { indexed: false, internalType: "address", name: "recipient", type: "address" },
                { indexed: false, internalType: "string", name: "message", type: "string" },
            ],
            name: "LzMessageSend",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                { indexed: true, internalType: "uint64", name: "sequence", type: "uint64" },
                { indexed: true, internalType: "uint32", name: "dstChainId", type: "uint32" },
                { indexed: true, internalType: "address", name: "dstAddress", type: "address" },
                { indexed: false, internalType: "address", name: "sender", type: "address" },
                { indexed: false, internalType: "address", name: "recipient", type: "address" },
                { indexed: false, internalType: "string", name: "message", type: "string" },
            ],
            name: "MessageSend",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                { indexed: false, internalType: "uint16", name: "chainId", type: "uint16" },
                { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
            ],
            name: "NewFee",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
                { indexed: true, internalType: "address", name: "newOwner", type: "address" },
            ],
            name: "OwnershipTransferred",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                { indexed: false, internalType: "address", name: "account", type: "address" },
                { indexed: false, internalType: "bool", name: "zkBridgePaused", type: "bool" },
                { indexed: false, internalType: "bool", name: "layerZeroPaused", type: "bool" },
            ],
            name: "PauseSendAction",
            type: "event",
        },
        { inputs: [], name: "claimFees", outputs: [], stateMutability: "nonpayable", type: "function" },
        {
            inputs: [
                { internalType: "uint16", name: "_dstChainId", type: "uint16" },
                { internalType: "address", name: "_recipient", type: "address" },
                { internalType: "string", name: "_message", type: "string" },
            ],
            name: "estimateLzFee",
            outputs: [{ internalType: "uint256", name: "nativeFee", type: "uint256" }],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [{ internalType: "uint16", name: "", type: "uint16" }],
            name: "fees",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                { internalType: "uint16", name: "_srcChainId", type: "uint16" },
                { internalType: "bytes", name: "_srcAddress", type: "bytes" },
            ],
            name: "forceResumeReceive",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                { internalType: "uint16", name: "_version", type: "uint16" },
                { internalType: "uint16", name: "_dstChainId", type: "uint16" },
                { internalType: "uint256", name: "_configType", type: "uint256" },
            ],
            name: "getConfig",
            outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "getSendVersion",
            outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "layerZeroPaused",
            outputs: [{ internalType: "bool", name: "", type: "bool" }],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "lzEndpoint",
            outputs: [{ internalType: "contract ILayerZeroEndpoint", name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                { internalType: "uint16", name: "lzChainId", type: "uint16" },
                { internalType: "address", name: "lzDstAddress", type: "address" },
                { internalType: "address", name: "recipient", type: "address" },
                { internalType: "string", name: "message", type: "string" },
            ],
            name: "lzSendMessage",
            outputs: [],
            stateMutability: "payable",
            type: "function",
        },
        {
            inputs: [],
            name: "maxLength",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "owner",
            outputs: [{ internalType: "address", name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                { internalType: "bool", name: "zkBridgePaused_", type: "bool" },
                { internalType: "bool", name: "layerZeroPaused_", type: "bool" },
            ],
            name: "pause",
            outputs: [],
            stateMutability: "nonpayable",
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
                { internalType: "uint16", name: "dstChainId", type: "uint16" },
                { internalType: "address", name: "dstAddress", type: "address" },
                { internalType: "uint16", name: "lzChainId", type: "uint16" },
                { internalType: "address", name: "lzDstAddress", type: "address" },
                { internalType: "uint256", name: "nativeFee", type: "uint256" },
                { internalType: "address", name: "recipient", type: "address" },
                { internalType: "string", name: "message", type: "string" },
            ],
            name: "sendMessage",
            outputs: [],
            stateMutability: "payable",
            type: "function",
        },
        {
            inputs: [
                { internalType: "uint16", name: "_version", type: "uint16" },
                { internalType: "uint16", name: "_dstChainId", type: "uint16" },
                { internalType: "uint256", name: "_configType", type: "uint256" },
                { internalType: "bytes", name: "_config", type: "bytes" },
            ],
            name: "setConfig",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                { internalType: "uint16", name: "_dstChainId", type: "uint16" },
                { internalType: "uint256", name: "_fee", type: "uint256" },
            ],
            name: "setFee",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [{ internalType: "uint256", name: "_maxLength", type: "uint256" }],
            name: "setMsgLength",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [{ internalType: "uint16", name: "_version", type: "uint16" }],
            name: "setReceiveVersion",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [{ internalType: "uint16", name: "_version", type: "uint16" }],
            name: "setSendVersion",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
            name: "transferOwnership",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [],
            name: "zkBridgeEntrypoint",
            outputs: [{ internalType: "contract IZKBridgeEntrypoint", name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "zkBridgePaused",
            outputs: [{ internalType: "bool", name: "", type: "bool" }],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                { internalType: "uint16", name: "dstChainId", type: "uint16" },
                { internalType: "address", name: "dstAddress", type: "address" },
                { internalType: "address", name: "recipient", type: "address" },
                { internalType: "string", name: "message", type: "string" },
            ],
            name: "zkSendMessage",
            outputs: [],
            stateMutability: "payable",
            type: "function",
        },
    ],
};