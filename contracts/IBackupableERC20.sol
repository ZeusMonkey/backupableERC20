// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IERC20.sol";

/**
 * @dev Interface of the IBackupableERC20.
 */
interface IBackupableERC20 is IERC20 {
    /**
     * @dev Returns backup address.
     */
    function backupAddress(address account) external view returns (address);

    /**
     * @dev Returns if black listed.
     */
    function blacklisted(address account) external view returns (bool);

    /**
     * @dev Emitted when `account` set `backupAddress` as backup address
     */
    event BackupAddressSet(
        address indexed account,
        address indexed backupAddress
    );

    /**
     * @dev Emitted when `account` is black listed
     */
    event Blacklisted(address indexed account);

    /**
     * @dev Emitted when `value` tokens are backed up from one account (`from`)
     */
    event EmergencyTransfer(
        address indexed from,
        address indexed to,
        uint256 amount
    );
}
