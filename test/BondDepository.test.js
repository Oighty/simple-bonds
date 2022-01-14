const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const { smock } = require('@defi-wonderland/smock');

const { round } = require("lodash");

// Updates needed to conform to new interface
describe.only("Bond Depository", async () => {
    const LARGE_APPROVAL = "100000000000000000000000000000000";
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    // Initial mint for tokens (10,000,000) - 18 decimals
    const initialQuoteMint = "10000000000000000000000000";
    const initialBaseMint = "10000000000000000000000000";
    const initialDeposit = "1000000000000000000000000";

    const mineBlock = async () => {
        await network.provider.request({
            method: "evm_mine",
            params: [],
        });
    };

    // Increase timestamp by amount determined by `offset`
    const jump = async (offset) => {
        await network.provider.request({
            method: "evm_increaseTime",
            params: [offset]
        });
    }


    let deployer, alice, bob, carol, treasury;
    let erc20Factory;
    let depositoryFactory;

    let quoteToken;
    let baseToken;
    let depository;

    let capacity = 10000e18; // Assumes 18 decimal base token
    let initialPrice = 400e18;
    let buffer = 2e5;

    let vesting = 100;
    let timeToConclusion = 60 * 60 * 24;
    let conclusion = round((Date.now() / 1000), 0) + timeToConclusion;

    let depositInterval = 60 * 60 * 4;
    let tuneInterval = 60 * 60;

    let refReward = 10;
    let daoReward = 50;

    var bid = 0;

    /**
     * Everything in this block is only run once before all tests.
     * This is the home for setup methods
     */
    before(async () => {
        [deployer, alice, bob, carol, treasury] = await ethers.getSigners();

        erc20Factory = await smock.mock("MockERC20");
        depositoryFactory = await ethers.getContractFactory("BondDepository");
    });

    beforeEach(async () => {
        quoteToken = await erc20Factory.deploy("Quote Token", "QT", 18);
        baseToken = await erc20Factory.deploy("Base Token", "BT", 18);
        depository = await depositoryFactory.deploy(
            baseToken.address,
            treasury.address
        );
        
        // Setup for each component
        await quoteToken.mint(bob.address, initialQuoteMint);

        await quoteToken.mint(deployer.address, initialDeposit);
        await quoteToken.approve(treasury.address, initialDeposit);
        
        await baseToken.mint(deployer.address, initialBaseMint);
        // await treasury.baseSupply.returns(await baseToken.totalSupply());

        // Mint enough baseToken to payout rewards
        await baseToken.mint(depository.address, "10000000000000000000000")

        await baseToken.connect(alice).approve(depository.address, LARGE_APPROVAL);
        await quoteToken.connect(bob).approve(depository.address, LARGE_APPROVAL);

        await quoteToken.connect(alice).approve(depository.address, capacity);

        // create the first bond
        await depository.create(
            quoteToken.address,
            [capacity, initialPrice, buffer],
            [false, true],
            [vesting, conclusion],
            [depositInterval, tuneInterval]
        );
    });

    it("should create market", async () => {
        expect(await depository.isLive(bid)).to.equal(true);
    });

    it("should conclude in correct amount of time", async () => {
        [,,,concludes,] = await depository.terms(bid);
        expect(concludes).to.equal(conclusion);
        [,,length,,,,] = await depository.metadata(bid);
        // timestamps are a bit inaccurate with tests
        var upperBound = timeToConclusion * 1.0033;
        var lowerBound = timeToConclusion * 0.9967;
        expect(Number(length)).to.be.greaterThan(lowerBound);
        expect(Number(length)).to.be.lessThan(upperBound);
    });

    it("should set max payout to correct % of capacity", async () => {
        [,,,,maxPayout,,] = await depository.markets(bid);
        var upperBound = capacity * 1.0033 / 6;
        var lowerBound = capacity * 0.9967 / 6;
        expect(Number(maxPayout)).to.be.greaterThan(lowerBound);
        expect(Number(maxPayout)).to.be.lessThan(upperBound);
    });

    it("should return IDs of all markets", async () => {
        // create a second bond
        await depository.create(
            quoteToken.address,
            [capacity, initialPrice, buffer],
            [false, true],
            [vesting, conclusion],
            [depositInterval, tuneInterval]
        );
        [first, second] = await depository.liveMarkets();
        expect(Number(first)).to.equal(0);
        expect(Number(second)).to.equal(1);
    });

    it("should update IDs of markets", async () => {
        // create a second bond
        await depository.create(
            quoteToken.address,
            [capacity, initialPrice, buffer],
            [false, true],
            [vesting, conclusion],
            [depositInterval, tuneInterval]
        );
        // close the first bond
        await depository.close(0);
        [first] = await depository.liveMarkets();
        expect(Number(first)).to.equal(1);
    });

    it("should include ID in live markets for quote token", async () => {
        [id] = await depository.liveMarketsFor(quoteToken.address);
        expect(Number(id)).to.equal(bid);
    });

    it("should start with price at initial price", async () => {
        let lowerBound = initialPrice * 0.9999;
        expect(Number(await depository.marketPrice(bid))).to.be.greaterThan(lowerBound);
    });

    it("should give accurate payout for price", async () => {
        let price = await depository.marketPrice(bid);
        let amount = "10000000000000000000000"; // 10,000
        let expectedPayout = amount / price;
        let lowerBound = expectedPayout * 0.9999;
        expect(Number(await depository.payoutFor(amount, 0))).to.be.greaterThan(lowerBound);
    });

    it("should decay debt", async () => {
        [,,,totalDebt,,,] = await depository.markets(0);
        
        await network.provider.send("evm_increaseTime", [100]);
        await depository.connect(bob).deposit(
            bid,
            "0",
            initialPrice,
            bob.address,
            carol.address
        );
        
        [,,,newTotalDebt,,,] = await depository.markets(0);
        expect(Number(totalDebt)).to.be.greaterThan(Number(newTotalDebt));
    });

    it("should not start adjustment if ahead of schedule", async () => {
        let amount = "650000000000000000000000"; // 10,000
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice * 2,
            bob.address,
            carol.address
        );
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice * 2,
            bob.address,
            carol.address
        );
        
        await network.provider.send("evm_increaseTime", [tuneInterval]);
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice * 2,
            bob.address,
            carol.address
        );
        [change, lastAdjustment, timeToAdjusted, active] = await depository.adjustments(bid);
        expect(Boolean(active)).to.equal(false);
    });
    
    it("should start adjustment if behind schedule", async () => {
        await network.provider.send("evm_increaseTime", [tuneInterval]);
        let amount = "10000000000000000000000"; // 10,000
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );
        [change, lastAdjustment, timeToAdjusted, active] = await depository.adjustments(bid);
        expect(Boolean(active)).to.equal(true);
    });

    it("adjustment should lower control variable by change in tune interval if behind", async () => {
        await network.provider.send("evm_increaseTime", [tuneInterval]);
        [,controlVariable,,,] = await depository.terms(bid);
        let amount = "10000000000000000000000"; // 10,000
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );
        await network.provider.send("evm_increaseTime", [tuneInterval]);
        [change, lastAdjustment, timeToAdjusted, active] = await depository.adjustments(bid);
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );
        [,newControlVariable,,,] = await depository.terms(bid);
        expect(newControlVariable).to.equal(controlVariable.sub(change));
    });

    it("adjustment should lower control variable by half of change in half of a tune interval", async () => {
        await network.provider.send("evm_increaseTime", [tuneInterval]);
        [,controlVariable,,,] = await depository.terms(bid);
        let amount = "10000000000000000000000"; // 10,000
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );
        [change, lastAdjustment, timeToAdjusted, active] = await depository.adjustments(bid);
        await network.provider.send("evm_increaseTime", [tuneInterval / 2]);
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );
        [,newControlVariable,,,] = await depository.terms(bid);
        let lowerBound = (controlVariable - (change / 2)) * 0.999;
        expect(Number(newControlVariable)).to.lessThanOrEqual(Number(controlVariable.sub(change.div(2))));
        expect(Number(newControlVariable)).to.greaterThan(Number(lowerBound));
    });

    it("adjustment should continue lowering over multiple deposits in same tune interval", async () => {
        await network.provider.send("evm_increaseTime", [tuneInterval]);
        [,controlVariable,,,] = await depository.terms(bid);
        let amount = "10000000000000000000000"; // 10,000
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        ); 
        [change, lastAdjustment, timeToAdjusted, active] = await depository.adjustments(bid);

        await network.provider.send("evm_increaseTime", [tuneInterval / 2]);
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );

        await network.provider.send("evm_increaseTime", [tuneInterval / 2]);
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );
        [,newControlVariable,,,] = await depository.terms(bid);
        expect(newControlVariable).to.equal(controlVariable.sub(change));
    });

    it("should allow a deposit", async () => {
        let amount = "10000000000000000000000"; // 10,000
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );

        expect(Array(await depository.indexesFor(bob.address)).length).to.equal(1);
    });

    it("should not allow a deposit greater than max payout", async () => {
        let amount = "6700000000000000000000000"; // 6.7m (400 * 10000 / 6 + 0.5%)
        await expect(depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        )).to.be.revertedWith("Depository: max size exceeded");
    });

    it("should not redeem before vested", async () => {
        let balance = await baseToken.balanceOf(bob.address);
        let amount = "10000000000000000000000"; // 10,000
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );
        await depository.connect(bob).redeemAll(bob.address, true);
        expect(await baseToken.balanceOf(bob.address)).to.equal(balance);
    });

    it("should redeem after vested", async () => {
        let amount = "10000000000000000000000"; // 10,000
        [expectedPayout, expiry, index] = await depository.connect(bob).callStatic.deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );

        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );

        await network.provider.send("evm_increaseTime", [1000]);
        await depository.redeemAll(bob.address, true);
        
        const bobBalance = Number(await baseToken.balanceOf(bob.address));
        expect(bobBalance).to.greaterThanOrEqual(Number(await baseToken.balanceTo(expectedPayout)));
        expect(bobBalance).to.lessThan(Number(await baseToken.balanceTo(expectedPayout * 1.0001)));
    });

    it("should give correct rewards to referrer and dao", async () => {
        let daoBalance = await baseToken.balanceOf(deployer.address);
        let refBalance = await baseToken.balanceOf(carol.address);
        let amount = "10000000000000000000000"; // 10,000
        [payout, expiry, index] = await depository.connect(bob).callStatic.deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );
        await depository.connect(bob).deposit(
            bid,
            amount,
            initialPrice,
            bob.address,
            carol.address
        );

        // Mint baseToken for depository to payout reward
        await baseToken.mint(depository.address, "1000000000000000000000");

        let daoExpected = Number(daoBalance) + Number(Number(payout) * daoReward / 1e4);
        await depository.getReward();

        const frontendReward = Number(await baseToken.balanceOf(deployer.address));
        expect(frontendReward).to.be.greaterThan(Number(daoExpected));
        expect(frontendReward).to.be.lessThan(Number(daoExpected) * 1.0001);

        let refExpected = Number(refBalance) + Number(Number(payout) * refReward / 1e4);
        await depository.connect(carol).getReward();

        const carolReward = Number(await baseToken.balanceOf(carol.address));
        expect(carolReward).to.be.greaterThan(Number(refExpected));
        expect(carolReward).to.be.lessThan(Number(refExpected) * 1.0001);
    });

    it("should decay a max payout in target deposit interval", async () => {
        [,,,,,maxPayout,,] = await depository.markets(bid);
        let price = await depository.marketPrice(bid);
        let amount = maxPayout * price;
        await depository.connect(bob).deposit(
            bid,
            amount, // amount for max payout
            initialPrice,
            bob.address,
            carol.address
        );
        await network.provider.send("evm_increaseTime", [depositInterval]);
        let newPrice = await depository.marketPrice(bid);
        expect(Number(newPrice)).to.be.lessThan(initialPrice);
    });

    it("should close a market", async () => {
        [capacity,,,,,,] = await depository.markets(bid);
        expect(Number(capacity)).to.be.greaterThan(0);
        await depository.close(bid);
        [capacity,,,,,,] = await depository.markets(bid);
        expect(Number(capacity)).to.equal(0);
    });

    // FIXME Works in isolation but not when run in suite
    it.skip("should not allow deposit past conclusion", async () => {
        await network.provider.send("evm_increaseTime", [timeToConclusion * 10000]);
        await expect(depository.connect(bob).deposit(
            bid,
            0,
            initialPrice,
            bob.address,
            carol.address
        )).to.be.revertedWith("Depository: market concluded");
    });
});