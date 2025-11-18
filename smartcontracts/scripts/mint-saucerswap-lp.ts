import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const rpcUrl = process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api";
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const nfpmAddress = process.env.SAUCERSWAP_NFPM_EVM;
  const token0Address = process.env.SAUCERSWAP_TOKEN0_EVM;
  const token1Address = process.env.SAUCERSWAP_TOKEN1_EVM;
  const token0Decimals = Number(process.env.SAUCERSWAP_TOKEN0_DECIMALS || "6");
  const token1Decimals = Number(process.env.SAUCERSWAP_TOKEN1_DECIMALS || "6");

  if (!privateKey || !nfpmAddress || !token0Address || !token1Address) {
    throw new Error(
      "Missing env vars: HEDERA_PRIVATE_KEY / SAUCERSWAP_NFPM_EVM / SAUCERSWAP_TOKEN0_EVM / SAUCERSWAP_TOKEN1_EVM"
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Using wallet:", wallet.address);

  // ABI for ERC20 + NonfungiblePositionManager (Uniswap V3)

  const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 value) external returns (bool)"
  ];

  const nfpmAbi = [
    "function mint((address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline)) external payable returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)"
  ];

  const nfpm = new ethers.Contract(nfpmAddress, nfpmAbi, wallet);
  const token0 = new ethers.Contract(token0Address, erc20Abi, wallet);
  const token1 = new ethers.Contract(token1Address, erc20Abi, wallet);

  // Configure pool parameters

  const FEE = 3000;              // 0.3% fee tier, example; use actual pool fee
  const TICK_LOWER = -887220;    // full-range example from Uni V3
  const TICK_UPPER =  887220;

  // How much liquidity to provide
  const amountToken0Desired = ethers.parseUnits("10", token0Decimals);  // 10 token0
  const amountToken1Desired = ethers.parseUnits("100", token1Decimals); // 100 token1

  const amountToken0Min = amountToken0Desired * 99n / 100n; // 1% slippage buffer
  const amountToken1Min = amountToken1Desired * 99n / 100n;

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 10); // 10 minutes

  // Check & approve balances

  const bal0 = await token0.balanceOf(wallet.address);
  const bal1 = await token1.balanceOf(wallet.address);
  console.log(`Token0 balance: ${bal0.toString()}`);
  console.log(`Token1 balance: ${bal1.toString()}`);

  if (bal0 < amountToken0Desired) {
    throw new Error("Insufficient token0 balance for desired liquidity");
  }
  if (bal1 < amountToken1Desired) {
    throw new Error("Insufficient token1 balance for desired liquidity");
  }

  console.log("Approving NFPM to spend token0 & token1...");

  const approve0Tx = await token0.approve(nfpmAddress, amountToken0Desired);
  console.log("approve token0 tx:", approve0Tx.hash);
  await approve0Tx.wait();

  const approve1Tx = await token1.approve(nfpmAddress, amountToken1Desired);
  console.log("approve token1 tx:", approve1Tx.hash);
  await approve1Tx.wait();

  console.log("Approvals confirmed, minting LP position...");

  // Call mint()

  const mintParams = {
    token0: token0Address,
    token1: token1Address,
    fee: FEE,
    tickLower: TICK_LOWER,
    tickUpper: TICK_UPPER,
    amount0Desired: amountToken0Desired,
    amount1Desired: amountToken1Desired,
    amount0Min: amountToken0Min,
    amount1Min: amountToken1Min,
    recipient: wallet.address,
    deadline: deadline,
  };

  const tx = await nfpm.mint(mintParams, {
    gasLimit: 3_000_000n,
  });

  console.log("mint() tx sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("mint() confirmed in block", receipt.blockNumber);

  console.log("LP position minted. Check your account's NFTs for token ID 0.0.1310436.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});