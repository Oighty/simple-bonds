// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IBondDepository {

  // Info about each type of market
  struct Market {
    uint256 capacity; // capacity remaining
    IERC20 quoteToken; // token to accept as payment
    bool capacityInQuote; // capacity limit is in quote token (true) or in the base token (false, default)
    uint256 totalDebt; // total debt from market
    uint256 maxPayout; // max tokens in/out (determined by capacityInQuote false/true, respectively)
    uint256 sold; // base tokens out
    uint256 purchased; // quote tokens in
  }

  // Info for creating new markets
  struct Terms {
    bool fixedTerm; // fixed term or fixed expiration
    uint256 controlVariable; // scaling variable for price
    uint48 vesting; // length of time from deposit to maturity if fixed-term
    uint48 conclusion; // timestamp when market no longer offered (doubles as time when market matures if fixed-expiry)
    uint256 maxDebt; // Debt maximum in the base token decimals
  }

  // Additional info about market.
  struct Metadata {
    uint48 lastTune; // last timestamp when control variable was tuned
    uint48 lastDecay; // last timestamp when market was created and debt was decayed
    uint48 length; // time from creation to conclusion. used as speed to decay debt.
    uint48 depositInterval; // target frequency of deposits
    uint48 tuneInterval; // frequency of tuning
    uint8 quoteDecimals; // decimals of quote token
  }

  // Control variable adjustment data
  struct Adjustment {
    uint256 change;
    uint48 lastAdjustment;
    uint48 timeToAdjusted;
    bool active;
  }

  // Info for market note
  struct Note {
    uint256 payout; // baseToken remaining to be paid
    uint48 created; // time market was created
    uint48 matured; // timestamp when market is matured
    uint48 redeemed; // time market was redeemed
    uint48 marketID; // market ID of deposit. uint48 to avoid adding a slot.
  }

  /* ========== MARKET FUNCTIONS =========== */

  /**
   * @notice deposit market
   * @param _bid uint256
   * @param _amount uint256
   * @param _maxPrice uint256
   * @param _user address
   * @return payout_ uint256
   * @return expiry_ uint256
   * @return index_ uint256
   */
  function deposit(
    uint256 _bid,
    uint256 _amount,
    uint256 _maxPrice,
    address _user
  ) external returns (
    uint256 payout_, 
    uint256 expiry_,
    uint256 index_
  );

  function create (
    IERC20 _quoteToken, // token used to deposit
    uint256[3] memory _market, // [capacity, initial price]
    bool[2] memory _booleans, // [capacity in quote, fixed term]
    uint256[2] memory _terms, // [vesting, conclusion]
    uint32[2] memory _intervals // [deposit interval, tune interval]
  ) external returns (uint256 id_);
  function close(uint256 _id) external;

  function isLive(uint256 _bid) external view returns (bool);
  function liveMarkets() external view returns (uint256[] memory);
  function liveMarketsFor(address _quoteToken) external view returns (uint256[] memory);
  function payoutFor(uint256 _amount, uint256 _bid) external view returns (uint256);
  function marketPrice(uint256 _bid) external view returns (uint256);
  function currentDebt(uint256 _bid) external view returns (uint256);
  function debtRatio(uint256 _bid) external view returns (uint256);
  function debtDecay(uint256 _bid) external view returns (uint256);
  function currentControlVariable(uint256 _id) external view returns (uint256);

  /* ========== NOTES FUNCTIONS ========== */

  function redeem(address _user, uint256[] memory _indexes) external returns (uint256);
  function redeemAll(address _user) external returns (uint256);
  function pushNote(address to, uint256 index) external;
  function pullNote(address from, uint256 index) external returns (uint256 newIndex_);

  function indexesFor(address _user) external view returns (uint256[] memory);
  function pendingFor(address _user, uint256 _index) external view returns (uint256 payout_, bool matured_);

  /* ========== MANAGEMENT FUNCTIONS ========== */
  function withdrawBaseToken(uint _amount) external;
  function depositBaseToken(uint _amount) external;
  function updateTreasury(address _treasury) external;
}