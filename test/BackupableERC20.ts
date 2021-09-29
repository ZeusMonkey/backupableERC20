import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, Signer, BigNumber, utils, constants } from 'ethers';
import { getCurrentBlockTime, makeBackupSignature } from './utils';

describe('BackupableERC20', () => {
  let backupableToken: Contract;
  let alice: Signer;
  let bob: Signer;
  let carol: Signer;
  const NAME = 'Backupable ERC20';
  const SYMBOL = 'BTOKEN';
  const DECIMALS = 18;
  const TOTAL_SUPPLY = utils.parseUnits('10000', DECIMALS);

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [alice, bob, carol] = accounts;
    const BackupableERC20Factory = await ethers.getContractFactory(
      'BackupableERC20',
    );
    backupableToken = await BackupableERC20Factory.deploy(
      NAME,
      SYMBOL,
      DECIMALS,
      TOTAL_SUPPLY,
    );
  });

  describe('tokenomics', () => {
    it('check token info', async () => {
      expect(await backupableToken.name()).to.equal(NAME);
      expect(await backupableToken.symbol()).to.equal(SYMBOL);
      expect(await backupableToken.decimals()).to.equal(DECIMALS);
    });

    it('check total supply', async () => {
      expect(await backupableToken.totalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it('check initial balance', async () => {
      expect(
        await backupableToken.balanceOf(await alice.getAddress()),
      ).to.equal(TOTAL_SUPPLY);
    });
  });

  describe('ERC20 standard functions', () => {
    describe('#transfer function', () => {
      const bobBalance = utils.parseUnits('1000', DECIMALS);

      beforeEach(async () => {
        await backupableToken
          .connect(alice)
          .transfer(await bob.getAddress(), bobBalance);
      });

      it('should transfer token from one address to another', async () => {
        const amount = utils.parseUnits('500', DECIMALS);
        const tx = await backupableToken
          .connect(bob)
          .transfer(await carol.getAddress(), amount);
        expect(
          await backupableToken.balanceOf(await bob.getAddress()),
        ).to.equal(bobBalance.sub(amount));
        expect(
          await backupableToken.balanceOf(await carol.getAddress()),
        ).to.equal(amount);
        expect(tx)
          .to.emit(backupableToken, 'Transfer')
          .withArgs(await bob.getAddress(), await carol.getAddress(), amount);

        // TODO check return value
      });

      it('revert to transfer to zero address', async () => {
        const amount = utils.parseUnits('500', DECIMALS);

        await expect(
          backupableToken.connect(bob).transfer(constants.AddressZero, amount),
        ).to.revertedWith('BackupableERC20: transfer to the zero address');
      });

      it('revert to transfer amount greater than balance', async () => {
        const amount = utils.parseUnits('5000', DECIMALS);
        await expect(
          backupableToken
            .connect(bob)
            .transfer(await carol.getAddress(), amount),
        ).to.revertedWith('BackupableERC20: transfer amount exceeds balance');
      });
    });

    describe('#transferFrom function', () => {
      const bobBalance = utils.parseUnits('1000', DECIMALS);
      const allowance = utils.parseUnits('800', DECIMALS);

      beforeEach(async () => {
        await backupableToken
          .connect(alice)
          .transfer(await bob.getAddress(), bobBalance);
        await backupableToken
          .connect(bob)
          .approve(await alice.getAddress(), allowance);
      });

      it('should transfer token from one address to another by approved user', async () => {
        const amount = utils.parseUnits('500', DECIMALS);
        const aliceBalanceBefore = await backupableToken.balanceOf(
          await alice.getAddress(),
        );

        const tx = await backupableToken
          .connect(alice)
          .transferFrom(
            await bob.getAddress(),
            await carol.getAddress(),
            amount,
          );
        expect(
          await backupableToken.balanceOf(await alice.getAddress()),
        ).to.equal(aliceBalanceBefore);
        expect(
          await backupableToken.balanceOf(await bob.getAddress()),
        ).to.equal(bobBalance.sub(amount));
        expect(
          await backupableToken.balanceOf(await carol.getAddress()),
        ).to.equal(amount);
        expect(tx)
          .to.emit(backupableToken, 'Transfer')
          .withArgs(await bob.getAddress(), await carol.getAddress(), amount);
        expect(tx)
          .to.emit(backupableToken, 'Approval')
          .withArgs(
            await bob.getAddress(),
            await alice.getAddress(),
            allowance.sub(amount),
          );

        // TODO check return value
      });

      it('revert to transfer to zero address', async () => {
        const amount = utils.parseUnits('500', DECIMALS);

        await expect(
          backupableToken
            .connect(alice)
            .transferFrom(
              await bob.getAddress(),
              constants.AddressZero,
              amount,
            ),
        ).to.revertedWith('BackupableERC20: transfer to the zero address');
      });

      it('revert to transfer from zero address', async () => {
        const amount = utils.parseUnits('500', DECIMALS);

        await expect(
          backupableToken
            .connect(alice)
            .transferFrom(
              constants.AddressZero,
              await bob.getAddress(),
              amount,
            ),
        ).to.revertedWith('BackupableERC20: transfer from the zero address');
      });

      it('revert to transfer amount greater than allowance', async () => {
        const amount = utils.parseUnits('900', DECIMALS);
        await expect(
          backupableToken
            .connect(alice)
            .transferFrom(
              await bob.getAddress(),
              await carol.getAddress(),
              amount,
            ),
        ).to.revertedWith('BackupableERC20: transfer amount exceeds allowance');
      });

      it('revert to transfer amount greater than balance', async () => {
        const amount = utils.parseUnits('5000', DECIMALS);

        await backupableToken
          .connect(bob)
          .approve(await alice.getAddress(), amount);

        await expect(
          backupableToken
            .connect(alice)
            .transferFrom(
              await bob.getAddress(),
              await carol.getAddress(),
              amount,
            ),
        ).to.revertedWith('BackupableERC20: transfer amount exceeds balance');
      });
    });

    describe('#approve function', () => {
      it('should approve spender', async () => {
        // When allowance is zero
        const amount1 = utils.parseUnits('500', DECIMALS);
        const tx1 = await backupableToken
          .connect(bob)
          .approve(await carol.getAddress(), amount1);
        expect(
          await backupableToken.allowance(
            await bob.getAddress(),
            await carol.getAddress(),
          ),
        ).to.equal(amount1);
        expect(tx1)
          .to.emit(backupableToken, 'Approval')
          .withArgs(await bob.getAddress(), await carol.getAddress(), amount1);

        // When allowance is already set
        const amount2 = utils.parseUnits('5000', DECIMALS);
        const tx2 = await backupableToken
          .connect(bob)
          .approve(await carol.getAddress(), amount2);
        expect(
          await backupableToken.allowance(
            await bob.getAddress(),
            await carol.getAddress(),
          ),
        ).to.equal(amount2);
        expect(tx2)
          .to.emit(backupableToken, 'Approval')
          .withArgs(await bob.getAddress(), await carol.getAddress(), amount2);

        // TODO check return value
      });

      it('revert to approve zero address', async () => {
        const amount = utils.parseUnits('500', DECIMALS);

        await expect(
          backupableToken.connect(bob).approve(constants.AddressZero, amount),
        ).to.revertedWith('BackupableERC20: approve to the zero address');
      });
    });

    describe('#increaseAllowance function', () => {
      const initialAllowance = utils.parseUnits('500', DECIMALS);

      beforeEach(async () => {
        await backupableToken
          .connect(bob)
          .approve(await carol.getAddress(), initialAllowance);
      });

      it('should increase allowance of spender', async () => {
        const amount = utils.parseUnits('800', DECIMALS);
        const tx = await backupableToken
          .connect(bob)
          .increaseAllowance(await carol.getAddress(), amount);
        expect(
          await backupableToken.allowance(
            await bob.getAddress(),
            await carol.getAddress(),
          ),
        ).to.equal(initialAllowance.add(amount));
        expect(tx)
          .to.emit(backupableToken, 'Approval')
          .withArgs(
            await bob.getAddress(),
            await carol.getAddress(),
            initialAllowance.add(amount),
          );

        // TODO check return value
      });

      it('revert to approve zero address', async () => {
        const amount = utils.parseUnits('500', DECIMALS);

        await expect(
          backupableToken
            .connect(bob)
            .increaseAllowance(constants.AddressZero, amount),
        ).to.revertedWith('BackupableERC20: approve to the zero address');
      });
    });

    describe('#decreaseAllowance function', () => {
      const initialAllowance = utils.parseUnits('500', DECIMALS);

      beforeEach(async () => {
        await backupableToken
          .connect(bob)
          .approve(await carol.getAddress(), initialAllowance);
      });

      it('should decrease allowance of spender', async () => {
        const amount = utils.parseUnits('300', DECIMALS);
        const tx = await backupableToken
          .connect(bob)
          .decreaseAllowance(await carol.getAddress(), amount);
        expect(
          await backupableToken.allowance(
            await bob.getAddress(),
            await carol.getAddress(),
          ),
        ).to.equal(initialAllowance.sub(amount));
        expect(tx)
          .to.emit(backupableToken, 'Approval')
          .withArgs(
            await bob.getAddress(),
            await carol.getAddress(),
            initialAllowance.sub(amount),
          );

        // TODO check return value
      });

      it('revert to decrease if previous allowance is lower than decrease amount', async () => {
        const amount = utils.parseUnits('800', DECIMALS);

        await expect(
          backupableToken
            .connect(bob)
            .decreaseAllowance(await carol.getAddress(), amount),
        ).to.revertedWith('BackupableERC20: decreased allowance below zero');
      });
    });
  });

  describe('backup', () => {
    describe('#setBackupAddress function', () => {
      it('should set backup address', async () => {
        const tx = await backupableToken
          .connect(bob)
          .setBackupAddress(await carol.getAddress());
        expect(
          await backupableToken.backupAddress(await bob.getAddress()),
        ).to.equal(await carol.getAddress());
        expect(tx)
          .to.emit(backupableToken, 'BackupAddressSet')
          .withArgs(await bob.getAddress(), await carol.getAddress());
      });

      it('revert if msg.sender is blacklisted', async () => {
        const currentTime = await getCurrentBlockTime();
        const deadline = currentTime + 10000;
        await backupableToken
          .connect(carol)
          .setBackupAddress(await alice.getAddress());
        let carolSig = await makeBackupSignature(
          carol,
          await alice.getAddress(),
          BigNumber.from('0'),
          deadline,
        );
        await backupableToken
          .connect(alice)
          .backupToken(
            await carol.getAddress(),
            deadline,
            carolSig.v,
            carolSig.r,
            carolSig.s,
          );

        await expect(
          backupableToken
            .connect(bob)
            .setBackupAddress(await carol.getAddress()),
        ).to.be.revertedWith('BackupableERC20: blacklisted');
      });

      it('revert if backup address is blacklisted', async () => {
        const currentTime = await getCurrentBlockTime();
        const deadline = currentTime + 10000;
        await backupableToken
          .connect(carol)
          .setBackupAddress(await alice.getAddress());
        let carolSig = await makeBackupSignature(
          carol,
          await alice.getAddress(),
          BigNumber.from('0'),
          deadline,
        );
        await backupableToken
          .connect(alice)
          .backupToken(
            await carol.getAddress(),
            deadline,
            carolSig.v,
            carolSig.r,
            carolSig.s,
          );

        await expect(
          backupableToken
            .connect(carol)
            .setBackupAddress(await bob.getAddress()),
        ).to.be.revertedWith('BackupableERC20: blacklisted');
      });
    });

    describe('#backupToken function', () => {
      const bobBalance = utils.parseUnits('1000', DECIMALS);

      beforeEach(async () => {
        await backupableToken
          .connect(alice)
          .transfer(await bob.getAddress(), bobBalance);
        await backupableToken
          .connect(bob)
          .setBackupAddress(await carol.getAddress());
      });

      it('should backup token and black list account', async () => {
        const currentTime = await getCurrentBlockTime();
        const deadline = currentTime + 10000;
        let sig = await makeBackupSignature(
          bob,
          await carol.getAddress(),
          bobBalance,
          deadline,
        );
        const tx = await backupableToken
          .connect(alice)
          .backupToken(await bob.getAddress(), deadline, sig.v, sig.r, sig.s);
        expect(
          await backupableToken.balanceOf(await bob.getAddress()),
        ).to.equal('0');
        expect(
          await backupableToken.balanceOf(await carol.getAddress()),
        ).to.equal(bobBalance);
        expect(
          await backupableToken.blacklisted(await bob.getAddress()),
        ).to.equal(true);
        expect(tx)
          .to.emit(backupableToken, 'Transfer')
          .withArgs(
            await bob.getAddress(),
            await carol.getAddress(),
            bobBalance,
          );
        expect(tx)
          .to.emit(backupableToken, 'EmergencyTransfer')
          .withArgs(
            await bob.getAddress(),
            await carol.getAddress(),
            bobBalance,
          );
        expect(tx)
          .to.emit(backupableToken, 'Blacklisted')
          .withArgs(await bob.getAddress());
      });

      it('revert if signature is expired', async () => {
        const currentTime = await getCurrentBlockTime();
        const deadline = currentTime - 10000;
        let sig = await makeBackupSignature(
          bob,
          await carol.getAddress(),
          bobBalance,
          deadline,
        );
        await expect(
          backupableToken
            .connect(alice)
            .backupToken(await bob.getAddress(), deadline, sig.v, sig.r, sig.s),
        ).to.be.revertedWith('BackupableERC20: signature expired');
      });

      it('revert if backup address is not set', async () => {
        const currentTime = await getCurrentBlockTime();
        const deadline = currentTime + 10000;
        let sig = await makeBackupSignature(
          alice,
          await carol.getAddress(),
          bobBalance,
          deadline,
        );
        await expect(
          backupableToken
            .connect(bob)
            .backupToken(
              await alice.getAddress(),
              deadline,
              sig.v,
              sig.r,
              sig.s,
            ),
        ).to.be.revertedWith('BackupableERC20: backup address is not set');
      });

      it('revert if already backed up', async () => {
        const currentTime = await getCurrentBlockTime();
        const deadline = currentTime + 10000;
        let sig = await makeBackupSignature(
          bob,
          await carol.getAddress(),
          bobBalance,
          deadline,
        );
        await backupableToken
          .connect(alice)
          .backupToken(await bob.getAddress(), deadline, sig.v, sig.r, sig.s);

        await expect(
          backupableToken
            .connect(alice)
            .backupToken(await bob.getAddress(), deadline, sig.v, sig.r, sig.s),
        ).to.be.revertedWith('BackupableERC20: blacklisted');
      });

      it('revert if backup address is blacklisted', async () => {
        const currentTime = await getCurrentBlockTime();
        const deadline = currentTime + 10000;
        await backupableToken
          .connect(carol)
          .setBackupAddress(await alice.getAddress());
        let carolSig = await makeBackupSignature(
          carol,
          await alice.getAddress(),
          BigNumber.from('0'),
          deadline,
        );
        await backupableToken
          .connect(alice)
          .backupToken(
            await carol.getAddress(),
            deadline,
            carolSig.v,
            carolSig.r,
            carolSig.s,
          );

        let bobSig = await makeBackupSignature(
          bob,
          await carol.getAddress(),
          bobBalance,
          deadline,
        );

        await expect(
          backupableToken
            .connect(alice)
            .backupToken(
              await bob.getAddress(),
              deadline,
              bobSig.v,
              bobSig.r,
              bobSig.s,
            ),
        ).to.be.revertedWith('BackupableERC20: backup address is black listed');
      });

      it('revert if signature is invalid', async () => {
        const currentTime = await getCurrentBlockTime();
        const deadline = currentTime + 10000;
        let sig = await makeBackupSignature(
          alice,
          await carol.getAddress(),
          bobBalance,
          deadline,
        );
        await expect(
          backupableToken
            .connect(alice)
            .backupToken(await bob.getAddress(), deadline, sig.v, sig.r, sig.s),
        ).to.be.revertedWith('BackupableERC20: invalid signature');
      });
    });

    describe('disable token transfer if blacklisted', () => {
      const bobBalance = utils.parseUnits('1000', DECIMALS);

      beforeEach(async () => {
        await backupableToken
          .connect(alice)
          .transfer(await bob.getAddress(), bobBalance);
        await backupableToken
          .connect(bob)
          .setBackupAddress(await carol.getAddress());
        const currentTime = await getCurrentBlockTime();
        const deadline = currentTime + 10000;
        let sig = await makeBackupSignature(
          bob,
          await carol.getAddress(),
          bobBalance,
          deadline,
        );
        await backupableToken
          .connect(alice)
          .backupToken(await bob.getAddress(), deadline, sig.v, sig.r, sig.s);
      });

      it('revert transfer to blacklisted address', async () => {
        await expect(
          backupableToken
            .connect(alice)
            .transfer(await bob.getAddress(), bobBalance),
        ).to.revertedWith('BackupableERC20: blacklisted');

        await backupableToken
          .connect(alice)
          .approve(await carol.getAddress(), bobBalance);
        await expect(
          backupableToken
            .connect(carol)
            .transferFrom(
              await alice.getAddress(),
              await bob.getAddress(),
              bobBalance,
            ),
        ).to.revertedWith('BackupableERC20: blacklisted');
      });

      it('revert transfer from blacklisted address', async () => {
        await expect(
          backupableToken.connect(bob).transfer(await alice.getAddress(), 0),
        ).to.revertedWith('BackupableERC20: blacklisted');

        await expect(
          backupableToken
            .connect(carol)
            .transferFrom(await bob.getAddress(), await alice.getAddress(), 0),
        ).to.revertedWith('BackupableERC20: blacklisted');
      });
    });

    describe('disable token approve if blacklisted', () => {
      const bobBalance = utils.parseUnits('1000', DECIMALS);

      beforeEach(async () => {
        await backupableToken
          .connect(alice)
          .transfer(await bob.getAddress(), bobBalance);
        await backupableToken
          .connect(bob)
          .approve(await alice.getAddress(), bobBalance);
        await backupableToken
          .connect(bob)
          .setBackupAddress(await carol.getAddress());
        await backupableToken
          .connect(alice)
          .approve(await bob.getAddress(), bobBalance);
        const currentTime = await getCurrentBlockTime();
        const deadline = currentTime + 10000;
        let sig = await makeBackupSignature(
          bob,
          await carol.getAddress(),
          bobBalance,
          deadline,
        );
        await backupableToken
          .connect(alice)
          .backupToken(await bob.getAddress(), deadline, sig.v, sig.r, sig.s);
      });

      it('revert approve blacklisted address', async () => {
        await expect(
          backupableToken
            .connect(alice)
            .approve(await bob.getAddress(), bobBalance),
        ).to.revertedWith('BackupableERC20: blacklisted');

        await expect(
          backupableToken
            .connect(alice)
            .increaseAllowance(await bob.getAddress(), bobBalance),
        ).to.revertedWith('BackupableERC20: blacklisted');

        await expect(
          backupableToken
            .connect(alice)
            .decreaseAllowance(await bob.getAddress(), bobBalance),
        ).to.revertedWith('BackupableERC20: blacklisted');
      });

      it('revert approve by blacklisted address', async () => {
        await expect(
          backupableToken
            .connect(bob)
            .approve(await alice.getAddress(), bobBalance),
        ).to.revertedWith('BackupableERC20: blacklisted');

        await expect(
          backupableToken
            .connect(bob)
            .increaseAllowance(await alice.getAddress(), bobBalance),
        ).to.revertedWith('BackupableERC20: blacklisted');

        await expect(
          backupableToken
            .connect(bob)
            .decreaseAllowance(await alice.getAddress(), bobBalance),
        ).to.revertedWith('BackupableERC20: blacklisted');
      });
    });
  });
});
