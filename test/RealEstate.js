const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RealEstate", () => {
	let realEstate, escrow
	let deployer, seller
	let nftID = 1

	let purchasePrice = ethers.utils.parseUnits('100', 'ether')
	let escrowAmount = ethers.utils.parseUnits('20', 'ether')

	beforeEach(async () => {

		// Setup accounts
		accounts = await ethers.getSigners()
		deployer = accounts[0]
		seller = deployer
		buyer = accounts[1]
		inspector = accounts[2]
		lender = accounts[3]

		// Load contracts
		const RealEstate = await ethers.getContractFactory("RealEstate")
		const Escrow = await ethers.getContractFactory("Escrow")

		// Deploy contracts
		realEstate = await RealEstate.deploy()
		escrow = await Escrow.deploy(
			realEstate.address,
			nftID,
			purchasePrice,
			escrowAmount,
			seller.address,
			buyer.address,
			inspector.address,
			lender.address
		)

		// Seller approves NFT
		transaction = await realEstate.connect(seller).approve(escrow.address, nftID)
		await transaction.wait(1)

	})

	describe("Deployment", async () => {
		
		it("sends an NFT to the seller / deployer", async () => {
			expect(await realEstate.ownerOf(nftID)).to.equal(seller.address)
		})

	})

	describe("Selling real estate", async () => {
		let balance, transaction

		it("executes a successful transaction", async () => {

			// Expect seller to be the NFT owner before the sale
			expect(await realEstate.ownerOf(nftID)).to.equal(seller.address)

			// Check escrow balance
			balance = await escrow.getBalance();
			console.log("Escrow balance: ", ethers.utils.formatEther(balance))

			// Buyer deposits earnest
			transaction = await escrow.connect(buyer).depositEarnest({ value: escrowAmount })
			await transaction.wait(1)

			// Check escrow balance
			balance = await escrow.getBalance();
			console.log("Escrow balance: ", ethers.utils.formatEther(balance))

			// Inspector updates status
			transaction = await escrow.connect(inspector).updateInspectionStatus(true)
			await transaction.wait(1)
			console.log("Inspector updates status")

			// Buyer Approves sale
			transaction = await escrow.connect(buyer).approveSale()
			await transaction.wait(1)
			console.log("Buyer approves sale")

			// Seller Approves sale
			transaction = await escrow.connect(seller).approveSale()
			await transaction.wait(1)
			console.log("Seller approves sale")

			// Lender funds sale
			transaction = await lender.sendTransaction({ to: escrow.address, value: ethers.utils.parseUnits('80', 'ether') })

			// Lender Approves sale
			transaction = await escrow.connect(lender).approveSale()
			await transaction.wait(1)
			console.log("Lender approves sale")

			// Finalize sale
			transaction = await escrow.connect(buyer).finalizeSale()
			await transaction.wait(1)
			console.log("Buyer finalizes sale")

			// Expect buyer to be the NFT owner after the sale
			expect(await realEstate.ownerOf(nftID)).to.equal(buyer.address)

			// Expect seller to receive funds
			balance = await ethers.provider.getBalance(seller.address)
			console.log("Seller balance after sale: ", ethers.utils.formatEther(balance))
				
			expect(balance).to.be.above(ethers.utils.parseUnits('10099', 'ether'))

		})

	})



})