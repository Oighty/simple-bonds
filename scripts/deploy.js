// scripts/deploy.js - Deploys a BondDepository

// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // Get Signer from Hardhat
  const [owner, treasury, protocol] = await ethers.getSigners();

  // Deploy Parameters for BondDepository
  const baseTokenAddr = '0x12345678901234567890abcdefabcd1234567890'; // Example address, change to deploy

  // Create the Factory and Deploy the Contract
  const BondDepo = await hre.ethers.getContractFactory("BondDepository");
  const bondDepo = await BondDepo.deploy(
    baseTokenAddr, // IERC20 _baseToken,
    treasury.address, // address _projectTreasury
    owner.address, // address _depoOwner,    
    protocol.address, // address _protocolTreasury,
    100, // 1%, uint256 _protocolFee
  );
  await bondDepo.deployed();

  console.log("BondDepository deployed to:", bondDepo.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
