// scripts/deploy.js - Deploys a BondDepository

// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
require("dotenv").config();
const hre = require("hardhat");
const {
    bondDepoAbi
} = require("../contractInfo");

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // Get Signer from Hardhat
    const [owner, , ] = await ethers.getSigners();

    // Create Signer instance of BondDepository
    const bondDepoAddr = '';
    const bondDepo = new hre.ethers.Contract(bondDepoAddr, bondDepoAbi, owner);

    // Parameters for BondDepository.create()
    const quoteTokenAddr = '';  //  IERC20Metadata:  token used to deposit
    const marketValues = [ // uint256[3] memory _market
        hre.ethers.utils.parseUnits("1000", "ether"), // capacity (in base token or quote token) - example is 1000 * 10**18
        hre.ethers.utils.parseUnits(), //initial price / 10 ** base decimals, - Need to research
        hre.ethers.utils.parseUnits("10000", "wei") //debt buffer (3 decimals) - example is 10%
    ];
    const marketBools = [  //   bool[2] memory _booleans
        true,  // capacity in quote (true for capacity in quote, false for capacity in payout) 
        true,  // fixed term (true for fixed term (# of blocks), false for fixed expiration (block to end on))
    ];
    const marketTerms = [  //   uint256[2] memory _terms
        432000, // vesting length (if fixed term) or vested timestamp (example is fixed term of 5 days which is 432,000 seconds)
        1643695200, // conclusion timestamp (example is the Unix timestamp for February 1st, 2022 at 00:00:00)
    ];
    const marketIntervals = [ //   uint32[2] memory _intervals - Need to research how to set these better
        3600, // deposit interval (seconds) (example is 1 hour which is 3600 seconds)
        3600, // tune interval (seconds) (example is 1 hour which is 3600 seconds) 
    ];
            

    // Create the Market
    const id = await bondDepo.create(
        quoteTokenAddr, // IERC20Metadata _quoteToken,
        marketValues, // uint256[3] memory _market,
        marketBools, // bool[2] memory _booleans,
        marketTerms, // uint256[2] memory _terms,
        marketIntervals// uint32[2] memory _intervals
    );

    console.log('New Market creatd with ID:', id);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
