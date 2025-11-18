import { ethers } from "hardhat";

//
// CONFIG
//
const ROUTER = "0x0000000000000000000000000000000000001578"; 
// EVM address for 0.0.1414040

// USDC Testnet Token
const USDC = "0x00000000000000000000000000000000000048c4"; 
// EVM address for 0.0.4760196

// Path HBAR → USDC
const PATH = [
  "0x0000000000000000000000000000000000000000",
  USDC
];

const AMOUNT_IN_HBAR = "100";
//

// ABI for swapExactHBARForTokens
const ROUTER_ABI = [
  "function swapExactHBARForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) payable returns (uint256[] memory amounts)"
];

async function main() {
  const [signer] = await ethers.getSigners();

  console.log("Using wallet:", signer.address);

  const router = new ethers.Contract(ROUTER, ROUTER_ABI, signer);

  const amountOutMin = 0;
  const deadline = Math.floor(Date.now() / 1000) + 120;

  console.log("Executing swap...");

  const tx = await router.swapExactHBARForTokens(
    amountOutMin,
    PATH,
    signer.address,
    deadline,
    {
      value: ethers.parseEther(AMOUNT_IN_HBAR)
    }
  );

  console.log("Swap submitted:", tx.hash);
  await tx.wait();

  console.log("Swap complete!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});