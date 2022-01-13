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
  const [owner, , ] = await ethers.getSigners();

  // Deploy Parameters for BondDepository
  const baseTokenAddr = '';
  const treasuryAddr = owner.address;

  // Create the Factory and Deploy the Contract
  const BondDepo = await hre.ethers.getContractFactory("BondDepository");
  const bondDepo = await BondDepo.deploy(
    baseTokenAddr, // IERC20Metadata _baseToken,
    treasuryAddr, // address _treasury
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
