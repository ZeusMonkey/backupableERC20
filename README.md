# Backupable ERC20 token standard

### Installation

```console
$ yarn add
```

### Setup Environment Variables

You'll need a `INFURA_KEY`, `TESTNET_PRIVATE_KEY`, `MAINNET_PRIVATE_KEY`, and `ETHERSCAN_API_KEY` environment variable. Your `MNEMONIC` is your seed phrase of your wallet. You can find an `INFURA_KEY` from [Infura](https://infura.io/)

Then, you can create a `.env` file with the following.

```console
INFURA_KEY=fffff
TESTNET_PRIVATE_KEY=0x...
MAINNET_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=HXAN49AA...
```

### Deploy

Before deploy, you need to configure token name, symbol, decimals, and total supply.
You can change them in deploy/BackupableERC20.js file

Deploy on mainnet

```console
npx hardhat deploy --network mainnet --tags BackupableERC20
```

Deploy on rinkeby

```console
npx hardhat deploy --network rinkeby --tags BackupableERC20
```

If you want to deploy to other network, you need to configure network info at `hardhat.config.ts`

### Test

```console
npx hardhat test
```

### How to use it

If you want to backup your token, you need to set backup address first using `setBackupAddress` function.

Then you generate signature and can backup any time.

You can sign message like following:

```
const message = await account.signMessage(
  ethers.utils.arrayify(
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'address', 'address', 'uint256', 'uint256'],
        [
          BACKUP_TYPEHASH,
          accountAddress,
          backupAddress,
          amount,
          deadline,
        ],
      ),
    ),
  ),
);

const sig = ethers.utils.splitSignature(signature);
```

In the above example,
BACKUP_TYPEHASH = 0x4310bae2d8c961b4f172b7233bb28f5e858776459ced2b09e2a6c2951c368ef4

accountAddress is address of user who want to backup
backupAddress is address which is set by user for backup.
amount is current token balance of holder.
deadline is epoch timestamp, and signature will be expired after deadline.

Token deployed on rinkeby testnet

https://rinkeby.etherscan.io/address/0x24331055d4e790c1a94ec7db77342c557dd491a6
