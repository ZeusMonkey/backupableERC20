const { utils } = require("ethers");

const deployBackupableERC20 = async function ({
  deployments,
  getNamedAccounts,
}) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const NAME = "Backupable ERC20";
  const SYMBOL = "BTOKEN";
  const DECIMALS = 18;
  const TOTAL_SUPPLY = utils.parseUnits("10000", DECIMALS);

  await deploy("BackupableERC20", {
    from: deployer,
    args: [NAME, SYMBOL, DECIMALS, TOTAL_SUPPLY],
    log: true,
  });
};

module.exports = deployBackupableERC20;
module.exports.tags = ["BackupableERC20"];
