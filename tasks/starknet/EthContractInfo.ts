export const EthContractInfo = {
  address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  abi: [
    {
      "name": "Uint256",
      "size": 2,
      "type": "struct",
      "members": [
        {
          "name": "low",
          "type": "felt",
          "offset": 0
        },
        {
          "name": "high",
          "type": "felt",
          "offset": 1
        }
      ]
    },
    {
      "data": [
        {
          "name": "from_",
          "type": "felt"
        },
        {
          "name": "to",
          "type": "felt"
        },
        {
          "name": "value",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "Transfer",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "owner",
          "type": "felt"
        },
        {
          "name": "spender",
          "type": "felt"
        },
        {
          "name": "value",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "Approval",
      "type": "event"
    },
    {
      "name": "name",
      "type": "function",
      "inputs": [],
      "outputs": [
        {
          "name": "name",
          "type": "felt"
        }
      ],
      "stateMutability": "view"
    },
    {
      "name": "symbol",
      "type": "function",
      "inputs": [],
      "outputs": [
        {
          "name": "symbol",
          "type": "felt"
        }
      ],
      "stateMutability": "view"
    },
    {
      "name": "totalSupply",
      "type": "function",
      "inputs": [],
      "outputs": [
        {
          "name": "totalSupply",
          "type": "Uint256"
        }
      ],
      "stateMutability": "view"
    },
    {
      "name": "decimals",
      "type": "function",
      "inputs": [],
      "outputs": [
        {
          "name": "decimals",
          "type": "felt"
        }
      ],
      "stateMutability": "view"
    },
    {
      "name": "balanceOf",
      "type": "function",
      "inputs": [
        {
          "name": "account",
          "type": "felt"
        }
      ],
      "outputs": [
        {
          "name": "balance",
          "type": "Uint256"
        }
      ],
      "stateMutability": "view"
    },
    {
      "name": "allowance",
      "type": "function",
      "inputs": [
        {
          "name": "owner",
          "type": "felt"
        },
        {
          "name": "spender",
          "type": "felt"
        }
      ],
      "outputs": [
        {
          "name": "remaining",
          "type": "Uint256"
        }
      ],
      "stateMutability": "view"
    },
    {
      "name": "permittedMinter",
      "type": "function",
      "inputs": [],
      "outputs": [
        {
          "name": "minter",
          "type": "felt"
        }
      ],
      "stateMutability": "view"
    },
    {
      "name": "initialized",
      "type": "function",
      "inputs": [],
      "outputs": [
        {
          "name": "res",
          "type": "felt"
        }
      ],
      "stateMutability": "view"
    },
    {
      "name": "get_version",
      "type": "function",
      "inputs": [],
      "outputs": [
        {
          "name": "version",
          "type": "felt"
        }
      ],
      "stateMutability": "view"
    },
    {
      "name": "get_identity",
      "type": "function",
      "inputs": [],
      "outputs": [
        {
          "name": "identity",
          "type": "felt"
        }
      ],
      "stateMutability": "view"
    },
    {
      "name": "initialize",
      "type": "function",
      "inputs": [
        {
          "name": "init_vector_len",
          "type": "felt"
        },
        {
          "name": "init_vector",
          "type": "felt*"
        }
      ],
      "outputs": []
    },
    {
      "name": "transfer",
      "type": "function",
      "inputs": [
        {
          "name": "recipient",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ]
    },
    {
      "name": "transferFrom",
      "type": "function",
      "inputs": [
        {
          "name": "sender",
          "type": "felt"
        },
        {
          "name": "recipient",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ]
    },
    {
      "name": "approve",
      "type": "function",
      "inputs": [
        {
          "name": "spender",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ]
    },
    {
      "name": "increaseAllowance",
      "type": "function",
      "inputs": [
        {
          "name": "spender",
          "type": "felt"
        },
        {
          "name": "added_value",
          "type": "Uint256"
        }
      ],
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ]
    },
    {
      "name": "decreaseAllowance",
      "type": "function",
      "inputs": [
        {
          "name": "spender",
          "type": "felt"
        },
        {
          "name": "subtracted_value",
          "type": "Uint256"
        }
      ],
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ]
    },
    {
      "name": "permissionedMint",
      "type": "function",
      "inputs": [
        {
          "name": "recipient",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "outputs": []
    },
    {
      "name": "permissionedBurn",
      "type": "function",
      "inputs": [
        {
          "name": "account",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "outputs": []
    }
  ]
}