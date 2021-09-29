import { BigNumber, Signer, utils } from 'ethers';
import { ethers } from 'hardhat';

export const BACKUP_TYPEHASH =
  '0x4310bae2d8c961b4f172b7233bb28f5e858776459ced2b09e2a6c2951c368ef4';

export const getCurrentBlockTime = async () => {
  const lastBlock = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(lastBlock);
  return block.timestamp;
};

export const makeBackupSignature = async (
  account: Signer,
  backupAddress: string,
  amount: BigNumber,
  deadline: number,
) => {
  const signature = await account.signMessage(
    utils.arrayify(
      utils.keccak256(
        utils.defaultAbiCoder.encode(
          ['bytes32', 'address', 'address', 'uint256', 'uint256'],
          [
            BACKUP_TYPEHASH,
            await account.getAddress(),
            backupAddress,
            amount,
            deadline,
          ],
        ),
      ),
    ),
  );

  return utils.splitSignature(signature);
};
