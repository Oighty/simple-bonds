// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.10;

import "./BondDepository.sol";

/// @title Generalized Bond Depository Factory
/// @author Oighty
/// @notice Deploys BondDepository contracts for Users

contract BondDepositoryFactory is Ownable {
/* ========== EVENTS ========== */

  event CreateBondDepo(uint256 indexed depoId, address indexed depoAddr, address depoOwner, address indexed baseToken);

/* ========== STATE VARIABLES ========== */

  /// Storage
  uint256 public depoCounter;
  mapping(uint256 => address) depoAddresses;
  address public protocolTreasury;
  uint256 public protocolFee;

  /// Constants
  address internal constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
  
/* ========== CONSTRUCTOR ========== */

  /**
   * @param _protocolTreasury Address that fees earned by deployed Bond Depositories will be sent to
   * @param _protocolFee      Percent of user payouts paid to protocol as a fee, expressed in hundredths of a percent (e.g. 100 = 1%), in addition to user payout
   */
  constructor(
      address _protocolTreasury,
      uint256 _protocolFee
  )
  {
    require(_protocolTreasury != ZERO_ADDRESS, "Treasury cannot be zero address.");
    protocolTreasury = _protocolTreasury;

    require(_protocolFee <= 10000, "Fee out of bounds.");
    protocolFee = _protocolFee;
  }

/* ========== CREATE ========== */

  /**
   * @notice Creates a new Bond Depository
   * @param _baseToken        Address of token that will be used to payout Notes, must conform to IERC20Metadata
   * @param _projectTreasury  Address that will receive deposited funds
   * @param _depoOwner        Address that will have initial administrative control over the Bond Depository
   * @return id_
   * @return addr_
   */
  function create(
    IERC20Metadata _baseToken,
    address _projectTreasury,
    address _depoOwner
  ) external returns (
    uint256 id_,
    address addr_
  ) {
    /// Create Bond Depository
    BondDepository newDepo = new BondDepository(
      _baseToken,
      _projectTreasury,
      _depoOwner,
      protocolTreasury,
      protocolFee
    );

    /// Increment counter and store the new Bond Depository address in the mapping
    depoCounter++;
    id_ = depoCounter;
    addr_ = address(newDepo);
    depoAddresses[id_] = addr_;

    /// Emit CreatedBondDepo event
    emit CreateBondDepo(id_, addr_, _depoOwner, address(_baseToken));
  }

/* ========== MANAGEMENT ========== */

  /**
   * @notice Change the address of the Protocol Treasury (only Owner)
   * @param _protocolTreasury Address that fees earned by deployed Bond Depositories will be sent to
   */
  function setProtocolTreasury(address _protocolTreasury) external onlyOwner {
    require(_protocolTreasury != ZERO_ADDRESS, "Treasury cannot be zero address.");
    protocolTreasury = _protocolTreasury;
  }

  /**
   * @notice Change the fee charged by the Protocol for new Bond Depositories (only Owner)
   * @param _protocolFee Percent of user payouts paid to protocol as a fee, expressed in hundredths of a percent (e.g. 100 = 1%), in addition to user payout
   */
  function setProtocolFee(uint256 _protocolFee) external onlyOwner {
    require(_protocolFee <= 10000, "Fee out of bounds.");
    protocolFee = _protocolFee;
  }

}